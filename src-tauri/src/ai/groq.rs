//! Groq API client with ultra-fast LPU inference.
//! Fully OpenAI-compatible chat completions and streaming SSE.

use reqwest::Client;
use serde_json::json;
use tauri::{AppHandle, Emitter};

use crate::ai::types::{AiStreamToken, ChatMessage, ChatResponse, StreamChunk};

pub const GROQ_BASE: &str = "https://api.groq.com/openai/v1";
pub const DEFAULT_GROQ_MODEL: &str = "llama-3.3-70b-versatile";
pub const FAST_GROQ_MODEL: &str = "llama-3.1-8b-instant";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GroqModelInfo {
    pub id: String,
    pub description: String,
    pub context_window: u32,
    pub is_recommended: bool,
}

pub fn get_curated_groq_models() -> Vec<GroqModelInfo> {
    vec![
        GroqModelInfo {
            id: "llama-3.3-70b-versatile".to_string(),
            description: "Meta Llama 3.3 70B — Flagship intelligence & rich coaching (128k context, ~280 tok/s)".to_string(),
            context_window: 131072,
            is_recommended: true,
        },
        GroqModelInfo {
            id: "llama-3.1-8b-instant".to_string(),
            description: "Meta Llama 3.1 8B — Blazing-fast instant responses (~800+ tok/s)".to_string(),
            context_window: 131072,
            is_recommended: false,
        },
        GroqModelInfo {
            id: "deepseek-r1-distill-llama-70b".to_string(),
            description: "DeepSeek R1 Distill Llama 70B — Advanced reasoning & mindful reflection".to_string(),
            context_window: 131072,
            is_recommended: false,
        },
        GroqModelInfo {
            id: "gemma2-9b-it".to_string(),
            description: "Google Gemma 2 9B — Crisp, concise instruction following".to_string(),
            context_window: 8192,
            is_recommended: false,
        },
        GroqModelInfo {
            id: "mixtral-8x7b-32768".to_string(),
            description: "Mistral Mixtral 8x7B — High-speed Mixture-of-Experts".to_string(),
            context_window: 32768,
            is_recommended: false,
        },
    ]
}

/// Validate Groq API key by listing models
pub async fn validate_groq_key(api_key: &str) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Ok(false);
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(format!("{}/models", GROQ_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    Ok(response.status().is_success())
}

/// Non-streaming chat completion with Groq
pub async fn chat_completion(
    api_key: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Groq API key not configured".to_string());
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": false
    });

    let response = client
        .post(format!("{}/chat/completions", GROQ_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Groq network error: {}", e))?;

    if !response.status().is_success() {
        let err_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown Groq error".to_string());
        return Err(format!("Groq API error: {}", err_body));
    }

    let chat_resp: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Groq parse error: {}", e))?;

    chat_resp
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "No response returned from Groq".to_string())
}

/// Streaming chat completion with Groq emitting tokens via Tauri event
pub async fn chat_completion_stream(
    app: &AppHandle,
    api_key: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
    stream_event: &str,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Groq API key not configured".to_string());
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": true
    });

    let mut response = client
        .post(format!("{}/chat/completions", GROQ_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Groq streaming connection error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let err_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown Groq error".to_string());
        return Err(format!("Groq API error {}: {}", status, err_body));
    }

    let mut full_response = String::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Groq stream reading error: {}", e))?
    {
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            let trimmed = line.trim();
            if !trimmed.starts_with("data: ") {
                continue;
            }
            let data = &trimmed["data: ".len()..];

            if data == "[DONE]" {
                let _ = app.emit(
                    stream_event,
                    AiStreamToken {
                        token: String::new(),
                        is_done: true,
                        full_text: full_response.clone(),
                    },
                );
                break;
            }

            if let Ok(chunk_data) = serde_json::from_str::<StreamChunk>(data) {
                if let Some(choice) = chunk_data.choices.first() {
                    if let Some(token) = &choice.delta.content {
                        full_response.push_str(token);

                        let _ = app.emit(
                            stream_event,
                            AiStreamToken {
                                token: token.clone(),
                                is_done: false,
                                full_text: full_response.clone(),
                            },
                        );
                    }
                }
            }
        }
    }

    // Final emit to guarantee completion state
    let _ = app.emit(
        stream_event,
        AiStreamToken {
            token: String::new(),
            is_done: true,
            full_text: full_response.clone(),
        },
    );

    Ok(full_response)
}
