// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod ollama;

use db::{Database, Conversation, Message};
use ollama::{OllamaClient, ChatMessage, OllamaModel};
use std::sync::Mutex;
use tauri::State;
use chrono::Utc;
use std::path::PathBuf;
use std::fs;
use base64::{Engine as _, engine::general_purpose};

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
async fn save_message_with_image(
    conversation_id: i32,
    role: String,
    content: String,
    input_type: String,
    image_path: Option<String>,
    image_filename: Option<String>,
    image_size: Option<i32>,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    db.save_message_with_image(
        conversation_id, 
        &role, 
        &content, 
        &input_type,
        image_path.as_deref(),
        image_filename.as_deref(),
        image_size,
        &timestamp
    ).map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
async fn save_image_file(
    conversation_id: i32,
    image_data: String,
    filename: String,
    _state: State<'_, AppState>
) -> Result<String, String> {
    // Create images directory
    let images_dir = get_images_dir()?;
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images directory: {}", e))?;
    
    // Create conversation subdirectory
    let conv_dir = images_dir.join(conversation_id.to_string());
    fs::create_dir_all(&conv_dir).map_err(|e| format!("Failed to create conversation directory: {}", e))?;
    
    // Generate unique filename
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let extension = std::path::Path::new(&filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");
    let unique_filename = format!("{}_{}.{}", timestamp, conversation_id, extension);
    let file_path = conv_dir.join(&unique_filename);
    
    // Decode base64 and save file
    let image_bytes = general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    fs::write(&file_path, image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_image_base64(image_path: String) -> Result<String, String> {
    let image_bytes = fs::read(&image_path)
        .map_err(|e| format!("Failed to read image file: {}", e))?;
    
    Ok(general_purpose::STANDARD.encode(image_bytes))
}

#[tauri::command]
async fn send_prompt_with_image(
    prompt: String,
    image_path: String,
    model: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    let image_base64 = get_image_base64(image_path).await?;
    state.ollama.send_prompt_with_image(&prompt, &image_base64, &model).await
}

#[tauri::command]
async fn cleanup_images(state: State<'_, AppState>) -> Result<(), String> {
    let images_dir = get_images_dir()?;
    let db = state.db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.cleanup_orphaned_images(&images_dir)
        .map_err(|e| format!("Cleanup error: {}", e))
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

fn get_images_dir() -> Result<PathBuf, String> {
    let mut path = dirs::data_local_dir()
        .or_else(|| dirs::home_dir())
        .ok_or("Failed to get data directory")?;
    
    path.push("com.example.chat");
    path.push("images");
    Ok(path)
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
            send_prompt_with_image,
            create_conversation,
            save_message,
            save_message_with_image,
            save_image_file,
            get_image_base64,
            get_conversations,
            get_messages,
            list_models,
            cleanup_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}