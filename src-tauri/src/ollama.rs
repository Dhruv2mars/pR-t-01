use reqwest;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub message: ChatMessage,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: i64,
    pub digest: String,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub models: Vec<OllamaModel>,
}

pub struct OllamaClient {
    client: reqwest::Client,
    base_url: String,
}

impl OllamaClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap();
        
        Self {
            client,
            base_url: "http://localhost:11434".to_string(),
        }
    }

    pub async fn check_connection(&self) -> bool {
        match self.client.get(&self.base_url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    pub async fn send_prompt(&self, prompt: &str, model: &str) -> Result<String, String> {
        let chat_request = ChatRequest {
            model: model.to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
                images: None,
            }],
            stream: false,
        };

        let url = format!("{}/api/chat", self.base_url);
        
        match self.client
            .post(&url)
            .json(&chat_request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<ChatResponse>().await {
                        Ok(chat_response) => Ok(chat_response.message.content),
                        Err(e) => Err(format!("Failed to parse response: {}", e)),
                    }
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    Err(format!("HTTP {}: {}", status, error_text))
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Err("Cannot connect to Ollama server. Please run 'ollama run gemma3:4b' in a terminal.".to_string())
                } else if e.is_timeout() {
                    Err("Request timed out. The model might be loading or the prompt is too complex.".to_string())
                } else {
                    Err(format!("Request failed: {}", e))
                }
            }
        }
    }

    pub async fn send_prompt_with_image(&self, prompt: &str, image_base64: &str, model: &str) -> Result<String, String> {
        let chat_request = ChatRequest {
            model: model.to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
                images: Some(vec![image_base64.to_string()]),
            }],
            stream: false,
        };

        let url = format!("{}/api/chat", self.base_url);
        
        match self.client
            .post(&url)
            .json(&chat_request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<ChatResponse>().await {
                        Ok(chat_response) => Ok(chat_response.message.content),
                        Err(e) => Err(format!("Failed to parse response: {}", e)),
                    }
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    
                    // Check if it's a vision-related error
                    if error_text.contains("vision") || error_text.contains("image") || error_text.contains("multimodal") {
                        Err("VISION_NOT_SUPPORTED".to_string())
                    } else {
                        Err(format!("HTTP {}: {}", status, error_text))
                    }
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Err("Cannot connect to Ollama server. Please run 'ollama run gemma3:4b' in a terminal.".to_string())
                } else if e.is_timeout() {
                    Err("Request timed out. The model might be loading or the prompt is too complex.".to_string())
                } else {
                    Err(format!("Request failed: {}", e))
                }
            }
        }
    }

    pub async fn send_prompt_with_history(&self, messages: Vec<ChatMessage>, model: &str) -> Result<String, String> {
        let chat_request = ChatRequest {
            model: model.to_string(),
            messages,
            stream: false,
        };

        let url = format!("{}/api/chat", self.base_url);
        
        match self.client
            .post(&url)
            .json(&chat_request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<ChatResponse>().await {
                        Ok(chat_response) => Ok(chat_response.message.content),
                        Err(e) => Err(format!("Failed to parse response: {}", e)),
                    }
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    
                    // Check if it's a vision-related error
                    if error_text.contains("vision") || error_text.contains("image") || error_text.contains("multimodal") {
                        Err("VISION_NOT_SUPPORTED".to_string())
                    } else {
                        Err(format!("HTTP {}: {}", status, error_text))
                    }
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Err("Cannot connect to Ollama server. Please run 'ollama run gemma3:4b' in a terminal.".to_string())
                } else if e.is_timeout() {
                    Err("Request timed out. The model might be loading or the prompt is too complex.".to_string())
                } else {
                    Err(format!("Request failed: {}", e))
                }
            }
        }
    }

    pub async fn list_models(&self) -> Result<Vec<OllamaModel>, String> {
        let url = format!("{}/api/tags", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<ModelsResponse>().await {
                        Ok(models_response) => Ok(models_response.models),
                        Err(e) => Err(format!("Failed to parse models response: {}", e)),
                    }
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    Err(format!("HTTP {}: {}", status, error_text))
                }
            }
            Err(e) => {
                if e.is_connect() {
                    Err("Cannot connect to Ollama server. Please ensure Ollama is running.".to_string())
                } else {
                    Err(format!("Request failed: {}", e))
                }
            }
        }
    }
}