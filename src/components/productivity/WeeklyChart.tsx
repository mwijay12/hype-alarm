import React, { useState, useMemo } from "react";
import type { HabitStreak } from "../../lib/types";
import { TrendingUp } from "lucide-react";

interface WeeklyChartProps {
  streaks: HabitStreak[];
  period?: "week" | "month";
  onPeriodChange?: (period: "week" | "month") => void;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  streaks = [],
  period: controlledPeriod,
  onPeriodChange,
}) => {
  const [internalPeriod, setInternalPeriod] = useState<"week" | "month">("week");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentPeriod = controlledPeriod ?? internalPeriod;
  const setPeriod = (p: "week" | "month") => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  const daysCount = currentPeriod === "week" ? 7 : 30;

  // Build the continuous day array ending today
  const chartData = useMemo(() => {
    const today = new Date();
    const result: Array<{
      date: string;
      label: string;
      score: number;
      wokeOnTime: boolean;
      goalsCompleted: number;
      goalsTotal: number;
      snoozes: number;
    }> = [];

    const streakMap = new Map<string, HabitStreak>();
    streaks.forEach((s) => {
      streakMap.set(s.date, s);
    });

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().split("T")[0];
      const match = streakMap.get(dateStr);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const label = currentPeriod === "week" ? dayNames[d.getDay()] : `${d.getDate()}`;

      result.push({
        date: dateStr,
        label,
        score: match ? (match.morningScore ?? match.morning_score ?? 0) : 0,
        wokeOnTime: match ? Boolean(match.wokeOnTime ?? match.woke_on_time) : false,
        goalsCompleted: match ? (match.goalsCompleted ?? match.goals_completed ?? 0) : 0,
        goalsTotal: match ? (match.goalsTotal ?? match.goals_total ?? 0) : 0,
        snoozes: match ? (match.alarmsSnoozed ?? match.alarms_snoozed ?? 0) : 0,
      });
    }

    return result;
  }, [streaks, daysCount, currentPeriod]);

  // Calculations
  const averageScore = useMemo(() => {
    const scoredDays = chartData.filter((d) => d.score > 0);
    if (scoredDays.length === 0) return 0;
    const sum = scoredDays.reduce((acc, d) => acc + d.score, 0);
    return Math.round(sum / scoredDays.length);
  }, [chartData]);

  const onTimeCount = chartData.filter((d) => d.wokeOnTime).length;
  const totalGoals = chartData.reduce((acc, d) => acc + d.goalsTotal, 0);
  const compGoals = chartData.reduce((acc, d) => acc + d.goalsCompleted, 0);
  const goalRate = totalGoals > 0 ? Math.round((compGoals / totalGoals) * 100) : 0;

  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500 hover:bg-emerald-400";
    if (score >= 65) return "bg-blue-600 hover:bg-blue-500";
    if (score >= 50) return "bg-amber-500 hover:bg-amber-400";
    if (score > 0) return "bg-rose-500 hover:bg-rose-400";
    return "bg-slate-200";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      {/* Header with period toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">Morning Performance</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily morning scores and consistency trends
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currentPeriod === "week"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currentPeriod === "month"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-48 sm:h-56 w-full pt-6 pb-2">
        {/* Average Line */}
        {averageScore > 0 && (
          <div
            className="absolute left-0 right-0 border-b border-dashed border-blue-400/60 z-10 pointer-events-none flex items-center"
            style={{ bottom: `${Math.min(95, Math.max(8, (averageScore / 100) * 80 + 10))}%` }}
          >
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50/90 px-1.5 py-0.5 rounded ml-2 shadow-xs">
              Avg: {averageScore}
            </span>
          </div>
        )}

        {/* Bars Container */}
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-full px-2">
          {chartData.map((d, index) => {
            const heightPercent = Math.max(6, Math.min(100, d.score));
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={d.date}
                className="relative flex-1 flex flex-col items-center h-full justify-end group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-20 z-30 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-xl text-xs whitespace-nowrap pointer-events-none transform -translate-y-2 transition-all">
                    <div className="font-bold text-slate-200">{d.date}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-emerald-400">Score: {d.score}/100</span>
                      <span>·</span>
                      <span className={d.wokeOnTime ? "text-blue-300" : "text-amber-300"}>
                        {d.wokeOnTime ? "On-Time" : "Late"}
                      </span>
                    </div>
                    {d.goalsTotal > 0 && (
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Goals: {d.goalsCompleted}/{d.goalsTotal} · Snoozes: {d.snoozes}
                      </div>
                    )}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900" />
                  </div>
                )}

                {/* The Bar */}
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ease-out cursor-pointer ${getBarColor(
                    d.score
                  )} ${isHovered ? "ring-2 ring-blue-500 ring-offset-2 scale-105" : ""}`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Day Label */}
                <span
                  className={`text-[10px] font-semibold mt-2 truncate ${
                    isHovered ? "text-blue-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Metrics Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">Period Average</span>
          <div className="text-lg font-black text-blue-600 mt-0.5">{averageScore} / 100</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">On-Time Wakes</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">
            {onTimeCount} / {daysCount}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">Goal Completion</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">{goalRate}%</div>
        </div>
      </div>
    </div>
  );
};
