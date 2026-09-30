import React, { useEffect, useState, useMemo } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarX,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Bot,
  User,
  Flame,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  dbGetAlarmHistory,
  dbExportHistoryCsv,
  dbGetAiConversations,
  dbGetAllMorningBriefings,
} from "../services/database";
import type {
  AlarmHistoryRecord,
  ConversationRecord,
  MorningBriefing,
  ChatMessage,
} from "../lib/types";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

type HistoryTab = "alarms" | "conversations" | "briefings";
type FilterRange = "7d" | "30d" | "all";

export const History: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("alarms");

  // Alarms History State
  const [alarmRecords, setAlarmRecords] = useState<AlarmHistoryRecord[]>([]);
  const [isAlarmsLoading, setIsAlarmsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterRange>("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const itemsPerPage = 20;

  // AI Conversations State
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null);

  // Briefings State
  const [briefings, setBriefings] = useState<MorningBriefing[]>([]);
  const [isBriefingsLoading, setIsBriefingsLoading] = useState(false);

  // Load Alarms History
  const loadAlarmHistory = async () => {
    setIsAlarmsLoading(true);
    try {
      const data = await dbGetAlarmHistory(500, 0);
      setAlarmRecords(data);
    } catch (err) {
      console.error("Failed to load alarm history:", err);
    } finally {
      setIsAlarmsLoading(false);
    }
  };

  // Load AI Conversations
  const loadConversations = async () => {
    setIsConversationsLoading(true);
    try {
      const data = await dbGetAiConversations(50);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load AI conversations:", err);
    } finally {
      setIsConversationsLoading(false);
    }
  };

  // Load Briefings
  const loadBriefings = async () => {
    setIsBriefingsLoading(true);
    try {
      const data = await dbGetAllMorningBriefings();
      setBriefings(data);
    } catch (err) {
      console.error("Failed to load morning briefings:", err);
    } finally {
      setIsBriefingsLoading(false);
    }
  };

  useEffect(() => {
    loadAlarmHistory();
  }, []);

  useEffect(() => {
    if (activeTab === "conversations") {
      loadConversations();
    } else if (activeTab === "briefings") {
      loadBriefings();
    }
  }, [activeTab]);

  // Filter alarm records based on selected range
  const filteredRecords = useMemo(() => {
    if (filter === "all") return alarmRecords;
    const now = Date.now();
    const days = filter === "7d" ? 7 : 30;
    const cutoff = now - days * 86400000;
    return alarmRecords.filter((r) => new Date(r.firedAt).getTime() >= cutoff);
  }, [alarmRecords, filter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleExportCsv = async () => {
    try {
      const csvString = await dbExportHistoryCsv();

      try {
        const filePath = await save({
          defaultPath: `hyperalarm_history_${new Date().toISOString().split("T")[0]}.csv`,
          filters: [{ name: "CSV File", extensions: ["csv"] }],
        });

        if (filePath) {
          await writeTextFile(filePath, csvString);
          setExportMessage(`Saved to ${filePath}`);
          setTimeout(() => setExportMessage(null), 4000);
          return;
        }
      } catch (tauriErr) {
        console.warn("Tauri dialog save fallback to browser blob:", tauriErr);
      }

      // Browser download fallback
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `hyperalarm_history_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportMessage("CSV downloaded successfully");
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      setExportMessage("Error exporting CSV");
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const parseMessages = (jsonString: string): ChatMessage[] => {
    try {
      return JSON.parse(jsonString) as ChatMessage[];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-800">
            Log Book & Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            History & Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review wake-up discipline, AI morning dialogues, and daily briefings.
          </p>
        </div>

        {activeTab === "alarms" && (
          <div className="flex items-center gap-3">
            {exportMessage && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {exportMessage}
              </span>
            )}
            <GlowButton
              onClick={handleExportCsv}
              icon={<Download className="w-4 h-4" />}
              className="text-xs py-2 px-4 shadow-sm"
            >
              Export CSV
            </GlowButton>
          </div>
        )}
      </div>

      {/* Primary 3-Tab Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("alarms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "alarms"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Alarm History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conversations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "conversations"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>AI Conversations</span>
          {conversations.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
              {conversations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("briefings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "briefings"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Morning Briefings</span>
          {briefings.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
              {briefings.length}
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: ALARM HISTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "alarms" && (
        <div className="space-y-4">
          {/* Filter Chips Bar */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setFilter("7d");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filter === "7d"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("30d");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filter === "30d"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All time
            </button>
          </div>

          {/* Table Container */}
          <GlassCard className="p-0 overflow-hidden shadow-sm">
            {filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Alarm Label</th>
                      <th className="py-3 px-4">Scheduled</th>
                      <th className="py-3 px-4">Actual Wake</th>
                      <th className="py-3 px-4 text-center">Snoozes</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {paginatedRecords.map((row, idx) => {
                      const firedDate = new Date(row.firedAt);
                      const dateLabel = firedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      const timeLabel = firedDate.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      let wakeTimeLabel = "—";
                      if (row.dismissedAt) {
                        const dismissDate = new Date(row.dismissedAt);
                        wakeTimeLabel = dismissDate.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }

                      const isDismissed = Boolean(row.dismissedAt);
                      const isSnoozed = row.snoozeCount > 0;

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/30 ${
                            idx % 2 === 0 ? "bg-white dark:bg-slate-900/60" : "bg-[#F8FAFC] dark:bg-slate-800/40"
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            <span>{dateLabel}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {timeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {row.alarmLabel}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {row.scheduledTime}
                          </td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-mono font-medium">
                            {wakeTimeLabel}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                row.snoozeCount === 0
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {row.snoozeCount}×
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!isDismissed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                <AlertCircle className="w-3 h-3" />
                                Missed
                              </span>
                            ) : isSnoozed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" />
                                Snoozed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                On Time
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : isAlarmsLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Loading alarm history...
                </p>
              </div>
            ) : (
              /* Empty State */
              <div className="py-16 text-center">
                <CalendarX className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  No alarm history yet
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your wake-up record and snooze analytics will automatically appear here once your alarms fire.
                </p>
              </div>
            )}

            {/* Pagination Footer */}
            {filteredRecords.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 select-none">
                <span>
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRecords.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of{" "}
                  {filteredRecords.length} records
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: AI CONVERSATIONS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "conversations" && (
        <div className="space-y-4">
          {isConversationsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">
                Loading AI conversations...
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <GlassCard className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                No AI conversations yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Complete a 3-exchange Morning Check-in after turning off an alarm to record your dialogues here.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {conversations.map((convo) => {
                const isExpanded = expandedConvoId === convo.id;
                const messages = parseMessages(convo.messages);
                const displayDate = new Date(convo.created_at || convo.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const displayTime = new Date(convo.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <GlassCard
                    key={convo.id}
                    className="p-4 transition-all hover:border-blue-200/80 cursor-pointer"
                    onClick={() => setExpandedConvoId(isExpanded ? null : convo.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-blue text-white flex items-center justify-center shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              Morning Check-in • {displayDate}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {displayTime}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{messages.length} messages</span>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              3-Exchange Complete
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {convo.morning_score > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Score: {convo.morning_score}
                          </span>
                        )}
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Conversation Transcript */}
                    {isExpanded && (
                      <div
                        className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {messages.map((msg, mIdx) => (
                          <div
                            key={mIdx}
                            className={`flex gap-2.5 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <div className="w-6 h-6 rounded-lg gradient-blue text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                <Bot className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                                  : "bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                              }`}
                            >
                              <div className="text-[10px] font-semibold opacity-70 mb-1">
                                {msg.role === "user" ? "You" : "AI Coach"}
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {msg.role === "user" && (
                              <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                <User className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: MORNING BRIEFINGS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "briefings" && (
        <div className="space-y-4">
          {isBriefingsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Loading morning briefings...
              </p>
            </div>
          ) : briefings.length === 0 ? (
            <GlassCard className="py-16 text-center">
              <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                No morning briefings saved yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Generate a fresh briefing from the Dashboard or wake-up screen to store daily AI strategic insights here.
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefings.map((b, bIdx) => {
                const displayDate = b.generated_at
                  ? new Date(b.generated_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Today";

                return (
                  <GlassCard key={bIdx} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800">
                          {displayDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {b.generated_at
                            ? new Date(b.generated_at).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {b.greeting}
                      </h3>

                      {b.streak_message && (
                        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800">
                          <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>{b.streak_message}</span>
                        </div>
                      )}

                      {b.goals_message && (
                        <div className="flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800">
                          <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <span>{b.goals_message}</span>
                        </div>
                      )}

                      {b.ai_tip && (
                        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/50 rounded-xl border border-emerald-200/60 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Tactical Tip
                          </div>
                          {b.ai_tip}
                        </div>
                      )}
                    </div>

                    {b.motivational_close && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs italic text-slate-500 dark:text-slate-400 font-medium">
                        “{b.motivational_close}”
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
