import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { Minus, Square, Copy, X, BellRing, Layers, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { AppLogo } from "../ui/AppLogo";

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [trayHint, setTrayHint] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    // Track maximization state
    const checkMaximized = async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const win = getCurrentWindow();
          const maximized = await win.isMaximized();
          setIsMaximized(maximized);
        }
      } catch (err) {
        console.warn("Tauri window API check:", err);
      }
    };
    checkMaximized();
  }, []);

  const handleToggleWidget = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        await invoke("toggle_desktop_widget");
      }
    } catch (err) {
      console.error("Failed to toggle desktop widget:", err);
    }
  };

  const handleMinimize = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          await invoke("minimize_window");
        } catch {
          await getCurrentWindow().minimize();
        }
      }
    } catch (err) {
      console.error("Failed to minimize window:", err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const isMax = await invoke<boolean>("toggle_maximize_window");
          setIsMaximized(isMax);
        } catch {
          const win = getCurrentWindow();
          await win.toggleMaximize();
          const maximized = await win.isMaximized();
          setIsMaximized(maximized);
        }
      }
    } catch (err) {
      console.error("Failed to toggle maximize window:", err);
    }
  };

  const handleClose = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          await invoke("close_window");
        } catch {
          await getCurrentWindow().hide();
        }
        setTrayHint(true);
        setTimeout(() => setTrayHint(false), 3500);
      }
    } catch (err) {
      console.error("Failed to hide window:", err);
    }
  };

  return (
    <>
      <header
        data-tauri-drag-region
        className="h-11 w-full select-none flex items-center justify-between px-3 bg-white/70 dark:bg-slate-950/80 backdrop-blur-md border-b border-blue-500/12 dark:border-white/10 z-50 sticky top-0 transition-colors duration-200"
      >
        {/* Brand Logo & Subtitle */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5 pointer-events-none"
        >
          <AppLogo size={22} className="shadow-xs shadow-blue-500/20" />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
              HyperAlarm <span className="text-blue-600 dark:text-blue-400">Pro</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-medium text-slate-400 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2">
              Wake up. Level up.
            </span>
          </div>
        </div>

        {/* Flexible Draggable Center Region */}
        <div
          data-tauri-drag-region
          className="flex-1 h-full mx-4 cursor-default"
        />

        {/* Window Controls & Quick Actions */}
        <div className="flex items-center space-x-1 no-drag">
          {/* Quick Dark/Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-0.5"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Dark Mode"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-90 duration-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600 animate-in spin-in-90 duration-300" />
            )}
          </button>

          {/* Desktop HUD Widget Toggle */}
          <button
            type="button"
            onClick={handleToggleWidget}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs font-semibold mr-1"
            title="Toggle Desktop Widget (Windhawk HUD)"
            aria-label="Toggle Desktop Widget"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline text-[11px]">Widget HUD</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Minimize */}
          <button
            type="button"
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Minimize"
            aria-label="Minimize Window"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
            aria-label="Maximize or Restore Window"
          >
            {isMaximized ? (
              <Copy className="w-3 h-3" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          {/* Close / Hide to Tray */}
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#EF4444] text-slate-500 dark:text-slate-400 hover:text-white transition-all"
            title="Hide to Tray (alarms keep running)"
            aria-label="Hide to System Tray"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Tray hint toast — shown briefly when user clicks X */}
      <AnimatePresence>
        {trayHint && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 right-4 z-[9999] bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl shadow-black/30 flex items-center gap-2.5 border border-white/10"
          >
            <BellRing className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Running in system tray</p>
              <p className="text-slate-400 text-[10px] font-medium">Right-click the tray icon to reopen</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
