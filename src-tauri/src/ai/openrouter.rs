//! OpenRouter API client.
//! Primary AI provider — gives access to Gemini, Claude, Llama, and 100+ models.
//! API key NEVER leaves Rust backend.

use reqwest::Client;
use serde_json::json;
use tauri::{AppHandle, Emitter};

use crate::ai::types::*;

pub const DEFAULT_MODEL: &str = "google/gemini-flash-1.5";
pub const OPENROUTER_BASE: &str = "https://openrouter.ai/api/v1";

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OpenRouterKeyInfo {
    pub is_valid: bool,
    pub credits_remaining: Option<f64>,
    pub label: Option<String>,
}

pub async fn validate_api_key(api_key: &str) -> Result<OpenRouterKeyInfo, String> {
    if api_key.trim().is_empty() {
        return Ok(OpenRouterKeyInfo {
            is_valid: false,
            credits_remaining: None,
            label: None,
        });
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(format!("{}/auth/key", OPENROUTER_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().as_u16() == 401 {
        return Ok(OpenRouterKeyInfo {
            is_valid: false,
            credits_remaining: None,
            label: None,
        });
    }

    #[derive(serde::Deserialize)]
    struct KeyResponse {
        data: KeyData,
    }
    #[derive(serde::Deserialize)]
    struct KeyData {
        label: Option<String>,
        usage: Option<f64>,
        limit: Option<f64>,
    }

    if let Ok(info) = response.json::<KeyResponse>().await {
        let credits = info
            .data
            .limit
            .and_then(|limit| info.data.usage.map(|usage| (limit - usage).max(0.0)));

        Ok(OpenRouterKeyInfo {
            is_valid: true,
            credits_remaining: credits,
            label: info.data.label,
        })
    } else {
        Ok(OpenRouterKeyInfo {
            is_valid: true,
            credits_remaining: None,
            label: Some("OpenRouter Key".to_string()),
        })
    }
}

pub async fn chat_completion(
    api_key: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("OpenRouter API key not configured".to_string());
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
        .post(format!("{}/chat/completions", OPENROUTER_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://hyperalarm.pro")
        .header("X-Title", "HyperAlarm Pro")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("OpenRouter error {}: {}", status.as_u16(), err_body));
    }

    let chat_resp: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    chat_resp
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "No response from AI".to_string())
}

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
        return Err("OpenRouter API key not configured".to_string());
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
        .post(format!("{}/chat/completions", OPENROUTER_BASE))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://hyperalarm.pro")
        .header("X-Title", "HyperAlarm Pro")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let err_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown".to_string());
        return Err(format!(
            "OpenRouter error {}: {}",
            status.as_u16(),
            err_body
        ));
    }

    let mut full_response = String::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Stream error: {}", e))?
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
