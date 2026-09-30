//! Google Gemini API direct client.
//! Used as fallback or direct provider when configured.

use reqwest::Client;
use serde_json::{json, Value};

use crate::ai::types::ChatMessage;

pub const GEMINI_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";
pub const GEMINI_MODEL: &str = "gemini-1.5-flash";

pub async fn chat_completion(
    api_key: &str,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Gemini API key not configured".to_string());
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let mut contents: Vec<Value> = vec![];
    let mut system_prompt = String::new();

    for msg in &messages {
        match msg.role.as_str() {
            "system" => {
                system_prompt = msg.content.clone();
            }
            "user" => {
                let content = if !system_prompt.is_empty() && contents.is_empty() {
                    format!("{}\n\n{}", system_prompt, msg.content)
                } else {
                    msg.content.clone()
                };
                contents.push(json!({
                    "role": "user",
                    "parts": [{ "text": content }]
                }));
            }
            "assistant" => {
                contents.push(json!({
                    "role": "model",
                    "parts": [{ "text": msg.content }]
                }));
            }
            _ => {}
        }
    }

    let body = json!({
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        }
    });

    let url = format!(
        "{}/models/{}:generateContent?key={}",
        GEMINI_BASE,
        GEMINI_MODEL,
        api_key.trim()
    );

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let err = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Gemini API error: {}", err));
    }

    let resp_json: Value = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    resp_json
        .get("candidates")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("content"))
        .and_then(|c| c.get("parts"))
        .and_then(|p| p.get(0))
        .and_then(|p| p.get("text"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "No text returned in Gemini response".to_string())
}

pub async fn validate_api_key(api_key: &str) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Ok(false);
    }

    let result = chat_completion(
        api_key,
        vec![ChatMessage {
            role: "user".to_string(),
            content: "Hi".to_string(),
        }],
        10,
        0.5,
    )
    .await;

    Ok(result.is_ok())
}
