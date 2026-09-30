use rusqlite::params;
use tauri::AppHandle;
use crate::models::Alarm;
use crate::voice::cache_manager::get_sqlite_conn;

#[tauri::command]
pub async fn get_alarms(app: AppHandle) -> Result<Vec<Alarm>, String> {
    let conn = get_sqlite_conn(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, label, hour, minute, is_active, repeat_pattern, days,
                    audio_path, audio_file_name, audio_start_ms, audio_end_ms,
                    volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
                    math_challenge, ai_voice_enabled, ai_personality,
                    created_at, updated_at, last_fired_at
             FROM alarms
             ORDER BY hour ASC, minute ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let days_raw: String = row.get(6).unwrap_or_else(|_| "[]".to_string());
            let days: Vec<String> = serde_json::from_str(&days_raw).unwrap_or_default();

            Ok(Alarm {
                id: row.get(0)?,
                label: row.get(1)?,
                hour: row.get(2)?,
                minute: row.get(3)?,
                is_active: row.get::<_, i64>(4)? != 0,
                repeat_pattern: row.get(5)?,
                days,
                audio_path: row.get(7)?,
                audio_file_name: row.get(8)?,
                audio_start_ms: row.get(9)?,
                audio_end_ms: row.get(10)?,
                volume_boost: row.get(11)?,
                fade_in_seconds: row.get(12)?,
                snooze_duration: row.get(13)?,
                snooze_limit: row.get(14)?,
                math_challenge: Some(row.get::<_, i64>(15).unwrap_or(0) != 0),
                ai_voice_enabled: Some(row.get::<_, i64>(16).unwrap_or(0) != 0),
                ai_personality: row.get(17)?,
                ai_voice_id: None,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
                last_fired_at: row.get(20)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut alarms = Vec::new();
    for r in rows.flatten() {
        alarms.push(r);
    }
    Ok(alarms)
}

#[tauri::command]
pub async fn save_alarm(app: AppHandle, alarm: Alarm) -> Result<Alarm, String> {
    let conn = get_sqlite_conn(&app)?;
    let days_json = serde_json::to_string(&alarm.days).unwrap_or_else(|_| "[]".to_string());
    let now_iso = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO alarms (
            id, label, hour, minute, is_active, repeat_pattern, days,
            audio_path, audio_file_name, audio_start_ms, audio_end_ms,
            volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
            math_challenge, ai_voice_enabled, ai_personality,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7,
            ?8, ?9, ?10, ?11,
            ?12, ?13, ?14, ?15,
            ?16, ?17, ?18,
            ?19, ?20
        )
        ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            hour = excluded.hour,
            minute = excluded.minute,
            is_active = excluded.is_active,
            repeat_pattern = excluded.repeat_pattern,
            days = excluded.days,
            audio_path = excluded.audio_path,
            audio_file_name = excluded.audio_file_name,
            audio_start_ms = excluded.audio_start_ms,
            audio_end_ms = excluded.audio_end_ms,
            volume_boost = excluded.volume_boost,
            fade_in_seconds = excluded.fade_in_seconds,
            snooze_duration = excluded.snooze_duration,
            snooze_limit = excluded.snooze_limit,
            math_challenge = excluded.math_challenge,
            ai_voice_enabled = excluded.ai_voice_enabled,
            ai_personality = excluded.ai_personality,
            updated_at = excluded.updated_at",
        params![
            alarm.id,
            alarm.label,
            alarm.hour,
            alarm.minute,
            if alarm.is_active { 1 } else { 0 },
            alarm.repeat_pattern,
            days_json,
            alarm.audio_path,
            alarm.audio_file_name,
            alarm.audio_start_ms.unwrap_or(0),
            alarm.audio_end_ms.unwrap_or(0),
            alarm.volume_boost.unwrap_or(150),
            alarm.fade_in_seconds.unwrap_or(0),
            alarm.snooze_duration.unwrap_or(10),
            alarm.snooze_limit.unwrap_or(3),
            if alarm.math_challenge.unwrap_or(false) { 1 } else { 0 },
            if alarm.ai_voice_enabled.unwrap_or(false) { 1 } else { 0 },
            alarm.ai_personality.as_deref().unwrap_or("motivational"),
            alarm.created_at.clone().unwrap_or_else(|| now_iso.clone()),
            now_iso,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(alarm)
}

#[tauri::command]
pub async fn toggle_alarm(app: AppHandle, id: String, enabled: bool) -> Result<bool, String> {
    let conn = get_sqlite_conn(&app)?;
    let now_iso = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE alarms SET is_active = ?1, updated_at = ?2 WHERE id = ?3",
        params![if enabled { 1 } else { 0 }, now_iso, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(enabled)
}

#[tauri::command]
pub async fn delete_alarm(app: AppHandle, id: String) -> Result<bool, String> {
    let conn = get_sqlite_conn(&app)?;
    conn.execute("DELETE FROM alarms WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
