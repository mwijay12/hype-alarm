import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initDatabase } from "../services/database";
import { useAlarmStore } from "../store/alarmStore";
import { useAudioStore } from "../store/audioStore";
import { useSettingsStore } from "../store/settingsStore";
import { useProductivityStore } from "../store/productivityStore";
import { usePowerStore } from "../store/powerStore";

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);

  const { loadAlarms } = useAlarmStore();
  const { loadTracks } = useAudioStore();
  const { loadSettings } = useSettingsStore();
  const { loadAllProductivityData } = useProductivityStore();
  const { syncStatus } = usePowerStore();

  const startBootSequence = async () => {
    setIsInitializing(true);

    // 1. Initialize SQLite database — bulletproof, never throws.
    //    Auto-falls back to localStorage adapter if SQLite/Tauri unavailable.
    try {
      await initDatabase();
    } catch {
      // Absolute safety net — should never reach here
      console.warn("[AppInitializer] initDatabase had an issue — using localStorage fallback");
    }

    // 2. Load all stores in parallel — individual failures are non-fatal
    try {
      await Promise.allSettled([
        loadAlarms(),
        loadTracks(),
        loadSettings(),
        loadAllProductivityData(),
        syncStatus(),
      ]);
    } catch {
      console.warn("[AppInitializer] Some stores failed to load — app still launching");
    }

    // Brief pause for smooth animated splash transition
    setTimeout(() => setIsInitializing(false), 500);
  };

  useEffect(() => {
    startBootSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            key="splash-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#070B18] text-slate-900 dark:text-white select-none transition-colors duration-200"
          >
            {/* Pulsing App Logo */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                filter: [
                  "drop-shadow(0 10px 20px rgba(37, 99, 235, 0.3))",
                  "drop-shadow(0 15px 30px rgba(37, 99, 235, 0.55))",
                  "drop-shadow(0 10px 20px rgba(37, 99, 235, 0.3))",
                ],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-20 h-20 flex items-center justify-center mb-4"
            >
              <img src="/app-icon.svg" alt="HyperAlarm Pro" className="w-full h-full object-contain" />
            </motion.div>

            {/* App Branding */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                HyperAlarm
              </span>
              <span className="bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black px-1.5 py-0.5 rounded-md border border-blue-600/20 dark:border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 animate-pulse">
              Starting up...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App content rendered once initialized */}
      {!isInitializing && children}
    </>
  );
};
