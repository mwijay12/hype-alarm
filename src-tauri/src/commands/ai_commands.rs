use rusqlite::{params, Connection};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::ai::{
    gemini,
    groq::{self, GroqModelInfo},
    openrouter, prompt_engine,
    types::*,
};
use crate::voice::cache_manager::get_sqlite_conn;

// ─────────────────────────────────────────────────────────────
// TABLE INITIALIZER FOR AI TABLES
// ─────────────────────────────────────────────────────────────

pub fn ensure_ai_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id              TEXT PRIMARY KEY,
            date            TEXT NOT NULL,
            alarm_id        TEXT,
            messages        TEXT NOT NULL,
            morning_score   REAL NOT NULL DEFAULT 0.0,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS morning_briefings (
            id                  TEXT PRIMARY KEY,
            date                TEXT NOT NULL UNIQUE,
            greeting            TEXT NOT NULL,
            streak_message      TEXT NOT NULL,
            goals_message       TEXT NOT NULL,
            ai_tip              TEXT NOT NULL,
            motivational_close  TEXT NOT NULL,
            generated_at        TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_ai_conversations_date ON ai_conversations(date);
        CREATE INDEX IF NOT EXISTS idx_morning_briefings_date ON morning_briefings(date);
        ",
    )
    .map_err(|e| e.to_string())
}

// ─────────────────────────────────────────────────────────────
// VALIDATION COMMANDS
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn validate_openrouter_key(
    api_key: String,
) -> Result<openrouter::OpenRouterKeyInfo, String> {
    openrouter::validate_api_key(&api_key).await
}

#[tauri::command]
pub async fn validate_gemini_key(api_key: String) -> Result<bool, String> {
    gemini::validate_api_key(&api_key).await
}

#[tauri::command]
pub async fn validate_groq_key(api_key: String) -> Result<bool, String> {
    groq::validate_groq_key(&api_key).await
}

#[tauri::command]
pub fn get_groq_models() -> Vec<GroqModelInfo> {
    groq::get_curated_groq_models()
}

// ─────────────────────────────────────────────────────────────
// MORNING CHECK-IN WORKFLOW
// ─────────────────────────────────────────────────────────────

/// Start morning check-in: constructs context-aware opening message and creates session record in DB.
#[tauri::command]
pub async fn start_morning_checkin(
    app: AppHandle,
    context: MorningContext,
) -> Result<String, String> {
    let opening = prompt_engine::build_opening_message(&context);

    // Save initial conversation session
    let conn = get_sqlite_conn(&app)?;
    ensure_ai_tables(&conn)?;

    let conv_id = Uuid::new_v4().to_string();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let now_iso = chrono::Local::now().to_rfc3339();

    let initial_messages = vec![ChatMessage {
        role: "assistant".to_string(),
        content: opening.clone(),
    }];

    let messages_json = serde_json::to_string(&initial_messages).unwrap_or_default();

    let _ = conn.execute(
        "INSERT INTO ai_conversations (id, date, alarm_id, messages, morning_score, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            conv_id,
            today,
            context.alarm_id.unwrap_or_default(),
            messages_json,
            context.this_week_score,
            now_iso,
            now_iso,
        ],
    );

    Ok(opening)
}

