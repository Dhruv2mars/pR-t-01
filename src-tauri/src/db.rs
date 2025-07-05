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
                timestamp TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )",
            [],
        )?;

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
            "INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4)",
            params![conversation_id, role, content, timestamp],
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
            "SELECT id, conversation_id, role, content, timestamp FROM messages 
             WHERE conversation_id = ?1 ORDER BY timestamp ASC"
        )?;
        let message_iter = stmt.query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })?;

        let mut messages = Vec::new();
        for message in message_iter {
            messages.push(message?);
        }
        Ok(messages)
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