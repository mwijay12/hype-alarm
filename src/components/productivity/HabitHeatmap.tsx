import React, { useMemo, useState } from "react";
import { useProductivityStore } from "../../store/productivityStore";
import type { HabitStreak } from "../../lib/types";
import { getScoreGrade } from "../../lib/utils";
import { Calendar, Flame } from "lucide-react";

export const HabitHeatmap: React.FC = () => {
  const { streakHistory, heatmapData, streakSummary } = useProductivityStore();

  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    score: number;
    wokeOnTime: boolean;
    goalsCompleted: number;
    goalsTotal: number;
    alarmsSnoozed: number;
    x: number;
    y: number;
  } | null>(null);

  // Map of streak history by date "YYYY-MM-DD"
  const streakMap = useMemo(() => {
    const map = new Map<string, HabitStreak>();
    streakHistory.forEach((s) => {
      map.set(s.date, s);
    });
    // Also include legacy heatmapData if streakHistory is empty
    if (map.size === 0 && heatmapData.length > 0) {
      heatmapData.forEach((d) => {
        map.set(d.date, {
          date: d.date,
          wokeOnTime: d.value === 2,
          alarmsFired: 1,
          alarmsSnoozed: d.value === 1 ? 1 : 0,
          goalsCompleted: 2,
          goalsTotal: 2,
          morningScore: d.value === 2 ? 85 : d.value === 1 ? 55 : 0,
        });
      });
    }
    return map;
  }, [streakHistory, heatmapData]);

  // Generate 52 weeks (364 days) aligned Mon-Sun ending with the current week
  const { columns, monthHeaders } = useMemo(() => {
    const today = new Date();
    // Find current day of week (0=Sun, 1=Mon, ..., 6=Sat)
    // In our matrix: row 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    const currentDayOfWeek = today.getDay();
    const daysSinceMonday = (currentDayOfWeek + 6) % 7;

    // End on upcoming Sunday (or today if Sunday)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - daysSinceMonday));

    const totalDays = 52 * 7;
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    const cols: Array<
      Array<{
        date: string;
        dateObj: Date;
        score: number;
        wokeOnTime: boolean;
        goalsCompleted: number;
        goalsTotal: number;
        alarmsSnoozed: number;
        level: number;
        isToday: boolean;
        isFuture: boolean;
      }>
    > = [];

    const monthStarts: Array<{ colIndex: number; label: string }> = [];
    let lastMonth = -1;

    const todayStr = today.toISOString().split("T")[0];

    for (let c = 0; c < 52; c++) {
      const colDays = [];
      for (let r = 0; r < 7; r++) {
        const dayIndex = c * 7 + r;
        const currentD = new Date(startDate);
        currentD.setDate(startDate.getDate() + dayIndex);

        const dateStr = currentD.toISOString().split("T")[0];
        const isToday = dateStr === todayStr;
        const isFuture = currentD.getTime() > today.getTime();

        const match = streakMap.get(dateStr);
        const score = match ? (match.morningScore ?? match.morning_score ?? 0) : 0;
        const woke = match ? Boolean(match.wokeOnTime ?? match.woke_on_time) : false;
        const comp = match ? (match.goalsCompleted ?? match.goals_completed ?? 0) : 0;
        const total = match ? (match.goalsTotal ?? match.goals_total ?? 0) : 0;
        const snoozed = match ? (match.alarmsSnoozed ?? match.alarms_snoozed ?? 0) : 0;

        let level = 0;
        if (!isFuture && match) {
          if (score >= 85) level = 4;
          else if (score >= 70) level = 3;
          else if (score >= 50) level = 2;
          else if (score > 0) level = 1;
        }

        // Track month change for header label
        if (r === 0) {
          const m = currentD.getMonth();
          if (m !== lastMonth) {
            monthStarts.push({
              colIndex: c,
              label: currentD.toLocaleDateString("en-US", { month: "short" }),
            });
            lastMonth = m;
          }
        }

        colDays.push({
          date: dateStr,
          dateObj: currentD,
          score,
          wokeOnTime: woke,
          goalsCompleted: comp,
          goalsTotal: total,
          alarmsSnoozed: snoozed,
          level,
          isToday,
          isFuture,
        });
      }
      cols.push(colDays);
    }

    return { columns: cols, monthHeaders: monthStarts };
  }, [streakMap]);

  // Heatmap Level styling
  const getCellClasses = (level: number, score: number, isToday: boolean, isFuture: boolean) => {
    if (isFuture) return "bg-slate-50/50 border-slate-100 opacity-40 cursor-default";

    let bgClass = "bg-slate-100 border-slate-200/70";
    if (level === 4) {
      bgClass = score === 100
        ? "bg-emerald-500 border-emerald-600 shadow-xs"
        : "bg-blue-700 border-blue-800";
    } else if (level === 3) {
      bgClass = "bg-blue-600 border-blue-700";
    } else if (level === 2) {
      bgClass = "bg-blue-400 border-blue-500";
    } else if (level === 1) {
      bgClass = "bg-blue-200 border-blue-300";
    }

    return `${bgClass} ${isToday ? "ring-2 ring-orange-500 ring-offset-1 z-10" : "hover:ring-2 hover:ring-blue-400 hover:scale-125 transition-transform"}`;
  };

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

  return (
    <div className="relative p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      {/* Top Header & Stats Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">52-Week Habit Heatmap</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full annual morning consistency and waking discipline
          </p>
        </div>

        {streakSummary && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Days Tracked</span>
              <span className="text-sm font-extrabold text-slate-800">
                {streakSummary.totalDaysTracked}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-500 block">Success Rate</span>
              <span className="text-sm font-extrabold text-blue-700">
                {Math.round(streakSummary.successRate)}%
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-orange-500 block">Streak</span>
              <span className="text-sm font-extrabold text-orange-600 flex items-center justify-center gap-0.5">
                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                {streakSummary.currentStreak}d
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-max">
          {/* Month labels row */}
          <div className="flex ml-8 mb-2 h-4 relative text-[11px] font-semibold text-slate-400">
            {monthHeaders.map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                style={{
                  position: "absolute",
                  left: `${m.colIndex * 15}px`,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Heatmap Matrix: Day Labels + 52 Columns */}
          <div className="flex gap-1.5">
            {/* Weekday Labels (Mon, Wed, Fri, Sun) */}
            <div className="flex flex-col justify-between py-0.5 text-[10px] font-semibold text-slate-400 select-none w-6 shrink-0">
              {dayLabels.map((lbl, idx) => (
                <span key={idx} className="h-3 leading-3">
                  {lbl}
                </span>
              ))}
            </div>

            {/* 52 Columns */}
            <div className="flex gap-[3px]">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[3px]">
                  {col.map((cell) => (
                    <div
                      key={cell.date}
                      onMouseEnter={(e) => {
                        if (cell.isFuture) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          date: cell.date,
                          score: cell.score,
                          wokeOnTime: cell.wokeOnTime,
                          goalsCompleted: cell.goalsCompleted,
                          goalsTotal: cell.goalsTotal,
                          alarmsSnoozed: cell.alarmsSnoozed,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-3 h-3 rounded-[3px] border ${getCellClasses(
                        cell.level,
                        cell.score,
                        cell.isToday,
                        cell.isFuture
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredCell.x, top: hoveredCell.y - 8 }}
        >
          <div className="font-bold text-slate-100 flex items-center justify-between gap-3">
            <span>
              {new Date(hoveredCell.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {hoveredCell.score > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-extrabold">
                {getScoreGrade(hoveredCell.score).grade}
              </span>
            )}
          </div>

          <div className="mt-1 text-slate-300 space-y-0.5">
            {hoveredCell.score > 0 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-emerald-400">
                    Morning Score: {hoveredCell.score}/100
                  </span>
                </div>
                <div>
                  Wake Status:{" "}
                  <strong className={hoveredCell.wokeOnTime ? "text-emerald-300" : "text-amber-300"}>
                    {hoveredCell.wokeOnTime ? "On Time" : "Late"}
                  </strong>
                  {hoveredCell.alarmsSnoozed > 0 && (
                    <span className="text-rose-300 ml-1">
                      ({hoveredCell.alarmsSnoozed} snooze{hoveredCell.alarmsSnoozed === 1 ? "" : "s"})
                    </span>
                  )}
                </div>
                {hoveredCell.goalsTotal > 0 && (
                  <div>
                    Goals: {hoveredCell.goalsCompleted} of {hoveredCell.goalsTotal} completed
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-400 italic">No activity logged</div>
            )}
          </div>
        </div>
      )}

      {/* Legend at Bottom */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-3 rounded-[3px] bg-slate-100 border border-slate-200" title="Level 0: No data" />
            <div className="w-3 h-3 rounded-[3px] bg-blue-200 border border-blue-300" title="Level 1: 1-49" />
            <div className="w-3 h-3 rounded-[3px] bg-blue-400 border border-blue-500" title="Level 2: 50-69" />
            <div className="w-3 h-3 rounded-[3px] bg-blue-600 border border-blue-700" title="Level 3: 70-84" />
            <div className="w-3 h-3 rounded-[3px] bg-blue-700 border border-blue-800" title="Level 4: 85-99" />
            <div className="w-3 h-3 rounded-[3px] bg-emerald-500 border border-emerald-600" title="Level 4: 100 Mastery" />
          </div>
          <span>More</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-orange-500 inline-block" /> Today
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 inline-block" /> 100 Score
          </span>
        </div>
      </div>
    </div>
  );
};
