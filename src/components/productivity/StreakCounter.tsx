import React from "react";
import { Flame, Trophy, Zap, Crown, Award } from "lucide-react";
import { getStreakTier } from "../../lib/utils";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
  showMilestones?: boolean;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  longestStreak,
  compact = false,
  showMilestones = true,
}) => {
  const tier = getStreakTier(currentStreak);

  // Next milestone calculation
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((m) => m > currentStreak) || 100;
  const prevMilestone = [...milestones].reverse().find((m) => m <= currentStreak) || 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 shrink-0">
          <Flame className="w-4 h-4 fill-white text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-slate-900 tracking-tight">{currentStreak}</span>
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              {currentStreak === 1 ? "Day Streak" : "Days Streak"}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Best: {longestStreak}d</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Subtle background glow */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-transparent blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <Flame className="w-5 h-5 fill-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Streak</h3>
              <p className="text-xs text-slate-500 font-medium">Consecutive on-time mornings</p>
            </div>
          </div>

          {longestStreak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Best: {longestStreak}d</span>
            </div>
          )}
        </div>

        {/* Big Counter Display */}
        <div className="my-2 flex items-baseline gap-3">
          <div className="text-5xl font-black tracking-tight text-slate-900 flex items-baseline gap-1">
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
              {currentStreak}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              {currentStreak === 1 ? "Day Streak" : "Days Streak"}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {currentStreak === 0
                ? "Start today by waking on time"
                : currentStreak >= longestStreak && currentStreak > 1
                ? "All-time personal record! 🎉"
                : `${longestStreak - currentStreak}d to beat your record`}
            </span>
          </div>
        </div>

        {/* Milestone Tier Badge */}
        {showMilestones && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
              <span className="text-slate-600 flex items-center gap-1.5">
                {currentStreak >= 30 ? (
                  <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                ) : currentStreak >= 14 ? (
                  <Zap className="w-4 h-4 text-orange-500 fill-orange-400" />
                ) : (
                  <Award className="w-4 h-4 text-blue-600" />
                )}
                <span className={tier.color}>{tier.title}</span>
              </span>
              <span className="text-slate-400 font-medium">
                Next target: <strong className="text-slate-700">{nextMilestone} days</strong>
              </span>
            </div>

            {/* Progress bar to next milestone */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">{tier.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
