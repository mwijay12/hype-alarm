import type { DayOfWeek, AppSettings, RepeatPattern } from './types';

// Days configuration
export const DAYS_OF_WEEK: {
  key: DayOfWeek;
  label: string;
  short: string;
}[] = [
  { key: 'Mon', label: 'Monday',    short: 'M'  },
  { key: 'Tue', label: 'Tuesday',   short: 'T'  },
  { key: 'Wed', label: 'Wednesday', short: 'W'  },
  { key: 'Thu', label: 'Thursday',  short: 'T'  },
  { key: 'Fri', label: 'Friday',    short: 'F'  },
  { key: 'Sat', label: 'Saturday',  short: 'S'  },
  { key: 'Sun', label: 'Sunday',    short: 'S'  },
];

// Repeat pattern options with labels
export const REPEAT_PATTERNS: {
  value: RepeatPattern;
  label: string;
  description: string;
  days: DayOfWeek[];
}[] = [
  {
    value: 'once',
    label: 'Once',
    description: 'Fires one time then deactivates',
    days: [],
  },
  {
    value: 'daily',
    label: 'Every Day',
    description: 'Repeats every day of the week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    value: 'weekdays',
    label: 'Weekdays',
    description: 'Monday through Friday only',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
  {
    value: 'weekends',
    label: 'Weekends',
    description: 'Saturday and Sunday only',
    days: ['Sat', 'Sun'],
  },
  {
    value: 'custom',
    label: 'Custom Days',
    description: 'Pick specific days of the week',
    days: [],
  },
];

// Volume boost presets
export const VOLUME_BOOST_PRESETS = [
  { value: 100, label: '100%', description: 'Normal'   },
  { value: 150, label: '150%', description: 'Boosted'  },
  { value: 200, label: '200%', description: 'Loud'     },
  { value: 250, label: '250%', description: 'Very Loud'},
  { value: 300, label: '300%', description: 'Maximum'  },
  { value: 400, label: '400%', description: 'Extreme'  },
];

// Snooze duration options (minutes)
export const SNOOZE_OPTIONS = [5, 10, 15, 20, 30];

// Max snooze limit options
export const SNOOZE_LIMIT_OPTIONS = [1, 2, 3, 4, 5];

// API keys are NOT bundled — users add their own in Settings (persisted to local DB).
// Keep these arrays (empty by default) for optional runtime injection / rotation logic.
// To pre-seed locally without committing secrets, use .env / .env.local (see .env.example)
// and inject at build time — never commit real keys.
export const OPENROUTER_KEYS: string[] = [];

export const ELEVENLABS_KEYS: string[] = [];

export const GROQ_KEYS: string[] = [];

// Helper: pick a working key from a pool (round-robin with localStorage tracking)
export function getNextKey(keys: string[], storageKey: string): string {
  if (!keys || keys.length === 0) return "";
  try {
    const idx = parseInt(localStorage.getItem(storageKey) || "0", 10);
    const safeIdx = Number.isFinite(idx) && idx >= 0 ? idx % keys.length : 0;
    const next = (safeIdx + 1) % keys.length;
    localStorage.setItem(storageKey, String(next));
    return keys[safeIdx] || "";
  } catch {
    return keys[0] || "";
  }
}

// Default app settings — API keys empty by default; user adds their own in Settings
export const DEFAULT_SETTINGS: AppSettings = {
  defaultVolumeBoost: 150,
  defaultSnoozeDuration: 10,
  defaultSnoozeLimit: 3,
  defaultFadeInSeconds: 0,
  defaultMathChallenge: false,
  mathChallengeDifficulty: 'easy',
  aiCompanionEnabled: true,
  aiVoiceEnabled: true,
  aiPersonality: 'motivational',
  startOnBoot: false,
  minimizeToTray: true,
  showTrayNotifications: true,
  alarmStyle: 'fullscreen',
  antiSleepEnabled: true,
  elevenLabsApiKey: '',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  openRouterApiKey: '',
  geminiApiKey: '',
  openRouterModel: 'google/gemini-flash-1.5',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  autoCacheNightly: true,
  showCheckinOnFire: true,
  theme: 'dark',
  voiceEngine: 'voicebox',
  voiceboxProfileId: '7f9e3a94-926d-4b8d-8fc9-931ee2691bfa',
  voiceboxProfileName: 'Noellyne',
  offlineAiMode: true,
};

// Wake-up message templates used for ElevenLabs TTS
export const WAKE_UP_MESSAGES = [
  "Good morning. It's {time} on {day}. Time to rise and build something great today.",
  "Hey, wake up. {time} is here. Every champion starts their day before the world does.",
  "Rise and shine. It's {time}. Your goals don't chase themselves — but you do.",
  "Good morning. {day} is yours. It's {time} and the day is waiting for you.",
  "Time to get up. It's {time}. One focused morning can change your entire week.",
  "Wake up. {time}. The version of you that succeeds woke up when this alarm rang.",
  "Morning. It's {time} on {day}. Small disciplines, practised daily, build great lives.",
  "Up and at it. {time} on {day}. Today is another chance to be better than yesterday.",
];

export const AI_PERSONALITIES = {
  motivational: "You are an energetic, positive morning coach. Keep responses short, punchy, and motivating.",
  calm: "You are a calm, mindful morning companion. Keep responses gentle, grounding, and peaceful.",
  coach: "You are a focused productivity coach. Keep responses direct, practical, and action-oriented.",
  friendly: "You are a warm, friendly morning companion. Keep responses cheerful and encouraging.",
};

export const ELEVENLABS_VOICES: { id: string; name: string; description: string }[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm & Clear" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Strong & Confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Warm & Friendly" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Deep & Motivating" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Bold & Energetic" },
];

