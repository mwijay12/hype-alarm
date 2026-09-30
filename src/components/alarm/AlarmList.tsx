import React from "react";
import { AnimatePresence } from "framer-motion";
import type { Alarm } from "../../lib/types";
import { AlarmCard } from "./AlarmCard";
import { useAlarmStore } from "../../store/alarmStore";
import { showToast } from "../ui/Toast";
import { BellOff } from "lucide-react";

export interface AlarmListProps {
  alarms: Alarm[];
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  onAddFirst?: () => void;
}

export const AlarmList: React.FC<AlarmListProps> = ({
  alarms,
  emptyMessage = "No alarms found.",
  emptyIcon: EmptyIcon = BellOff,
  onAddFirst,
}) => {
  const { toggleAlarm, openEditModal, setDeleteConfirmId } = useAlarmStore();

  const handleToggle = (id: string, nextActive: boolean) => {
    toggleAlarm(id, nextActive);
    showToast(nextActive ? "Alarm armed" : "Alarm paused", "info");
  };

  if (alarms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white/60 border border-blue-100/70 shadow-glass my-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 border border-blue-200/50 flex items-center justify-center mb-3">
          <EmptyIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          No alarms here
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          {emptyMessage}
        </p>
        {onAddFirst && (
          <button
            type="button"
            onClick={onAddFirst}
            className="px-4 py-2 rounded-xl text-xs font-semibold gradient-blue text-white shadow-sm shadow-blue-500/20 hover:scale-[1.02] transition-all"
          >
            + Add Your First Alarm
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-4">
      <AnimatePresence mode="popLayout">
        {alarms.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            onToggle={handleToggle}
            onEdit={openEditModal}
            onDelete={setDeleteConfirmId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
