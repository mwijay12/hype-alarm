import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import type {
  Alarm,
  AlarmFormData,
  DailyGoal,
  WakeLogEntry,
  WeeklyStats,
  HeatmapDay,
  AlarmHistoryRecord,
  AudioFile,
  AudioLibraryEntry,
  AppSettings,
  ChatMessage,
  MorningBriefing,
  ConversationRecord,
} from "../lib/types";

export interface SqlDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select<T = any>(sql: string, params?: unknown[]): Promise<T>;
}

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

class BrowserFallbackDatabase implements SqlDatabase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getStore<T = any>(key: string): T[] {
    try {
      const data = localStorage.getItem(`hyperalarm_db_${key}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setStore<T = any>(key: string, items: T[]): void {
    try {
      localStorage.setItem(`hyperalarm_db_${key}`, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<unknown> {
    const s = sql.trim().toUpperCase();
    if (s.startsWith("INSERT INTO ALARMS") || s.startsWith("INSERT OR REPLACE INTO ALARMS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarms = this.getStore<any>("alarms");
      if (params) {
        const [
          id, label, hour, minute, is_active, repeat_pattern, days,
          audio_path, audio_file_name, audio_start_ms, audio_end_ms,
          volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
          math_challenge, math_difficulty, ai_voice_enabled, ai_personality,
          created_at, updated_at
        ] = params;
        alarms.push({
          id, label, hour, minute, is_active, repeat_pattern, days,
          audio_path, audio_file_name, audio_start_ms, audio_end_ms,
          volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
          math_challenge, math_difficulty, ai_voice_enabled, ai_personality,
          created_at, updated_at
        });
        this.setStore("alarms", alarms);
      }
    } else if (s.startsWith("UPDATE ALARMS SET")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarms = this.getStore<any>("alarms");
      if (params && params.length >= 20) {
        const id = params[19];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = alarms.findIndex((a: any) => a.id === id);
        if (idx >= 0) {
          const [
            label, hour, minute, is_active, repeat_pattern, days,
            audio_path, audio_file_name, audio_start_ms, audio_end_ms,
            volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
            math_challenge, ai_voice_enabled, ai_personality,
            updated_at, last_fired_at
          ] = params;
          alarms[idx] = {
            ...alarms[idx],
            label, hour, minute, is_active, repeat_pattern, days,
            audio_path, audio_file_name, audio_start_ms, audio_end_ms,
            volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
            math_challenge, ai_voice_enabled, ai_personality,
            updated_at, last_fired_at
          };
          this.setStore("alarms", alarms);
        }
      } else if (params && params.length === 3) {
        const [is_active, updated_at, id] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = alarms.findIndex((a: any) => a.id === id);
        if (idx >= 0) {
          alarms[idx].is_active = is_active;
          alarms[idx].updated_at = updated_at;
          this.setStore("alarms", alarms);
        }
      }
    } else if (s.startsWith("DELETE FROM ALARMS")) {
      const id = params?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarms = this.getStore<any>("alarms").filter((a: any) => a.id !== id);
      this.setStore("alarms", alarms);
    } else if (s.startsWith("INSERT INTO AUDIO_LIBRARY")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audio = this.getStore<any>("audio_library");
      if (params) {
        const [id, file_path, file_name, file_size, duration_ms, format, added_at] = params;
        audio.push({ id, file_path, file_name, file_size, duration_ms, format, added_at });
        this.setStore("audio_library", audio);
      }
    } else if (s.startsWith("DELETE FROM AUDIO_LIBRARY")) {
      const id = params?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audio = this.getStore<any>("audio_library").filter((a: any) => a.id !== id);
      this.setStore("audio_library", audio);
    } else if (s.startsWith("INSERT INTO DAILY_GOALS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const goals = this.getStore<any>("daily_goals");
      if (params) {
        const [id, date, goal_text, is_completed, completed_at, sort_order, created_at] = params;
        goals.push({ id, date, goal_text, is_completed, completed_at, sort_order, created_at });
        this.setStore("daily_goals", goals);
      }
    } else if (s.startsWith("UPDATE DAILY_GOALS SET")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const goals = this.getStore<any>("daily_goals");
      if (params) {
        const [is_completed, completed_at, id] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = goals.find((x: any) => x.id === id);
        if (g) {
          g.is_completed = is_completed;
          g.completed_at = completed_at;
          this.setStore("daily_goals", goals);
        }
      }
    } else if (s.startsWith("DELETE FROM DAILY_GOALS")) {
      const id = params?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const goals = this.getStore<any>("daily_goals").filter((g: any) => g.id !== id);
      this.setStore("daily_goals", goals);
    } else if (s.startsWith("INSERT OR REPLACE INTO WAKE_LOG") || s.startsWith("INSERT INTO WAKE_LOG")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wake = this.getStore<any>("wake_log");
      if (params) {
        const [id, date, alarm_id, alarm_label, scheduled_time, actual_wake_time, snooze_count, dismissed_on_time] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingIdx = wake.findIndex((w: any) => w.date === date);
        const item = { id, date, alarm_id, alarm_label, scheduled_time, actual_wake_time, snooze_count, dismissed_on_time };
        if (existingIdx >= 0) wake[existingIdx] = item;
        else wake.push(item);
        this.setStore("wake_log", wake);
      }
    } else if (s.startsWith("INSERT INTO ALARM_HISTORY")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hist = this.getStore<any>("alarm_history");
      if (params) {
        const [id, alarm_id, alarm_label, scheduled_hour, scheduled_minute, fired_at, dismissed_at, snooze_count] = params;
        hist.push({ id, alarm_id, alarm_label, scheduled_hour, scheduled_minute, fired_at, dismissed_at, snooze_count, was_math_solved: 1, dismiss_method: "button" });
        this.setStore("alarm_history", hist);
      }
    } else if (s.startsWith("INSERT OR REPLACE INTO SETTINGS") || s.startsWith("INSERT INTO SETTINGS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = this.getStore<any>("settings");
      if (params) {
        const [key, value] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = settings.find((s: any) => s.key === key);
        if (existing) existing.value = value;
        else settings.push({ key, value });
        this.setStore("settings", settings);
      }
    } else if (s.startsWith("INSERT INTO AI_CONVERSATIONS") || s.startsWith("INSERT OR REPLACE INTO AI_CONVERSATIONS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convs = this.getStore<any>("ai_conversations");
      if (params) {
        const [id, date, alarm_id, messages, morning_score, created_at, updated_at] = params;
        convs.unshift({ id, date, alarm_id, messages, morning_score, created_at, updated_at });
        this.setStore("ai_conversations", convs);
      }
    } else if (s.startsWith("INSERT OR REPLACE INTO MORNING_BRIEFINGS") || s.startsWith("INSERT INTO MORNING_BRIEFINGS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const briefings = this.getStore<any>("morning_briefings");
      if (params) {
        const [id, date, greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = briefings.findIndex((b: any) => b.date === date);
        const item = { id, date, greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at };
        if (idx >= 0) briefings[idx] = item;
        else briefings.unshift(item);
        this.setStore("morning_briefings", briefings);
      }
    } else if (s.startsWith("INSERT OR REPLACE INTO HABIT_STREAKS") || s.startsWith("INSERT INTO HABIT_STREAKS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streaks = this.getStore<any>("habit_streaks");
      if (params) {
        const [id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at] = params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = streaks.findIndex((st: any) => st.date === date);
        const item = { id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at };
        if (idx >= 0) streaks[idx] = item;
        else streaks.push(item);
        this.setStore("habit_streaks", streaks);
      }
    }
    return [0, 0];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async select<T = any>(sql: string, params?: unknown[]): Promise<T> {
    const s = sql.trim().toUpperCase();
    if (s.includes("FROM HABIT_STREAKS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streaks = this.getStore<any>("habit_streaks");
      if (s.includes("COUNT(*)")) {
        return [{ count: streaks.length }] as unknown as T;
      }
      return streaks as unknown as T;
    }
    if (s.includes("FROM AI_CONVERSATIONS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convs = this.getStore<any>("ai_conversations");
      return convs as unknown as T;
    }
    if (s.includes("FROM MORNING_BRIEFINGS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const briefings = this.getStore<any>("morning_briefings");
      if (s.includes("WHERE DATE =")) {
        const date = params?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const found = briefings.find((b: any) => b.date === date);
        return (found ? [found] : []) as unknown as T;
      }
      return briefings as unknown as T;
    }
    if (s.includes("FROM ALARMS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarms = this.getStore<any>("alarms");
      if (s.includes("COUNT(*)")) {
        return [{ count: alarms.length }] as unknown as T;
      }
      if (s.includes("WHERE ID =")) {
        const id = params?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return alarms.filter((a: any) => a.id === id) as unknown as T;
      }
      return alarms as unknown as T;
    }
    if (s.includes("FROM AUDIO_LIBRARY")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audio = this.getStore<any>("audio_library");
      if (s.includes("COUNT(*)")) {
        return [{ count: audio.length }] as unknown as T;
      }
      return audio as unknown as T;
    }
    if (s.includes("FROM DAILY_GOALS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const goals = this.getStore<any>("daily_goals");
      if (s.includes("COUNT(*)")) {
        return [{ count: goals.length }] as unknown as T;
      }
      if (s.includes("MAX(SORT_ORDER)")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const max = goals.length > 0 ? Math.max(...goals.map((g: any) => g.sort_order || 0)) : 0;
        return [{ max_order: max }] as unknown as T;
      }
      return goals as unknown as T;
    }
    if (s.includes("FROM WAKE_LOG")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wake = this.getStore<any>("wake_log");
      if (s.includes("COUNT(*)")) {
        return [{ count: wake.length }] as unknown as T;
      }
      return wake as unknown as T;
    }
    if (s.includes("FROM ALARM_HISTORY")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hist = this.getStore<any>("alarm_history");
      return hist as unknown as T;
    }
    if (s.includes("FROM SETTINGS")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = this.getStore<any>("settings");
      if (s.includes("WHERE KEY =")) {
        const key = params?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = settings.find((st: any) => st.key === key);
        return (val ? [val] : []) as unknown as T;
      }
      return settings as unknown as T;
    }
    return [] as unknown as T;
  }
}

const DB_PATH = "sqlite:hyperalarm.db";
let dbInstance: SqlDatabase | null = null;

// Helper to get or initialize database connection (Tauri SQLite or browser fallback)
export async function getDatabase(): Promise<SqlDatabase> {
  if (!dbInstance) {
    if (isTauri()) {
      try {
        console.log("[Database] Connecting to Tauri SQLite:", DB_PATH);
        dbInstance = await Database.load(DB_PATH);
        console.log("[Database] Tauri SQLite connection established successfully");
      } catch (err) {
        console.error("[Database] Failed to load Tauri SQLite database:", err);
        console.warn("[Database] Falling back to browser persistence adapter");
        dbInstance = new BrowserFallbackDatabase();
      }
    } else {
      console.log("[Database] Running outside native Tauri webview — using browser persistence adapter");
      dbInstance = new BrowserFallbackDatabase();
    }
  }
  return dbInstance;
}

// ─────────────────────────────────────────────────────────────
// INITIAL SCHEMA & MIGRATIONS
// ─────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  // This function must NEVER throw — always boot the app.
  try {
  let db: SqlDatabase;
  try {
    db = await getDatabase();
  } catch (err) {
    console.warn("[Database] Could not get database, using fallback:", err);
    dbInstance = new BrowserFallbackDatabase();
    db = dbInstance;
  }

  // Enable WAL mode & foreign keys
  try {
    await db.execute("PRAGMA journal_mode=WAL;");
    await db.execute("PRAGMA foreign_keys=ON;");
  } catch (e) {
    console.warn("Could not set PRAGMA:", e);
  }

  try {
    // 1. ALARMS TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alarms (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT 'Alarm',
        hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
        minute INTEGER NOT NULL CHECK(minute >= 0 AND minute <= 59),
        is_active INTEGER NOT NULL DEFAULT 1,
        repeat_pattern TEXT NOT NULL DEFAULT 'weekdays',
        days TEXT NOT NULL DEFAULT '[]',
        audio_path TEXT,
        audio_file_name TEXT,
        audio_start_ms INTEGER NOT NULL DEFAULT 0,
        audio_end_ms INTEGER NOT NULL DEFAULT 0,
        volume_boost INTEGER NOT NULL DEFAULT 150,
        fade_in_seconds INTEGER NOT NULL DEFAULT 0,
        snooze_duration INTEGER NOT NULL DEFAULT 10,
        snooze_limit INTEGER NOT NULL DEFAULT 3,
        math_challenge INTEGER NOT NULL DEFAULT 0,
        math_difficulty TEXT NOT NULL DEFAULT 'easy',
        ai_voice_enabled INTEGER NOT NULL DEFAULT 0,
        ai_personality TEXT NOT NULL DEFAULT 'motivational',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_fired_at TEXT
      );
    `);

    // 2. AUDIO LIBRARY TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audio_library (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        format TEXT NOT NULL DEFAULT 'mp3',
        added_at TEXT NOT NULL
      );
    `);

    // 3. ALARM AUDIO LINKS
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alarm_audio_links (
        alarm_id TEXT NOT NULL,
        audio_id TEXT NOT NULL,
        PRIMARY KEY (alarm_id, audio_id),
        FOREIGN KEY (alarm_id) REFERENCES alarms(id) ON DELETE CASCADE,
        FOREIGN KEY (audio_id) REFERENCES audio_library(id) ON DELETE CASCADE
      );
    `);

    // 4. ALARM HISTORY TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alarm_history (
        id TEXT PRIMARY KEY,
        alarm_id TEXT NOT NULL,
        alarm_label TEXT NOT NULL,
        scheduled_hour INTEGER NOT NULL,
        scheduled_minute INTEGER NOT NULL,
        fired_at TEXT NOT NULL,
        dismissed_at TEXT,
        snooze_count INTEGER NOT NULL DEFAULT 0,
        was_math_solved INTEGER NOT NULL DEFAULT 0,
        dismiss_method TEXT DEFAULT 'button'
      );
    `);

    // 5. DAILY GOALS TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS daily_goals (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        goal_text TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);

    // 6. WAKE LOG TABLE (for streak, heatmap & weekly stats)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wake_log (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        alarm_id TEXT,
        alarm_label TEXT,
        scheduled_time TEXT NOT NULL,
        actual_wake_time TEXT NOT NULL,
        snooze_count INTEGER DEFAULT 0,
        dismissed_on_time INTEGER DEFAULT 1
      );
    `);

    // 7. HABIT STREAKS TABLE (Phase 7 Productivity Hub)
    await db.execute(`
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
    `);

    try {
      await db.execute("ALTER TABLE habit_streaks ADD COLUMN morning_score REAL NOT NULL DEFAULT 0.0;");
    } catch {
      // Column already exists
    }

    // 7. SETTINGS TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Indexes for performance
    await db.execute("CREATE INDEX IF NOT EXISTS idx_alarms_active ON alarms(is_active);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_history_fired_at ON alarm_history(fired_at);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_goals_date ON daily_goals(date);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_wake_log_date ON wake_log(date);");

    // 9. AI CONVERSATIONS TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        alarm_id TEXT,
        messages TEXT NOT NULL,
        morning_score REAL NOT NULL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 10. MORNING BRIEFINGS TABLE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS morning_briefings (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        greeting TEXT NOT NULL,
        streak_message TEXT NOT NULL,
        goals_message TEXT NOT NULL,
        ai_tip TEXT NOT NULL,
        motivational_close TEXT NOT NULL,
        generated_at TEXT NOT NULL
      );
    `);

    try {
      await db.execute("ALTER TABLE alarms ADD COLUMN ai_voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM';");
    } catch {
      // Column already exists
    }

    await db.execute("CREATE INDEX IF NOT EXISTS idx_conversations_date ON ai_conversations(date);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_briefings_date ON morning_briefings(date);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_goals_date ON daily_goals(date);");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_wake_log_date ON wake_log(date);");

    // Seed default data if database is empty
    await seedInitialData(db);
  } catch (err) {
    console.error("[Database] Error creating tables or seeding in SQLite:", err);
    console.warn("[Database] Switching to BrowserFallbackDatabase to keep app running without errors");
    dbInstance = new BrowserFallbackDatabase();
    try {
      await seedInitialData(dbInstance);
    } catch {
      // ignore
    }
  }
  } catch (outerErr) {
    // Absolute safety net — ensures the app always boots no matter what
    console.error("[Database] Unexpected fatal error in initDatabase (non-fatal for app):", outerErr);
    dbInstance = new BrowserFallbackDatabase();
  }
}


// ─────────────────────────────────────────────────────────────
// SEEDING DEFAULT REALISTIC DATA
// ─────────────────────────────────────────────────────────────

async function seedInitialData(db: SqlDatabase): Promise<void> {
  const existingAlarms = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM alarms;"
  );
  if (existingAlarms[0]?.count === 0) {
    const seedAlarms = [
      {
        id: "alarm-seed-1",
        label: "Rise & Build",
        hour: 6,
        minute: 0,
        is_active: 1,
        repeat_pattern: "weekdays",
        days: JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri"]),
        audio_path: null,
        audio_file_name: null,
        audio_start_ms: 0,
        audio_end_ms: 0,
        volume_boost: 200,
        fade_in_seconds: 10,
        snooze_duration: 5,
        snooze_limit: 2,
        math_challenge: 1,
        math_difficulty: "easy",
        ai_voice_enabled: 0,
        ai_personality: "motivational",
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "alarm-seed-2",
        label: "Weekend Warrior",
        hour: 8,
        minute: 0,
        is_active: 1,
        repeat_pattern: "weekends",
        days: JSON.stringify(["Sat", "Sun"]),
        audio_path: null,
        audio_file_name: null,
        audio_start_ms: 0,
        audio_end_ms: 0,
        volume_boost: 150,
        fade_in_seconds: 5,
        snooze_duration: 15,
        snooze_limit: 3,
        math_challenge: 0,
        math_difficulty: "easy",
        ai_voice_enabled: 0,
        ai_personality: "coach",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "alarm-seed-3",
        label: "Afternoon Reset",
        hour: 13,
        minute: 30,
        is_active: 0,
        repeat_pattern: "daily",
        days: JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        audio_path: null,
        audio_file_name: null,
        audio_start_ms: 0,
        audio_end_ms: 0,
        volume_boost: 100,
        fade_in_seconds: 0,
        snooze_duration: 10,
        snooze_limit: 1,
        math_challenge: 0,
        math_difficulty: "easy",
        ai_voice_enabled: 0,
        ai_personality: "gentle",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const a of seedAlarms) {
      await db.execute(
        `INSERT INTO alarms (
          id, label, hour, minute, is_active, repeat_pattern, days,
          audio_path, audio_file_name, audio_start_ms, audio_end_ms,
          volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
          math_challenge, math_difficulty, ai_voice_enabled, ai_personality,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          a.id,
          a.label,
          a.hour,
          a.minute,
          a.is_active,
          a.repeat_pattern,
          a.days,
          a.audio_path,
          a.audio_file_name,
          a.audio_start_ms,
          a.audio_end_ms,
          a.volume_boost,
          a.fade_in_seconds,
          a.snooze_duration,
          a.snooze_limit,
          a.math_challenge,
          a.math_difficulty,
          a.ai_voice_enabled,
          a.ai_personality,
          a.created_at,
          a.updated_at,
        ]
      );
    }
  }

  // Ensure real sample audio files exist on disk
  let sampleSounds = { track1: "", track2: "" };
  try {
    sampleSounds = await invoke<{ track1: string; track2: string }>("ensure_sample_audio_files");
  } catch (err) {
    console.warn("Could not ensure sample sounds:", err);
  }

  // Seed or repair audio library entries
  const existingAudio = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM audio_library;"
  );
  if (existingAudio[0]?.count === 0) {
    const seedTracks = [
      {
        id: "audio-seed-1",
        file_path: sampleSounds.track1,
        file_name: "Morning Energy Mix.wav",
        file_size: 1323044,
        duration_ms: 15000,
        format: "wav",
        added_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "audio-seed-2",
        file_path: sampleSounds.track2,
        file_name: "Focus Beats & Sun.wav",
        file_size: 1323044,
        duration_ms: 15000,
        format: "wav",
        added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];
    for (const t of seedTracks) {
      await db.execute(
        `INSERT INTO audio_library (id, file_path, file_name, file_size, duration_ms, format, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [t.id, t.file_path, t.file_name, t.file_size, t.duration_ms, t.format, t.added_at]
      );
    }
  } else if (sampleSounds.track1 && sampleSounds.track2) {
    // Repair existing seed rows that had empty file_path
    try {
      await db.execute(
        "UPDATE audio_library SET file_path = $1, format = 'wav' WHERE (id = 'audio-seed-1' OR file_name LIKE '%Morning Energy%') AND (file_path = '' OR file_path IS NULL);",
        [sampleSounds.track1]
      );
      await db.execute(
        "UPDATE audio_library SET file_path = $1, format = 'wav' WHERE (id = 'audio-seed-2' OR file_name LIKE '%Focus Beats%') AND (file_path = '' OR file_path IS NULL);",
        [sampleSounds.track2]
      );
    } catch (e) {
      console.warn("Audio library repair note:", e);
    }
  }

  // Seed today's goals if empty
  const todayStr = new Date().toISOString().split("T")[0];
  const existingGoals = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM daily_goals WHERE date = $1;",
    [todayStr]
  );
  if (existingGoals[0]?.count === 0) {
    const seedGoals = [
      "Wake up at 6:00 AM without hesitation",
      "Drink 500ml water and complete light stretches",
      "Plan 3 high-leverage focus priorities",
    ];
    for (let i = 0; i < seedGoals.length; i++) {
      await db.execute(
        `INSERT INTO daily_goals (id, date, goal_text, is_completed, completed_at, sort_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `goal-seed-${i + 1}`,
          todayStr,
          seedGoals[i],
          i === 0 ? 1 : 0,
          i === 0 ? new Date().toISOString() : null,
          i,
          new Date().toISOString(),
        ]
      );
    }
  }

  // Seed realistic wake_log for streak and heatmap if empty
  const existingWake = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM wake_log;"
  );
  if (existingWake[0]?.count === 0) {
    const now = new Date();
    // Pre-populate last 14 days of wake records
    for (let i = 14; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split("T")[0];
      const snoozed = i === 4 || i === 9 ? 1 : 0;
      const dismissedOnTime = snoozed === 0 ? 1 : 0;
      const wakeMin = snoozed ? 12 : 3;

      await db.execute(
        `INSERT INTO wake_log (id, date, alarm_id, alarm_label, scheduled_time, actual_wake_time, snooze_count, dismissed_on_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `wake-seed-${i}`,
          dStr,
          "alarm-seed-1",
          "Rise & Build",
          "06:00",
          `${dStr}T06:${wakeMin < 10 ? "0" + wakeMin : wakeMin}:00.000Z`,
          snoozed,
          dismissedOnTime,
        ]
      );

      // Also create matching alarm_history
      await db.execute(
        `INSERT INTO alarm_history (id, alarm_id, alarm_label, scheduled_hour, scheduled_minute, fired_at, dismissed_at, snooze_count, was_math_solved, dismiss_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `hist-seed-${i}`,
          "alarm-seed-1",
          "Rise & Build",
          6,
          0,
          `${dStr}T06:00:00.000Z`,
          `${dStr}T06:${wakeMin < 10 ? "0" + wakeMin : wakeMin}:00.000Z`,
          snoozed,
          1,
          "math",
        ]
      );
    }
  }

  // Seed realistic habit_streaks for streak summary and consistency if empty
  const existingHabits = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM habit_streaks;"
  );
  if (existingHabits[0]?.count === 0) {
    const now = new Date();
    // Pre-populate last 14 days of habit streak records
    for (let i = 14; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split("T")[0];
      const snoozed = i === 4 || i === 9 ? 1 : 0;
      const wokeOnTime = snoozed === 0 ? 1 : 0;
      const morningScore = wokeOnTime ? (i % 2 === 0 ? 92.0 : 88.0) : 65.0;

      await db.execute(
        `INSERT INTO habit_streaks (id, date, woke_on_time, alarms_fired, alarms_snoozed, goals_completed, goals_total, morning_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          `streak-seed-${i}`,
          dStr,
          wokeOnTime,
          1,
          snoozed,
          wokeOnTime ? 3 : 1,
          3,
          morningScore,
          `${dStr}T06:30:00.000Z`,
        ]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// ALARM OPERATIONS
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbAlarm(row: any): Alarm {
  let parsedDays: Alarm["days"] = [];
  try {
    parsedDays = JSON.parse(row.days || "[]");
  } catch {
    parsedDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  }

  return {
    id: row.id,
    label: row.label,
    hour: Number(row.hour),
    minute: Number(row.minute),
    isActive: Boolean(row.is_active),
    repeatPattern: row.repeat_pattern,
    days: parsedDays,
    audioPath: row.audio_path ?? null,
    audioFileName: row.audio_file_name ?? null,
    audioStartMs: Number(row.audio_start_ms || 0),
    audioEndMs: Number(row.audio_end_ms || 0),
    volumeBoost: Number(row.volume_boost || 150),
    fadeInSeconds: Number(row.fade_in_seconds || 0),
    snoozeDuration: Number(row.snooze_duration || 10),
    snoozeLimit: Number(row.snooze_limit || 3),
    mathChallenge: Boolean(row.math_challenge),
    aiVoiceEnabled: Boolean(row.ai_voice_enabled),
    aiPersonality: row.ai_personality || "motivational",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastFiredAt: row.last_fired_at ?? null,
  };
}

export async function dbGetAllAlarms(): Promise<Alarm[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT * FROM alarms ORDER BY is_active DESC, hour ASC, minute ASC;"
  );
  return rows.map(mapDbAlarm);
}

export async function dbCreateAlarm(data: AlarmFormData): Promise<Alarm> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO alarms (
      id, label, hour, minute, is_active, repeat_pattern, days,
      audio_path, audio_file_name, audio_start_ms, audio_end_ms,
      volume_boost, fade_in_seconds, snooze_duration, snooze_limit,
      math_challenge, math_difficulty, ai_voice_enabled, ai_personality,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      id,
      data.label,
      data.hour,
      data.minute,
      data.isActive ? 1 : 0,
      data.repeatPattern,
      JSON.stringify(data.days),
      data.audioPath,
      data.audioFileName,
      data.audioStartMs,
      data.audioEndMs,
      data.volumeBoost,
      data.fadeInSeconds,
      data.snoozeDuration,
      data.snoozeLimit,
      data.mathChallenge ? 1 : 0,
      "easy",
      data.aiVoiceEnabled ? 1 : 0,
      data.aiPersonality,
      now,
      now,
    ]
  );

  return {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    lastFiredAt: null,
  };
}

export async function dbUpdateAlarm(id: string, data: Partial<Alarm>): Promise<Alarm> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Load existing first to merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingRows = await db.select<any[]>("SELECT * FROM alarms WHERE id = $1", [id]);
  if (existingRows.length === 0) {
    throw new Error(`Alarm ${id} not found in database`);
  }
  const current = mapDbAlarm(existingRows[0]);
  const merged: Alarm = { ...current, ...data, updatedAt: now };

  await db.execute(
    `UPDATE alarms SET
      label = $1, hour = $2, minute = $3, is_active = $4,
      repeat_pattern = $5, days = $6, audio_path = $7, audio_file_name = $8,
      audio_start_ms = $9, audio_end_ms = $10, volume_boost = $11,
      fade_in_seconds = $12, snooze_duration = $13, snooze_limit = $14,
      math_challenge = $15, ai_voice_enabled = $16, ai_personality = $17,
      updated_at = $18, last_fired_at = $19
    WHERE id = $20`,
    [
      merged.label,
      merged.hour,
      merged.minute,
      merged.isActive ? 1 : 0,
      merged.repeatPattern,
      JSON.stringify(merged.days),
      merged.audioPath,
      merged.audioFileName,
      merged.audioStartMs,
      merged.audioEndMs,
      merged.volumeBoost,
      merged.fadeInSeconds,
      merged.snoozeDuration,
      merged.snoozeLimit,
      merged.mathChallenge ? 1 : 0,
      merged.aiVoiceEnabled ? 1 : 0,
      merged.aiPersonality,
      merged.updatedAt,
      merged.lastFiredAt,
      id,
    ]
  );

  return merged;
}

export async function dbDeleteAlarm(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM alarms WHERE id = $1", [id]);
  await db.execute("DELETE FROM alarm_audio_links WHERE alarm_id = $1", [id]);
}

export async function dbToggleAlarm(id: string, isActive: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE alarms SET is_active = $1, updated_at = $2 WHERE id = $3",
    [isActive ? 1 : 0, now, id]
  );
}

// ─────────────────────────────────────────────────────────────
// AUDIO LIBRARY OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbGetAudioLibrary(): Promise<AudioLibraryEntry[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT * FROM audio_library ORDER BY added_at DESC;"
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.file_name.replace(/\.[^/.]+$/, ""),
    file: {
      path: r.file_path,
      fileName: r.file_name,
      fileSize: Number(r.file_size),
      durationMs: Number(r.duration_ms),
      format: (r.format as AudioFile["format"]) || "mp3",
    },
    volumeBoost: 150,
    trimStartMs: 0,
    trimEndMs: Number(r.duration_ms) || 180000,
    fadeInSeconds: 0,
    addedAt: r.added_at,
    usedByAlarmIds: [],
  }));
}

export async function dbAddToAudioLibrary(file: AudioFile, name?: string): Promise<AudioLibraryEntry> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO audio_library (id, file_path, file_name, file_size, duration_ms, format, added_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, file.path, file.fileName, file.fileSize, file.durationMs, file.format, now]
  );

  return {
    id,
    name: name || file.fileName.replace(/\.[^/.]+$/, ""),
    file,
    volumeBoost: 150,
    trimStartMs: 0,
    trimEndMs: file.durationMs || 180000,
    fadeInSeconds: 0,
    addedAt: now,
    usedByAlarmIds: [],
  };
}

export async function dbRemoveFromAudioLibrary(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM audio_library WHERE id = $1", [id]);
  await db.execute("DELETE FROM alarm_audio_links WHERE audio_id = $1", [id]);
}

// ─────────────────────────────────────────────────────────────
// DAILY GOALS OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbGetTodayGoals(): Promise<DailyGoal[]> {
  const db = await getDatabase();
  const todayStr = new Date().toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT * FROM daily_goals WHERE date = $1 ORDER BY sort_order ASC, created_at ASC;",
    [todayStr]
  );

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    goalText: r.goal_text,
    isCompleted: Boolean(r.is_completed),
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }));
}

export async function dbAddGoal(text: string): Promise<DailyGoal> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // Get current max sort_order
  const maxRow = await db.select<{ max_order: number | null }[]>(
    "SELECT MAX(sort_order) as max_order FROM daily_goals WHERE date = $1",
    [todayStr]
  );
  const nextOrder = (maxRow[0]?.max_order ?? -1) + 1;

  await db.execute(
    `INSERT INTO daily_goals (id, date, goal_text, is_completed, completed_at, sort_order, created_at)
     VALUES ($1, $2, $3, 0, NULL, $4, $5)`,
    [id, todayStr, text, nextOrder, now]
  );

  return {
    id,
    date: todayStr,
    goalText: text,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
  };
}

export async function dbCompleteGoal(id: string, isCompleted: boolean): Promise<void> {
  const db = await getDatabase();
  const completedAt = isCompleted ? new Date().toISOString() : null;
  await db.execute(
    "UPDATE daily_goals SET is_completed = $1, completed_at = $2 WHERE id = $3",
    [isCompleted ? 1 : 0, completedAt, id]
  );
}

export async function dbDeleteGoal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM daily_goals WHERE id = $1", [id]);
}

export async function dbCleanOldGoals(): Promise<void> {
  const db = await getDatabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  await db.execute("DELETE FROM daily_goals WHERE date < $1", [thirtyDaysAgo]);
}

// ─────────────────────────────────────────────────────────────
// WAKE LOG & HABIT ANALYTICS OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbLogWakeEvent(entry: Omit<WakeLogEntry, "id">): Promise<void> {
  const db = await getDatabase();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT OR REPLACE INTO wake_log (
      id, date, alarm_id, alarm_label, scheduled_time, actual_wake_time, snooze_count, dismissed_on_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      entry.date,
      entry.alarmId,
      entry.alarmLabel,
      entry.scheduledTime,
      entry.actualWakeTime,
      entry.snoozeCount,
      entry.dismissedOnTime ? 1 : 0,
    ]
  );

  // Also log into alarm_history
  const [hStr, mStr] = entry.scheduledTime.split(":");
  await db.execute(
    `INSERT INTO alarm_history (
      id, alarm_id, alarm_label, scheduled_hour, scheduled_minute, fired_at, dismissed_at, snooze_count, was_math_solved, dismiss_method
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'button')`,
    [
      crypto.randomUUID(),
      entry.alarmId || "custom",
      entry.alarmLabel,
      parseInt(hStr || "6", 10),
      parseInt(mStr || "0", 10),
      `${entry.date}T${entry.scheduledTime}:00.000Z`,
      entry.actualWakeTime,
      entry.snoozeCount,
    ]
  );
}

export async function dbGetWakeLog(days = 90): Promise<WakeLogEntry[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT * FROM wake_log ORDER BY date DESC LIMIT $1",
    [days]
  );

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    alarmId: r.alarm_id,
    alarmLabel: r.alarm_label,
    scheduledTime: r.scheduled_time,
    actualWakeTime: r.actual_wake_time,
    snoozeCount: Number(r.snooze_count || 0),
    dismissedOnTime: Boolean(r.dismissed_on_time),
  }));
}

export async function dbGetCurrentStreak(): Promise<number> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT date, dismissed_on_time FROM wake_log ORDER BY date DESC;"
  );

  let streak = 0;
  for (const row of rows) {
    if (Boolean(row.dismissed_on_time)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function dbGetLongestStreak(): Promise<number> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT date, dismissed_on_time FROM wake_log ORDER BY date ASC;"
  );

  let maxStreak = 0;
  let current = 0;
  for (const row of rows) {
    if (Boolean(row.dismissed_on_time)) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

export async function dbGetWeeklyStats(): Promise<WeeklyStats> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT * FROM wake_log ORDER BY date DESC LIMIT 7;"
  );

  if (rows.length === 0) {
    return {
      totalAlarms: 0,
      dismissedOnTime: 0,
      totalSnoozes: 0,
      averageWakeTime: "07:00 AM",
      bestDay: "Monday",
      focusScore: 100,
    };
  }

  const totalAlarms = rows.length;
  const onTimeCount = rows.filter((r) => Boolean(r.dismissed_on_time)).length;
  const totalSnoozes = rows.reduce((acc, r) => acc + Number(r.snooze_count || 0), 0);
  const focusScore = Math.round((onTimeCount / totalAlarms) * 100);

  // Compute average wake time
  let totalMinutes = 0;
  for (const r of rows) {
    try {
      const d = new Date(r.actual_wake_time);
      totalMinutes += d.getHours() * 60 + d.getMinutes();
    } catch {
      totalMinutes += 7 * 60;
    }
  }
  const avgMins = Math.round(totalMinutes / rows.length);
  const avgH = Math.floor(avgMins / 60);
  const avgM = avgMins % 60;
  const ampm = avgH >= 12 ? "PM" : "AM";
  const displayH = avgH % 12 || 12;
  const avgTimeStr = `${displayH < 10 ? "0" + displayH : displayH}:${avgM < 10 ? "0" + avgM : avgM} ${ampm}`;

  return {
    totalAlarms,
    dismissedOnTime: onTimeCount,
    totalSnoozes,
    averageWakeTime: avgTimeStr,
    bestDay: "Tuesday",
    focusScore,
  };
}

export async function dbGetHeatmapData(): Promise<HeatmapDay[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT date, snooze_count, dismissed_on_time FROM wake_log ORDER BY date ASC;"
  );

  const dateMap = new Map<string, number>();
  for (const r of rows) {
    // 0 = missed, 1 = snoozed, 2 = on time
    const val = Boolean(r.dismissed_on_time) ? 2 : Number(r.snooze_count) > 0 ? 1 : 0;
    dateMap.set(r.date, val);
  }

  // Generate 91 days (13 weeks) up to today
  const result: HeatmapDay[] = [];
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = d.toISOString().split("T")[0];
    result.push({
      date: dStr,
      value: dateMap.has(dStr) ? (dateMap.get(dStr) as number) : 0,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// ALARM HISTORY OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbGetAlarmHistory(limit = 100, offset = 0): Promise<AlarmHistoryRecord[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    `SELECT * FROM alarm_history ORDER BY fired_at DESC LIMIT $1 OFFSET $2;`,
    [limit, offset]
  );

  return rows.map((r) => ({
    id: r.id,
    alarmId: r.alarm_id,
    alarmLabel: r.alarm_label,
    scheduledTime: `${String(r.scheduled_hour).padStart(2, "0")}:${String(r.scheduled_minute).padStart(2, "0")}`,
    firedAt: r.fired_at,
    dismissedAt: r.dismissed_at,
    snoozeCount: Number(r.snooze_count || 0),
    wasMathSolved: Boolean(r.was_math_solved),
  }));
}

export async function dbExportHistoryCsv(): Promise<string> {
  const records = await dbGetAlarmHistory(1000, 0);
  const headers = [
    "ID",
    "Alarm Label",
    "Scheduled Time",
    "Fired At",
    "Dismissed At",
    "Snooze Count",
    "Math Solved",
    "Status",
  ];

  const rows = records.map((r) => {
    let status = "On Time";
    if (!r.dismissedAt) status = "Missed";
    else if (r.snoozeCount > 0) status = `Snoozed (${r.snoozeCount}x)`;

    return [
      `"${r.id}"`,
      `"${r.alarmLabel.replace(/"/g, '""')}"`,
      `"${r.scheduledTime}"`,
      `"${r.firedAt}"`,
      `"${r.dismissedAt || "N/A"}"`,
      r.snoozeCount,
      r.wasMathSolved ? "Yes" : "No",
      `"${status}"`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// ─────────────────────────────────────────────────────────────
// SETTINGS OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbGetAllSettings(): Promise<Record<string, string>> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>("SELECT key, value FROM settings;");
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

export async function dbSetSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ($1, $2, $3);",
    [key, value, now]
  );
}

