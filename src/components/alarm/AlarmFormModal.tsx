import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { GlowButton } from "../ui/GlowButton";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import {
  Bell,
  Pencil,
  Music2,
  ChevronUp,
  ChevronDown,
  Clock,
  Check,
  Play,
  AlertTriangle,
  Loader2,
  Mic,
  BellRing,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAlarmStore } from "../../store/alarmStore";
import { useAudioStore } from "../../store/audioStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useVoicePlayer } from "../../hooks/useVoicePlayer";
import type { DayOfWeek, RepeatPattern, AlarmFormData, AudioFile, VoicePersonality } from "../../lib/types";
import { VOICE_PERSONALITIES } from "../../lib/types";
import {
  DAYS_OF_WEEK,
  REPEAT_PATTERNS,
  SNOOZE_OPTIONS,
  SNOOZE_LIMIT_OPTIONS,
} from "../../lib/constants";
import { formatTime, validateAlarmForm } from "../../lib/utils";
import {
  pickAudioFile,
  copyAudioToLibrary,
  buildAudioFile,
} from "../../services/audioService";
import { WaveformTrimmer } from "../audio/WaveformTrimmer";
import { AudioPreviewPlayer } from "../audio/AudioPreviewPlayer";
import { BoostSlider } from "../audio/BoostSlider";
import { showToast } from "../ui/Toast";

