import { create } from "zustand";
import type { Alarm, AlarmFormData } from "../lib/types";
import { sortAlarms } from "../lib/utils";
import {
  dbGetAllAlarms,
  dbCreateAlarm,
  dbUpdateAlarm,
  dbDeleteAlarm,
  dbToggleAlarm,
  dbLogWakeEvent,
} from "../services/database";
import { useProductivityStore } from "./productivityStore";

export interface SnoozeItem {
  alarmId: string;
  alarm: Alarm;
  snoozeUntil: number; // timestamp in ms
  snoozeCount: number;
}

export interface AlarmStore {
  alarms: Alarm[];
  isLoading: boolean;
  firingAlarm: Alarm | null;
  firingSnoozeCount: number;
  snoozedAlarms: SnoozeItem[];
  selectedAlarm: Alarm | null;
  isModalOpen: boolean;
  modalMode: "add" | "edit";
  deleteConfirmId: string | null;

  // Actions
  loadAlarms: () => Promise<void>;
  addAlarm: (data: AlarmFormData) => Promise<Alarm>;
  updateAlarm: (id: string, updates: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, isActive: boolean) => Promise<void>;
  dismissAlarm: (snoozeCount?: number) => Promise<void>;
  snoozeAlarm: (alarm: Alarm, durationMinutes: number, currentSnoozeCount: number) => void;
  cancelSnooze: (alarmId: string) => void;
  testFireAlarm: (alarm: Alarm) => void;
  setFiringAlarm: (alarm: Alarm | null, snoozeCount?: number) => void;
  openAddModal: () => void;
  openEditModal: (alarm: Alarm) => void;
  closeModal: () => void;
  setDeleteConfirmId: (id: string | null) => void;
}