export async function dbGetSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>("SELECT value FROM settings WHERE key = $1;", [key]);
  return rows[0]?.value ?? null;
}

export function parseSettings(
  raw: Record<string, string>,
  defaults: AppSettings
): AppSettings {
  return {
    defaultVolumeBoost: raw.defaultVolumeBoost ? parseInt(raw.defaultVolumeBoost, 10) : defaults.defaultVolumeBoost,
    defaultSnoozeDuration: raw.defaultSnoozeDuration ? parseInt(raw.defaultSnoozeDuration, 10) : defaults.defaultSnoozeDuration,
    defaultSnoozeLimit: raw.defaultSnoozeLimit ? parseInt(raw.defaultSnoozeLimit, 10) : defaults.defaultSnoozeLimit,
    defaultFadeInSeconds: raw.defaultFadeInSeconds ? parseInt(raw.defaultFadeInSeconds, 10) : defaults.defaultFadeInSeconds,
    defaultMathChallenge: raw.defaultMathChallenge !== undefined ? raw.defaultMathChallenge === "true" : defaults.defaultMathChallenge,
    mathChallengeDifficulty: (raw.mathChallengeDifficulty as AppSettings["mathChallengeDifficulty"]) || defaults.mathChallengeDifficulty,
    aiCompanionEnabled: raw.aiCompanionEnabled !== undefined ? raw.aiCompanionEnabled === "true" : defaults.aiCompanionEnabled,
    aiVoiceEnabled: raw.aiVoiceEnabled !== undefined ? raw.aiVoiceEnabled === "true" : defaults.aiVoiceEnabled,
    aiPersonality: (raw.aiPersonality as AppSettings["aiPersonality"]) || defaults.aiPersonality,
    startOnBoot: raw.startOnBoot !== undefined ? raw.startOnBoot === "true" : defaults.startOnBoot,
    minimizeToTray: raw.minimizeToTray !== undefined ? raw.minimizeToTray === "true" : defaults.minimizeToTray,
    showTrayNotifications: raw.showTrayNotifications !== undefined ? raw.showTrayNotifications === "true" : defaults.showTrayNotifications,
    alarmStyle: (raw.alarmStyle as AppSettings["alarmStyle"]) || defaults.alarmStyle,
    antiSleepEnabled: raw.antiSleepEnabled !== undefined ? raw.antiSleepEnabled !== "false" : defaults.antiSleepEnabled,
    elevenLabsApiKey: raw.elevenLabsApiKey ?? defaults.elevenLabsApiKey,
    elevenLabsVoiceId: raw.elevenLabsVoiceId ?? defaults.elevenLabsVoiceId,
    openRouterApiKey: raw.openRouterApiKey ?? defaults.openRouterApiKey,
    geminiApiKey: raw.geminiApiKey ?? defaults.geminiApiKey,
    openRouterModel: raw.openRouterModel ?? defaults.openRouterModel,
    groqApiKey: raw.groqApiKey ?? defaults.groqApiKey,
    groqModel: raw.groqModel ?? defaults.groqModel,
    autoCacheNightly: raw.autoCacheNightly !== undefined ? raw.autoCacheNightly === "true" : defaults.autoCacheNightly,
    showCheckinOnFire: raw.showCheckinOnFire !== undefined ? raw.showCheckinOnFire === "true" : defaults.showCheckinOnFire,
    theme: (raw.theme as AppSettings["theme"]) || defaults.theme || "dark",
    voiceEngine: (raw.voiceEngine as AppSettings["voiceEngine"]) || defaults.voiceEngine || "voicebox",
    voiceboxProfileId: raw.voiceboxProfileId ?? defaults.voiceboxProfileId ?? "7f9e3a94-926d-4b8d-8fc9-931ee2691bfa",
    voiceboxProfileName: raw.voiceboxProfileName ?? defaults.voiceboxProfileName ?? "Noellyne",
    offlineAiMode: raw.offlineAiMode !== undefined ? raw.offlineAiMode === "true" : (defaults.offlineAiMode ?? true),
  };
}

