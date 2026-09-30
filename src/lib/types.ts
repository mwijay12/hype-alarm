// Day of week type
export type DayOfWeek = 
  | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

// Alarm repeat pattern
export type RepeatPattern = 
  | 'once'       // fires once, then deactivates
  | 'daily'      // every day
  | 'weekdays'   // Mon–Fri
  | 'weekends'   // Sat–Sun
  | 'custom';    // user picks specific days

// AI personality for voice wake-up (placeholder for Phase 8)
export type AIPersonality = 
  | 'motivational' | 'gentle' | 'military' | 'coach';

// Core Alarm interface
export interface Alarm {
  id: string;
  label: string;
  hour: number;             // 0–23
  minute: number;           // 0–59
  isActive: boolean;
  repeatPattern: RepeatPattern;
  days: DayOfWeek[];        // used when repeatPattern === 'custom'
  
  // Audio (Phase 3 — stored as placeholders for now)
  audioPath: string | null;
  audioFileName: string | null;
  audioStartMs: number;     // trim start in milliseconds
  audioEndMs: number;       // trim end in milliseconds (0 = end of file)
  volumeBoost: number;      // 100–400 (percentage)
  fadeInSeconds: number;    // 0 = no fade
  
  // Snooze
  snoozeDuration: number;   // minutes: 5, 10, 15, 20, 30
  snoozeLimit: number;      // max times user can snooze (1–5)
  
  // Dismiss challenge
  mathChallenge: boolean;   // require solving math to dismiss
  
  // AI Voice (Phase 8)
  aiVoiceEnabled: boolean;
  aiPersonality: AIPersonality;
  aiVoiceId?: string;
  
  // Metadata
  createdAt: string;        // ISO date string
  updatedAt: string;        // ISO date string
  lastFiredAt: string | null;
}

// Form data for creating/editing alarm (no id/metadata)
export type AlarmFormData = Omit<
  Alarm, 
  'id' | 'createdAt' | 'updatedAt' | 'lastFiredAt'
>;

// Alarm card display state
export interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
}

// Goal for productivity (Phase 7)
export interface Goal {
  id: string;
  date: string;
  text: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  title?: string;
  completed?: boolean;
  goalText?: string;
}

