//! Manages the voice pre-cache system.
//! Runs at 23:45 PM nightly to pre-generate
//! voice messages for next morning's alarms.

use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

use crate::voice::{elevenlabs, script_generator};

#[derive(Debug, Clone)]
pub struct AiAlarmRecord {
    pub id: String,
    pub label: String,
    pub hour: i64,
    pub minute: i64,
    pub ai_personality: String,
    pub ai_voice_id: Option<String>,
}

#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct CacheResult {
    pub success: usize,
    pub skipped: usize,
    pub failed: usize,
    pub message: String,
    pub error: Option<String>,
}

/// Helper to get SQLite connection from app handle
pub fn get_sqlite_conn(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("hyperalarm.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    Ok(conn)
}

/// Get the voice cache directory path: AppData/voice-cache/
pub fn get_cache_dir(app: &AppHandle) -> PathBuf {
    let app_data = app
        .path()
        .app_data_dir()
        .expect("Failed to get AppData dir");
    app_data.join("voice-cache")
}

/// Pre-generate and cache voice messages for all AI-enabled alarms.
pub async fn pre_cache_all_alarms(app: AppHandle) -> CacheResult {
    let cache_dir = get_cache_dir(&app);
    let mut result = CacheResult::default();

    // 1. Get API key from settings DB
    let _api_key = match get_api_key(&app).await {
        Ok(key) if !key.trim().is_empty() => key,
        _ => {
            result.error = Some("ElevenLabs API key not configured".to_string());
            result.message = "ElevenLabs API key not configured".to_string();
            return result;
        }
    };

    // 2. Load all AI-enabled alarms from DB
    let alarms = match load_ai_enabled_alarms(&app).await {
        Ok(a) => a,
        Err(e) => {
            result.error = Some(e);
            return result;
        }
    };

    if alarms.is_empty() {
        result.skipped = 0;
        result.message = "No AI-enabled alarms found".to_string();
        return result;
    }

    // 3. Get streak info for context
    let streak = get_current_streak(&app).await.unwrap_or(0);

    // 4. Get today's goals for context
    let goals = get_today_goals(&app).await.unwrap_or_default();

    // 5. Cache each alarm using key rotation
    for alarm in &alarms {
        // Skip if cache is still fresh
        if elevenlabs::is_cache_fresh(&cache_dir, &alarm.id).await {
            result.skipped += 1;
            println!("🎤 Cache fresh for alarm: {}", alarm.label);
            continue;
        }

        let ctx = script_generator::VoiceScriptContext {
            alarm_label: alarm.label.clone(),
            hour: alarm.hour,
            minute: alarm.minute,
            current_streak: streak,
            today_goals: goals.clone(),
            personality: script_generator::VoicePersonality::from_str(&alarm.ai_personality),
            is_weekend: is_weekend_tomorrow(),
            user_name: None,
        };

        let script = script_generator::generate_wake_script(&ctx);
        println!("🎤 Generating voice for: {}", alarm.label);

        let voice_id = alarm
            .ai_voice_id
            .clone()
            .unwrap_or_else(default_voice_id);

        match generate_speech_with_rotation(
            &app,
            &voice_id,
            &script,
            &alarm.ai_personality,
        )
        .await
        {
            Ok((audio_bytes, _key_used)) => {
                match elevenlabs::save_to_cache(&cache_dir, &alarm.id, &audio_bytes).await {
                    Ok(path) => {
                        result.success += 1;
                        println!("✅ Cached voice: {:?}", path);
                    }
                    Err(e) => {
                        result.failed += 1;
                        println!("❌ Cache save failed: {}", e);
                    }
                }
            }
            Err(e) => {
                result.failed += 1;
                println!("❌ ElevenLabs error for {}: {}", alarm.label, e);
                // If all keys exhausted, stop trying
                if e.contains("exhausted") {
                    result.error = Some(e);
                    break;
                }
            }
        }

        // Small delay between API calls to avoid rate limiting
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
    }

    result.message = format!(
        "Cache complete: {} success, {} skipped, {} failed",
        result.success, result.skipped, result.failed
    );
    println!("🎤 {}", result.message);
    result
}

pub fn default_voice_id() -> String {
    // ElevenLabs "Rachel" voice — calm, clear English
    "21m00Tcm4TlvDq8ikWAM".to_string()
}

fn is_weekend_tomorrow() -> bool {
    use chrono::{Datelike, Local};
    let tomorrow = Local::now() + chrono::Duration::days(1);
    matches!(
        tomorrow.weekday(),
        chrono::Weekday::Sat | chrono::Weekday::Sun
    )
}

/// Optional ElevenLabs key pool — empty by default.
/// Users configure their own key in Settings (persisted to local DB).
/// Never commit real keys here.
const FALLBACK_ELEVENLABS_KEYS: &[&str] = &[];

pub async fn get_api_key(app: &AppHandle) -> Result<String, String> {
    let conn = get_sqlite_conn(app)?;

    // Ensure settings table exists
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);"
    );

    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = 'elevenLabsApiKey'")
        .map_err(|e| e.to_string())?;

    let val = stmt
        .query_row([], |row| row.get::<_, String>(0))
        .unwrap_or_default();

    if !val.trim().is_empty() {
        return Ok(val);
    }

    // No key in DB yet — use bundled fallback if available, otherwise ask user to configure
    let fallback = FALLBACK_ELEVENLABS_KEYS.first().copied().ok_or_else(|| {
        "ElevenLabs API key not configured. Please add your key in Settings.".to_string()
    })?;
    let now = chrono::Local::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('elevenLabsApiKey', ?1, ?2)",
        rusqlite::params![fallback, now],
    );
    println!("🔑 Seeded fallback ElevenLabs API key into settings");
    Ok(fallback.to_string())
}

