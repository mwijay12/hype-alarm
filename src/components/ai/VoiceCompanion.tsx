import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import { VOICE_PERSONALITIES } from '../../lib/types';

interface VoiceCompanionProps {
  alarmId?: string;
  alarmLabel?: string;
  personality?: string;
  isEnabled?: boolean;
  isCached?: boolean;
  onGenerateNow?: () => void;
  compact?: boolean;
  variant?: 'compact' | 'fire' | 'full';
  scriptPreview?: string;
  isSpeaking?: boolean;
}

export const VoiceCompanion: React.FC<VoiceCompanionProps> = ({
  personality = 'motivational',
  isCached = false,
  compact = false,
  variant = 'compact',
  scriptPreview,
  isSpeaking = false,
}) => {
  const currentPersonality =
    VOICE_PERSONALITIES.find((p) => p.value === personality) ||
    VOICE_PERSONALITIES[0];

  // 1. Compact badge for AlarmCard
  if (compact || variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight shadow-xs ${
          isCached
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        <span className="text-xs">🎤</span>
        <span>AI Voice · {currentPersonality.label}</span>
        {!isCached && <span className="text-[10px] text-amber-600 font-semibold">(Pending)</span>}
      </span>
    );
  }

  // 2. Fire screen animated speaking card
  if (variant === 'fire') {
    return (
      <div className="w-full max-w-sm mx-auto p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-blue-200 shadow-xl select-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">
                AI Voice Companion
              </p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                {currentPersonality.emoji} {currentPersonality.label} Persona
              </p>
            </div>
          </div>

          {isSpeaking && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Speaking...
            </span>
          )}
        </div>

        {/* 5-bar Waveform Animation */}
        <div className="flex items-center justify-center gap-1.5 h-10 my-2 bg-blue-50/60 rounded-xl px-4">
          {[0.5, 0.9, 1.2, 0.8, 0.6].map((scale, i) => (
            <motion.div
              key={i}
              className="w-1.5 bg-blue-600 rounded-full"
              animate={{
                height: isSpeaking
                  ? [`${scale * 8}px`, `${scale * 28}px`, `${scale * 8}px`]
                  : '6px',
              }}
              transition={{
                duration: 0.6 + i * 0.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {scriptPreview && (
          <p className="text-xs text-slate-600 italic text-center px-2 line-clamp-2 mt-2">
            &ldquo;{scriptPreview}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // 3. Full section
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">
            AI Personality: {currentPersonality.label}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isCached
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isCached ? 'Cached ✓' : 'Will cache nightly'}
        </span>
      </div>
      <p className="text-xs text-slate-500">{currentPersonality.description}</p>
    </div>
  );
};