export interface DailyGoal {
  id: string;
  date: string;
  goalText: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface WakeLogEntry {
  id: string;
  date: string;
  alarmId: string | null;
  alarmLabel: string;
  scheduledTime: string;
  actualWakeTime: string;
  snoozeCount: number;
  dismissedOnTime: boolean;
}

export interface WeeklyStats {
  totalAlarms: number;
  dismissedOnTime: number;
  totalSnoozes: number;
  averageWakeTime: string;
  bestDay: string;
  focusScore: number;
}

export interface HeatmapDay {
  date: string;
  value: number; // 0 = no alarm / missed, 1 = snoozed, 2 = on time
}

export interface HabitStreak {
  id?: string;
  date: string;
  wokeOnTime: boolean;
  woke_on_time?: boolean;
  alarmsFired: number;
  alarms_fired?: number;
  alarmsSnoozed: number;
  alarms_snoozed?: number;
  goalsCompleted: number;
  goals_completed?: number;
  goalsTotal: number;
  goals_total?: number;
  morningScore: number;
  morning_score?: number;
  createdAt?: string;
  created_at?: string;
  count?: number; // legacy compatibility
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalDaysTracked: number;
  totalOnTime: number;
  successRate: number;
  thisWeekScore: number;
  thisMonthScore: number;
}

export interface HeatmapCell {
  date: string;
  score: number;
  wokeOnTime: boolean;
  goalsCompleted: number;
  goalsTotal: number;
  alarmsSnoozed: number;
  level: number; // 0 to 4
  isToday: boolean;
}

export interface ChartDataPoint {
  date: string;
  dayLabel: string;
  score: number;
  goalRate: number;
  wokeOnTime: boolean;
  snoozes: number;
}

// Alarm history record (Phase 8)
export interface AlarmHistoryRecord {
  id: string;
  alarmId: string;
  alarmLabel: string;
  scheduledTime: string;
  firedAt: string;
  dismissedAt: string | null;
  snoozeCount: number;
  wasMathSolved: boolean;
}

// App settings
export interface AppSettings {
  defaultVolumeBoost: number;
  defaultSnoozeDuration: number;
  defaultSnoozeLimit: number;
  defaultFadeInSeconds: number;
  defaultMathChallenge: boolean;
  mathChallengeDifficulty: 'easy' | 'medium' | 'hard';
  aiCompanionEnabled: boolean;
  aiVoiceEnabled: boolean;
  aiPersonality: AIPersonality;
  startOnBoot: boolean;
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  alarmStyle: 'fullscreen' | 'notification';
  antiSleepEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  openRouterApiKey: string;
  geminiApiKey: string;
  openRouterModel: string;
  groqApiKey?: string;
  groqModel?: string;
  autoCacheNightly?: boolean;
  showCheckinOnFire?: boolean;
  theme?: 'light' | 'dark' | 'system';
  voiceEngine?: 'voicebox' | 'elevenlabs' | 'system';
  voiceboxProfileId?: string;
  voiceboxProfileName?: string;
  offlineAiMode?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  message: string;
  model_used: string;
  tokens_used: number;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface AntiSleepSettings {
  enabled: boolean;
  keepDisplayOn: boolean;
}

export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
}

export interface MathChallenge {
  question: string;
  answer: number;
}

// Audio file metadata
export interface AudioFile {
  path: string;           // absolute file path
  fileName: string;       // display name
  fileSize: number;       // bytes
  durationMs: number;     // total duration in ms
  format: 'mp3' | 'wav' | 'flac' | 'ogg' | 'm4a' | 'unknown';
  waveformData?: number[]; // normalized amplitude data for display
}

// Audio Track interface (for persistent library & SQLite schema readiness)
export interface AudioTrack {
  id: string;                  // UUID
  name: string;                // User-facing name (e.g. "Morning Energy")
  fileName: string;            // Original filename
  filePath: string;            // Absolute path in app userData/sounds/
  durationMs: number;          // Total duration in milliseconds
  trimStartMs: number;         // Trim start point in ms
  trimEndMs: number;           // Trim end point (0 = full duration)
  volumeBoost: number;         // 100–400 (percent)
  fadeInSeconds: number;       // 0 = no fade, max 10 seconds
  createdAt: string;
}

// Audio trim region
export interface AudioTrimRegion {
  startMs: number;   // trim start in milliseconds
  endMs: number;     // trim end in milliseconds
}

// Audio engine playback state
export type AudioPlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'error';

// Audio engine configuration
export interface AudioEngineConfig {
  audioFile: AudioFile | null;
  trimRegion: AudioTrimRegion;
  volumeBoost: number;       // 100–400 (percentage -> gain = value/100)
  fadeInSeconds: number;     // 0 = no fade
  loop: boolean;             // loop during alarm fire
}

// Audio engine state (for React hook)
export interface AudioEngineState {
  config: AudioEngineConfig;
  playbackState: AudioPlaybackState;
  currentTimeMs: number;     // current position in ms
  error: string | null;
}

// Saved audio library entry (Phase 3 in-memory store)
export interface AudioLibraryEntry {
  id: string;
  file: AudioFile;
  name: string;
  volumeBoost: number;
  trimStartMs: number;
  trimEndMs: number;
  fadeInSeconds: number;
  addedAt: string;
  usedByAlarmIds: string[];  // which alarms use this file
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  boost: number;               // Current GainNode value * 100
  isMuted: boolean;
}

// ─────────────────────────────────────────
// PHASE 8: ELEVENLABS AI VOICE TYPES
// ─────────────────────────────────────────

export interface ElevenLabsSubscription {
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  tier: string;
}

export interface VoiceCacheResult {
  success: number;
  skipped: number;
  failed: number;
  message: string;
  error: string | null;
}

export type VoicePersonality =
  | 'motivational'
  | 'gentle'
  | 'military'
  | 'coach';

export const VOICE_PERSONALITIES: {
  value: VoicePersonality;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: 'motivational',
    label: 'Motivational',
    description: 'Energetic, streak-aware, and inspiring wake-up call',
    emoji: '⚡',
  },
  {
    value: 'gentle',
    label: 'Gentle',
    description: 'Soft, calm, and grounded morning breathing nudge',
    emoji: '🌅',
  },
  {
    value: 'military',
    label: 'Military',
    description: 'No-nonsense, direct discipline wake command',
    emoji: '🫡',
  },
  {
    value: 'coach',
    label: 'Coach',
    description: 'High-performance metrics and daily gameplan',
    emoji: '🏆',
  },
];

