use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────
// REQUEST TYPES
// ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
    pub stream: bool,
}

// ─────────────────────────────────────────
// RESPONSE TYPES (OpenRouter / Groq / OpenAI format)
// ─────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<ChatChoice>,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Deserialize)]
pub struct ChatChoice {
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: Option<u32>,
    pub completion_tokens: Option<u32>,
    pub total_tokens: Option<u32>,
}

// ─────────────────────────────────────────
// STREAMING TYPES
// ─────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct StreamChunk {
    pub choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
pub struct StreamChoice {
    pub delta: StreamDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StreamDelta {
    pub content: Option<String>,
}

// ─────────────────────────────────────────
// MORNING CHECK-IN CONTEXT
// ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MorningContext {
    pub current_streak: i64,
    pub today_goals: Vec<String>,
    pub this_week_score: f64,
    pub alarm_label: String,
    pub snooze_count: i64,
    pub hour: i64,
    pub minute: i64,
    pub ai_personality: String,
    pub alarm_id: Option<String>,
}

// ─────────────────────────────────────────
// CONVERSATION RECORD (for DB storage)
// ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationRecord {
    pub id: String,
    pub date: String,
    pub alarm_id: Option<String>,
    pub messages: String, // JSON array of ChatMessage
    pub morning_score: f64,
    pub created_at: String,
    pub updated_at: String,
}

// ─────────────────────────────────────────
// MORNING BRIEFING
// ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MorningBriefing {
    pub greeting: String,
    pub streak_message: String,
    pub goals_message: String,
    pub ai_tip: String,
    pub motivational_close: String,
    pub generated_at: String,
}

// ─────────────────────────────────────────
// STREAM TOKEN EVENT PAYLOAD
// ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiStreamToken {
    pub token: String,
    pub is_done: bool,
    pub full_text: String,
}