/// Send a user message and stream back the AI response token-by-token.
/// Fallback chain: Groq (ultra-fast) ➔ OpenRouter ➔ Gemini Direct.
#[tauri::command]
pub async fn send_checkin_message(
    app: AppHandle,
    conversation_id: String,
    user_message: String,
    message_history: Vec<ChatMessage>,
    context: MorningContext,
) -> Result<String, String> {
    let conn = get_sqlite_conn(&app)?;
    ensure_ai_tables(&conn)?;

    let system_prompt = prompt_engine::build_system_prompt(&context);
    let mut api_messages = vec![ChatMessage {
        role: "system".to_string(),
        content: system_prompt,
    }];
    api_messages.extend(message_history.clone());
    api_messages.push(ChatMessage {
        role: "user".to_string(),
        content: user_message.clone(),
    });

    // Check exchange count (if >= 3 user turns, end with closing message)
    let user_turns = api_messages.iter().filter(|m| m.role == "user").count();
    if user_turns >= 3 {
        let closing = prompt_engine::build_closing_message(&context.ai_personality, context.current_streak);
        let final_text = format!("{}|||DONE", closing);
        return Ok(final_text);
    }

    // Retrieve configured API keys from SQLite settings
    let groq_key = get_setting_val(&conn, "groqApiKey");
    let groq_model = get_setting_val(&conn, "groqModel")
        .unwrap_or_else(|| groq::DEFAULT_GROQ_MODEL.to_string());

    let openrouter_key = get_setting_val(&conn, "openRouterApiKey");
    let openrouter_model = get_setting_val(&conn, "openRouterModel")
        .unwrap_or_else(|| openrouter::DEFAULT_MODEL.to_string());

    let gemini_key = get_setting_val(&conn, "geminiApiKey");

    let stream_event = "ai:checkin:token";
    let mut full_response = String::new();
    let mut succeeded = false;

    // 1. Try Groq first (Ultra-fast LPU inference)
    if let Some(ref g_key) = groq_key {
        if !g_key.trim().is_empty() {
            println!("⚡ [AI] Streaming via Groq ({})", groq_model);
            match groq::chat_completion_stream(
                &app,
                g_key,
                &groq_model,
                api_messages.clone(),
                220,
                0.7,
                stream_event,
            )
            .await
            {
                Ok(resp) if !resp.trim().is_empty() => {
                    full_response = resp;
                    succeeded = true;
                }
                Err(e) => {
                    println!("⚠️ [AI] Groq failed: {}, falling back to OpenRouter...", e);
                }
                _ => {}
            }
        }
    }

    // 2. Fallback to OpenRouter
    if !succeeded {
        if let Some(ref or_key) = openrouter_key {
            if !or_key.trim().is_empty() {
                println!("⚡ [AI] Streaming via OpenRouter ({})", openrouter_model);
                match openrouter::chat_completion_stream(
                    &app,
                    or_key,
                    &openrouter_model,
                    api_messages.clone(),
                    250,
                    0.75,
                    stream_event,
                )
                .await
                {
                    Ok(resp) if !resp.trim().is_empty() => {
                        full_response = resp;
                        succeeded = true;
                    }
                    Err(e) => {
                        println!("⚠️ [AI] OpenRouter failed: {}, falling back to Gemini...", e);
                    }
                    _ => {}
                }
            }
        }
    }

    // 3. Fallback to Gemini Direct
    if !succeeded {
        if let Some(ref gem_key) = gemini_key {
            if !gem_key.trim().is_empty() {
                println!("⚡ [AI] Querying Gemini Direct");
                match gemini::chat_completion(gem_key, api_messages.clone(), 250, 0.7).await {
                    Ok(resp) => {
                        full_response = resp;
                        succeeded = true;
                        // Emit token event with complete text
                        let _ = app.emit(
                            stream_event,
                            AiStreamToken {
                                token: full_response.clone(),
                                is_done: true,
                                full_text: full_response.clone(),
                            },
                        );
                    }
                    Err(e) => {
                        println!("⚠️ [AI] Gemini Direct failed: {}", e);
                    }
                }
            }
        }
    }

    if !succeeded {
        return Err("No AI provider available or all configured keys failed. Please check your API keys in Settings.".to_string());
    }

    // Save/update conversation in SQLite
    let mut updated_messages = message_history;
    updated_messages.push(ChatMessage {
        role: "user".to_string(),
        content: user_message,
    });
    updated_messages.push(ChatMessage {
        role: "assistant".to_string(),
        content: full_response.clone(),
    });

    let now_iso = chrono::Local::now().to_rfc3339();
    let json_str = serde_json::to_string(&updated_messages).unwrap_or_default();

    if !conversation_id.is_empty() {
        let _ = conn.execute(
            "UPDATE ai_conversations SET messages = ?1, updated_at = ?2 WHERE id = ?3",
            params![json_str, now_iso, conversation_id],
        );
    }

    Ok(full_response)
}

