import React, { useState, useEffect } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { BoostSlider } from "../components/audio/BoostSlider";
import { useSettingsStore } from "../store/settingsStore";
import { usePowerStore } from "../store/powerStore";
import { useVoicePlayer } from "../hooks/useVoicePlayer";
import { MorningCheckin } from "../components/ai/MorningCheckin";
import { MorningBriefingCard } from "../components/ai/MorningBriefingCard";
import {
  SNOOZE_OPTIONS,
  SNOOZE_LIMIT_OPTIONS,
  ELEVENLABS_VOICES,
} from "../lib/constants";
import {
  GROQ_MODELS,
  OPENROUTER_MODELS,
  VOICE_PERSONALITIES,
  type ElevenLabsSubscription,
  type OpenRouterKeyInfo,
  type ElevenLabsVoice,
  type MorningBriefing,
  type VoiceCacheResult,
  type VoicePersonality,
} from "../lib/types";
import { Switch } from "../components/ui/switch";
import {
  Sliders,
  Power,
  KeyRound,
  Info,
  Check,
  ShieldCheck,
  Shield,
  Bot,
  Laptop,
  Mic,
  Volume2,
  Eye,
  EyeOff,
  Bell,
  Download,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  RefreshCw,
  Trash2,
  ExternalLink,
  Zap,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Palette,
  Radio,
  Cpu,
  WifiOff,
} from "lucide-react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { invoke } from "@tauri-apps/api/core";
import { dbExportHistoryCsv } from "../services/database";
import { useTheme } from "../hooks/useTheme";
import { AppLogo } from "../components/ui/AppLogo";
import {
  checkVoiceboxHealth,
  getVoiceboxProfiles,
  speakVoiceboxText,
  type VoiceboxProfile,
  type VoiceboxHealth,
} from "../services/voiceboxService";
import { generateOfflineBriefing } from "../services/offlineAiService";

type SettingsTab = "ai" | "audio" | "behavior" | "system";

