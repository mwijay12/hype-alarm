import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import type { Alarm, DayOfWeek } from "../../lib/types";
import { DAYS_OF_WEEK } from "../../lib/constants";
import { formatTime, getDayLabel, msToDisplay } from "../../lib/utils";
import { Switch } from "../ui/switch";
import { VoiceCompanion } from "../ai/VoiceCompanion";
import { useAlarmStore } from "../../store/alarmStore";
import {
  Music2,
  Volume2,
  Moon,
  Calculator,
  Pencil,
  Trash2,
  Scissors,
  Zap,
  AlertTriangle,
  BellRing,
  Clock,
} from "lucide-react";

export interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
}

export const AlarmCard: React.FC<AlarmCardProps> = ({
  alarm,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const { testFireAlarm, snoozedAlarms } = useAlarmStore();
  const activeSnooze = snoozedAlarms.find((s) => s.alarmId === alarm.id);
  const [isVoiceCached, setIsVoiceCached] = React.useState(false);

  React.useEffect(() => {
    if (alarm.aiVoiceEnabled && alarm.id) {
      invoke<string | null>("get_voice_cache_path", { alarmId: alarm.id })
        .then((path: string | null) => setIsVoiceCached(Boolean(path)))
        .catch(() => setIsVoiceCached(false));
    }
  }, [alarm.id, alarm.aiVoiceEnabled]);

  const formattedTime = formatTime(alarm.hour, alarm.minute);
  const dayLabel = getDayLabel(alarm.days, alarm.repeatPattern);

  // Check if a day is active in this alarm
  const isDayActive = (dayKey: DayOfWeek): boolean => {
    if (alarm.repeatPattern === "daily") return true;
    if (alarm.repeatPattern === "weekdays") {
      return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(dayKey);
    }
    if (alarm.repeatPattern === "weekends") {
      return ["Sat", "Sun"].includes(dayKey);
    }
    if (alarm.repeatPattern === "custom") {
      return alarm.days.includes(dayKey);
    }
    return false;
  };

  // Volume badge styling based on boost percentage
  const getVolumeBadgeColor = (volume: number) => {
    if (volume >= 300) return "text-red-500 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800";
    if (volume > 200) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800";
    return "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.24 }}
      className={`rounded-3xl p-6 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl transition-all duration-300 relative border ${
        alarm.isActive
          ? "border-blue-500/20 dark:border-blue-500/30 border-l-[4px] border-l-blue-600 dark:border-l-blue-500 shadow-glass dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20"
          : "border-slate-200 dark:border-slate-800 border-l-[4px] border-l-slate-300 dark:border-l-slate-700 opacity-70 shadow-xs"
      }`}
    >
      {/* Top Header: Label + Switch */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wider truncate ${
            alarm.isActive ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {alarm.label}
        </span>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={alarm.isActive}
            onCheckedChange={(checked) => onToggle(alarm.id, checked)}
            aria-label={`Toggle ${alarm.label}`}
          />
        </div>
      </div>

      {/* Main Time Display */}
      <div className="mb-4">
        <h3
          className={`digital-text text-4xl sm:text-5xl font-black tracking-tight ${
            alarm.isActive
              ? "gradient-blue-text drop-shadow-xs"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {formattedTime}
        </h3>
      </div>

      {/* Day Pills & Repeat Label */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 pb-4 border-b border-blue-500/10 dark:border-white/10">
        <div className="flex items-center gap-1">
          {DAYS_OF_WEEK.map((d) => {
            const active = isDayActive(d.key);
            return (
              <span
                key={d.key}
                title={d.label}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  active
                    ? alarm.isActive
                      ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                      : "bg-slate-300 dark:bg-slate-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50"
                }`}
              >
                {d.short}
              </span>
            );
          })}
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">
          {dayLabel}
        </span>
      </div>

      {/* Bottom Metadata & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        {/* Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Track Info */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-colors ${
              alarm.audioFileName
                ? "bg-blue-50/70 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold"
                : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700 text-slate-400 dark:text-slate-400"
            }`}
            title={alarm.audioFileName || "Default alarm sound"}
          >
            <Music2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {alarm.audioFileName || "Default sound"}
            </span>
          </div>

          {/* Audio Trim Chip (if custom trim is active) */}
          {(alarm.audioStartMs > 0 || (alarm.audioEndMs > 0 && alarm.audioEndMs !== 180000)) && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold"
              title={`Trimmed: ${msToDisplay(alarm.audioStartMs)} to ${msToDisplay(alarm.audioEndMs)}`}
            >
              <Scissors className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>
                {msToDisplay(alarm.audioStartMs)}–{msToDisplay(alarm.audioEndMs)}
              </span>
            </div>
          )}

          {/* Volume Boost */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${getVolumeBadgeColor(
              alarm.volumeBoost
            )}`}
            title={`Volume amplification: ${alarm.volumeBoost}%`}
          >
            {alarm.volumeBoost > 300 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : alarm.volumeBoost > 200 ? (
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{alarm.volumeBoost}%</span>
          </div>

          {/* Snooze */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <Moon className="w-3.5 h-3.5 text-slate-400" />
            <span>{alarm.snoozeDuration}m</span>
          </div>

          {/* Math Challenge Badge */}
          {alarm.mathChallenge && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
              <Calculator className="w-3.5 h-3.5" />
              <span>Math ON</span>
            </div>
          )}

          {/* Active Snooze Badge */}
          {activeSnooze && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold animate-pulse shadow-xs"
              title={`Snoozed until ${new Date(activeSnooze.snoozeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (Snooze #${activeSnooze.snoozeCount})`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                Snoozed ({new Date(activeSnooze.snoozeUntil).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })})
              </span>
            </div>
          )}

          {/* AI Voice Badge */}
          {alarm.aiVoiceEnabled && (
            <VoiceCompanion
              alarmId={alarm.id}
              personality={alarm.aiPersonality}
              isCached={isVoiceCached}
              compact
            />
          )}
        </div>

        {/* Action Buttons: Test, Edit & Delete */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => testFireAlarm(alarm)}
            className="px-2.5 py-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center gap-1.5 group"
            title="Test Alarm Now (Preview fire screen, sound, and challenges)"
            aria-label="Test Alarm Now"
          >
            <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline text-[11px] font-bold">Test</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(alarm)}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            title="Edit Alarm"
            aria-label="Edit Alarm"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(alarm.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
            title="Delete Alarm"
            aria-label="Delete Alarm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