// ─────────────────────────────────────────────────────────────
// MORNING BRIEFING WORKFLOW
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_morning_briefing(
    app: AppHandle,
    context: MorningContext,
) -> Result<MorningBriefing, String> {
    let conn = get_sqlite_conn(&app)?;
    ensure_ai_tables(&conn)?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Check if already generated today
    if let Ok(mut stmt) = conn.prepare(
        "SELECT greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at
         FROM morning_briefings WHERE date = ?1",
    ) {
        if let Ok(existing) = stmt.query_row(params![today], |row| {
            Ok(MorningBriefing {
                greeting: row.get(0)?,
                streak_message: row.get(1)?,
                goals_message: row.get(2)?,
                ai_tip: row.get(3)?,
                motivational_close: row.get(4)?,
                generated_at: row.get(5)?,
            })
        }) {
            return Ok(existing);
        }
    }

    let groq_key = get_setting_val(&conn, "groqApiKey");
    let groq_model = get_setting_val(&conn, "groqModel")
        .unwrap_or_else(|| groq::DEFAULT_GROQ_MODEL.to_string());

    let openrouter_key = get_setting_val(&conn, "openRouterApiKey");
    let openrouter_model = get_setting_val(&conn, "openRouterModel")
        .unwrap_or_else(|| openrouter::DEFAULT_MODEL.to_string());

    let gemini_key = get_setting_val(&conn, "geminiApiKey");

    let prompt_messages = prompt_engine::build_briefing_prompt(&context);
    let mut raw_response = String::new();
    let mut succeeded = false;

    // 1. Try Groq
    if let Some(ref g_key) = groq_key {
        if !g_key.trim().is_empty() {
            if let Ok(resp) = groq::chat_completion(g_key, &groq_model, prompt_messages.clone(), 350, 0.6).await {
                raw_response = resp;
                succeeded = true;
            }
        }
    }

    // 2. Try OpenRouter
    if !succeeded {
        if let Some(ref or_key) = openrouter_key {
            if !or_key.trim().is_empty() {
                if let Ok(resp) = openrouter::chat_completion(or_key, &openrouter_model, prompt_messages.clone(), 350, 0.6).await {
                    raw_response = resp;
                    succeeded = true;
                }
            }
        }
    }

    // 3. Try Gemini
    if !succeeded {
        if let Some(ref gem_key) = gemini_key {
            if !gem_key.trim().is_empty() {
                if let Ok(resp) = gemini::chat_completion(gem_key, prompt_messages, 350, 0.6).await {
                    raw_response = resp;
                    succeeded = true;
                }
            }
        }
    }

    let now_iso = chrono::Local::now().to_rfc3339();
    let briefing = if succeeded {
        // Parse JSON or extract fields safely
        parse_briefing_json(&raw_response, &now_iso)
    } else {
        // Graceful fallback briefing if no API keys are set yet
        MorningBriefing {
            greeting: format!("Good morning, champion! {} is your moment.", context.alarm_label),
            streak_message: if context.current_streak > 0 {
                format!("You're holding strong on a {}-day streak. Keep your momentum going!", context.current_streak)
            } else {
                "Today is Day 1 of your new victory chain.".to_string()
            },
            goals_message: if !context.today_goals.is_empty() {
                format!("You set {} goals for today. Tackle your hardest priority first.", context.today_goals.len())
            } else {
                "Take a moment to define your number one focus for today.".to_string()
            },
            ai_tip: "Hydrate immediately with a large glass of water and stretch your body for 60 seconds.".to_string(),
            motivational_close: "Action cures fear and builds discipline. Rise and conquer.".to_string(),
            generated_at: now_iso.clone(),
        }
    };

    // Save to SQLite
    let id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT OR REPLACE INTO morning_briefings (id, date, greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            today,
            briefing.greeting,
            briefing.streak_message,
            briefing.goals_message,
            briefing.ai_tip,
            briefing.motivational_close,
            briefing.generated_at,
        ],
    );

    Ok(briefing)
}

