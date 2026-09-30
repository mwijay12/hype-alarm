import React, { useState, useEffect, useRef } from "react";
import { GlassCard } from "../ui/GlassCard";
import { GlowButton } from "../ui/GlowButton";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAICompanion } from "../../hooks/useAICompanion";
import { useProductivityStore } from "../../store/productivityStore";
import { useSettingsStore } from "../../store/settingsStore";
import type { ChatMessage } from "../../lib/types";

interface AICheckinProps {
  alarmLabel?: string;
  onClose: () => void;
}

const QUICK_CHIPS = [
  "I feel ready 🚀",
  "A bit tired still ☕",
  "I have a lot to do today 📋",
  "Let's focus on one thing 🎯",
];

export const AICheckin: React.FC<AICheckinProps> = ({
  alarmLabel = "Morning Routine",
  onClose,
}) => {
  const { currentStreak } = useProductivityStore();
  const { settings } = useSettingsStore();
  const { sendMessage, isLoading } = useAICompanion();

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const streakDisplay = currentStreak || 7;

  // Initialize initial message on mount
  useEffect(() => {
    const initialText = `Good morning! You dismissed your "${alarmLabel}" alarm right on time. That's day ${streakDisplay} in a row — impressive momentum. What's the one key priority you want to accomplish today?`;
    setMessages([{ role: "assistant", content: initialText }]);
  }, [alarmLabel, streakDisplay]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (contentToSend?: string) => {
    const text = contentToSend || inputText.trim();
    if (!text || isLoading) return;

    const newHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInputText("");

    try {
      const reply = await sendMessage(newHistory, settings.aiPersonality);
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "AI companion is offline right now. You've got this anyway! Go make today count! 💪",
        },
      ]);
    }
  };

  const userExchangeCount = messages.filter((m) => m.role === "user").length;
  const isConversationFinished = userExchangeCount >= 3;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-lg h-[580px] flex flex-col p-0 overflow-hidden shadow-2xl border-blue-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-100/80 bg-white/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">
                  Morning Check-in
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  {settings.aiPersonality}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Day {streakDisplay} Streak • Intentional Start
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Skip for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Bubble History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]/60">
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20 rounded-tr-sm"
                      : "bg-white text-slate-800 border border-blue-100/80 shadow-xs rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-blue-100 text-slate-500 text-xs px-3.5 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>AI companion is thinking...</span>
              </div>
            </motion.div>
          )}

          {/* Max exchange completion banner */}
          {isConversationFinished && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 space-y-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-bold">
                Great start to your morning. Go make it count! 💪
              </p>
              <GlowButton
                onClick={onClose}
                className="text-xs py-1.5 px-4 mx-auto"
              >
                Done & Open Dashboard
              </GlowButton>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Area: Quick Reply Chips + Input */}
        {!isConversationFinished ? (
          <div className="p-3 border-t border-blue-100/80 bg-white/90 space-y-2">
            {/* Quick Reply Suggestion Chips */}
            {userExchangeCount === 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(chip)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shrink-0 border border-blue-200/60"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your morning thought or focus..."
                disabled={isLoading}
                maxLength={160}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-100 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Close Check-in
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
