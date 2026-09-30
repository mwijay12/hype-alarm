import React, { useEffect, useMemo, useState } from "react";
import { StreakCounter } from "../components/productivity/StreakCounter";
import { MorningScoreRing } from "../components/productivity/MorningScoreRing";
import { WeeklyChart } from "../components/productivity/WeeklyChart";
import { GoalsList } from "../components/productivity/GoalsList";
import { HabitHeatmap } from "../components/productivity/HabitHeatmap";
import { useProductivityStore } from "../store/productivityStore";
import { generateProductivityInsights } from "../lib/insightGenerator";
import { seedDemoHabitData } from "../lib/mockDataSeeder";
import {
  Sparkles,
  RefreshCw,
  Database,
  Zap,
} from "lucide-react";

export const Productivity: React.FC = () => {
  const {
    currentStreak,
    longestStreak,
    streakSummary,
    streakHistory,
    todayStreak,
    todayGoals,
    refreshAll,
    isLoading,
  } = useProductivityStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg(null);
    try {
      const res = await seedDemoHabitData();
      await refreshAll();
      setSeedSuccessMsg(`Successfully seeded ${res.daysSeeded} days of demo habit data!`);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Failed to seed demo data:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Generate smart insights
  const insights = useMemo(() => {
    return generateProductivityInsights(streakHistory, streakSummary);
  }, [streakHistory, streakSummary]);

  // Today's stats calculation
  const todayGoalsCompleted = todayGoals.filter((g) => g.isCompleted || g.completed).length;
  const todayScore = todayStreak
    ? todayStreak.morningScore ?? todayStreak.morning_score ?? 0
    : streakSummary?.thisWeekScore || 85;

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-800">
              Productivity Hub
            </span>
            <span className="text-xs font-semibold text-slate-400">· Phase 7</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Habits & Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build unshakeable morning discipline, track consistency streaks, and master daily goals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshAll()}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            title="Refresh habit analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            title="Populate 90 days of realistic habit history"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSeeding ? "Seeding..." : "Seed 90d Demo"}</span>
          </button>
        </div>
      </div>

      {/* Success banner if seeded */}
      {seedSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* Hero Overview Grid: Streak Counter & Morning Score Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Streak Card (7 cols) */}
        <div className="lg:col-span-7">
          <StreakCounter
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            showMilestones={true}
          />
        </div>

        {/* Morning Score Ring Card (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-center items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 self-start flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Today's Discipline Rating</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 self-start">
            Computed from wake punctuality, snoozes, and goal completion
          </p>

          <MorningScoreRing
            score={todayScore}
            size={150}
            strokeWidth={13}
            showDetails={true}
            wokeOnTime={todayStreak?.wokeOnTime ?? true}
            goalsCompleted={todayGoalsCompleted}
            goalsTotal={todayGoals.length}
            alarmsSnoozed={todayStreak?.alarmsSnoozed ?? 0}
          />
        </div>
      </div>

      {/* Middle Grid: Weekly Chart & Daily Goals List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Chart (7 cols) */}
        <div className="lg:col-span-7">
          <WeeklyChart streaks={streakHistory} />
        </div>

        {/* Daily Goals List (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
          <GoalsList showTitle={true} compact={false} showAddInput={true} />
        </div>
      </div>

      {/* Annual Heatmap Section (52 Weeks) */}
      <section>
        <HabitHeatmap />
      </section>

      {/* Smart Productivity Insights Section */}
      <section className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Habit Insights & Observations</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized data observations calculated from your waking history
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800">
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
