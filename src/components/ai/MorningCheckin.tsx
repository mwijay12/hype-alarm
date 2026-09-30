import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, CheckCircle2, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { useAICheckin } from '../../hooks/useAICheckin';
import { useProductivityStore } from '../../store/productivityStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { MorningContext } from '../../lib/types';

interface MorningCheckinProps {
  alarmLabel?: string;
  hour?: number;
  minute?: number;
  snoozeCount?: number;
  onClose: () => void;
  mockContext?: boolean;
}

const QUICK_CHIPS = [
  'Energized and ready 🚀',
  'A bit groggy still ☕',
  'Need to focus on one big task 🎯',
  'Ready to protect my streak 🔥',
];

export const MorningCheckin: React.FC<MorningCheckinProps> = ({
  alarmLabel = 'Morning Routine',
  hour = 7,
  minute = 0,
  snoozeCount = 0,
  onClose,
  mockContext = false,
}) => {
  const { currentStreak, todayGoals } = useProductivityStore();
  const { settings } = useSettingsStore();
  const {
    state,
    startCheckin,
    sendMessage,
    dismiss,
    isLoading,
    isStreaming,
    isDone,
    hasNoKey,
    hasError,
  } = useAICheckin();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const context: MorningContext = {
    current_streak: mockContext ? 7 : currentStreak,
    today_goals: todayGoals.map((g) => g.text || g.goalText || ''),
    this_week_score: 88.0,
    alarm_label: alarmLabel,
    snooze_count: snoozeCount,
    hour,
    minute,
    ai_personality: settings.aiPersonality || 'motivational',
  };

  // Start check-in on mount
  useEffect(() => {
    startCheckin(context);
    return () => {
      dismiss();
    };
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.streamingText, isStreaming]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isStreaming || isLoading || isDone) return;
    setInputText('');
    await sendMessage(text, context);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-lg h-[620px] flex flex-col p-0 overflow-hidden shadow-2xl border-blue-200/90 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl gradient-blue text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">
                  Morning Check-in
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 uppercase">
                  {settings.aiPersonality}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Streak: {context.current_streak}d • {alarmLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {/* Missing Key State */}
          {hasNoKey && (
            <div className="p-6 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                AI Companion Key Required
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Configure your Groq, OpenRouter, or Gemini API key in Settings to activate your morning AI companion.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Error State */}
          {hasError && !hasNoKey && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <strong>Connection Note:</strong> {state.error || 'AI temporarily unavailable. Keep your momentum going!'}
            </div>
          )}

          {/* Message Bubbles */}
          {state.messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tl-xs bg-blue-50/90 border-l-4 border-l-blue-600 border border-blue-200/70 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-blue-700">
                    <Bot className="w-3.5 h-3.5" />
                    <span>HyperAlarm Companion</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div className="max-w-[80%] p-3.5 rounded-2xl rounded-tr-xs gradient-blue text-white shadow-md shadow-blue-500/20">
                  <span className="text-[10px] font-bold text-blue-100 block mb-0.5 text-right">
                    You
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              )}
            </motion.div>
          ))}

          {/* Streaming Bubble */}
          {isStreaming && state.streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tl-xs bg-blue-50/90 border-l-4 border-l-blue-600 border border-blue-200/70 shadow-xs">
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-blue-700">
                  <Bot className="w-3.5 h-3.5" />
                  <span>HyperAlarm Companion</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-900 leading-relaxed">
                  {state.streamingText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-blue-600 rounded-xs animate-pulse" />
                </p>
              </div>
            </motion.div>
          )}

          {/* Thinking Spinner */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>AI is crafting your morning response...</span>
            </div>
          )}

          {/* Session Complete Banner */}
          {isDone && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 mt-4"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Morning Check-in Complete!
              </h4>
              <p className="text-xs text-emerald-700">
                You&apos;re awake, aligned, and ready. Go conquer your day!
              </p>
              <GlowButton
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold rounded-xl mt-2"
              >
                Close &amp; Level Up
              </GlowButton>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips (shown when active and not streaming) */}
        {!isDone && !hasNoKey && state.messages.length <= 3 && (
          <div className="px-5 py-2 flex flex-wrap gap-1.5 bg-white border-t border-slate-100">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isStreaming || isLoading}
                onClick={() => handleSend(chip)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200/80 transition-all disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar & Exchange Dots */}
        {!hasNoKey && !isDone && (
          <div className="p-4 border-t border-blue-100/80 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                disabled={isStreaming || isLoading}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type your morning thought or goal..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={!inputText.trim() || isStreaming || isLoading}
                onClick={() => handleSend()}
                className="p-2.5 rounded-xl gradient-blue text-white shadow-md shadow-blue-500/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Exchange {Math.min(state.exchangeCount + 1, 3)}/3
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`w-2 h-2 rounded-full transition-all ${
                      step <= state.exchangeCount + 1
                        ? 'bg-blue-600'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
