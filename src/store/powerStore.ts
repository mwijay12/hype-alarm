import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface PowerStore {
  isAntiSleepActive: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  enableAntiSleep: () => Promise<void>;
  disableAntiSleep: () => Promise<void>;
  toggleAntiSleep: () => Promise<void>;
  syncStatus: () => Promise<void>;
}

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

export const usePowerStore = create<PowerStore>((set, get) => ({
  isAntiSleepActive: false,
  isLoading: false,
  error: null,

  /**
   * Enables Windows OS-level anti-sleep mode via Win32 SetThreadExecutionState.
   * Prevents system sleep and screen dimming while alarms are armed or firing.
   */
  enableAntiSleep: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isTauri()) {
        const response = await invoke<string>("enable_anti_sleep");
        console.log("[Anti-Sleep] Enabled:", response);
      } else {
        console.log("[Anti-Sleep] (Browser mock) Enabled");
      }
      set({ isAntiSleepActive: true, isLoading: false });
    } catch (err) {
      console.error("[Anti-Sleep] Failed to enable:", err);
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * Disables anti-sleep mode, clearing OS-level execution state flags
   * and allowing normal Windows power management & screen timeouts.
   */
  disableAntiSleep: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isTauri()) {
        const response = await invoke<string>("disable_anti_sleep");
        console.log("[Anti-Sleep] Disabled:", response);
      } else {
        console.log("[Anti-Sleep] (Browser mock) Disabled");
      }
      set({ isAntiSleepActive: false, isLoading: false });
    } catch (err) {
      console.error("[Anti-Sleep] Failed to disable:", err);
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * Manually toggles the Anti-Sleep state from the UI.
   */
  toggleAntiSleep: async () => {
    const current = get().isAntiSleepActive;
    if (current) {
      await get().disableAntiSleep();
    } else {
      await get().enableAntiSleep();
    }
  },

  /**
   * Synchronizes the frontend state with the atomic state in the Rust backend on app load.
   */
  syncStatus: async () => {
    try {
      if (isTauri()) {
        const status = await invoke<boolean>("get_anti_sleep_status");
        set({ isAntiSleepActive: Boolean(status) });
      }
    } catch (err) {
      console.warn("[Anti-Sleep] Failed to sync status with Rust:", err);
    }
  },
}));
