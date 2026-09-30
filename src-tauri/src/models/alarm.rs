use serde::{Deserialize, Serialize};

/// Muundo kamili wa data wa kengele (Full Alarm Data Model).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alarm {
    pub id: String,
    pub label: String,
    pub hour: u32,
    pub minute: u32,
    pub is_active: bool,
    #[serde(default = "default_repeat_pattern")]
    pub repeat_pattern: String,
    #[serde(default)]
    pub days: Vec<String>,
    pub audio_path: Option<String>,
    pub audio_file_name: Option<String>,
    pub audio_start_ms: Option<u64>,
    pub audio_end_ms: Option<u64>,
    pub volume_boost: Option<u32>,
    pub fade_in_seconds: Option<u32>,
    pub snooze_duration: Option<u32>,
    pub snooze_limit: Option<u32>,
    pub math_challenge: Option<bool>,
    pub ai_voice_enabled: Option<bool>,
    pub ai_personality: Option<String>,
    pub ai_voice_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub last_fired_at: Option<String>,
}

fn default_repeat_pattern() -> String {
    "weekdays".to_string()
}
