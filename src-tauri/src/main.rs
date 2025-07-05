// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod ollama;

use db::{Database, Conversation, Message};
use ollama::{OllamaClient, ChatMessage, OllamaModel};
use std::sync::Mutex;
use tauri::State;
use chrono::Utc;

struct AppState {
    db: Mutex<Database>,
    ollama: OllamaClient,
}

#[tauri::command]
async fn check_ollama(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.ollama.check_connection().await)
}

#[tauri::command]
async fn send_prompt(prompt: String, model: String, state: State<'_, AppState>) -> Result<String, String> {
    state.ollama.send_prompt(&prompt, &model).await
}

#[tauri::command]
async fn send_prompt_with_history(messages: Vec<ChatMessage>, model: String, state: State<'_, AppState>) -> Result<String, String> {
    state.ollama.send_prompt_with_history(messages, &model).await
}

#[tauri::command]
async fn create_conversation(state: State<'_, AppState>) -> Result<i32, String> {
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    let created_at = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    db.create_conversation(&created_at).map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
async fn save_message(
    conversation_id: i32,
    role: String,
    content: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    db.save_message(conversation_id, &role, &content, &timestamp)
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
async fn get_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.get_conversations().map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
async fn get_messages(conversation_id: i32, state: State<'_, AppState>) -> Result<Vec<Message>, String> {
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.get_messages(conversation_id).map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
async fn list_models(state: State<'_, AppState>) -> Result<Vec<OllamaModel>, String> {
    state.ollama.list_models().await
}

fn main() {
    let database = Database::new().expect("Failed to initialize database");
    let ollama_client = OllamaClient::new();
    
    let app_state = AppState {
        db: Mutex::new(database),
        ollama: ollama_client,
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            check_ollama,
            send_prompt,
            send_prompt_with_history,
            create_conversation,
            save_message,
            get_conversations,
            get_messages,
            list_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}