/// Rotate to the next ElevenLabs key in the pool and save it to the DB.
/// Returns the new key.
pub async fn rotate_api_key(app: &AppHandle) -> Result<String, String> {
    let conn = get_sqlite_conn(app)?;

    let current_key = conn
        .prepare("SELECT value FROM settings WHERE key = 'elevenLabsApiKey'")
        .ok()
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, String>(0)).ok())
        .unwrap_or_default();

    // Find the current key's index in the pool
    let current_idx = FALLBACK_ELEVENLABS_KEYS
        .iter()
        .position(|k| *k == current_key.as_str())
        .unwrap_or(0);

    if FALLBACK_ELEVENLABS_KEYS.is_empty() {
        return Err("No ElevenLabs fallback keys configured. Please add your key in Settings.".to_string());
    }

    let next_idx = (current_idx + 1) % FALLBACK_ELEVENLABS_KEYS.len();
    let next_key = FALLBACK_ELEVENLABS_KEYS[next_idx];

    let now = chrono::Local::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('elevenLabsApiKey', ?1, ?2)",
        rusqlite::params![next_key, now],
    );

    println!("🔑 Rotated ElevenLabs API key → index {}", next_idx);
    Ok(next_key.to_string())
}

/// Try to generate speech, rotating through all available keys on failure.
/// Returns Ok((audio_bytes, key_used)) on success.
pub async fn generate_speech_with_rotation(
    app: &AppHandle,
    voice_id: &str,
    text: &str,
    personality: &str,
) -> Result<(Vec<u8>, String), String> {
    let mut current_key = get_api_key(app).await?;
    let max_attempts = FALLBACK_ELEVENLABS_KEYS.len().max(1);

    for attempt in 0..max_attempts {
        match elevenlabs::generate_speech(&current_key, voice_id, text, personality).await {
            Ok(bytes) => {
                return Ok((bytes, current_key));
            }
            Err(elevenlabs::ElevenLabsError::InvalidApiKey)
            | Err(elevenlabs::ElevenLabsError::QuotaExceeded)
            | Err(elevenlabs::ElevenLabsError::RateLimited) => {
                println!(
                    "⚠️ ElevenLabs key failed (attempt {}/{}), rotating...",
                    attempt + 1,
                    max_attempts
                );
                current_key = rotate_api_key(app).await?;
            }
            Err(e) => {
                return Err(format!("ElevenLabs error: {}", e));
            }
        }
    }

    Err("All ElevenLabs API keys exhausted. Please add a fresh key in Settings.".to_string())
}


pub async fn load_ai_enabled_alarms(app: &AppHandle) -> Result<Vec<AiAlarmRecord>, String> {
    let conn = get_sqlite_conn(app)?;

    // Make sure ai_voice_id column exists
    let _ = conn.execute(
        "ALTER TABLE alarms ADD COLUMN ai_voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM'",
        [],
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, label, hour, minute, ai_personality, ai_voice_id
             FROM alarms
             WHERE ai_voice_enabled = 1 AND is_active = 1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AiAlarmRecord {
                id: row.get(0)?,
                label: row.get(1)?,
                hour: row.get(2)?,
                minute: row.get(3)?,
                ai_personality: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "motivational".to_string()),
                ai_voice_id: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut alarms = Vec::new();
    for r in rows.flatten() {
        alarms.push(r);
    }
    Ok(alarms)
}

pub async fn get_current_streak(app: &AppHandle) -> Result<i64, String> {
    let conn = get_sqlite_conn(app)?;
    // Count consecutive days where woke_on_time = 1 ending at yesterday or today
    let mut stmt = conn
        .prepare(
            "SELECT date, woke_on_time
             FROM habit_streaks
             ORDER BY date DESC
             LIMIT 60",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? != 0))
        })
        .map_err(|e| e.to_string())?;

    let mut streak: i64 = 0;
    for r in rows.flatten() {
        if r.1 {
            streak += 1;
        } else {
            break;
        }
    }
    Ok(streak)
}

pub async fn get_today_goals(app: &AppHandle) -> Result<Vec<String>, String> {
    let conn = get_sqlite_conn(app)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT goal_text
             FROM daily_goals
             WHERE date = ?1 AND is_completed = 0
             ORDER BY sort_order ASC
             LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![today], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut goals = Vec::new();
    for r in rows.flatten() {
        goals.push(r);
    }
    Ok(goals)
}

/// Clean up old cache files (older than 3 days)
pub async fn cleanup_old_cache(cache_dir: &Path) {
    let mut dir = match tokio::fs::read_dir(cache_dir).await {
        Ok(d) => d,
        Err(_) => return,
    };

    while let Ok(Some(entry)) = dir.next_entry().await {
        if let Ok(meta) = entry.metadata().await {
            if let Ok(modified) = meta.modified() {
                let age = std::time::SystemTime::now()
                    .duration_since(modified)
                    .unwrap_or_default();
                // Delete if older than 3 days
                if age.as_secs() > 3 * 24 * 3600 {
                    let _ = tokio::fs::remove_file(entry.path()).await;
                }
            }
        }
    }
}
