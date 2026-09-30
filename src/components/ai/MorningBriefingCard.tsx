import React from 'react';
import { Sparkles, Target, Lightbulb, RotateCw, Compass } from 'lucide-react';
import type { MorningBriefing } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';

interface MorningBriefingCardProps {
  briefing: MorningBriefing | null;
  isLoading?: boolean;
  onGenerateNew?: () => void;
  className?: string;
}

export const MorningBriefingCard: React.FC<MorningBriefingCardProps> = ({
  briefing,
  isLoading = false,
  onGenerateNew,
  className = '',
}) => {
  if (isLoading) {
    return (
      <GlassCard className={`p-6 space-y-4 border-blue-200/80 shadow-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-slate-200 rounded-full w-1/3 animate-pulse" />
            <div className="h-2.5 bg-slate-100 rounded-full w-1/4 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="h-3 bg-slate-200 rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-slate-200 rounded-full w-5/6 animate-pulse" />
          <div className="h-3 bg-slate-200 rounded-full w-2/3 animate-pulse" />
        </div>

        <p className="text-xs text-blue-600 font-semibold text-center pt-2 animate-pulse">
          Crafting your personalized morning briefing with AI...
        </p>
      </GlassCard>
    );
  }

  if (!briefing) {
    return (
      <GlassCard className={`p-6 border-blue-100 dark:border-slate-800 shadow-md ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Morning Briefing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI creates your briefing after your first morning alarm
              </p>
            </div>
          </div>

          {onGenerateNew && (
            <button
              type="button"
              onClick={onGenerateNew}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Now</span>
            </button>
          )}
        </div>
      </GlassCard>
    );
  }

  const timeFormatted = briefing.generated_at
    ? new Date(briefing.generated_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  return (
    <GlassCard className={`p-6 border-blue-200/90 dark:border-slate-800 shadow-xl space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-100/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl gradient-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Morning Briefing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-200 dark:border-blue-800">
                AI Companion
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Personalized strategy • {timeFormatted}
            </p>
          </div>
        </div>

        {onGenerateNew && (
          <button
            type="button"
            onClick={onGenerateNew}
            title="Regenerate today's briefing"
            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Greeting & Streak */}
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
          👋 {briefing.greeting}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {briefing.streak_message}
        </p>
      </div>

      {/* Goals Section */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
          {briefing.goals_message}
        </p>
      </div>

      {/* AI Focus Tip with left accent border */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 border border-blue-200/60 dark:border-blue-800/50 flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-0.5">
            Key Morning Strategy
          </span>
          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
            {briefing.ai_tip}
          </p>
        </div>
      </div>

      {/* Motivational Close */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          &ldquo;{briefing.motivational_close}&rdquo;
        </p>
      </div>
    </GlassCard>
  );
};
