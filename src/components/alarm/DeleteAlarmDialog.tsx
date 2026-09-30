import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { GlowButton } from "../ui/GlowButton";
import { AlertTriangle } from "lucide-react";
import { useAlarmStore } from "../../store/alarmStore";
import { showToast } from "../ui/Toast";

export const DeleteAlarmDialog: React.FC = () => {
  const { deleteConfirmId, alarms, deleteAlarm, setDeleteConfirmId } =
    useAlarmStore();

  const alarmToDelete = alarms.find((a) => a.id === deleteConfirmId);

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteAlarm(deleteConfirmId);
      showToast("Alarm removed", "danger");
      setDeleteConfirmId(null);
    }
  };

  return (
    <Dialog
      open={!!deleteConfirmId}
      onOpenChange={(open) => {
        if (!open) setDeleteConfirmId(null);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-6 shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Delete this alarm?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            This will permanently remove{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              "{alarmToDelete?.label || "this alarm"}"
            </span>
            . This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 mt-4 sm:justify-end">
          <GlowButton
            type="button"
            variant="ghost"
            onClick={() => setDeleteConfirmId(null)}
          >
            Cancel
          </GlowButton>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="px-5 py-2.5 rounded-2xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all active:scale-[0.98]"
          >
            Delete Alarm
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
