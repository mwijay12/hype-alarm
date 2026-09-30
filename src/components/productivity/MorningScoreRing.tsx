import React from "react";
import { getScoreGrade } from "../../lib/utils";
import { Clock, Target, Moon } from "lucide-react";

interface MorningScoreRingProps {
  score: number; // 0 - 100
  size?: number; // default 140
  strokeWidth?: number; // default 12
  showDetails?: boolean;
  wokeOnTime?: boolean;
  goalsCompleted?: number;
  goalsTotal?: number;
  alarmsSnoozed?: number;
}

export const MorningScoreRing: React.FC<MorningScoreRingProps> = ({
  score = 0,
  size = 140,
  strokeWidth = 12,
  showDetails = true,
  wokeOnTime = true,
  goalsCompleted = 0,
  goalsTotal = 0,
  alarmsSnoozed = 0,
}) => {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const { grade, color, bg, label } = getScoreGrade(clampedScore);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Gradient IDs based on score tier
  const gradientId = `score-grad-${clampedScore >= 90 ? "emerald" : clampedScore >= 80 ? "blue" : clampedScore >= 65 ? "sky" : clampedScore >= 50 ? "amber" : "rose"}`;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* SVG Ring */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg] drop-shadow-sm">
          <defs>
            <linearGradient id="score-grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="score-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="score-grad-sky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="score-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="score-grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{clampedScore}</span>
            <span className="text-xs font-semibold text-slate-400">/100</span>
          </div>
          <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${bg} ${color}`}>
            {grade} · {label}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Morning Score</span>
      </div>

      {/* Details breakdown pills */}
      {showDetails && (
        <div className="mt-4 grid grid-cols-3 gap-2 w-full max-w-xs text-center">
          {/* Wake Status */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Wake</span>
            </div>
            <span className={`text-xs font-bold mt-1 ${wokeOnTime ? "text-emerald-600" : "text-amber-600"}`}>
              {wokeOnTime ? "+50" : "+10"}
            </span>
          </div>

          {/* Goals Rate */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <Target className="w-3 h-3 text-indigo-600" />
              <span>Goals</span>
            </div>
            <span className="text-xs font-bold mt-1 text-indigo-600">
              {goalsTotal > 0 ? `+${Math.round((goalsCompleted / goalsTotal) * 30 + (goalsCompleted === goalsTotal ? 20 : 0))}` : "0"}
            </span>
          </div>

          {/* Snooze Penalty */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <Moon className="w-3 h-3 text-rose-500" />
              <span>Snooze</span>
            </div>
            <span className={`text-xs font-bold mt-1 ${alarmsSnoozed > 0 ? "text-rose-600" : "text-slate-500"}`}>
              {alarmsSnoozed > 0 ? `-${alarmsSnoozed * 5}` : "0"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
