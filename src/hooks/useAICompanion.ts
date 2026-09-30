import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../store/settingsStore";
import type { ChatMessage, AIResponse } from "../lib/types";

export interface UseAICompanionReturn {
  isLoading: boolean;
  error: string | null;
  sendMessage: (messages: ChatMessage[], personality?: string) => Promise<string>;
  generateVoice: (text: string, cacheKey: string) => Promise<string | null>;
  checkVoiceCache: (cacheKey: string) => Promise<boolean>;
}

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

export function useAICompanion(): UseAICompanionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettingsStore();

  const checkVoiceCache = useCallback(async (cacheKey: string): Promise<boolean> => {
    if (!isTauri()) return false;
    try {
      return await invoke<boolean>("check_voice_cache", { cacheKey });
    } catch {
      return false;
    }
  }, []);

  const generateVoice = useCallback(
    async (text: string, cacheKey: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      if (!isTauri()) {
        console.log("[AI Voice] Browser preview — TTS generation simulated");
        setIsLoading(false);
        return null;
      }

      try {
        const filePath = await invoke<string>("generate_voice_message", {
          text,
          voiceId: settings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM",
          cacheKey,
          apiKey: settings.elevenLabsApiKey || null,
        });
        setIsLoading(false);
        return filePath;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn("[AI Voice] Generation notice:", errMsg);
        setError(errMsg);
        setIsLoading(false);
        return null;
      }
    },
    [settings.elevenLabsVoiceId, settings.elevenLabsApiKey]
  );

  const sendMessage = useCallback(
    async (messages: ChatMessage[], personality = "motivational"): Promise<string> => {
      setIsLoading(true);
      setError(null);

      // In browser preview or if keys are not configured, provide high-quality motivational replies
      if (!isTauri() || (!settings.openRouterApiKey && !settings.geminiApiKey)) {
        setIsLoading(false);
        const lastUser = messages.filter((m) => m.role === "user").pop()?.content || "";
        const lower = lastUser.toLowerCase();

        if (lower.includes("tired") || lower.includes("sleep")) {
          return "That's completely normal. Splash some cold water, hydrate, and take the first 10 minutes gently. Momentum builds quickly once you start moving! 💧";
        }
        if (lower.includes("ready") || lower.includes("focus") || lower.includes("work")) {
          return "Love that energy! Lock in on your number one priority before distractions creep in. You've set the tone for an incredible day. 🚀";
        }
        if (lower.includes("lot") || lower.includes("busy") || lower.includes("stress")) {
          return "Breathe and pick just one high-leverage task. You don't have to conquer everything all at once — just win the next hour. You've got this! ✨";
        }
        return "Good morning! Focus on making progress today. Small consistent morning disciplines create massive long-term victories. Go make today count! 💪";
      }

      // Try OpenRouter first if configured
      if (settings.openRouterApiKey.trim()) {
        try {
          const res = await invoke<AIResponse>("send_ai_checkin", {
            messages,
            personality,
            apiKey: settings.openRouterApiKey,
            model: settings.openRouterModel || "google/gemini-flash-1.5",
          });
          setIsLoading(false);
          return res.message;
        } catch (openRouterErr) {
          console.warn("[AI Companion] OpenRouter failed, attempting fallback:", openRouterErr);
        }
      }

      // Fallback to direct Gemini
      if (settings.geminiApiKey.trim()) {
        try {
          const lastUserText =
            messages.filter((m) => m.role === "user").pop()?.content ||
            "Good morning companion";
          const res = await invoke<AIResponse>("send_gemini_message", {
            message: lastUserText,
            personality,
            apiKey: settings.geminiApiKey,
          });
          setIsLoading(false);
          return res.message;
        } catch (geminiErr) {
          console.warn("[AI Companion] Gemini fallback failed:", geminiErr);
        }
      }

      setIsLoading(false);
      return "You're up on time and the day is yours. Stay intentional and attack your key goals today! 🌟";
    },
    [settings.openRouterApiKey, settings.geminiApiKey, settings.openRouterModel]
  );

  return {
    isLoading,
    error,
    sendMessage,
    generateVoice,
    checkVoiceCache,
  };
}