// 30 original motivational wake-up quotes (<12 words each)
export const MOTIVATIONAL_QUOTES: string[] = [
  "Win the morning, own the entire day.",
  "Your potential is waiting for you to rise.",
  "Discipline today builds the freedom of tomorrow.",
  "Wake up with determination, sleep with satisfaction.",
  "The secret of getting ahead is getting started.",
  "Today is an unrepeatable opportunity. Seize it.",
  "Small daily habits create massive lifelong victories.",
  "Focus on progress, not on immediate perfection.",
  "Action cures fear; begin before you feel ready.",
  "Champions rise before their doubts have awakened.",
  "Build the discipline your future self will thank.",
  "Energy flows where intentional focus goes today.",
  "Rise and execute with uncompromising clarity.",
  "One focused hour beats ten distracted hours.",
  "Your morning routine defines your daily outcome.",
  "Consistency is the true superpower of achievers.",
  "Do what is required, even when difficult.",
  "Every sunrise offers a brand new chapter.",
  "Master your morning, master your destiny.",
  "Momentum starts with opening your eyes promptly.",
  "You do not find time; you create it.",
  "Hard work beats talent when talent naps.",
  "Step into the day with quiet confidence.",
  "Greatness begins the moment you decide to rise.",
  "Your dreams require your active presence today.",
  "Defeat laziness with decisive morning action.",
  "Start early, stay focused, finish strong.",
  "Discipline is choosing what you want most.",
  "Today’s effort is tomorrow’s undeniable result.",
  "Wake up, level up, and conquer your goals.",
];

// Design color tokens (JS reference)
export const COLORS = {
  accent:       '#2563EB',
  accentBright: '#3B82F6',
  sky:          '#0EA5E9',
  accentLight:  '#DBEAFE',
  text:         '#0F172A',
  textMuted:    '#64748B',
  border:       'rgba(59, 130, 246, 0.15)',
  white:        '#FFFFFF',
  bgLight:      '#F0F5FF',
};

// Navigation items
export const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',     path: '/',          icon: 'LayoutDashboard' },
  { id: 'alarms',     label: 'Alarms',        path: '/alarms',    icon: 'BellRing'        },
  { id: 'sounds',     label: 'Sound Library', path: '/sounds',    icon: 'Music2'          },
  { id: 'progress',   label: 'Progress',      path: '/progress',  icon: 'BarChart3'       },
  { id: 'history',    label: 'History',       path: '/history',   icon: 'History'         },
  { id: 'settings',   label: 'Settings',      path: '/settings',  icon: 'Settings'        },
];
