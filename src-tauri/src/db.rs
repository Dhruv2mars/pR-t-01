use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use dirs;

#[derive(Debug, Serialize, Deserialize)]
pub struct Conversation {
    pub id: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: i32,
    pub conversation_id: i32,
    pub role: String,
    pub content: String,
    pub input_type: String,
    pub image_path: Option<String>,
    pub image_filename: Option<String>,
    pub image_size: Option<i32>,
    pub timestamp: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path();
        
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                    Some(format!("Failed to create directory: {}", e))
                )
            })?;
        }

        let conn = Connection::open(&db_path)?;
        let db = Database { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                input_type TEXT NOT NULL DEFAULT 'text',
                image_path TEXT,
                image_filename TEXT,
                image_size INTEGER,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )",
            [],
        )?;

        // Add new columns to existing messages table if they don't exist
        let _ = self.conn.execute("ALTER TABLE messages ADD COLUMN input_type TEXT DEFAULT 'text'", []);
        let _ = self.conn.execute("ALTER TABLE messages ADD COLUMN image_path TEXT", []);
        let _ = self.conn.execute("ALTER TABLE messages ADD COLUMN image_filename TEXT", []);
        let _ = self.conn.execute("ALTER TABLE messages ADD COLUMN image_size INTEGER", []);

        Ok(())
    }

    pub fn create_conversation(&self, created_at: &str) -> Result<i32> {
        self.conn.execute(
            "INSERT INTO conversations (created_at) VALUES (?1)",
            params![created_at],
        )?;
        Ok(self.conn.last_insert_rowid() as i32)
    }

    pub fn save_message(&self, conversation_id: i32, role: &str, content: &str, timestamp: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO messages (conversation_id, role, content, input_type, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![conversation_id, role, content, "text", timestamp],
        )?;
        Ok(())
    }

    pub fn save_message_with_image(
        &self, 
        conversation_id: i32, 
        role: &str, 
        content: &str, 
        input_type: &str,
        image_path: Option<&str>,
        image_filename: Option<&str>,
        image_size: Option<i32>,
        timestamp: &str
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO messages (conversation_id, role, content, input_type, image_path, image_filename, image_size, timestamp) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![conversation_id, role, content, input_type, image_path, image_filename, image_size, timestamp],
        )?;
        Ok(())
    }

    pub fn get_conversations(&self) -> Result<Vec<Conversation>> {
        let mut stmt = self.conn.prepare("SELECT id, created_at FROM conversations ORDER BY created_at DESC")?;
        let conversation_iter = stmt.query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                created_at: row.get(1)?,
            })
        })?;

        let mut conversations = Vec::new();
        for conversation in conversation_iter {
            conversations.push(conversation?);
        }
        Ok(conversations)
    }

    pub fn get_messages(&self, conversation_id: i32) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, conversation_id, role, content, input_type, image_path, image_filename, image_size, timestamp FROM messages 
             WHERE conversation_id = ?1 ORDER BY timestamp ASC"
        )?;
        let message_iter = stmt.query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                input_type: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "text".to_string()),
                image_path: row.get(5)?,
                image_filename: row.get(6)?,
                image_size: row.get(7)?,
                timestamp: row.get(8)?,
            })
        })?;

        let mut messages = Vec::new();
        for message in message_iter {
            messages.push(message?);
        }
        Ok(messages)
    }

    pub fn cleanup_orphaned_images(&self, images_dir: &std::path::Path) -> Result<()> {
        // Get all image paths from database
        let mut stmt = self.conn.prepare("SELECT DISTINCT image_path FROM messages WHERE image_path IS NOT NULL")?;
        let db_paths: std::collections::HashSet<String> = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        })?.collect::<Result<_, _>>()?;

        // Clean up files not in database
        if let Ok(entries) = std::fs::read_dir(images_dir) {
            for entry in entries.flatten() {
                if let Some(path_str) = entry.path().to_str() {
                    if !db_paths.contains(path_str) {
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
        }
        Ok(())
    }
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_local_dir()
        .or_else(|| dirs::home_dir())
        .unwrap_or_else(|| PathBuf::from("."));
    
    path.push("com.example.chat");
    path.push("chat.db");
    path
}