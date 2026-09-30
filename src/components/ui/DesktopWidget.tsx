import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAlarmStore } from "../../store/alarmStore";
import { formatTime, getNextFireLabel } from "../../lib/utils";
import {
  Bell,
  BellOff,
  Pin,
  PinOff,
  Minimize2,
  Maximize2,
  AppWindow,
  X,
  GripHorizontal,
} from "lucide-react";

export const DesktopWidget: React.FC = () => {
  const { alarms, loadAlarms } = useAlarmStore();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

  // 1. Wezesha mtindo wa uwazi (transparent widget mode) kwenye body
  useEffect(() => {
    document.body.classList.add("widget-mode");
    loadAlarms();

    // Sasisha muda kila sekunde 1
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Sikiliza mabadiliko ya kengele kutoka dirisha kuu
    let unlisten: (() => void) | undefined;
    listen("alarm-updated", () => {
      loadAlarms();
    }).then((unsub) => {
      unlisten = unsub;
    });

    return () => {
      document.body.classList.remove("widget-mode");
      clearInterval(timer);
      if (unlisten) unlisten();
    };
  }, [loadAlarms]);

  // 2. Tafuta kengele inayofuata (Next Active Alarm)
  const activeAlarms = useMemo(() => {
    return alarms.filter((a) => a.isActive);
  }, [alarms]);

  const nextAlarm = useMemo(() => {
    if (activeAlarms.length === 0) return null;
    return activeAlarms[0];
  }, [activeAlarms]);

  // Muda: HH:MM na :SS
  const hours = String(currentTime.getHours()).padStart(2, "0");
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");

  // Tarehe
  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Toggle Always On Top
  const handleTogglePin = async () => {
    try {
      const nextState = !isAlwaysOnTop;
      await invoke("set_widget_always_on_top", { alwaysOnTop: nextState });
      setIsAlwaysOnTop(nextState);
    } catch (err) {
      console.error("Failed to set always on top:", err);
    }
  };

  // Toggle Compact / Expanded
  const handleToggleCompact = async () => {
    try {
      const nextCompact = !isCompact;
      if (nextCompact) {
        await invoke("set_widget_size", { width: 300.0, height: 85.0 });
      } else {
        await invoke("set_widget_size", { width: 380.0, height: 175.0 });
      }
      setIsCompact(nextCompact);
    } catch (err) {
      console.error("Failed to resize widget:", err);
    }
  };

  // Fungua Dirisha Kuu
  const handleOpenMain = async () => {
    try {
      await invoke("show_main_window");
    } catch (err) {
      console.error("Failed to show main window:", err);
    }
  };

  // Funga/Ficha Widget
  const handleCloseWidget = async () => {
    try {
      await invoke("toggle_desktop_widget", { show: false });
    } catch (err) {
      console.error("Failed to hide widget:", err);
    }
  };

  // Muundo wa Compact (Mini Pill HUD)
  if (isCompact) {
    return (
      <div
        data-tauri-drag-region
        className="w-full h-full p-2 select-none flex items-center justify-center cursor-move"
      >
        <div
          data-tauri-drag-region
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-blue-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(37,99,235,0.25)] group relative overflow-hidden"
        >
          {/* Top highlight glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Clock Display */}
          <div data-tauri-drag-region className="flex items-baseline gap-1">
            <span className="digital-text text-2xl font-black tracking-tight text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
              {hours}:{minutes}
            </span>
            <span className="digital-text text-sm font-bold text-cyan-400">
              :{seconds}
            </span>
          </div>

          {/* Next Alarm or Date */}
          <div data-tauri-drag-region className="flex items-center gap-1.5 text-xs text-slate-300 mx-2 truncate max-w-[130px]">
            {nextAlarm ? (
              <>
                <Bell className="w-3 h-3 text-blue-400 flex-shrink-0 animate-pulse" />
                <span className="truncate font-medium">{formatTime(nextAlarm.hour, nextAlarm.minute)}</span>
              </>
            ) : (
              <span className="text-slate-400 text-[11px] truncate">{formattedDate}</span>
            )}
          </div>

          {/* Mini Controls */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-drag">
            <button
              type="button"
              onClick={handleToggleCompact}
              title="Expand HUD"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleOpenMain}
              title="Open HyperAlarm Pro"
              className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
            >
              <AppWindow className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCloseWidget}
              title="Close Widget"
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Muundo Kamili wa Windhawk HUD (Standard Glassmorphism HUD)
  return (
    <div
      data-tauri-drag-region
      className="w-full h-full p-2 select-none flex items-center justify-center cursor-move"
    >
      <div
        data-tauri-drag-region
        className="w-full h-full flex flex-col justify-between p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-blue-500/35 shadow-[0_12px_36px_rgba(0,0,0,0.75),0_0_25px_rgba(37,99,235,0.22)] relative overflow-hidden group"
      >
        {/* Top Gradient Highlight Strip */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 opacity-90" />

        {/* Header Row: Date & Action Controls */}
        <div data-tauri-drag-region className="flex items-center justify-between w-full">
          <div data-tauri-drag-region className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              {formattedDate}
            </span>
          </div>

          {/* Quick Action Controls (Fades in on hover) */}
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity no-drag">
            <button
              type="button"
              onClick={handleTogglePin}
              title={isAlwaysOnTop ? "Always On Top: ON" : "Always On Top: OFF"}
              className={`p-1 rounded-lg transition-colors ${
                isAlwaysOnTop
                  ? "text-blue-400 bg-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {isAlwaysOnTop ? (
                <Pin className="w-3.5 h-3.5" />
              ) : (
                <PinOff className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleCompact}
              title="Compact Mode"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleOpenMain}
              title="Open HyperAlarm Pro"
              className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
            >
              <AppWindow className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleCloseWidget}
              title="Close Widget"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Row: Bold Orbitron Clock */}
        <div data-tauri-drag-region className="flex items-baseline justify-between w-full my-auto">
          <div data-tauri-drag-region className="flex items-baseline gap-1">
            <span className="digital-text text-4xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]">
              {hours}:{minutes}
            </span>
            <span className="digital-text text-xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] ml-1">
              :{seconds}
            </span>
          </div>

          <div
            data-tauri-drag-region
            className="flex items-center text-slate-600 group-hover:text-slate-400 transition-colors cursor-move"
            title="Drag to reposition widget"
          >
            <GripHorizontal className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom Row: Next Alarm HUD Badge */}
        <div data-tauri-drag-region className="w-full pt-1">
          {nextAlarm ? (
            <div
              data-tauri-drag-region
              className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs shadow-inner"
            >
              <div data-tauri-drag-region className="flex items-center gap-2 truncate max-w-[220px]">
                <Bell className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 animate-bounce" />
                <span className="font-semibold text-white truncate">
                  {formatTime(nextAlarm.hour, nextAlarm.minute)}
                </span>
                <span className="text-[11px] text-blue-300/80 truncate">
                  • {nextAlarm.label || "Alarm"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30 flex-shrink-0">
                {getNextFireLabel(nextAlarm)}
              </span>
            </div>
          ) : (
            <div
              data-tauri-drag-region
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 text-xs"
            >
              <BellOff className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium">No active alarms set</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