export const Settings: React.FC = () => {
  const { settings, updateSetting, updateSettings } = useSettingsStore();
  const { isAntiSleepActive, toggleAntiSleep } = usePowerStore();
  const { theme, setTheme } = useTheme();
  const voicePlayer = useVoicePlayer();

  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Key reveal toggles
  const [showElevenKey, setShowElevenKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Voicebox Studio State
  const [voiceboxHealth, setVoiceboxHealth] = useState<VoiceboxHealth | null>(null);
  const [voiceboxProfiles, setVoiceboxProfiles] = useState<VoiceboxProfile[]>([]);
  const [isVoiceboxChecking, setIsVoiceboxChecking] = useState(false);
  const [isVoiceboxTesting, setIsVoiceboxTesting] = useState(false);
  const [voiceboxTestText, setVoiceboxTestText] = useState("Habari ya asubuhi! Amka uanze siku kwa nguvu na ushindi.");

  // ElevenLabs State
  const [elevenSub, setElevenSub] = useState<ElevenLabsSubscription | null>(null);
  const [elevenStatus, setElevenStatus] = useState<"idle" | "validating" | "valid" | "invalid" | "quota">("idle");
  const [elevenVoices, setElevenVoices] = useState<ElevenLabsVoice[]>([]);
  const [previewAlarmLabel, setPreviewAlarmLabel] = useState("Rise & Build");
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [isPreCaching, setIsPreCaching] = useState(false);
  const [lastPreCacheTime, setLastPreCacheTime] = useState<string>("Today at 23:45");

  // Groq State
  const [groqStatus, setGroqStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  // OpenRouter State
  const [openRouterInfo, setOpenRouterInfo] = useState<OpenRouterKeyInfo | null>(null);
  const [openRouterStatus, setOpenRouterStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  // Gemini State
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  // Interactive AI Testing
  const [isTestingCheckin, setIsTestingCheckin] = useState(false);
  const [briefingTest, setBriefingTest] = useState<MorningBriefing | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  // Test Tone playing state
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);

  // Real autostart status
  const [realAutostart, setRealAutostart] = useState(settings.startOnBoot);

  const refreshVoicebox = async () => {
    setIsVoiceboxChecking(true);
    try {
      const health = await checkVoiceboxHealth();
      setVoiceboxHealth(health);
      if (health.isOnline) {
        const profiles = await getVoiceboxProfiles();
        setVoiceboxProfiles(profiles);
        if (profiles.length > 0 && !settings.voiceboxProfileId) {
          updateSetting("voiceboxProfileId", profiles[0].id);
          updateSetting("voiceboxProfileName", profiles[0].name);
        }
      }
    } catch (err) {
      console.warn("Failed checking Voicebox:", err);
    } finally {
      setIsVoiceboxChecking(false);
    }
  };

  useEffect(() => {
    refreshVoicebox();
  }, []);

  useEffect(() => {
    isEnabled()
      .then((status) => setRealAutostart(status))
      .catch(() => {});
  }, []);

  const showToast = (message: string) => {
    setSaveToast(message);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleAutostartToggle = async () => {
    try {
      if (realAutostart) {
        await disable();
        setRealAutostart(false);
        updateSetting("startOnBoot", false);
        showToast("Autostart disabled");
      } else {
        await enable();
        setRealAutostart(true);
        updateSetting("startOnBoot", true);
        showToast("Autostart enabled");
      }
    } catch (err) {
      console.warn("Autostart toggle failed:", err);
      showToast("Autostart not supported in dev mode");
    }
  };

  // ElevenLabs
  const handleValidateElevenLabs = async () => {
    if (!settings.elevenLabsApiKey.trim()) {
      showToast("Please enter an ElevenLabs API key");
      return;
    }
    setElevenStatus("validating");
    try {
      const sub = await invoke<ElevenLabsSubscription>("validate_elevenlabs_key", {
        apiKey: settings.elevenLabsApiKey.trim(),
      });
      setElevenSub(sub);
      setElevenStatus(sub.character_count >= sub.character_limit ? "quota" : "valid");

      const voices = await invoke<ElevenLabsVoice[]>("get_elevenlabs_voices", {
        apiKey: settings.elevenLabsApiKey.trim(),
      });
      setElevenVoices(voices);
      showToast("Connected to ElevenLabs successfully! ✓");
    } catch (err) {
      setElevenStatus("invalid");
      showToast(`Validation error: ${err}`);
    }
  };

  const handlePlayVoicePreview = async () => {
    if (!settings.elevenLabsApiKey.trim()) {
      showToast("Please enter an ElevenLabs API key");
      return;
    }
    setIsPreviewGenerating(true);
    try {
      const filePath = await invoke<string>("generate_voice_preview", {
        apiKey: settings.elevenLabsApiKey.trim(),
        voiceId: settings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM",
        personality: settings.aiPersonality || "motivational",
        alarmLabel: previewAlarmLabel || "Rise & Build",
      });
      showToast("Playing voice preview...");
      await voicePlayer.playPreviewFile(filePath, 100, () => {
        setIsPreviewGenerating(false);
      });
    } catch (err) {
      showToast(`Preview failed: ${err}`);
      setIsPreviewGenerating(false);
    }
  };

  const handleRefreshVoiceCache = async () => {
    setIsPreCaching(true);
    try {
      const res = await invoke<VoiceCacheResult>("pre_cache_voice_messages");
      setLastPreCacheTime("Just now");
      showToast(`Cache update: ${res.success} ready, ${res.skipped} skipped, ${res.failed} failed`);
    } catch (err) {
      showToast(`Cache update failed: ${err}`);
    } finally {
      setIsPreCaching(false);
    }
  };

  const handleClearVoiceCache = async () => {
    try {
      await invoke("cleanup_voice_cache");
      showToast("Voice cache cleared");
    } catch (err) {
      showToast(`Could not clear cache: ${err}`);
    }
  };

  // Groq
  const handleValidateGroq = async () => {
    const key = settings.groqApiKey || "";
    if (!key.trim()) {
      showToast("Please enter a Groq API key");
      return;
    }
    setGroqStatus("validating");
    try {
      const valid = await invoke<boolean>("validate_groq_key", { apiKey: key.trim() });
      if (valid) {
        setGroqStatus("valid");
        showToast("Connected to Groq successfully! ✓ (Ultra-fast LPU active)");
      } else {
        setGroqStatus("invalid");
        showToast("Groq API key is invalid");
      }
    } catch {
      setGroqStatus("invalid");
      showToast("Failed to connect to Groq");
    }
  };

  // OpenRouter
  const handleValidateOpenRouter = async () => {
    if (!settings.openRouterApiKey.trim()) {
      showToast("Please enter an OpenRouter API key");
      return;
    }
    setOpenRouterStatus("validating");
    try {
      const info = await invoke<OpenRouterKeyInfo>("validate_openrouter_key", {
        apiKey: settings.openRouterApiKey.trim(),
      });
      setOpenRouterInfo(info);
      setOpenRouterStatus(info.is_valid ? "valid" : "invalid");
      showToast(info.is_valid ? "Connected to OpenRouter! ✓" : "Invalid OpenRouter key");
    } catch {
      setOpenRouterStatus("invalid");
      showToast("Failed to connect to OpenRouter");
    }
  };

  // Gemini
  const handleValidateGemini = async () => {
    if (!settings.geminiApiKey.trim()) {
      showToast("Please enter a Gemini API key");
      return;
    }
    setGeminiStatus("validating");
    try {
      const valid = await invoke<boolean>("validate_gemini_key", {
        apiKey: settings.geminiApiKey.trim(),
      });
      setGeminiStatus(valid ? "valid" : "invalid");
      showToast(valid ? "Connected to Google Gemini! ✓" : "Invalid Gemini key");
    } catch {
      setGeminiStatus("invalid");
      showToast("Failed to connect to Gemini");
    }
  };

  // Voicebox Test
  const handleTestVoicebox = async () => {
    setIsVoiceboxTesting(true);
    try {
      const targetProfile = voiceboxProfiles.find((p) => p.id === settings.voiceboxProfileId) || voiceboxProfiles[0];
      await speakVoiceboxText(voiceboxTestText, targetProfile?.name || "Noellyne");
      showToast("Voicebox speech triggered ✓");
    } catch (err) {
      showToast(`Voicebox test error: ${err}`);
    } finally {
      setIsVoiceboxTesting(false);
    }
  };

  // Test Briefing
  const handleGenerateBriefingNow = async () => {
    setIsGeneratingBriefing(true);
    try {
      if (settings.offlineAiMode) {
        const offline = generateOfflineBriefing({
          current_streak: 7,
          today_goals: ["Finish top priority goal", "Hydrate and stretch 60s"],
          this_week_score: 92.0,
          alarm_label: "Rise & Build",
          snooze_count: 0,
          hour: 6,
          minute: 30,
          ai_personality: settings.aiPersonality || "motivational",
        });
        setBriefingTest(offline);
        showToast("Offline Morning Briefing generated! (0ms latency) ✓");
        return;
      }
      const res = await invoke<MorningBriefing>("generate_morning_briefing", {
        context: {
          current_streak: 7,
          today_goals: ["Finish top priority goal", "Hydrate and stretch 60s"],
          this_week_score: 92.0,
          alarm_label: "Rise & Build",
          snooze_count: 0,
          hour: 6,
          minute: 30,
          ai_personality: settings.aiPersonality || "motivational",
        },
      });
      setBriefingTest(res);
      showToast("Today's Morning Briefing generated! ✓");
    } catch (err) {
      console.warn("Cloud briefing failed, using offline briefing:", err);
      const offline = generateOfflineBriefing({
        current_streak: 7,
        today_goals: ["Finish top priority goal", "Hydrate and stretch 60s"],
        this_week_score: 92.0,
        alarm_label: "Rise & Build",
        snooze_count: 0,
        hour: 6,
        minute: 30,
        ai_personality: settings.aiPersonality || "motivational",
      });
      setBriefingTest(offline);
      showToast("Offline Morning Briefing ready (Cloud unreachable) ✓");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const playTestTone = () => {
    try {
      setIsPlayingTestTone(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.value = (settings.defaultVolumeBoost || 150) / 100;
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);

      setTimeout(() => {
        setIsPlayingTestTone(false);
      }, 1200);
    } catch (e) {
      console.warn("Test audio error:", e);
      setIsPlayingTestTone(false);
    }
  };

  const handleExportData = async () => {
    try {
      const csv = await dbExportHistoryCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `hyperalarm_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Data export downloaded ✓");
    } catch {
      showToast("Export failed");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-800/60">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure AI companions, audio amplification, alarm behavior, and system startup.
          </p>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold shadow-xs animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ai"
              ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm shadow-blue-500/10"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Companion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "audio"
              ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm shadow-blue-500/10"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio Defaults</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("behavior")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "behavior"
              ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm shadow-blue-500/10"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alarm Behavior</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "system"
              ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm shadow-blue-500/10"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Power className="w-4 h-4" />
          <span>System & About</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: AI COMPANION (VOICEBOX + ELEVENLABS + GROQ + OPENROUTER + GEMINI)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {/* VOICE SYNTHESIS ENGINE & OFFLINE INTELLIGENCE */}
          <GlassCard className="p-6 space-y-6 border-indigo-200 dark:border-indigo-900/50 shadow-xl bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/30 dark:from-slate-900/90 dark:via-slate-900 dark:to-indigo-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      Voice Engine &amp; Offline Intelligence
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      100% Offline Capable
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose local neural Voicebox for zero-network playback, or cloud ElevenLabs when online
                  </p>
                </div>
              </div>

              {/* Master Offline AI Mode Switch */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs self-start sm:self-auto">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                      Offline AI Mode
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Zero cloud API calls
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.offlineAiMode ?? true}
                  onCheckedChange={(checked: boolean) => {
                    updateSetting("offlineAiMode", checked);
                    showToast(`Offline AI Mode ${checked ? "Enabled (0ms latency)" : "Disabled (Cloud active)"}`);
                  }}
                />
              </div>
            </div>

            {/* Voice Engine Picker Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Primary Voice Synthesis Engine
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Voicebox Card */}
                <div
                  onClick={() => {
                    updateSetting("voiceEngine", "voicebox");
                    showToast("Switched to Voicebox Studio (Offline Neural TTS)");
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    (settings.voiceEngine ?? "voicebox") === "voicebox"
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/40"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Voicebox Studio
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Local
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Uses local PyTorch Kokoro engine &amp; custom cloned voices. Zero data quota, works without internet.
                  </p>
                </div>

                {/* ElevenLabs Card */}
                <div
                  onClick={() => {
                    updateSetting("voiceEngine", "elevenlabs");
                    showToast("Switched to ElevenLabs Cloud AI");
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    settings.voiceEngine === "elevenlabs"
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/40"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ElevenLabs AI
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      Cloud
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ultra-realistic cloud neural voices. Pre-cached nightly. Requires active internet &amp; character quota.
                  </p>
                </div>

                {/* System Speech Card */}
                <div
                  onClick={() => {
                    updateSetting("voiceEngine", "system");
                    showToast("Switched to System Offline Speech");
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    settings.voiceEngine === "system"
                      ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/40"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      System Speech
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      Native
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Built-in Windows / Web Speech API synthesizer. Instant fallback on any device with zero configuration.
                  </p>
                </div>
              </div>
            </div>

            {/* Voicebox Dedicated Configuration Panel */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-indigo-200/70 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Local Voicebox Studio Status:
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    voiceboxHealth?.isOnline
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}>
                    {voiceboxHealth?.isOnline
                      ? `Online (127.0.0.1:17493) • ${voiceboxHealth.backend || "Kokoro PyTorch"}`
                      : "Voicebox App Standby • Ready via Native Speech Fallback"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={refreshVoicebox}
                  disabled={isVoiceboxChecking}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVoiceboxChecking ? "animate-spin" : ""}`} />
                  <span>Check Voicebox</span>
                </button>
              </div>

              {/* Profile Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Voicebox Profile / Speaker
                  </label>
                  <select
                    value={settings.voiceboxProfileId || (voiceboxProfiles[0]?.id || "voicebox-local-kokoro")}
                    onChange={(e) => {
                      const sel = voiceboxProfiles.find((p) => p.id === e.target.value);
                      updateSetting("voiceboxProfileId", e.target.value);
                      if (sel) {
                        updateSetting("voiceboxProfileName", sel.name);
                        showToast(`Voicebox profile set to "${sel.name}"`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    {voiceboxProfiles.length > 0 ? (
                      voiceboxProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.engine ? `(${p.engine})` : ""} {p.voiceType ? `• ${p.voiceType}` : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="voicebox-local-kokoro">Noellyne (Kokoro: af_bella)</option>
                        <option value="voicebox-clone-mwijat">Mwijat (Voice Clone)</option>
                        <option value="voicebox-local-system">Default Native System Voice</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Voicebox App Location
                  </label>
                  <div className="px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 font-mono text-slate-600 dark:text-slate-400 truncate">
                    C:\Users\MWIJAY TECH\Desktop\PROJECTS\voicebox
                  </div>
                </div>
              </div>

              {/* Test Voicebox Audio */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-slate-950/50 border border-indigo-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
                    Test Voicebox Offline Speech
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                    0ms latency • No internet needed
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voiceboxTestText}
                    onChange={(e) => setVoiceboxTestText(e.target.value)}
                    placeholder="Enter Swahili or English phrase to speak..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={isVoiceboxTesting}
                    onClick={handleTestVoicebox}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isVoiceboxTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Speaking...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Hear Voicebox</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ELEVENLABS AI VOICE COMPANION */}
          <GlassCard className="p-6 space-y-5 border-blue-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>ElevenLabs AI Voice Wake-up</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-800">
                      Phase 8
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-clarity spoken wake-up message generated and pre-cached nightly at 23:45
                  </p>
                </div>
              </div>

              {/* Master AI Voice Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {settings.aiVoiceEnabled ? "Active" : "Disabled"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !settings.aiVoiceEnabled;
                    updateSetting("aiVoiceEnabled", next);
                    showToast(`AI Voice wake-up ${next ? "enabled" : "disabled"}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.aiVoiceEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.aiVoiceEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  ElevenLabs API Key
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                  Stored in local SQLite settings • Key NEVER exposed to frontend
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showElevenKey ? "text" : "password"}
                    value={settings.elevenLabsApiKey}
                    onChange={(e) => updateSetting("elevenLabsApiKey", e.target.value)}
                    placeholder="sk_..."
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowElevenKey(!showElevenKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showElevenKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleValidateElevenLabs}
                  disabled={elevenStatus === "validating"}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {elevenStatus === "validating" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : elevenStatus === "valid" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : elevenStatus === "invalid" ? (
                    <XCircle className="w-4 h-4 text-red-300" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{elevenStatus === "validating" ? "Validating..." : "Validate Key"}</span>
                </button>
              </div>

              {/* Status Message */}
              {elevenStatus === "valid" && elevenSub && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Connected — {elevenSub.character_limit - elevenSub.character_count} chars remaining ({elevenSub.tier} tier)
                  </span>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 underline font-semibold flex items-center gap-1"
                  >
                    <span>Upgrade</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {elevenStatus === "invalid" && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>Invalid ElevenLabs API key. Please double-check your key.</span>
                </div>
              )}

              {elevenStatus === "quota" && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Quota exceeded for this billing cycle on ElevenLabs.</span>
                </div>
              )}
            </div>

            {/* Character Quota Bar */}
            {elevenSub && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Monthly Character Quota</span>
                  <span>
                    {elevenSub.character_count.toLocaleString()} / {elevenSub.character_limit.toLocaleString()} chars
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (elevenSub.character_count / (elevenSub.character_limit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Voice Dropdown & Personality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Default AI Voice
                </label>
                <select
                  value={settings.elevenLabsVoiceId}
                  onChange={(e) => {
                    updateSetting("elevenLabsVoiceId", e.target.value);
                    showToast("Default voice updated");
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {(elevenVoices.length > 0 ? elevenVoices : ELEVENLABS_VOICES).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.description ? `(${v.description})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Default Wake-up Personality
                </label>
                <select
                  value={settings.aiPersonality}
                  onChange={(e) => {
                    updateSetting("aiPersonality", e.target.value as VoicePersonality);
                    showToast("Personality updated");
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {VOICE_PERSONALITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.emoji} {p.label} — {p.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Voice Preview Section */}
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-slate-900/50 border border-blue-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                  Test Voice Generation
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">~180 chars used per test</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={previewAlarmLabel}
                  onChange={(e) => setPreviewAlarmLabel(e.target.value)}
                  placeholder="Preview alarm label (e.g. Rise & Build)"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                <button
                  type="button"
                  disabled={isPreviewGenerating || !settings.elevenLabsApiKey.trim()}
                  onClick={handlePlayVoicePreview}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isPreviewGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Audio...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Hear Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pre-Cache Controls & Auto-Cache Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPreCaching || !settings.elevenLabsApiKey.trim()}
                  onClick={handleRefreshVoiceCache}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPreCaching ? "animate-spin" : ""}`} />
                  <span>Refresh Voice Cache Now</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearVoiceCache}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Clear old cached voice files"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Auto-cache nightly at 23:45 ({lastPreCacheTime})
                </span>
                <Switch
                  checked={settings.autoCacheNightly !== false}
                  onCheckedChange={(checked: boolean) => {
                    updateSetting("autoCacheNightly", checked);
                    showToast(`Nightly pre-caching ${checked ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
            </div>

            {/* How AI Voice Works Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>How AI Wake-up Voice Works</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Every night at 23:45, HyperAlarm Pro pre-generates personalized audio for your next-day alarms.</li>
                <li>When the alarm fires, the AI voice plays instantly with zero API latency, followed by your custom music.</li>
                <li>Your API keys remain on your machine inside SQLite — never transmitted to third-party tracking servers.</li>
              </ol>
            </div>
          </GlassCard>

          {/* GROQ LPU INFERENCE (ULTRA-FAST MORNING CHAT) */}
          <GlassCard className="p-6 space-y-5 border-blue-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Groq LPU AI Engine</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-extrabold border border-orange-200 dark:border-orange-800">
                      Ultra-Fast LPU
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-speed token streaming (~300 to 800+ tok/s) for instantaneous morning check-ins
                  </p>
                </div>
              </div>

              {groqStatus === "valid" && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  LPU Connected ✓
                </span>
              )}
            </div>

            {/* Groq API Key Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  Groq API Key
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                  Runs via Rust reqwest SSE stream
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGroqKey ? "text" : "password"}
                    value={settings.groqApiKey || ""}
                    onChange={(e) => updateSetting("groqApiKey", e.target.value)}
                    placeholder="Enter your Groq API key"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleValidateGroq}
                  disabled={groqStatus === "validating"}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {groqStatus === "validating" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : groqStatus === "valid" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{groqStatus === "validating" ? "Validating..." : "Validate Groq"}</span>
                </button>
              </div>
            </div>

            {/* Groq Model Selector with Speed Badges */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Groq Model Selection
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {GROQ_MODELS.map((m) => {
                  const isSelected = (settings.groqModel || "llama-3.3-70b-versatile") === m.value;
                  return (
                    <div
                      key={m.value}
                      onClick={() => {
                        updateSetting("groqModel", m.value);
                        showToast(`Groq model set to ${m.label}`);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-500 shadow-md shadow-orange-500/10 ring-1 ring-orange-500"
                          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {m.label}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 shrink-0">
                          {m.speed}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* OPENROUTER & GEMINI FALLBACK */}
          <GlassCard className="p-6 space-y-5 border-blue-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>OpenRouter &amp; Google Gemini</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200 dark:border-indigo-800">
                      Phase 9
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Secondary unified gateway and direct fallback for conversational morning check-in
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {settings.aiCompanionEnabled ? "Active" : "Disabled"}
                </span>
                <Switch
                  checked={settings.aiCompanionEnabled}
                  onCheckedChange={(checked: boolean) => {
                    updateSetting("aiCompanionEnabled", checked);
                    showToast(`Morning Check-in ${checked ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
            </div>

            {/* Keys Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OpenRouter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>OpenRouter API Key</span>
                    {openRouterStatus === "validating" && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </span>
                    )}
                    {openRouterStatus === "valid" && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-semibold">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                    {openRouterStatus === "invalid" && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-0.5 font-semibold">
                        <XCircle className="w-3 h-3" /> Invalid
                      </span>
                    )}
                  </div>
                  {openRouterInfo?.credits_remaining !== null && openRouterInfo?.credits_remaining !== undefined && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      ${openRouterInfo.credits_remaining.toFixed(2)} remaining
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showOpenRouterKey ? "text" : "password"}
                      value={settings.openRouterApiKey}
                      onChange={(e) => updateSetting("openRouterApiKey", e.target.value)}
                      placeholder="Enter your OpenRouter API key"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleValidateOpenRouter}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shrink-0"
                  >
                    Validate
                  </button>
                </div>
              </div>

              {/* Gemini Direct */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Google Gemini API Key (Direct)</span>
                    {geminiStatus === "validating" && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </span>
                    )}
                    {geminiStatus === "valid" && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-semibold">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                    {geminiStatus === "invalid" && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-0.5 font-semibold">
                        <XCircle className="w-3 h-3" /> Invalid
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Flash 1.5</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={settings.geminiApiKey}
                      onChange={(e) => updateSetting("geminiApiKey", e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleValidateGemini}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shrink-0"
                  >
                    Validate
                  </button>
                </div>
              </div>
            </div>

            {/* OpenRouter Model Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                OpenRouter Model
              </label>
              <select
                value={settings.openRouterModel}
                onChange={(e) => {
                  updateSetting("openRouterModel", e.target.value);
                  showToast("OpenRouter model updated");
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                {OPENROUTER_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} — {m.description} {m.isFree ? "(Free)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Behavior Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Show Check-in on Alarm Fire Screen
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Offers morning conversational check-in directly when alarm is dismissed
                  </span>
                </div>
                <Switch
                  checked={settings.showCheckinOnFire !== false}
                  onCheckedChange={(checked: boolean) => {
                    updateSetting("showCheckinOnFire", checked);
                    showToast(`Post-alarm check-in ${checked ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
            </div>

            {/* Test AI Controls */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-900/50 border border-indigo-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Live AI Testing
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Preview without waiting for alarm</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTestingCheckin(true)}
                  className="px-4 py-2 rounded-xl gradient-blue text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-102 active:scale-98 transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>▶ Test Morning Check-in</span>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingBriefing}
                  onClick={handleGenerateBriefingNow}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingBriefing ? "animate-spin" : ""}`} />
                  <span>Generate Today&apos;s Briefing Now</span>
                </button>
              </div>

              {briefingTest && (
                <div className="pt-2">
                  <MorningBriefingCard briefing={briefingTest} />
                </div>
              )}
            </div>
          </GlassCard>

          {/* Test Check-in Modal */}
          {isTestingCheckin && (
            <MorningCheckin
              alarmLabel="Morning Routine"
              hour={7}
              minute={0}
              mockContext={true}
              onClose={() => setIsTestingCheckin(false)}
            />
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: AUDIO DEFAULTS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "audio" && (
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Audio Defaults</h2>
                <p className="text-xs text-slate-400">
                  Global volume boost ceiling, fade-in transitions, and snooze duration
                </p>
              </div>
            </div>

            {/* Volume Boost Slider */}
            <div>
              <BoostSlider
                value={settings.defaultVolumeBoost}
                onChange={(val) => {
                  updateSetting("defaultVolumeBoost", val);
                  showToast("Default volume boost saved");
                }}
              />
            </div>

            {/* Audio Test Box */}
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Verify Volume Amplification
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Play a 1.2-second test tone through the Web Audio GainNode at {settings.defaultVolumeBoost}%
                </span>
              </div>
              <button
                type="button"
                onClick={playTestTone}
                disabled={isPlayingTestTone}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingTestTone ? "animate-ping" : ""}`} />
                <span>{isPlayingTestTone ? "Testing..." : "Test Tone"}</span>
              </button>
            </div>

            {/* Snooze & Fade-in Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default Snooze Duration
                </label>
                <select
                  value={settings.defaultSnoozeDuration}
                  onChange={(e) => {
                    updateSetting("defaultSnoozeDuration", Number(e.target.value));
                    showToast("Snooze duration saved");
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {SNOOZE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default Fade-in Duration
                </label>
                <select
                  value={settings.defaultFadeInSeconds}
                  onChange={(e) => {
                    updateSetting("defaultFadeInSeconds", Number(e.target.value));
                    showToast("Fade-in saved");
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  <option value={0}>0 seconds (Instant full volume)</option>
                  <option value={2}>2 seconds (Gentle rise)</option>
                  <option value={5}>5 seconds (Smooth ramp)</option>
                  <option value={10}>10 seconds (Gradual wake)</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ALARM BEHAVIOR
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "behavior" && (
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Alarm Behavior</h2>
                <p className="text-xs text-slate-400">
                  Dismissal challenges, snooze limits, and display styles
                </p>
              </div>
            </div>

            {/* Alarm Firing Style */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Alarm Firing Mode
                </span>
                <span className="text-[11px] text-slate-400">
                  Full screen immersive takeover or discrete native notification
                </span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    updateSetting("alarmStyle", "fullscreen");
                    showToast("Mode set to Fullscreen Takeover");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    settings.alarmStyle === "fullscreen"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Fullscreen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSetting("alarmStyle", "notification");
                    showToast("Mode set to Notification");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    settings.alarmStyle === "notification"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Notification
                </button>
              </div>
            </div>

            {/* Math Challenge Difficulty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Math Challenge Difficulty
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Forces cognitive activation to prevent mindless snooze clicking
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {settings.defaultMathChallenge ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !settings.defaultMathChallenge;
                      updateSetting("defaultMathChallenge", next);
                      showToast(`Math Challenge by default ${next ? "on" : "off"}`);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.defaultMathChallenge ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.defaultMathChallenge ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { id: "easy", name: "Easy", ex: "7 + 8 = 15" },
                  { id: "medium", name: "Medium", ex: "34 + 19 = 53" },
                  { id: "hard", name: "Hard", ex: "14 × 6 = 84" },
                ].map((item) => {
                  const isSel = settings.mathChallengeDifficulty === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        updateSetting("mathChallengeDifficulty", item.id as any);
                        showToast(`Math difficulty set to ${item.name}`);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSel
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-1 ring-blue-500"
                          : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                        Ex: {item.ex}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Max Snooze Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Default Maximum Snooze Limit
              </label>
              <select
                value={settings.defaultSnoozeLimit}
                onChange={(e) => {
                  updateSetting("defaultSnoozeLimit", Number(e.target.value));
                  showToast("Snooze limit saved");
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {SNOOZE_LIMIT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c} time{c > 1 ? "s" : ""} maximum per alarm
                  </option>
                ))}
              </select>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SYSTEM, TRAY & DATA MANAGEMENT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "system" && (
        <div className="space-y-6">
          {/* Appearance & Theme Section */}
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Appearance & Theme</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch between deep obsidian dark mode, crisp light mode, or match Windows
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Dark Mode Option */}
              <div
                onClick={() => {
                  setTheme("dark");
                  showToast("Switched to Dark Mode 🌙");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  theme === "dark"
                    ? "bg-slate-900 border-blue-500 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/40"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-blue-400" />
                  </div>
                  {theme === "dark" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                </div>
                <span className="text-xs font-bold text-white block">Dark Mode (Recommended)</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Deep obsidian, vibrant neon blue accents, easy on the eyes.
                </span>
              </div>

              {/* Light Mode Option */}
              <div
                onClick={() => {
                  setTheme("light");
                  showToast("Switched to Light Mode ☀️");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  theme === "light"
                    ? "bg-white border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/40"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  {theme === "light" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Light Mode</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Clean white and electric blue morning palette.
                </span>
              </div>

              {/* System Option */}
              <div
                onClick={() => {
                  setTheme("system");
                  showToast("Theme set to Match Windows 💻");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  theme === "system"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/40"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-sky-500" />
                  </div>
                  {theme === "system" && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">System (Auto)</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Synchronizes with your Windows OS dark/light mode automatically.
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">System Integration</h2>
                <p className="text-xs text-slate-400">
                  Windows boot startup, system tray behavior, and OS power control
                </p>
              </div>
            </div>

            {/* Windows Autostart */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Start on Windows Boot
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Registers HyperAlarm Pro in Windows startup to arm scheduled alarms automatically
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutostartToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  realAutostart ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    realAutostart ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Minimize to System Tray on Close
                </span>
                <span className="text-[11px] text-slate-400">
                  Closing the window leaves HyperAlarm Pro running in the Windows background
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.minimizeToTray;
                  updateSetting("minimizeToTray", next);
                  showToast(`Minimize to tray ${next ? "enabled" : "disabled"}`);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.minimizeToTray ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.minimizeToTray ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Anti-Sleep Guardian */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isAntiSleepActive
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isAntiSleepActive ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Anti-Sleep Guardian
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                        isAntiSleepActive
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {isAntiSleepActive ? "ACTIVE" : "STANDBY"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Uses Win32 SetThreadExecutionState to prevent PC sleep while alarms are armed
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAntiSleep}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAntiSleepActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isAntiSleepActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </GlassCard>

          {/* Data Management Section */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Data Management</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportData}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All History (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset all settings to default values?")) {
                    updateSettings({
                      defaultVolumeBoost: 150,
                      defaultSnoozeDuration: 10,
                      defaultSnoozeLimit: 3,
                      defaultMathChallenge: false,
                      aiCompanionEnabled: false,
                      aiVoiceEnabled: false,
                    });
                    showToast("Settings reset to defaults");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 transition-colors border border-red-200 dark:border-red-900/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Settings to Default</span>
              </button>
            </div>
          </GlassCard>

          {/* App Info Card */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3.5">
              <AppLogo size={42} animate className="shadow-md shadow-blue-500/25" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">HyperAlarm Pro</h3>
                  <span className="text-[10px] font-extrabold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-md">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  “Wake up. Level up.” • Desktop Edition for Windows 10/11
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Engine:</span> Tauri v2 + Rust + Web Audio GainNode
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Voice:</span> ElevenLabs TTS Pre-caching
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Check-in:</span> Gemini 1.5 & OpenRouter
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Persistence:</span> SQLite WAL Mode
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
