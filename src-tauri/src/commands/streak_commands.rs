use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HabitStreak {
    pub id: String,
    pub date: String,          // "YYYY-MM-DD"
    pub woke_on_time: bool,
    pub alarms_fired: i64,
    pub alarms_snoozed: i64,
    pub goals_completed: i64,
    pub goals_total: i64,
    pub morning_score: f64,    // 0.0–100.0 calculated score
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreakSummary {
    pub current_streak: i64,      // consecutive days woke on time
    pub longest_streak: i64,      // all-time best streak
    pub total_days_tracked: i64,
    pub total_on_time: i64,
    pub success_rate: f64,        // percentage
    pub this_week_score: f64,     // avg score this week
    pub this_month_score: f64,    // avg score this month
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalDto {
    pub text: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub date: String,
    pub text: String,
    pub is_completed: bool,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub title: String,
    pub completed: bool,
}

fn get_db(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("hyperalarm.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS habit_streaks (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL UNIQUE,
            woke_on_time INTEGER NOT NULL DEFAULT 0,
            alarms_fired INTEGER NOT NULL DEFAULT 0,
            alarms_snoozed INTEGER NOT NULL DEFAULT 0,
            goals_completed INTEGER NOT NULL DEFAULT 0,
            goals_total INTEGER NOT NULL DEFAULT 0,
            morning_score REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS daily_goals (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            goal_text TEXT NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_habit_streaks_date ON habit_streaks(date);
        CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
        ",
    )
    .map_err(|e| e.to_string())?;

    // Attempt migration in case morning_score was missing
    let _ = conn.execute(
        "ALTER TABLE habit_streaks ADD COLUMN morning_score REAL NOT NULL DEFAULT 0.0",
        [],
    );

    Ok(conn)
}

/// Get habit data for a date range (for heatmap)
#[tauri::command]
pub async fn get_streak_history(
    app: AppHandle,
    start_date: String,
    end_date: String,
) -> Result<Vec<HabitStreak>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at
             FROM habit_streaks
             WHERE date >= ?1 AND date <= ?2
             ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(HabitStreak {
                id: row.get(0)?,
                date: row.get(1)?,
                woke_on_time: row.get::<_, i64>(2)? != 0,
                alarms_fired: row.get(3)?,
                alarms_snoozed: row.get(4)?,
                goals_completed: row.get(5)?,
                goals_total: row.get(6)?,
                morning_score: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

/// Get streak summary statistics
#[tauri::command]
pub async fn get_streak_summary(app: AppHandle) -> Result<StreakSummary, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at
             FROM habit_streaks
             ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(HabitStreak {
                id: row.get(0)?,
                date: row.get(1)?,
                woke_on_time: row.get::<_, i64>(2)? != 0,
                alarms_fired: row.get(3)?,
                alarms_snoozed: row.get(4)?,
                goals_completed: row.get(5)?,
                goals_total: row.get(6)?,
                morning_score: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut all_streaks = Vec::new();
    let mut date_map = HashMap::new();
    for r in rows {
        let s = r.map_err(|e| e.to_string())?;
        date_map.insert(s.date.clone(), s.clone());
        all_streaks.push(s);
    }

    let total_days_tracked = all_streaks.len() as i64;
    let total_on_time = all_streaks.iter().filter(|s| s.woke_on_time).count() as i64;
    let success_rate = if total_days_tracked > 0 {
        ((total_on_time as f64) / (total_days_tracked as f64)) * 100.0
    } else {
        0.0
    };

    // Calculate longest streak (consecutive calendar days woke_on_time)
    let mut longest_streak: i64 = 0;
    let mut current_consecutive: i64 = 0;
    let mut prev_date: Option<chrono::NaiveDate> = None;

    for streak in &all_streaks {
        if let Ok(curr_date) = chrono::NaiveDate::parse_from_str(&streak.date, "%Y-%m-%d") {
            if streak.woke_on_time {
                if let Some(prev) = prev_date {
                    if curr_date == prev + chrono::Duration::days(1) {
                        current_consecutive += 1;
                    } else {
                        current_consecutive = 1;
                    }
                } else {
                    current_consecutive = 1;
                }
                if current_consecutive > longest_streak {
                    longest_streak = current_consecutive;
                }
            } else {
                current_consecutive = 0;
            }
            prev_date = Some(curr_date);
        }
    }

    // Calculate current streak counting backwards from today or yesterday
    let today = chrono::Local::now().date_naive();
    let today_str = today.format("%Y-%m-%d").to_string();
    let yesterday = today - chrono::Duration::days(1);
    let yesterday_str = yesterday.format("%Y-%m-%d").to_string();

    let mut current_streak: i64 = 0;
    let check_date = if let Some(today_entry) = date_map.get(&today_str) {
        if today_entry.woke_on_time {
            Some(today)
        } else {
            None // Woke late today, streak is broken
        }
    } else if let Some(yesterday_entry) = date_map.get(&yesterday_str) {
        if yesterday_entry.woke_on_time {
            Some(yesterday)
        } else {
            None
        }
    } else {
        None
    };

    if let Some(start_d) = check_date {
        let mut d = start_d;
        loop {
            let d_str = d.format("%Y-%m-%d").to_string();
            if let Some(entry) = date_map.get(&d_str) {
                if entry.woke_on_time {
                    current_streak += 1;
                    d = d - chrono::Duration::days(1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    // Calculate this_week_score (last 7 days average) and this_month_score (last 30 days average)
    let week_ago = today - chrono::Duration::days(7);
    let month_ago = today - chrono::Duration::days(30);

    let mut week_scores = Vec::new();
    let mut month_scores = Vec::new();

    for streak in &all_streaks {
        if let Ok(d) = chrono::NaiveDate::parse_from_str(&streak.date, "%Y-%m-%d") {
            if d >= week_ago && d <= today {
                week_scores.push(streak.morning_score);
            }
            if d >= month_ago && d <= today {
                month_scores.push(streak.morning_score);
            }
        }
    }

    let this_week_score = if !week_scores.is_empty() {
        week_scores.iter().sum::<f64>() / (week_scores.len() as f64)
    } else {
        0.0
    };

    let this_month_score = if !month_scores.is_empty() {
        month_scores.iter().sum::<f64>() / (month_scores.len() as f64)
    } else {
        0.0
    };

    Ok(StreakSummary {
        current_streak,
        longest_streak,
        total_days_tracked,
        total_on_time,
        success_rate,
        this_week_score,
        this_month_score,
    })
}

/// Record or update today's habit streak entry
/// Called automatically when alarm is dismissed or manual/demo
#[tauri::command]
pub async fn record_habit_day(
    app: AppHandle,
    date: String,
    woke_on_time: bool,
    alarms_fired: i64,
    alarms_snoozed: i64,
    goals_completed: i64,
    goals_total: i64,
) -> Result<HabitStreak, String> {
    let conn = get_db(&app)?;

    // Calculate morning score:
    // Base: woke_on_time ? 50 : 10 (no snooze: 50, with snooze: 30, late: 10)
    let mut score: f64 = if woke_on_time && alarms_snoozed == 0 {
        50.0
    } else if woke_on_time {
        30.0
    } else {
        10.0
    };

    // Goals bonus (up to +30 points)
    if goals_total > 0 {
        let goal_rate = (goals_completed as f64) / (goals_total as f64);
        score += (goal_rate * 30.0).round();
        if goals_completed == goals_total {
            score += 20.0;
        }
    }

    // Snooze penalty: -5 per snooze
    score -= (alarms_snoozed as f64) * 5.0;
    let morning_score = score.clamp(0.0, 100.0);

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO habit_streaks (id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(date) DO UPDATE SET
            woke_on_time = excluded.woke_on_time,
            alarms_fired = excluded.alarms_fired,
            alarms_snoozed = excluded.alarms_snoozed,
            goals_completed = excluded.goals_completed,
            goals_total = excluded.goals_total,
            morning_score = excluded.morning_score",
        params![
            id,
            date,
            if woke_on_time { 1 } else { 0 },
            alarms_fired,
            alarms_snoozed,
            goals_completed,
            goals_total,
            morning_score,
            created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(HabitStreak {
        id,
        date,
        woke_on_time,
        alarms_fired,
        alarms_snoozed,
        goals_completed,
        goals_total,
        morning_score,
        created_at,
    })
}

/// Get today's streak entry (or None if not yet recorded)
#[tauri::command]
pub async fn get_today_streak(app: AppHandle) -> Result<Option<HabitStreak>, String> {
    let conn = get_db(&app)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let result = conn.query_row(
        "SELECT id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at
         FROM habit_streaks
         WHERE date = ?1",
        params![today],
        |row| {
            Ok(HabitStreak {
                id: row.get(0)?,
                date: row.get(1)?,
                woke_on_time: row.get::<_, i64>(2)? != 0,
                alarms_fired: row.get(3)?,
                alarms_snoozed: row.get(4)?,
                goals_completed: row.get(5)?,
                goals_total: row.get(6)?,
                morning_score: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    );

    match result {
        Ok(streak) => Ok(Some(streak)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// ─────────────────────────────────────────────────────────────
// DAILY GOALS COMMANDS
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_goals_for_date(app: AppHandle, date: String) -> Result<Vec<Goal>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, date, goal_text, is_completed, completed_at, created_at
             FROM daily_goals
             WHERE date = ?1
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![date], |row| {
            let text: String = row.get(2)?;
            let is_completed: i64 = row.get(3)?;
            let bool_completed = is_completed != 0;
            Ok(Goal {
                id: row.get(0)?,
                date: row.get(1)?,
                text: text.clone(),
                title: text,
                is_completed: bool_completed,
                completed: bool_completed,
                completed_at: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub async fn create_goal(app: AppHandle, dto: GoalDto) -> Result<Goal, String> {
    let conn = get_db(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM daily_goals WHERE date = ?1",
            params![dto.date],
            |r| r.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO daily_goals (id, date, goal_text, is_completed, completed_at, sort_order, created_at)
         VALUES (?1, ?2, ?3, 0, NULL, ?4, ?5)",
        params![id, dto.date, dto.text, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id,
        date: dto.date,
        text: dto.text.clone(),
        title: dto.text,
        is_completed: false,
        completed: false,
        completed_at: None,
        created_at: now,
    })
}

#[tauri::command]
pub async fn complete_goal(app: AppHandle, id: String, completed: bool) -> Result<(), String> {
    let conn = get_db(&app)?;
    let completed_at = if completed {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    conn.execute(
        "UPDATE daily_goals SET is_completed = ?1, completed_at = ?2 WHERE id = ?3",
        params![if completed { 1 } else { 0 }, completed_at, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_goal(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM daily_goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