export const AlarmFormModal: React.FC = () => {
  const {
    isModalOpen,
    modalMode,
    selectedAlarm,
    closeModal,
    addAlarm,
    updateAlarm,
    testFireAlarm,
  } = useAlarmStore();
  const { library, addToLibrary } = useAudioStore();
  const { settings } = useSettingsStore();
  const voicePlayer = useVoicePlayer();

  // Form State
  const [label, setLabel] = useState("Rise & Build");
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [repeatPattern, setRepeatPattern] = useState<RepeatPattern>("weekdays");
  const [days, setDays] = useState<DayOfWeek[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [volumeBoost, setVolumeBoost] = useState(150);
  const [fadeInEnabled, setFadeInEnabled] = useState(false);
  const [fadeInSeconds, setFadeInSeconds] = useState(10);
  const [snoozeDuration, setSnoozeDuration] = useState(10);
  const [snoozeLimit, setSnoozeLimit] = useState(3);
  const [mathChallenge, setMathChallenge] = useState(false);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0);
  const [isPickingAudio, setIsPickingAudio] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // AI Voice State
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [aiPersonality, setAiPersonality] = useState<VoicePersonality>("motivational");
  const [aiVoiceId, setAiVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [voiceCacheStatus, setVoiceCacheStatus] = useState<"unknown" | "cached" | "not_cached">("unknown");
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showScriptPreview, setShowScriptPreview] = useState(false);

  // Prefill or reset form on open
  useEffect(() => {
    if (isModalOpen) {
      if (modalMode === "edit" && selectedAlarm) {
        setLabel(selectedAlarm.label);
        setHour(selectedAlarm.hour);
        setMinute(selectedAlarm.minute);
        setRepeatPattern(selectedAlarm.repeatPattern);
        setDays(selectedAlarm.days || []);
        setVolumeBoost(selectedAlarm.volumeBoost || 150);
        setFadeInEnabled((selectedAlarm.fadeInSeconds || 0) > 0);
        setFadeInSeconds(selectedAlarm.fadeInSeconds || 10);
        setSnoozeDuration(selectedAlarm.snoozeDuration || 10);
        setSnoozeLimit(selectedAlarm.snoozeLimit || 3);
        setMathChallenge(selectedAlarm.mathChallenge || false);
        setAiVoiceEnabled(selectedAlarm.aiVoiceEnabled || false);
        setAiPersonality((selectedAlarm.aiPersonality as VoicePersonality) || "motivational");
        setAiVoiceId(selectedAlarm.aiVoiceId || settings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM");

        if (selectedAlarm.id && selectedAlarm.aiVoiceEnabled) {
          invoke<string | null>("get_voice_cache_path", { alarmId: selectedAlarm.id })
            .then((path) => setVoiceCacheStatus(path ? "cached" : "not_cached"))
            .catch(() => setVoiceCacheStatus("not_cached"));
        } else {
          setVoiceCacheStatus("unknown");
        }

        if (selectedAlarm.audioPath || selectedAlarm.audioFileName) {
          setAudioFile({
            path: selectedAlarm.audioPath || "",
            fileName: selectedAlarm.audioFileName || "Custom Audio",
            fileSize: 0,
            durationMs: selectedAlarm.audioEndMs || 180000,
            format: "mp3",
          });
          setTrimStartMs(selectedAlarm.audioStartMs || 0);
          setTrimEndMs(selectedAlarm.audioEndMs || 180000);
        } else {
          setAudioFile(null);
          setTrimStartMs(0);
          setTrimEndMs(0);
        }
      } else {
        // Default new alarm form
        setLabel("Rise & Build");
        setHour(7);
        setMinute(0);
        setRepeatPattern("weekdays");
        setDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
        setVolumeBoost(150);
        setFadeInEnabled(false);
        setFadeInSeconds(10);
        setSnoozeDuration(10);
        setSnoozeLimit(3);
        setMathChallenge(false);
        setAudioFile(null);
        setTrimStartMs(0);
        setTrimEndMs(0);
        setAiVoiceEnabled(settings.aiVoiceEnabled || false);
        setAiPersonality(settings.aiPersonality || "motivational");
        setAiVoiceId(settings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM");
        setVoiceCacheStatus("unknown");
      }
      setErrors([]);
    }
  }, [isModalOpen, modalMode, selectedAlarm, settings]);

  // Handle Repeat Pattern Selection
  const handlePatternChange = (pattern: RepeatPattern) => {
    setRepeatPattern(pattern);
    const patternConfig = REPEAT_PATTERNS.find((p) => p.value === pattern);
    if (patternConfig && pattern !== "custom") {
      setDays(patternConfig.days);
    }
  };

  // Toggle single day in custom pattern
  const toggleDay = (dayKey: DayOfWeek) => {
    if (days.includes(dayKey)) {
      setDays(days.filter((d) => d !== dayKey));
    } else {
      setDays([...days, dayKey]);
    }
  };

  // Increment / decrement helpers (1-minute precision)
  const incrementHour = () => setHour((prev) => (prev + 1) % 24);
  const decrementHour = () => setHour((prev) => (prev === 0 ? 23 : prev - 1));
  const incrementMinute = () => setMinute((prev) => (prev + 1) % 60);
  const decrementMinute = () => setMinute((prev) => (prev === 0 ? 59 : prev - 1));
  const incrementMinute5 = () => setMinute((prev) => (prev + 5) % 60);
  const decrementMinute5 = () => setMinute((prev) => (prev < 5 ? 55 : prev - 5));

  // Audio picker handlers
  const handleBrowseAudio = async () => {
    try {
      setIsPickingAudio(true);
      const pickedPath = await pickAudioFile();
      if (pickedPath) {
        const persistentPath = await copyAudioToLibrary(pickedPath);
        const built = await buildAudioFile(persistentPath);
        setAudioFile(built);
        setTrimStartMs(0);
        setTrimEndMs(built.durationMs || 180000);
        addToLibrary(built);
        showToast(`Loaded "${built.fileName}"`, "success");
      }
    } catch (err) {
      showToast("Could not load selected audio file", "danger");
    } finally {
      setIsPickingAudio(false);
    }
  };

  const handleSelectLibraryTrack = (trackId: string) => {
    const entry = library.find((t) => t.id === trackId);
    if (entry) {
      setAudioFile(entry.file);
      setTrimStartMs(entry.trimStartMs || 0);
      setTrimEndMs(entry.trimEndMs || entry.file.durationMs || 180000);
      setVolumeBoost(entry.volumeBoost || volumeBoost);
      setFadeInSeconds(entry.fadeInSeconds || fadeInSeconds);
      if (entry.fadeInSeconds > 0) setFadeInEnabled(true);
      showToast(`Selected "${entry.name}"`, "info");
    }
  };

  const handleAiVoiceToggle = async (enabled: boolean) => {
    if (enabled && !settings.elevenLabsApiKey?.trim()) {
      showToast("Configure your ElevenLabs API Key in Settings first", "warning");
      setAiVoiceEnabled(false);
      return;
    }
    setAiVoiceEnabled(enabled);

    if (enabled && selectedAlarm?.id) {
      setIsGeneratingVoice(true);
      showToast("Generating wake-up voice cache...", "info");
      try {
        await invoke("generate_and_cache_alarm_voice", {
          alarmId: selectedAlarm.id,
          alarmLabel: label,
          hour,
          minute,
          personality: aiPersonality,
          voiceId: aiVoiceId,
        });
        setVoiceCacheStatus("cached");
        showToast("Voice message ready & cached ✓", "success");
      } catch (err) {
        showToast(`Voice generation failed: ${err}`, "danger");
      } finally {
        setIsGeneratingVoice(false);
      }
    }
  };

  const handleHearPreview = async () => {
    if (!settings.elevenLabsApiKey?.trim()) {
      showToast("Configure your ElevenLabs API Key in Settings to hear preview", "warning");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const previewPath = await invoke<string>("generate_voice_preview", {
        apiKey: settings.elevenLabsApiKey,
        voiceId: aiVoiceId,
        personality: aiPersonality,
        alarmLabel: label,
      });
      showToast("Playing AI voice preview...", "info");
      await voicePlayer.playPreviewFile(previewPath, 100, () => {
        setIsPreviewLoading(false);
      });
    } catch (err) {
      showToast(`Preview failed: ${err}`, "danger");
      setIsPreviewLoading(false);
    }
  };

  const handleGenerateVoiceNow = async () => {
    if (!selectedAlarm?.id) {
      showToast("Save alarm first to generate individual voice cache", "info");
      return;
    }
    setIsGeneratingVoice(true);
    try {
      await invoke("generate_and_cache_alarm_voice", {
        alarmId: selectedAlarm.id,
        alarmLabel: label,
        hour,
        minute,
        personality: aiPersonality,
        voiceId: aiVoiceId,
      });
      setVoiceCacheStatus("cached");
      showToast("Voice generated & cached ✓", "success");
    } catch (err) {
      showToast(`Voice cache failed: ${err}`, "danger");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData: AlarmFormData = {
      label: label.trim(),
      hour,
      minute,
      isActive: true,
      repeatPattern,
      days,
      audioPath: audioFile?.path ?? null,
      audioFileName: audioFile?.fileName ?? null,
      audioStartMs: trimStartMs,
      audioEndMs: trimEndMs,
      volumeBoost,
      fadeInSeconds: fadeInEnabled ? fadeInSeconds : 0,
      snoozeDuration,
      snoozeLimit,
      mathChallenge,
      aiVoiceEnabled,
      aiPersonality,
      aiVoiceId,
    };

    const validationErrors = validateAlarmForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (modalMode === "edit" && selectedAlarm) {
      updateAlarm(selectedAlarm.id, formData);
      showToast("✓ Alarm updated", "success");
    } else {
      addAlarm(formData);
      showToast("✓ Alarm saved", "success");
    }

    closeModal();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-6 md:p-8 shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 border-b border-blue-500/10 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl gradient-blue flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            {modalMode === "add" ? (
              <Bell className="w-5 h-5" />
            ) : (
              <Pencil className="w-5 h-5" />
            )}
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {modalMode === "add" ? "New Alarm" : "Edit Alarm"}
            </DialogTitle>
            <p className="text-xs text-slate-400">
              Configure timing, repeat days, and wake-up challenges
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Validation Errors Box */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-300 space-y-1">
              {errors.map((err, idx) => (
                <p key={idx}>• {err}</p>
              ))}
            </div>
          )}

          {/* 1. Alarm Label */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alarm Label *
              </label>
              <span className="text-[10px] text-slate-400">
                {label.length} / 30
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={30}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Rise & Build"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>

          {/* 2. Digital Time Picker with Direct Typing & 1-Minute Precision */}
          <div className="p-5 rounded-3xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-700 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Set Wake-Up Time (Type or Click)
              </span>
              <label className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:text-blue-700">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px]">System Clock:</span>
                <input
                  type="time"
                  value={`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":");
                    if (h !== undefined && m !== undefined) {
                      setHour(parseInt(h, 10) || 0);
                      setMinute(parseInt(m, 10) || 0);
                    }
                  }}
                  className="w-24 px-1 py-0.5 text-xs border border-blue-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              {/* Hour Column (Editable) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementHour}
                  title="Hour +1"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={String(hour).padStart(2, "0")}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    if (clean === "") {
                      setHour(0);
                      return;
                    }
                    const val = parseInt(clean, 10);
                    setHour(Math.min(23, Math.max(0, val)));
                  }}
                  onFocus={(e) => e.target.select()}
                  title="Click to type hour (00-23)"
                  className="w-20 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-center digital-text text-3xl font-black text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-text hover:border-blue-300 dark:hover:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={decrementHour}
                  title="Hour -1"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <span className="digital-text text-3xl font-bold text-blue-600 dark:text-blue-400 pb-2 select-none">
                :
              </span>

              {/* Minute Column (Editable with 1-min precision) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementMinute}
                  title="Minute +1"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={String(minute).padStart(2, "0")}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    if (clean === "") {
                      setMinute(0);
                      return;
                    }
                    const val = parseInt(clean, 10);
                    setMinute(Math.min(59, Math.max(0, val)));
                  }}
                  onFocus={(e) => e.target.select()}
                  title="Click to type ANY exact minute (e.g. 41, 43, 17)"
                  className="w-20 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-center digital-text text-3xl font-black text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-text hover:border-blue-300 dark:hover:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={decrementMinute}
                  title="Minute -1"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Minute Jump Chips */}
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
              <button
                type="button"
                onClick={decrementMinute5}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={decrementMinute}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                -1m
              </button>
              <button
                type="button"
                onClick={incrementMinute}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                +1m
              </button>
              <button
                type="button"
                onClick={incrementMinute5}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                +5m
              </button>
            </div>

            {/* Live Formatted Time Preview */}
            <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-blue-200 dark:border-slate-700 shadow-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Preview: {formatTime(hour, minute)} (24h: {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")})</span>
            </div>
          </div>

          {/* 3. Repeat Pattern Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Repeat Schedule
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              {REPEAT_PATTERNS.map((p) => {
                const isSelected = repeatPattern === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePatternChange(p.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Day Toggle Buttons */}
            {repeatPattern === "custom" && (
              <div className="mt-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-1">
                {DAYS_OF_WEEK.map((d) => {
                  const isDaySelected = days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                        isDaySelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                      title={d.label}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Volume Boost Slider */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs">
            <BoostSlider
              value={volumeBoost}
              onChange={setVolumeBoost}
              showPresets={true}
            />
          </div>

          {/* 5. Fade In Toggle & Slider */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Fade In Volume
                </span>
                <span className="text-[11px] text-slate-400">
                  Gradually increase volume over time
                </span>
              </div>
              <Switch
                checked={fadeInEnabled}
                onCheckedChange={setFadeInEnabled}
              />
            </div>

            {fadeInEnabled && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Duration: {fadeInSeconds} seconds
                  </span>
                </div>
                <Slider
                  value={[fadeInSeconds]}
                  min={5}
                  max={60}
                  step={5}
                  onValueChange={(val) => setFadeInSeconds(val[0])}
                />
              </div>
            )}
          </div>

          {/* 6. Snooze Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Snooze Duration
              </label>
              <select
                value={snoozeDuration}
                onChange={(e) => setSnoozeDuration(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SNOOZE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} Minutes
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Max Snoozes
              </label>
              <select
                value={snoozeLimit}
                onChange={(e) => setSnoozeLimit(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SNOOZE_LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Time" : "Times"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. Math Challenge Dismiss */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div className="pr-4">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Require Math Challenge
              </span>
              <span className="text-[11px] text-slate-400 block leading-tight">
                Solve a math equation to dismiss the alarm. No lazy snoozing.
              </span>
            </div>
            <Switch
              checked={mathChallenge}
              onCheckedChange={setMathChallenge}
            />
          </div>

          {/* 8. Audio & Sound Engine Section */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Music2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Alarm Sound & Waveform
                  </span>
                  <span className="text-[10px] text-slate-400">
                    MP3 · WAV · FLAC · OGG supported
                  </span>
                </div>
              </div>

              {audioFile && (
                <button
                  type="button"
                  onClick={() => {
                    setAudioFile(null);
                    setTrimStartMs(0);
                    setTrimEndMs(0);
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Remove Sound
                </button>
              )}
            </div>

            {audioFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      🎵 {audioFile.fileName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-blue-200 dark:border-slate-700">
                      {audioFile.format}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseAudio}
                    className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-2"
                  >
                    Change
                  </button>
                </div>

                {/* Waveform Trimmer */}
                <WaveformTrimmer
                  audioFilePath={audioFile.path}
                  trimStartMs={trimStartMs}
                  trimEndMs={trimEndMs}
                  onTrimChange={(start, end) => {
                    setTrimStartMs(start);
                    setTrimEndMs(end);
                  }}
                  onDurationLoaded={(dur) => {
                    if (trimEndMs === 0 || trimEndMs > dur) {
                      setTrimEndMs(dur);
                    }
                  }}
                />

                {/* Audio Preview Player */}
                <AudioPreviewPlayer
                  audioFile={audioFile}
                  trimStartMs={trimStartMs}
                  trimEndMs={trimEndMs}
                  volumeBoost={volumeBoost}
                  fadeInSeconds={fadeInEnabled ? fadeInSeconds : 0}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-6 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-700 bg-blue-50/20 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center">
                  <Music2 className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    No custom audio selected
                  </span>
                  <p className="text-[11px] text-slate-400 mb-3 max-w-xs">
                    Upload your favorite MP3 or select an energetic wake-up track
                    from your sound library.
                  </p>
                  <button
                    type="button"
                    onClick={handleBrowseAudio}
                    disabled={isPickingAudio}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Music2 className="w-3.5 h-3.5" />
                    <span>{isPickingAudio ? "Browsing..." : "Browse PC Audio Files"}</span>
                  </button>
                </div>

                {/* Quick Select from Sound Library */}
                {library.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Or pick from Sound Library:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {library.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectLibraryTrack(track.id)}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-all"
                        >
                          🎵 {track.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 9. AI Voice Companion Section */}
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-slate-700 bg-blue-50/30 dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    AI Wake-Up Voice
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Spoken morning motivation before your alarm song plays
                  </span>
                </div>
              </div>
              <Switch
                checked={aiVoiceEnabled}
                onCheckedChange={handleAiVoiceToggle}
              />
            </div>

            {/* Warning if ElevenLabs API key not configured */}
            {!settings.elevenLabsApiKey?.trim() && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  ElevenLabs API key is not configured. Go to{" "}
                  <strong>Settings &rarr; AI Voice Companion</strong> to add your key.
                </span>
              </div>
            )}

            {aiVoiceEnabled && (
              <div className="space-y-3.5 pt-2 border-t border-blue-100 dark:border-slate-700 animate-in fade-in duration-200">
                {/* Personality Segmented Pills */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    Voice Personality
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VOICE_PERSONALITIES.map((p) => {
                      const isSelected = aiPersonality === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setAiPersonality(p.value)}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-base mb-0.5">{p.emoji}</div>
                          <div className="text-xs font-bold leading-none">{p.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview & Status Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isPreviewLoading || !settings.elevenLabsApiKey?.trim()}
                    onClick={handleHearPreview}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    {isPreviewLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Preview...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-blue-600 dark:fill-blue-400" />
                        <span>Hear Preview</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {voiceCacheStatus === "cached" ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Voice Cached
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Pre-caches at 23:45
                      </span>
                    )}

                    {selectedAlarm?.id && (
                      <button
                        type="button"
                        disabled={isGeneratingVoice || !settings.elevenLabsApiKey?.trim()}
                        onClick={handleGenerateVoiceNow}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        {isGeneratingVoice ? "Generating..." : "⚡ Generate Now"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Script Preview Expandable */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowScriptPreview(!showScriptPreview)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>{showScriptPreview ? "Hide script preview ↑" : "Show script preview ↓"}</span>
                  </button>

                  {showScriptPreview && (
                    <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 italic">
                      &ldquo;Good morning. It is 7:00 AM. Time for {label}. You are 5 days into your streak. Keep building. Rise with purpose.&rdquo;
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400">
                  ~180 characters will be used from your monthly ElevenLabs quota.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer: Cancel & Submit Buttons */}
          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between">
            {selectedAlarm ? (
              <button
                type="button"
                onClick={() => {
                  testFireAlarm(selectedAlarm);
                  closeModal();
                }}
                className="px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Test fire this alarm immediately"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Test Alarm</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <GlowButton type="button" variant="ghost" onClick={closeModal}>
                Cancel
              </GlowButton>
              <GlowButton type="submit" icon={<Check className="w-4 h-4" />}>
                {modalMode === "add" ? "Save Alarm" : "Update Alarm"}
              </GlowButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
