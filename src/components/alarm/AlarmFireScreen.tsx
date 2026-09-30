import React, { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAlarmStore } from "../../store/alarmStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useProductivityStore } from "../../store/productivityStore";
import { GlowButton } from "../ui/GlowButton";
import { VoiceCompanion } from "../ai/VoiceCompanion";
import { MorningCheckin } from "../ai/MorningCheckin";
import { MorningBriefingCard } from "../ai/MorningBriefingCard";
import { useVoicePlayer } from "../../hooks/useVoicePlayer";
import { useAlarmAudio } from "../../hooks/useAlarmAudio";
import {
  BellRing,
  Calculator,
  Clock,
  Check,
  AlertCircle,
  Flame,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { MorningBriefing, MorningContext } from "../../lib/types";

export const AlarmFireScreen: React.FC = () => {
  const { firingAlarm, dismissAlarm, setFiringAlarm, snoozeAlarm, firingSnoozeCount } =
    useAlarmStore();
  const { settings } = useSettingsStore();
  const { loadStreaks, currentStreak, todayGoals } = useProductivityStore();

  const voicePlayer = useVoicePlayer();

  const [snoozeCount, setSnoozeCount] = useState(firingSnoozeCount || 0);
  const [voiceFinished, setVoiceFinished] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);

  useEffect(() => {
    if (firingAlarm) {
      setSnoozeCount(firingSnoozeCount || 0);
    }
  }, [firingAlarm, firingSnoozeCount]);

  // Post-dismiss state (shows Briefing & Check-in launch)
  const [isPostDismiss, setIsPostDismiss] = useState(false);
  const [showAICheckin, setShowAICheckin] = useState(false);
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Math Challenge State
  const [mathAnswerInput, setMathAnswerInput] = useState("");
  const [mathError, setMathError] = useState(false);

  const hasFiredVoiceRef = useRef(false);

  // Generate math challenge
  const mathChallenge = useMemo(() => {
    if (!firingAlarm?.mathChallenge) return null;
    const diff = settings.mathChallengeDifficulty || "easy";

    let n1 = 7;
    let n2 = 8;
    let op = "+";
    let ans = 15;

    if (diff === "hard") {
      n1 = Math.floor(Math.random() * 12) + 11;
      n2 = Math.floor(Math.random() * 8) + 3;
      op = "×";
      ans = n1 * n2;
    } else if (diff === "medium") {
      n1 = Math.floor(Math.random() * 40) + 15;
      n2 = Math.floor(Math.random() * 30) + 12;
      op = "+";
      ans = n1 + n2;
    } else {
      n1 = Math.floor(Math.random() * 9) + 4;
      n2 = Math.floor(Math.random() * 9) + 5;
      op = "+";
      ans = n1 + n2;
    }

    return { question: `${n1} ${op} ${n2} = ?`, answer: ans };
  }, [firingAlarm, settings.mathChallengeDifficulty]);

  // Play voice first if enabled, then alarm audio
  useEffect(() => {
    if (!firingAlarm) {
      hasFiredVoiceRef.current = false;
      setIsVoicePlaying(false);
      setVoiceFinished(false);
      setIsPostDismiss(false);
      setShowAICheckin(false);
      return;
    }

    const aiVoiceActive = Boolean(
      firingAlarm.aiVoiceEnabled || settings.aiVoiceEnabled
    );

    if (aiVoiceActive && !hasFiredVoiceRef.current) {
      hasFiredVoiceRef.current = true;
      setIsVoicePlaying(true);
      setVoiceFinished(false);

      voicePlayer.playVoiceForAlarm(
        firingAlarm.id,
        firingAlarm.volumeBoost || 150,
        () => {
          setIsVoicePlaying(false);
          setVoiceFinished(true);
        }
      );
    } else if (!aiVoiceActive) {
      setVoiceFinished(true);
      setIsVoicePlaying(false);
    }
  }, [firingAlarm, settings.aiVoiceEnabled, voicePlayer]);

  // Main alarm music audio plays once voice is finished or disabled
  const shouldPlayAlarmAudio =
    Boolean(firingAlarm) && !isPostDismiss && (voiceFinished || !settings.aiVoiceEnabled);

  useAlarmAudio(firingAlarm, shouldPlayAlarmAudio);

  // Background fetch of morning briefing when dismissed
  useEffect(() => {
    if (isPostDismiss && firingAlarm) {
      const fetchBriefing = async () => {
        setIsBriefingLoading(true);
        const context: MorningContext = {
          current_streak: currentStreak,
          today_goals: todayGoals.map((g) => g.text || g.goalText || ""),
          this_week_score: 90.0,
          alarm_label: firingAlarm.label,
          snooze_count: snoozeCount,
          hour: firingAlarm.hour,
          minute: firingAlarm.minute,
          ai_personality: firingAlarm.aiPersonality || settings.aiPersonality || "motivational",
          alarm_id: firingAlarm.id,
        };

        try {
          const res = await invoke<MorningBriefing>("generate_morning_briefing", {
            context,
          });
          setBriefing(res);
        } catch (e) {
          console.warn("Could not generate briefing:", e);
        } finally {
          setIsBriefingLoading(false);
        }
      };

      fetchBriefing();
    }
  }, [isPostDismiss]);

  if (!firingAlarm && !showAICheckin) return null;

  // Active full-screen AI Morning Check-in modal
  if (showAICheckin && firingAlarm) {
    return (
      <MorningCheckin
        alarmLabel={firingAlarm.label}
        hour={firingAlarm.hour}
        minute={firingAlarm.minute}
        snoozeCount={snoozeCount}
        onClose={() => {
          setShowAICheckin(false);
          setIsPostDismiss(false);
          setFiringAlarm(null);
        }}
      />
    );
  }

  if (!firingAlarm) return null;

  const handleDismiss = async () => {
    if (firingAlarm.mathChallenge && mathChallenge) {
      const parsed = parseInt(mathAnswerInput.trim(), 10);
      if (parsed !== mathChallenge.answer) {
        setMathError(true);
        return;
      }
    }

    voicePlayer.stop();

    // Dismiss in store (logs to SQLite wake_log & alarm_history)
    await dismissAlarm(snoozeCount);
    await loadStreaks();

    // Transition to post-dismiss screen
    setIsPostDismiss(true);
  };

  const handleSnooze = () => {
    const limit = firingAlarm.snoozeLimit || settings.defaultSnoozeLimit || 3;
    if (snoozeCount >= limit) return;

    voicePlayer.stop();
    snoozeAlarm(firingAlarm, firingAlarm.snoozeDuration, snoozeCount);
    console.log(
      `[Snooze] Snoozed for ${firingAlarm.snoozeDuration} minutes (snooze #${snoozeCount + 1})`
    );
  };

  const snoozeLimit = firingAlarm.snoozeLimit || settings.defaultSnoozeLimit || 3;
  const canSnooze = snoozeCount < snoozeLimit;

  // ─────────────────────────────────────────────────────────────
  // POST-DISMISS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isPostDismiss) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
        <div className="w-full max-w-lg space-y-6">
          {/* Dismissed badge */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/15 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold">Alarm Dismissed</h2>
                <p className="text-xs text-slate-300">
                  {firingAlarm.label} • {String(firingAlarm.hour).padStart(2, "0")}:
                  {String(firingAlarm.minute).padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
              <span>{currentStreak}d Streak</span>
            </div>
          </div>

          {/* Morning Briefing Card */}
          <MorningBriefingCard
            briefing={briefing}
            isLoading={isBriefingLoading}
            onGenerateNew={() => {
              setIsBriefingLoading(true);
              setBriefing(null);
              // Trigger reload
              const context: MorningContext = {
                current_streak: currentStreak,
                today_goals: todayGoals.map((g) => g.text || g.goalText || ""),
                this_week_score: 90.0,
                alarm_label: firingAlarm.label,
                snooze_count: snoozeCount,
                hour: firingAlarm.hour,
                minute: firingAlarm.minute,
                ai_personality: firingAlarm.aiPersonality || "motivational",
                alarm_id: firingAlarm.id,
              };
              invoke<MorningBriefing>("generate_morning_briefing", { context })
                .then(setBriefing)
                .finally(() => setIsBriefingLoading(false));
            }}
          />

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAICheckin(true)}
              className="flex-1 py-3.5 px-5 rounded-2xl gradient-blue text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Morning Check-in</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPostDismiss(false);
                setFiringAlarm(null);
              }}
              className="py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ACTIVE ALARM FIRING SCREEN
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-300">
      {/* Pulsing Bell Avatar */}
      <div className="animate-bounce mb-5">
        <div className="w-24 h-24 rounded-3xl gradient-blue flex items-center justify-center text-white shadow-2xl shadow-blue-500/50">
          <BellRing className="w-12 h-12 animate-pulse" />
        </div>
      </div>

      {/* Orbitron Clock Header */}
      <h1 className="digital-text text-7xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-widest mb-1 drop-shadow-xs">
        {String(firingAlarm.hour).padStart(2, "0")}:{String(firingAlarm.minute).padStart(2, "0")}
      </h1>

      <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 tracking-wide">
        {firingAlarm.label}
      </p>

      {/* Streak & Motivation Indicator */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold shadow-xs">
          <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
          <span>{currentStreak > 0 ? `${currentStreak}-Day Streak Active!` : "Start Day 1 Streak!"}</span>
        </div>
        {todayGoals.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs">
            <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{todayGoals.length} Intentions Set</span>
          </div>
        )}
      </div>

      {/* AI Voice Companion Speaking Card */}
      {(firingAlarm.aiVoiceEnabled || settings.aiVoiceEnabled) && (
        <div className="mb-6 w-full max-w-sm">
          <VoiceCompanion
            alarmId={firingAlarm.id}
            alarmLabel={firingAlarm.label}
            personality={firingAlarm.aiPersonality}
            variant="fire"
            isSpeaking={isVoicePlaying}
          />
        </div>
      )}

      {/* Math Challenge Box */}
      {firingAlarm.mathChallenge && mathChallenge && (
        <div className="mb-6 p-5 rounded-2xl bg-blue-50/80 dark:bg-slate-900/80 border border-blue-200/80 dark:border-slate-700 shadow-md max-w-xs w-full text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            <Calculator className="w-4 h-4" />
            <span>Math Dismiss Challenge</span>
          </div>

          <div className="digital-text text-3xl font-black text-slate-900 dark:text-white">
            {mathChallenge.question}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={mathAnswerInput}
              onChange={(e) => {
                setMathAnswerInput(e.target.value);
                setMathError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDismiss();
              }}
              placeholder="Your answer"
              autoFocus
              className="w-full text-center font-mono text-base font-bold py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {mathError && (
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incorrect answer, try again!</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 max-w-md w-full">
        {canSnooze && (
          <button
            type="button"
            onClick={handleSnooze}
            className="flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Snooze ({firingAlarm.snoozeDuration}m)</span>
          </button>
        )}

        <GlowButton
          onClick={handleDismiss}
          className="flex-1 min-w-[160px] px-8 py-4 text-base font-bold rounded-2xl shadow-xl shadow-blue-500/30"
          icon={<Check className="w-5 h-5" />}
        >
          {firingAlarm.mathChallenge ? "Solve & Wake Up" : "Dismiss Alarm"}
        </GlowButton>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
        HyperAlarm Pro Anti-Sleep Guardian is holding your system awake.
      </p>
    </div>
  );
};
