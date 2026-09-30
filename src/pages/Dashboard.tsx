import React, { useMemo, useEffect, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { DigitalClock } from "../components/ui/DigitalClock";
import { AlarmFormModal } from "../components/alarm/AlarmFormModal";
import { DeleteAlarmDialog } from "../components/alarm/DeleteAlarmDialog";
import { DailyGoalsCard } from "../components/productivity/DailyGoalsCard";
import { MorningBriefingCard } from "../components/ai/MorningBriefingCard";
import { useAlarmStore } from "../store/alarmStore";
import { useProductivityStore } from "../store/productivityStore";
import { usePowerStore } from "../store/powerStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatTime, getDayLabel, getNextFireLabel, getScoreGrade } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { dbGetTodayMorningBriefing, dbSaveMorningBriefing } from "../services/database";
import { generateOfflineBriefing } from "../services/offlineAiService";
import type { MorningBriefing, MorningContext } from "../lib/types";
import {
  CalendarDays,
  Plus,
  Flame,
  Sparkles,
  Bell,
  BellOff,
  ShieldCheck,
  Shield,
  Award,
  Layers,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { alarms, openAddModal } = useAlarmStore();
  const {
    currentStreak,
    longestStreak,
    streakSummary,
    todayStreak,
    weeklyStats,
    todayGoals,
    refreshAll,
  } = useProductivityStore();
  const { isAntiSleepActive } = usePowerStore();
  const { settings } = useSettingsStore();

  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  useEffect(() => {
    refreshAll();
    dbGetTodayMorningBriefing()
      .then((b) => setBriefing(b))
      .catch(() => {});
  }, [refreshAll]);

  const handleGenerateBriefing = async () => {
    setIsBriefingLoading(true);
    const context: MorningContext = {
      current_streak: currentStreak,
      today_goals: todayGoals.map((g) => g.text || g.goalText || ""),
      this_week_score: 90.0,
      alarm_label: alarms[0]?.label || "Rise & Build",
      snooze_count: 0,
      hour: alarms[0]?.hour || 7,
      minute: alarms[0]?.minute || 0,
      ai_personality: settings.aiPersonality || "motivational",
      alarm_id: alarms[0]?.id,
    };

    if (settings.offlineAiMode) {
      // 100% Offline Generation
      const offlineBriefing = generateOfflineBriefing(context);
      setBriefing(offlineBriefing);
      await dbSaveMorningBriefing(offlineBriefing).catch(() => {});
      setIsBriefingLoading(false);
      return;
    }

    try {
      const res = await invoke<MorningBriefing>("generate_morning_briefing", {
        context,
      });
      setBriefing(res);
      await dbSaveMorningBriefing(res).catch(() => {});
    } catch (err) {
      console.warn("Cloud morning briefing offline, using offline AI:", err);
      const fallback = generateOfflineBriefing(context);
      setBriefing(fallback);
      await dbSaveMorningBriefing(fallback).catch(() => {});
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const activeAlarms = useMemo(() => alarms.filter((a) => a.isActive), [alarms]);
  const activeCount = activeAlarms.length;
  const pausedCount = alarms.length - activeCount;

  // Next upcoming active alarm
  const nextAlarm = useMemo(() => {
    if (activeAlarms.length === 0) return null;
    return activeAlarms[0]; // Active alarms are sorted by time in store
  }, [activeAlarms]);

  const onTimeCount = streakSummary?.totalOnTime ?? weeklyStats?.dismissedOnTime ?? 5;
  const totalDays = streakSummary?.totalDaysTracked ?? weeklyStats?.totalAlarms ?? 7;
  const morningScore = todayStreak
    ? todayStreak.morningScore ?? todayStreak.morning_score ?? 85
    : streakSummary?.thisWeekScore || 85;
  const scoreInfo = getScoreGrade(morningScore);

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-6">
      {/* A. Greeting Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-800/60">
            Good Morning
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Ready to own your morning?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Set your rhythm, wake up with purpose, and build momentum one day at a time.
          </p>
        </div>

        {/* Right Date / Status Chips */}
        <div className="self-start sm:self-auto flex items-center gap-2.5">
          {/* Real Anti-Sleep Status Chip */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold transition-colors ${
              isAntiSleepActive
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {isAntiSleepActive ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Anti-Sleep: {isAntiSleepActive ? "ACTIVE" : "STANDBY"}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-200/60 dark:border-blue-900/40 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300">
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              {activeCount} Active · {pausedCount} Paused
            </span>
          </div>

          {/* Desktop HUD Widget Toggle Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                await invoke("toggle_desktop_widget");
              } catch (err) {
                console.error("Failed to toggle desktop widget:", err);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border text-xs font-bold bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 border-blue-300/80 dark:border-blue-500/30 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Launch or toggle Floating Desktop Widget HUD"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Desktop HUD</span>
          </button>
        </div>
      </section>

      {/* B. Hero Clock & Next Alarm Card */}
      <GlassCard className="relative overflow-hidden p-6 md:p-8">
        {/* Subtle Decorative Background Blob */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-24 w-64 h-64 rounded-full bg-sky-300/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Digital Clock */}
          <div className="lg:col-span-7">
            <DigitalClock />
          </div>

          {/* Vertical Divider (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 h-24 w-[1px] bg-gradient-to-b from-transparent via-blue-200 dark:via-blue-900/60 to-transparent mx-auto" />

          {/* Next Alarm Block (Reactive) */}
          <div className="lg:col-span-4 flex flex-col justify-between p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Next Alarm
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  nextAlarm
                    ? "bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-600/20 dark:border-blue-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                {nextAlarm ? "ARMED" : "NO ALARMS"}
              </span>
            </div>

            <div className="flex items-baseline justify-between my-1">
              {nextAlarm ? (
                <div>
                  <span className="digital-text text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {formatTime(nextAlarm.hour, nextAlarm.minute)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium mt-0.5">
                    {nextAlarm.label} • {getDayLabel(nextAlarm.days, nextAlarm.repeatPattern)}
                  </span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                    {getNextFireLabel(nextAlarm)}
                  </span>
                </div>
              ) : (
                <div className="py-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <BellOff className="w-4 h-4" />
                    <span className="text-sm font-medium">No active alarms</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Add an alarm to schedule your morning.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <GlowButton
                onClick={openAddModal}
                className="w-full text-xs font-semibold py-2"
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add New Alarm
              </GlowButton>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* C. Quick Overview Cards (3 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Wake-up Streak */}
        <GlassCard hoverable className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-500 border border-orange-200/50 dark:border-orange-800/50 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            </div>
          </div>
          <div className="digital-text text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentStreak} Days
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personal best: {longestStreak} days
          </p>
        </GlassCard>

        {/* 2. Today's Morning Score */}
        <GlassCard hoverable className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Morning Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="digital-text text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {morningScore}
            </div>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${scoreInfo.bg} ${scoreInfo.color}`}>
              Grade {scoreInfo.grade}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {scoreInfo.label} · Daily discipline rating
          </p>
        </GlassCard>

        {/* 3. Consistency */}
        <GlassCard hoverable className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Consistency
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="digital-text text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {onTimeCount} / {totalDays}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            On-time wake-ups logged
          </p>
        </GlassCard>
      </section>

      {/* D. Bottom Dashboard Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Today's Focus Intentions Card */}
        <div className="lg:col-span-7">
          <DailyGoalsCard compact={false} maxVisible={4} showAddInput={true} showViewAllLink={true} />
        </div>

        {/* Right: AI Morning Briefing Card */}
        <MorningBriefingCard
          briefing={briefing}
          isLoading={isBriefingLoading}
          onGenerateNew={handleGenerateBriefing}
          className="lg:col-span-5"
        />
      </section>

      {/* Modals & Dialogs for Dashboard */}
      <AlarmFormModal />
      <DeleteAlarmDialog />
    </div>
  );
};