export const useAlarmStore = create<AlarmStore>((set, get) => ({
  alarms: [],
  isLoading: true,
  firingAlarm: null,
  firingSnoozeCount: 0,
  snoozedAlarms: [],
  selectedAlarm: null,
  isModalOpen: false,
  modalMode: "add",
  deleteConfirmId: null,

  // Load all alarms from SQLite database
  loadAlarms: async () => {
    set({ isLoading: true });
    try {
      const alarms = await dbGetAllAlarms();
      set({ alarms: sortAlarms(alarms), isLoading: false });
    } catch (err) {
      console.error("[AlarmStore] Failed to load alarms from DB:", err);
      set({ isLoading: false });
    }
  },

  // Save new alarm to SQLite database
  addAlarm: async (data: AlarmFormData) => {
    try {
      const created = await dbCreateAlarm(data);
      set((state) => ({
        alarms: sortAlarms([created, ...state.alarms]),
        isModalOpen: false,
        selectedAlarm: null,
      }));
      return created;
    } catch (err) {
      console.error("[AlarmStore] Failed to create alarm:", err);
      throw err;
    }
  },

  // Update existing alarm in SQLite database
  updateAlarm: async (id: string, updates: Partial<Alarm>) => {
    try {
      const updated = await dbUpdateAlarm(id, updates);
      set((state) => ({
        alarms: sortAlarms(
          state.alarms.map((a) => (a.id === id ? updated : a))
        ),
        isModalOpen: false,
        selectedAlarm: null,
      }));
    } catch (err) {
      console.error("[AlarmStore] Failed to update alarm:", err);
      throw err;
    }
  },

  // Delete alarm from SQLite database
  deleteAlarm: async (id: string) => {
    try {
      await dbDeleteAlarm(id);
      set((state) => ({
        alarms: state.alarms.filter((a) => a.id !== id),
        deleteConfirmId: null,
      }));
    } catch (err) {
      console.error("[AlarmStore] Failed to delete alarm:", err);
      throw err;
    }
  },

  // Toggle alarm active/paused state in SQLite database
  toggleAlarm: async (id: string, isActive: boolean) => {
    try {
      await dbToggleAlarm(id, isActive);
      set((state) => ({
        alarms: sortAlarms(
          state.alarms.map((a) => (a.id === id ? { ...a, isActive } : a))
        ),
      }));
    } catch (err) {
      console.error("[AlarmStore] Failed to toggle alarm:", err);
      throw err;
    }
  },

  // Dismiss currently firing alarm & log wake event into SQLite + habit streak
  dismissAlarm: async (snoozeCount = 0) => {
    const active = get().firingAlarm;
    if (active) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const scheduledTimeStr = `${String(active.hour).padStart(2, "0")}:${String(active.minute).padStart(2, "0")}`;

      try {
        await dbLogWakeEvent({
          date: todayStr,
          alarmId: active.id,
          alarmLabel: active.label,
          scheduledTime: scheduledTimeStr,
          actualWakeTime: now.toISOString(),
          snoozeCount,
          dismissedOnTime: snoozeCount === 0,
        });

        // Phase 7: Record habit streak & update morning score
        const prodStore = useProductivityStore.getState();
        const goals = prodStore.todayGoals || [];
        const completedCount = goals.filter((g) => g.isCompleted || g.completed).length;

        await prodStore.recordHabitDay({
          date: todayStr,
          wokeOnTime: snoozeCount === 0,
          alarmsFired: 1,
          alarmsSnoozed: snoozeCount,
          goalsCompleted: completedCount,
          goalsTotal: goals.length,
        });

        await prodStore.refreshAll();

        // If alarm repeat pattern is 'once', auto-deactivate it in DB & state
        if (active.repeatPattern === "once") {
          await dbToggleAlarm(active.id, false);
          set((state) => ({
            alarms: sortAlarms(
              state.alarms.map((a) =>
                a.id === active.id ? { ...a, isActive: false } : a
              )
            ),
          }));
        }
      } catch (err) {
        console.error("[AlarmStore] Failed to log wake event on dismiss:", err);
      }

      // Remove any lingering snooze for this alarm
      set((state) => ({
        snoozedAlarms: state.snoozedAlarms.filter((s) => s.alarmId !== active.id),
      }));
    }
    set({ firingAlarm: null, firingSnoozeCount: 0 });
  },

  snoozeAlarm: (alarm: Alarm, durationMinutes: number, currentSnoozeCount: number) => {
    const snoozeUntil = Date.now() + Math.max(1, durationMinutes) * 60 * 1000;
    const newSnoozeCount = currentSnoozeCount + 1;
    set((state) => ({
      firingAlarm: null,
      firingSnoozeCount: 0,
      snoozedAlarms: [
        ...state.snoozedAlarms.filter((s) => s.alarmId !== alarm.id),
        {
          alarmId: alarm.id,
          alarm,
          snoozeUntil,
          snoozeCount: newSnoozeCount,
        },
      ],
    }));
    console.log(
      `[AlarmStore] Alarm "${alarm.label}" snoozed until ${new Date(snoozeUntil).toLocaleTimeString()} (Snooze #${newSnoozeCount})`
    );
  },

  cancelSnooze: (alarmId: string) => {
    set((state) => ({
      snoozedAlarms: state.snoozedAlarms.filter((s) => s.alarmId !== alarmId),
    }));
  },

  testFireAlarm: (alarm: Alarm) => {
    set({ firingAlarm: alarm, firingSnoozeCount: 0 });
  },

  setFiringAlarm: (alarm: Alarm | null, snoozeCount = 0) => {
    set({ firingAlarm: alarm, firingSnoozeCount: snoozeCount });
  },

  openAddModal: () => {
    set({ isModalOpen: true, modalMode: "add", selectedAlarm: null });
  },

  openEditModal: (alarm: Alarm) => {
    set({ isModalOpen: true, modalMode: "edit", selectedAlarm: alarm });
  },

  closeModal: () => {
    set({ isModalOpen: false, selectedAlarm: null });
  },

  setDeleteConfirmId: (id: string | null) => {
    set({ deleteConfirmId: id });
  },
}));
