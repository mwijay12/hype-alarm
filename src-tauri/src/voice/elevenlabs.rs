//! ElevenLabs TTS API client.
//! All API calls are made from Rust backend only.
//! The API key is NEVER passed to the frontend.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;

// ─────────────────────────────────────────
// API TYPES
// ─────────────────────────────────────────

#[derive(Debug, Serialize)]
struct TtsRequest {
    text: String,
    model_id: String,
    voice_settings: VoiceSettings,
}

#[derive(Debug, Serialize)]
struct VoiceSettings {
    stability: f32,
    similarity_boost: f32,
    style: f32,
    use_speaker_boost: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevenLabsVoice {
    pub voice_id: String,
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VoicesResponse {
    voices: Vec<ElevenLabsVoice>,
}

// ─────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────

#[derive(Debug)]
pub enum ElevenLabsError {
    InvalidApiKey,
    RateLimited,
    QuotaExceeded,
    NetworkError(String),
    ApiError(String),
}

impl std::fmt::Display for ElevenLabsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidApiKey => write!(f, "Invalid ElevenLabs API key"),
            Self::RateLimited => write!(f, "Rate limited — try again later"),
            Self::QuotaExceeded => write!(f, "ElevenLabs quota exceeded"),
            Self::NetworkError(e) => write!(f, "Network error: {}", e),
            Self::ApiError(e) => write!(f, "API error: {}", e),
        }
    }
}

// ─────────────────────────────────────────
// MAIN CLIENT FUNCTIONS
// ─────────────────────────────────────────

/// Generate TTS audio and return raw MP3 bytes.
/// voice_id: ElevenLabs voice ID string
/// text: The script to convert to speech
/// api_key: User's ElevenLabs API key
pub async fn generate_speech(
    api_key: &str,
    voice_id: &str,
    text: &str,
    personality: &str,
) -> Result<Vec<u8>, ElevenLabsError> {
    if api_key.trim().is_empty() {
        return Err(ElevenLabsError::InvalidApiKey);
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    // Voice settings vary by personality
    let (stability, similarity, style) = match personality.to_lowercase().as_str() {
        "military" => (0.85, 0.85, 0.40),
        "gentle" => (0.60, 0.80, 0.15),
        "coach" => (0.70, 0.85, 0.30),
        _ => (0.75, 0.80, 0.25), // motivational
    };

    let request_body = TtsRequest {
        text: text.to_string(),
        model_id: "eleven_turbo_v2_5".to_string(), // fastest, cheapest, high quality (v2 deprecated)
        voice_settings: VoiceSettings {
            stability,
            similarity_boost: similarity,
            style,
            use_speaker_boost: true,
        },
    };

    let url = format!(
        "https://api.elevenlabs.io/v1/text-to-speech/{}",
        voice_id.trim()
    );

    let response = client
        .post(&url)
        .header("xi-api-key", api_key.trim())
        .header("Content-Type", "application/json")
        .header("Accept", "audio/mpeg")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    match response.status().as_u16() {
        200 => {
            let bytes = response
                .bytes()
                .await
                .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;
            Ok(bytes.to_vec())
        }
        401 => Err(ElevenLabsError::InvalidApiKey),
        429 => Err(ElevenLabsError::RateLimited),
        422 => Err(ElevenLabsError::QuotaExceeded),
        status => {
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(ElevenLabsError::ApiError(format!("Status {}: {}", status, body)))
        }
    }
}

/// Save audio bytes to a cache file.
/// Returns the file path.
pub async fn save_to_cache(
    cache_dir: &Path,
    alarm_id: &str,
    audio_bytes: &[u8],
) -> Result<PathBuf, String> {
    fs::create_dir_all(cache_dir)
        .await
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;

    let sanitized_id = alarm_id.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let file_name = format!("voice_{}.mp3", sanitized_id);
    let file_path = cache_dir.join(&file_name);

    fs::write(&file_path, audio_bytes)
        .await
        .map_err(|e| format!("Failed to write cache file: {}", e))?;

    println!("🎤 Voice cached: {:?}", file_path);
    Ok(file_path)
}

/// Check if a cached voice file exists and is fresh
/// (generated within the last 25 hours)
pub async fn is_cache_fresh(cache_dir: &Path, alarm_id: &str) -> bool {
    let sanitized_id = alarm_id.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let file_path = cache_dir.join(format!("voice_{}.mp3", sanitized_id));

    match fs::metadata(&file_path).await {
        Ok(meta) => {
            if meta.len() < 1024 {
                return false;
            }
            match meta.modified() {
                Ok(modified) => {
                    let age = std::time::SystemTime::now()
                        .duration_since(modified)
                        .unwrap_or_default();
                    age.as_secs() < 25 * 3600
                }
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

/// Get path to cached voice file (if exists)
pub fn get_cache_path(cache_dir: &Path, alarm_id: &str) -> PathBuf {
    let sanitized_id = alarm_id.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    cache_dir.join(format!("voice_{}.mp3", sanitized_id))
}

/// Get available ElevenLabs voices for the user
pub async fn get_available_voices(
    api_key: &str,
) -> Result<Vec<ElevenLabsVoice>, ElevenLabsError> {
    if api_key.trim().is_empty() {
        return Err(ElevenLabsError::InvalidApiKey);
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    let response = client
        .get("https://api.elevenlabs.io/v1/voices")
        .header("xi-api-key", api_key.trim())
        .send()
        .await
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    if response.status().as_u16() == 401 {
        return Err(ElevenLabsError::InvalidApiKey);
    }

    if !response.status().is_success() {
        return Err(ElevenLabsError::ApiError(format!("Status: {}", response.status())));
    }

    let data: VoicesResponse = response
        .json()
        .await
        .map_err(|e| ElevenLabsError::ApiError(e.to_string()))?;

    Ok(data.voices)
}

/// Get user's ElevenLabs subscription info
/// (to show remaining character quota)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionInfo {
    pub character_count: i64,
    pub character_limit: i64,
    pub can_extend_character_limit: bool,
    pub tier: String,
}

pub async fn get_subscription_info(
    api_key: &str,
) -> Result<SubscriptionInfo, ElevenLabsError> {
    if api_key.trim().is_empty() {
        return Err(ElevenLabsError::InvalidApiKey);
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    let response = client
        .get("https://api.elevenlabs.io/v1/user/subscription")
        .header("xi-api-key", api_key.trim())
        .send()
        .await
        .map_err(|e| ElevenLabsError::NetworkError(e.to_string()))?;

    if response.status().as_u16() == 401 {
        return Err(ElevenLabsError::InvalidApiKey);
    }

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(ElevenLabsError::ApiError(err_text));
    }

    response
        .json::<SubscriptionInfo>()
        .await
        .map_err(|e| ElevenLabsError::ApiError(e.to_string()))
}
