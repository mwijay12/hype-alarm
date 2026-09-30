import { create } from "zustand";
import type { AppSettings } from "../lib/types";
import { DEFAULT_SETTINGS, ELEVENLABS_KEYS, OPENROUTER_KEYS, GROQ_KEYS } from "../lib/constants";
import { dbGetAllSettings, dbSetSetting, parseSettings } from "../services/database";

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  /** Rotate to next ElevenLabs key when current one hits quota/fails */
  rotateElevenLabsKey: () => Promise<void>;
  /** Rotate to next OpenRouter key when current one fails */
  rotateOpenRouterKey: () => Promise<void>;
  /** Rotate to next Groq key when current one fails */
  rotateGroqKey: () => Promise<void>;
}

function getCurrentKeyIndex(keys: string[], current: string): number {
  const idx = keys.indexOf(current);
  return idx >= 0 ? idx : 0;
}

function nextKey(keys: string[], current: string): string {
  if (!keys || keys.length === 0) return current || "";
  const idx = getCurrentKeyIndex(keys, current);
  return keys[(idx + 1) % keys.length] || current || "";
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const raw = await dbGetAllSettings();
      const merged = parseSettings(raw, DEFAULT_SETTINGS);

      // If no keys are stored yet, seed them from defaults (first-time setup)
      if (!raw.elevenLabsApiKey && DEFAULT_SETTINGS.elevenLabsApiKey) {
        await dbSetSetting("elevenLabsApiKey", DEFAULT_SETTINGS.elevenLabsApiKey);
        merged.elevenLabsApiKey = DEFAULT_SETTINGS.elevenLabsApiKey;
      }
      if (!raw.openRouterApiKey && DEFAULT_SETTINGS.openRouterApiKey) {
        await dbSetSetting("openRouterApiKey", DEFAULT_SETTINGS.openRouterApiKey);
        merged.openRouterApiKey = DEFAULT_SETTINGS.openRouterApiKey;
      }
      if (!raw.groqApiKey && DEFAULT_SETTINGS.groqApiKey) {
        await dbSetSetting("groqApiKey", DEFAULT_SETTINGS.groqApiKey);
        merged.groqApiKey = DEFAULT_SETTINGS.groqApiKey;
      }

      set({ settings: merged, isLoading: false });
    } catch (err) {
      console.error("[SettingsStore] Failed to load settings from DB:", err);
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    // Optimistic UI update
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));

    try {
      await dbSetSetting(String(key), String(value));
    } catch (err) {
      console.error(`[SettingsStore] Failed to persist setting ${String(key)}:`, err);
    }
  },

  updateSettings: async (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));

    try {
      for (const [key, val] of Object.entries(newSettings)) {
        if (val !== undefined) {
          await dbSetSetting(key, String(val));
        }
      }
    } catch (err) {
      console.error("[SettingsStore] Failed to persist settings:", err);
    }
  },

  rotateElevenLabsKey: async () => {
    if (ELEVENLABS_KEYS.length === 0) return;
    const current = get().settings.elevenLabsApiKey;
    const next = nextKey(ELEVENLABS_KEYS, current);
    console.log(`[SettingsStore] Rotating ElevenLabs key → index ${ELEVENLABS_KEYS.indexOf(next)}`);
    await get().updateSetting("elevenLabsApiKey", next);
  },

  rotateOpenRouterKey: async () => {
    if (OPENROUTER_KEYS.length === 0) return;
    const current = get().settings.openRouterApiKey;
    const next = nextKey(OPENROUTER_KEYS, current);
    console.log(`[SettingsStore] Rotating OpenRouter key → index ${OPENROUTER_KEYS.indexOf(next)}`);
    await get().updateSetting("openRouterApiKey", next);
  },

  rotateGroqKey: async () => {
    if (GROQ_KEYS.length === 0) return;
    const current = get().settings.groqApiKey || "";
    const next = nextKey(GROQ_KEYS, current);
    console.log(`[SettingsStore] Rotating Groq key → index ${GROQ_KEYS.indexOf(next)}`);
    await get().updateSetting("groqApiKey", next);
  },
}));