#[tauri::command]
pub async fn get_today_morning_briefing(app: AppHandle) -> Result<Option<MorningBriefing>, String> {
    let conn = get_sqlite_conn(&app)?;
    ensure_ai_tables(&conn)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at
             FROM morning_briefings WHERE date = ?1",
        )
        .map_err(|e| e.to_string())?;

    match stmt.query_row(params![today], |row| {
        Ok(MorningBriefing {
            greeting: row.get(0)?,
            streak_message: row.get(1)?,
            goals_message: row.get(2)?,
            ai_tip: row.get(3)?,
            motivational_close: row.get(4)?,
            generated_at: row.get(5)?,
        })
    }) {
        Ok(b) => Ok(Some(b)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_ai_conversations(
    app: AppHandle,
    limit: Option<i64>,
) -> Result<Vec<ConversationRecord>, String> {
    let conn = get_sqlite_conn(&app)?;
    ensure_ai_tables(&conn)?;

    let lim = limit.unwrap_or(30);
    let mut stmt = conn
        .prepare(
            "SELECT id, date, alarm_id, messages, morning_score, created_at, updated_at
             FROM ai_conversations
             ORDER BY created_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![lim], |row| {
            Ok(ConversationRecord {
                id: row.get(0)?,
                date: row.get(1)?,
                alarm_id: row.get(2)?,
                messages: row.get(3)?,
                morning_score: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

// ─────────────────────────────────────────────────────────────
// BACKWARD COMPATIBLE & UTILITY COMMANDS
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn test_groq_connection(api_key: String) -> Result<String, String> {
    if validate_groq_key(api_key.clone()).await? {
        Ok("Connected to Groq successfully".to_string())
    } else {
        Err("Invalid Groq API key or network failure".to_string())
    }
}

#[tauri::command]
pub async fn test_ai_connection(api_key: String) -> Result<String, String> {
    crate::commands::voice_commands::validate_elevenlabs_key(api_key)
        .await
        .map(|info| format!("Connected! Tier: {}, Chars remaining: {}", info.tier, info.character_limit - info.character_count))
}

#[tauri::command]
pub async fn send_ai_checkin(
    messages: Vec<ChatMessage>,
    personality: String,
    api_key: String,
    model: Option<String>,
) -> Result<AIResponse, String> {
    let model_to_use = model.unwrap_or_else(|| openrouter::DEFAULT_MODEL.to_string());
    let mut formatted = vec![ChatMessage {
        role: "system".to_string(),
        content: format!("You are a {} morning companion. Keep responses under 45 words.", personality),
    }];
    formatted.extend(messages);

    let reply = openrouter::chat_completion(&api_key, &model_to_use, formatted, 120, 0.7).await?;
    Ok(AIResponse {
        message: reply,
        model_used: model_to_use,
        tokens_used: 60,
    })
}

#[tauri::command]
pub async fn send_gemini_message(
    message: String,
    personality: String,
    api_key: String,
) -> Result<AIResponse, String> {
    let reply = gemini::chat_completion(
        &api_key,
        vec![
            ChatMessage {
                role: "system".to_string(),
                content: format!("You are a {} morning companion. Keep replies under 40 words.", personality),
            },
            ChatMessage {
                role: "user".to_string(),
                content: message,
            },
        ],
        100,
        0.7,
    )
    .await?;

    Ok(AIResponse {
        message: reply,
        model_used: "gemini-1.5-flash".to_string(),
        tokens_used: 40,
    })
}

#[tauri::command]
pub async fn generate_voice_message(
    app: AppHandle,
    text: String,
    voice_id: String,
    cache_key: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let cache_dir = crate::voice::cache_manager::get_cache_dir(&app);
    let path = crate::voice::elevenlabs::get_cache_path(&cache_dir, &cache_key);

    if path.exists() {
        return Ok(path.to_string_lossy().to_string());
    }

    // Try provided key first, then use rotation
    let audio_bytes = if let Some(ref key) = api_key {
        if !key.trim().is_empty() {
            match crate::voice::elevenlabs::generate_speech(key, &voice_id, &text, "motivational").await {
                Ok(bytes) => bytes,
                Err(_) => {
                    println!("⚠️ Provided key failed for voice message, trying rotation...");
                    let (bytes, _) = crate::voice::cache_manager::generate_speech_with_rotation(
                        &app, &voice_id, &text, "motivational",
                    ).await?;
                    bytes
                }
            }
        } else {
            let (bytes, _) = crate::voice::cache_manager::generate_speech_with_rotation(
                &app, &voice_id, &text, "motivational",
            ).await?;
            bytes
        }
    } else {
        let (bytes, _) = crate::voice::cache_manager::generate_speech_with_rotation(
            &app, &voice_id, &text, "motivational",
        ).await?;
        bytes
    };

    let saved = crate::voice::elevenlabs::save_to_cache(&cache_dir, &cache_key, &audio_bytes).await?;
    Ok(saved.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_voice_cache(app: AppHandle, cache_key: String) -> bool {
    let cache_dir = crate::voice::cache_manager::get_cache_dir(&app);
    let path = crate::voice::elevenlabs::get_cache_path(&cache_dir, &cache_key);
    path.exists()
}

#[tauri::command]
pub async fn clear_old_voice_cache(app: AppHandle) -> Result<u32, String> {
    let cache_dir = crate::voice::cache_manager::get_cache_dir(&app);
    crate::voice::cache_manager::cleanup_old_cache(&cache_dir).await;
    Ok(1)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AIResponse {
    pub message: String,
    pub model_used: String,
    pub tokens_used: u32,
}

/// Optional fallback key pools — empty by default.
/// Users provide their own keys in Settings (persisted to local DB).
/// Never commit real keys here. See .env.example for local development.
const FALLBACK_GROQ_KEYS: &[&str] = &[];

/// Optional fallback key pools — empty by default.
const FALLBACK_OPENROUTER_KEYS: &[&str] = &[];

fn get_setting_val(conn: &Connection, key: &str) -> Option<String> {
    // Try DB first
    let db_val = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .ok()
        .and_then(|mut stmt| stmt.query_row(params![key], |row| row.get::<_, String>(0)).ok());

    // If DB has a non-empty value, use it
    if let Some(ref v) = db_val {
        if !v.trim().is_empty() {
            return db_val;
        }
    }

    // Optional bundled fallback (empty by default — user configures keys in Settings)
    let fallback: Option<String> = match key {
        "groqApiKey" => FALLBACK_GROQ_KEYS.first().map(|s| s.to_string()),
        "openRouterApiKey" => FALLBACK_OPENROUTER_KEYS.first().map(|s| s.to_string()),
        _ => None,
    };

    // Seed fallback into DB for next time
    if let Some(ref fb) = fallback {
        let now = chrono::Local::now().to_rfc3339();
        let _ = conn.execute(
            "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, fb, now],
        );
    }

    fallback
}


fn parse_briefing_json(raw: &str, now_iso: &str) -> MorningBriefing {
    // Clean potential markdown blocks
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    if let Ok(v) = serde_json::from_str::<serde_json::Value>(cleaned) {
        MorningBriefing {
            greeting: v.get("greeting").and_then(|s| s.as_str()).unwrap_or("Good morning, champion!").to_string(),
            streak_message: v.get("streak_message").and_then(|s| s.as_str()).unwrap_or("Keep your discipline strong today.").to_string(),
            goals_message: v.get("goals_message").and_then(|s| s.as_str()).unwrap_or("Focus on your top goal early.").to_string(),
            ai_tip: v.get("ai_tip").and_then(|s| s.as_str()).unwrap_or("Block your first 60 minutes for high-leverage work.").to_string(),
            motivational_close: v.get("motivational_close").and_then(|s| s.as_str()).unwrap_or("Make today count!").to_string(),
            generated_at: now_iso.to_string(),
        }
    } else {
        MorningBriefing {
            greeting: "Good morning, champion!".to_string(),
            streak_message: "Consistency is your greatest advantage.".to_string(),
            goals_message: "Focus on execution right from the start.".to_string(),
            ai_tip: "Start with a 5-minute plan before touching emails or social feeds.".to_string(),
            motivational_close: "Rise and build something great today.".to_string(),
            generated_at: now_iso.to_string(),
        }
    }
}
