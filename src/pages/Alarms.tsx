import React, { useState, useMemo } from "react";
import { GlowButton } from "../components/ui/GlowButton";
import { AlarmList } from "../components/alarm/AlarmList";
import { AlarmFormModal } from "../components/alarm/AlarmFormModal";
import { DeleteAlarmDialog } from "../components/alarm/DeleteAlarmDialog";
import { useAlarmStore } from "../store/alarmStore";
import { formatTime, getNextFireLabel } from "../lib/utils";
import { Plus, Bell, BellRing, BellOff, Clock, Sparkles } from "lucide-react";

type FilterTab = "all" | "active" | "inactive";

export const Alarms: React.FC = () => {
  const { alarms, openAddModal, snoozedAlarms, cancelSnooze } = useAlarmStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const totalCount = alarms.length;
  const activeCount = alarms.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Filtered alarms
  const filteredAlarms = useMemo(() => {
    if (activeTab === "active") return alarms.filter((a) => a.isActive);
    if (activeTab === "inactive") return alarms.filter((a) => !a.isActive);
    return alarms;
  }, [alarms, activeTab]);

  // Quick summary computations
  const summary = useMemo(() => {
    if (alarms.length === 0) return null;

    // Sort by time regardless of active status
    const sortedByTime = [...alarms].sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    const earliest = sortedByTime[0];
    const latest = sortedByTime[sortedByTime.length - 1];

    // Find next firing active alarm
    const activeAlarms = alarms.filter((a) => a.isActive);
    const nextAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

    return {
      earliest: formatTime(earliest.hour, earliest.minute),
      latest: formatTime(latest.hour, latest.minute),
      nextFire: nextAlarm
        ? `${nextAlarm.label} (${getNextFireLabel(nextAlarm)})`
        : "No active alarms",
    };
  }, [alarms]);

  const getEmptyMessage = () => {
    if (activeTab === "active") {
      return "No active alarms. Toggle one on or create a new routine.";
    }
    if (activeTab === "inactive") {
      return "All your alarms are currently active and ready to fire.";
    }
    return "Create your first alarm to start building your morning discipline.";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Your Alarms
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> total{" "}
            {totalCount === 1 ? "alarm" : "alarms"} ·{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">{activeCount} active</span>
          </p>
        </div>

        <GlowButton onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>
          New Alarm
        </GlowButton>
      </div>

      {/* Active Snooze Alert Banner */}
      {snoozedAlarms.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200/90 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {snoozedAlarms.length === 1
                  ? `Alarm "${snoozedAlarms[0].alarm.label}" is currently snoozed`
                  : `${snoozedAlarms.length} alarms are currently snoozed`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Next ring at{" "}
                <span className="font-bold">
                  {new Date(snoozedAlarms[0].snoozeUntil).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                (Snooze #{snoozedAlarms[0].snoozeCount})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => cancelSnooze(snoozedAlarms[0].alarmId)}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-200/80 dark:bg-amber-900/80 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors"
          >
            Cancel Snooze
          </button>
        </div>
      )}

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-blue-500/10 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "all"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-slate-800/80"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>All</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "all"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "active"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-slate-800/80"
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Active</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "active"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inactive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "inactive"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-slate-800/80"
          }`}
        >
          <BellOff className="w-3.5 h-3.5" />
          <span>Inactive</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "inactive"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {inactiveCount}
          </span>
        </button>
      </div>

      {/* 3. Alarm List */}
      <AlarmList
        alarms={filteredAlarms}
        emptyMessage={getEmptyMessage()}
        onAddFirst={openAddModal}
      />

      {/* 4. Quick Summary Bar */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-blue-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong className="text-slate-800 dark:text-white">Earliest:</strong> {summary.earliest}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-800 dark:text-white">Latest:</strong> {summary.latest}
            </span>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">
              <strong className="text-slate-800 dark:text-white">Next:</strong> {summary.nextFire}
            </span>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <AlarmFormModal />
      <DeleteAlarmDialog />
    </div>
  );
};
