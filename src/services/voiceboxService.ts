/**
 * Voicebox Local Voice & Offline AI Service
 * Integrates with Voicebox (local-first AI voice studio running on http://127.0.0.1:17493)
 * Provides 100% offline voice cloning, speech synthesis, and local TTS playback.
 */

export interface VoiceboxProfile {
  id: string;
  name: string;
  description?: string;
  engine?: string;
  voiceType?: "preset" | "cloned" | "import";
  language?: string;
}

export interface VoiceboxHealth {
  isOnline: boolean;
  version?: string;
  backend?: string;
  gpu?: string;
  message?: string;
}

export const VOICEBOX_PORT = 17493;
export const VOICEBOX_BASE_URL = `http://127.0.0.1:${VOICEBOX_PORT}`;

// Default profiles present in the user's local Voicebox database (Mwijay Tech)
export const DEFAULT_VOICEBOX_PROFILES: VoiceboxProfile[] = [
  {
    id: "7f9e3a94-926d-4b8d-8fc9-931ee2691bfa",
    name: "Noellyne",
    description: "Default assistant voice for Mwijay Tech setup (Kokoro engine)",
    engine: "kokoro",
    voiceType: "preset",
    language: "en",
  },
  {
    id: "c1895a33-b639-4dec-bc7b-ab0d0c1e1697",
    name: "Mwijat",
    description: "Personal Cloned Voice (Zero-shot offline clone)",
    engine: "cloned",
    voiceType: "cloned",
    language: "en",
  },
  {
    id: "kokoro-bella",
    name: "Bella (Kokoro Offline)",
    description: "Natural, warm & clear morning companion",
    engine: "kokoro",
    voiceType: "preset",
    language: "en",
  },
  {
    id: "kokoro-adam",
    name: "Adam (Kokoro Offline)",
    description: "Deep, commanding & motivational tone",
    engine: "kokoro",
    voiceType: "preset",
    language: "en",
  },
];

/**
 * Check if the local Voicebox server is running and healthy on port 17493.
 */
export async function checkVoiceboxHealth(): Promise<VoiceboxHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`${VOICEBOX_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        isOnline: true,
        version: data.version || "0.5.0",
        backend: data.backend || "local",
        gpu: data.gpu || "DirectML/CPU",
        message: "Voicebox Local Studio is Active & Ready",
      };
    }
    return {
      isOnline: false,
      message: `Voicebox returned HTTP ${res.status}`,
    };
  } catch {
    return {
      isOnline: false,
      message: "Voicebox is not currently running on port 17493",
    };
  }
}

/**
 * Fetch available voice profiles from the local Voicebox REST API.
 * Falls back to local database defaults if the server is offline.
 */
export async function getVoiceboxProfiles(): Promise<VoiceboxProfile[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${VOICEBOX_BASE_URL}/profiles`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          engine: p.default_engine || p.preset_engine || "kokoro",
          voiceType: p.voice_type || "preset",
          language: p.language || "en",
        }));
      }
    }
  } catch {
    // Voicebox offline — fallback gracefully
  }

  return DEFAULT_VOICEBOX_PROFILES;
}

/**
 * Synthesize speech via Voicebox local server with polling.
 * If Voicebox is offline, uses the native Web Speech API fallback.
 */
export async function generateVoiceboxSpeech(
  profileId: string,
  text: string,
  language: string = "en"
): Promise<{ audioUrl?: string; duration?: number; fallbackPlayed?: boolean }> {
  // 1. Try Voicebox local server
  try {
    const genRes = await fetch(`${VOICEBOX_BASE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        text,
        language,
      }),
    });

    if (genRes.ok) {
      const genData = await genRes.json();
      const genId = genData.id;

      // Poll up to 10 seconds for generation
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const statusRes = await fetch(`${VOICEBOX_BASE_URL}/audio/${genId}`, {
          method: "HEAD",
        });
        if (statusRes.ok) {
          const audioUrl = `${VOICEBOX_BASE_URL}/audio/${genId}`;
          return { audioUrl, duration: genData.duration || 5 };
        }
      }
    }
  } catch (err) {
    console.warn("[Voicebox] Local server generation unavailable, falling back:", err);
  }

  // 2. Offline fallback: Native Web Speech API
  await speakNativeOffline(text);
  return { fallbackPlayed: true };
}

/**
 * Trigger immediate speech via Voicebox `/speak` endpoint or native system fallback.
 */
export async function speakVoiceboxText(
  text: string,
  profileName: string = "Noellyne"
): Promise<boolean> {
  try {
    const res = await fetch(`${VOICEBOX_BASE_URL}/speak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voicebox-Client-Id": "hyperalarm-pro",
      },
      body: JSON.stringify({
        profile: profileName,
        text,
      }),
    });

    if (res.ok) {
      return true;
    }
  } catch {
    // Voicebox offline
  }

  // Fallback to native Web Speech API
  return speakNativeOffline(text);
}

/**
 * 100% Offline Native System Speech Synthesis (zero dependencies, works on any Windows/Mac machine)
 */
export function speakNativeOffline(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      // Pick a natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const natural = voices.find(
        (v) =>
          v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Zira") ||
          v.name.includes("David")
      );
      if (natural) utterance.voice = natural;

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}