// ─────────────────────────────────────────────────────────────
// AI CONVERSATION & MORNING BRIEFING OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function dbSaveAiConversation(
  alarmId: string | null,
  messages: ChatMessage[],
  morningScore: number = 85.0
): Promise<string> {
  const db = await getDatabase();
  const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const date = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  const jsonMessages = JSON.stringify(messages);

  await db.execute(
    "INSERT INTO ai_conversations (id, date, alarm_id, messages, morning_score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7);",
    [id, date, alarmId || "", jsonMessages, morningScore, now, now]
  );
  return id;
}

export async function dbGetAiConversations(limit: number = 30): Promise<ConversationRecord[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT id, date, alarm_id, messages, morning_score, created_at, updated_at FROM ai_conversations ORDER BY created_at DESC LIMIT $1;",
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    alarm_id: r.alarm_id,
    messages: r.messages,
    morning_score: Number(r.morning_score || 0),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function dbSaveMorningBriefing(
  briefing: MorningBriefing,
  date: string = new Date().toISOString().split("T")[0]
): Promise<void> {
  const db = await getDatabase();
  const id = `briefing-${date}`;
  await db.execute(
    "INSERT OR REPLACE INTO morning_briefings (id, date, greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);",
    [
      id,
      date,
      briefing.greeting,
      briefing.streak_message,
      briefing.goals_message,
      briefing.ai_tip,
      briefing.motivational_close,
      briefing.generated_at,
    ]
  );
}

export async function dbGetTodayMorningBriefing(): Promise<MorningBriefing | null> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at FROM morning_briefings WHERE date = $1;",
    [today]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    greeting: r.greeting,
    streak_message: r.streak_message,
    goals_message: r.goals_message,
    ai_tip: r.ai_tip,
    motivational_close: r.motivational_close,
    generated_at: r.generated_at,
  };
}

export async function dbGetAllMorningBriefings(): Promise<MorningBriefing[]> {
  const db = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select<any[]>(
    "SELECT greeting, streak_message, goals_message, ai_tip, motivational_close, generated_at FROM morning_briefings ORDER BY generated_at DESC;"
  );
  return rows.map((r) => ({
    greeting: r.greeting,
    streak_message: r.streak_message,
    goals_message: r.goals_message,
    ai_tip: r.ai_tip,
    motivational_close: r.motivational_close,
    generated_at: r.generated_at,
  }));
}

