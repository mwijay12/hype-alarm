import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";
import { AlarmFireScreen } from "../alarm/AlarmFireScreen";
import { useAlarmScheduler } from "../../hooks/useAlarmScheduler";
import { useTheme } from "../../hooks/useTheme";

export const Layout: React.FC = () => {
  const location = useLocation();

  // Active theme manager (keeps root dark class and system theme synced)
  useTheme();

  // Global alarm scheduler loop (checks every second, fires alarms,
  // manages snoozes, anti-sleep, window focus & native notifications).
  useAlarmScheduler();

  return (
    <div className="flex flex-col h-screen w-full min-w-0 overflow-hidden select-none bg-gradient-to-b from-white via-white to-[#F0F5FF] dark:from-slate-950 dark:via-slate-900 dark:to-[#060913] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Frameless TitleBar */}
      <TitleBar />

      {/* Body Area: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-7 md:p-9 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full h-full max-w-6xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Fullscreen Alarm Screen Overlay & Boosted Audio */}
      <AlarmFireScreen />

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
