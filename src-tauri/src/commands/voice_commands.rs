use tauri::AppHandle;
use crate::voice::{cache_manager, elevenlabs};
use crate::voice::cache_manager::CacheResult;

/// Validate an ElevenLabs API key.
/// Returns Ok(subscription_info) or Err(message).
#[tauri::command]
pub async fn validate_elevenlabs_key(
    api_key: String,
) -> Result<elevenlabs::SubscriptionInfo, String> {
    elevenlabs::get_subscription_info(&api_key)
        .await
        .map_err(|e| e.to_string())
}

/// Get list of available voices for user's account.
#[tauri::command]
pub async fn get_elevenlabs_voices(
    api_key: String,
) -> Result<Vec<elevenlabs::ElevenLabsVoice>, String> {
    elevenlabs::get_available_voices(&api_key)
        .await
        .map_err(|e| e.to_string())
}

/// Pre-cache voice messages for all AI-enabled alarms.
#[tauri::command]
pub async fn pre_cache_voice_messages(
    app: AppHandle,
) -> Result<CacheResult, String> {
    Ok(cache_manager::pre_cache_all_alarms(app).await)
}

/// Generate a single voice preview for Settings page.
/// Uses key rotation: tries the provided key first, falls back to pool on failure.
#[tauri::command]
pub async fn generate_voice_preview(
    app: AppHandle,
    api_key: String,
    voice_id: String,
    personality: String,
    alarm_label: String,
) -> Result<String, String> {
    let ctx = crate::voice::script_generator::VoiceScriptContext {
        alarm_label: alarm_label.clone(),
        hour: 7,
        minute: 0,
        current_streak: 5,
        today_goals: vec!["Crush your top priority goal".to_string()],
        personality: crate::voice::script_generator::VoicePersonality::from_str(&personality),
        is_weekend: false,
        user_name: None,
    };

    let script = crate::voice::script_generator::generate_wake_script(&ctx);

    let preview_script: String = script.chars().take(220).collect();

    // Try the provided key first
    let result = elevenlabs::generate_speech(
        &api_key,
        &voice_id,
        &preview_script,
        &personality,
    )
    .await;

    let audio_bytes = match result {
        Ok(bytes) => bytes,
        Err(_) => {
            // Provided key failed — use rotation through the key pool
            println!("⚠️ Provided ElevenLabs key failed for preview, trying key rotation...");
            let (bytes, _) = cache_manager::generate_speech_with_rotation(
                &app,
                &voice_id,
                &preview_script,
                &personality,
            )
            .await?;
            bytes
        }
    };

    let cache_dir = cache_manager::get_cache_dir(&app);
    let temp_path = elevenlabs::save_to_cache(&cache_dir, "preview", &audio_bytes)
        .await
        .map_err(|e| e.to_string())?;

    Ok(temp_path.to_string_lossy().to_string())
}

/// Get path to cached voice file for an alarm.
/// Returns None if not cached yet.
#[tauri::command]
pub async fn get_voice_cache_path(
    app: AppHandle,
    alarm_id: String,
) -> Result<Option<String>, String> {
    let cache_dir = cache_manager::get_cache_dir(&app);
    let path = elevenlabs::get_cache_path(&cache_dir, &alarm_id);

    if path.exists() {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Generate and cache voice for a SPECIFIC alarm immediately.
/// Uses key rotation for resilient generation.
#[tauri::command]
pub async fn generate_and_cache_alarm_voice(
    app: AppHandle,
    alarm_id: String,
    alarm_label: String,
    hour: i64,
    minute: i64,
    personality: String,
    voice_id: String,
) -> Result<String, String> {
    let cache_dir = cache_manager::get_cache_dir(&app);
    let streak = cache_manager::get_current_streak(&app).await.unwrap_or(0);
    let goals = cache_manager::get_today_goals(&app).await.unwrap_or_default();

    let ctx = crate::voice::script_generator::VoiceScriptContext {
        alarm_label: alarm_label.clone(),
        hour,
        minute,
        current_streak: streak,
        today_goals: goals,
        personality: crate::voice::script_generator::VoicePersonality::from_str(&personality),
        is_weekend: false,
        user_name: None,
    };

    let script = crate::voice::script_generator::generate_wake_script(&ctx);

    // Use key rotation for resilient generation
    let (audio_bytes, _key_used) = cache_manager::generate_speech_with_rotation(
        &app,
        &voice_id,
        &script,
        &personality,
    )
    .await?;

    let path = elevenlabs::save_to_cache(&cache_dir, &alarm_id, &audio_bytes)
        .await
        .map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

/// Clean up old voice cache files
#[tauri::command]
pub async fn cleanup_voice_cache(
    app: AppHandle,
) -> Result<(), String> {
    let cache_dir = cache_manager::get_cache_dir(&app);
    cache_manager::cleanup_old_cache(&cache_dir).await;
    Ok(())
}