// ─────────────────────────────────────────
// PHASE 9: AI CHECK-IN, GROQ & BRIEFING TYPES
// ─────────────────────────────────────────

export interface MorningContext {
  alarm_id?: string;
  current_streak: number;
  today_goals: string[];
  this_week_score: number;
  alarm_label: string;
  snooze_count: number;
  hour: number;
  minute: number;
  ai_personality: string;
}

export interface MorningBriefing {
  greeting: string;
  streak_message: string;
  goals_message: string;
  ai_tip: string;
  motivational_close: string;
  generated_at: string;
}

export interface ConversationRecord {
  id: string;
  date: string;
  alarm_id: string | null;
  messages: string; // JSON array of ChatMessage
  morning_score: number;
  created_at: string;
  updated_at: string;
}

export interface OpenRouterKeyInfo {
  is_valid: boolean;
  credits_remaining: number | null;
  label: string | null;
}

export interface GroqModelInfo {
  id: string;
  description: string;
  context_window: number;
  is_recommended: boolean;
}

export const GROQ_MODELS: {
  value: string;
  label: string;
  description: string;
  speed: string;
}[] = [
  {
    value: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile (Flagship)',
    description: 'Meta flagship intelligence, deep coaching, 128k context',
    speed: '~280 tok/s',
  },
  {
    value: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant (Ultra-Fast)',
    description: 'Blazing speed for instant wake-up responses, 128k context',
    speed: '~800+ tok/s',
  },
  {
    value: 'deepseek-r1-distill-llama-70b',
    label: 'DeepSeek R1 Distill 70B',
    description: 'Advanced reasoning, mindful reflection, and goal planning',
    speed: '~250 tok/s',
  },
  {
    value: 'gemma2-9b-it',
    label: 'Google Gemma 2 9B',
    description: 'High precision and concise instruction following on LPU',
    speed: '~450 tok/s',
  },
  {
    value: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B MoE',
    description: 'Mistral mixture of experts, 32k context',
    speed: '~500 tok/s',
  },
];

export const OPENROUTER_MODELS: {
  value: string;
  label: string;
  description: string;
  isFree: boolean;
}[] = [
  {
    value: 'google/gemini-flash-1.5',
    label: 'Gemini Flash 1.5',
    description: 'Recommended — fast, low latency, and highly capable',
    isFree: false,
  },
  {
    value: 'google/gemini-pro-1.5',
    label: 'Gemini Pro 1.5',
    description: 'Deep context reasoning and detailed morning briefing',
    isFree: false,
  },
  {
    value: 'anthropic/claude-haiku-3-5',
    label: 'Claude Haiku 3.5',
    description: 'Exceptional writing tone and natural conversation',
    isFree: false,
  },
  {
    value: 'meta-llama/llama-3.1-8b-instruct:free',
    label: 'Llama 3.1 8B (Free)',
    description: 'OpenRouter free community tier',
    isFree: true,
  },
  {
    value: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Fast, balanced, and consistent assistant',
    isFree: false,
  },
];


