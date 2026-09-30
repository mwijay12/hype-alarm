import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BellRing,
  Music2,
  BarChart3,
  History,
  Settings,
  ShieldCheck,
  Shield,
  Loader2,
} from "lucide-react";
import { useAlarmStore } from "../../store/alarmStore";
import { usePowerStore } from "../../store/powerStore";
import { useTheme } from "../../hooks/useTheme";
import { AppLogo } from "../ui/AppLogo";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { alarms } = useAlarmStore();
  const { isAntiSleepActive, isLoading: isPowerLoading, toggleAntiSleep, syncStatus } = usePowerStore();
  const { isDark } = useTheme();
  const activeCount = alarms.filter((a) => a.isActive).length;

  useEffect(() => {
    syncStatus();
  }, [syncStatus]);

  const navItems: NavItem[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Alarms", path: "/alarms", icon: BellRing, badge: activeCount },
    { name: "Sound Library", path: "/sounds", icon: Music2 },
    { name: "Progress", path: "/progress", icon: BarChart3 },
    { name: "History", path: "/history", icon: History },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-[250px] min-w-[250px] h-[calc(100vh-2.75rem)] bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-r border-blue-500/15 dark:border-white/10 flex flex-col justify-between p-4 overflow-y-auto select-none transition-colors duration-200">
      {/* Top Section: Brand Identity & Nav Links */}
      <div className="space-y-6">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <AppLogo size={36} animate className="shadow-md shadow-blue-500/25" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                HyperAlarm
              </span>
              <span className="bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-blue-600/20 dark:border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
              Desktop Edition
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <div className="px-2 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Menu
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30 font-semibold shadow-sm shadow-blue-500/5"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:translate-x-1"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.name}</span>

                    {/* Active Alarm Count Badge on Alarms item */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {item.badge}
                      </span>
                    )}

                    {isActive && item.badge === undefined && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-600/50" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Active Alarms Status & Profile */}
      <div className="space-y-3 pt-4 border-t border-blue-500/10 dark:border-white/10">
        {/* Active Alarms Quick Status Indicator */}
        <div className="px-3 py-2 rounded-2xl bg-blue-50/50 dark:bg-slate-800/50 border border-blue-100/70 dark:border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {activeCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300 dark:bg-slate-600" />
              )}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {activeCount > 0 ? `${activeCount} Active Alarms` : "No active alarms"}
            </span>
          </div>
        </div>

        {/* Anti-Sleep Guardian Card */}
        <motion.div
          animate={{
            backgroundColor: isAntiSleepActive
              ? isDark ? "rgba(6, 78, 59, 0.4)" : "rgba(236, 253, 245, 0.85)"
              : isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.75)",
            borderColor: isAntiSleepActive
              ? isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.35)"
              : isDark ? "rgba(51, 65, 85, 0.6)" : "rgba(226, 232, 240, 0.8)",
          }}
          transition={{ duration: 0.3 }}
          className="p-3 rounded-2xl border flex items-center justify-between shadow-xs transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isAntiSleepActive
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400"
              }`}
            >
              {isAntiSleepActive ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Shield className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block leading-tight">
                  Anti-Sleep
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                    isAntiSleepActive
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {isAntiSleepActive ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block truncate">
                {isAntiSleepActive ? "PC will not sleep" : "Arms when alarm is set"}
              </span>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={toggleAntiSleep}
            disabled={isPowerLoading}
            title={isAntiSleepActive ? "Click to disable Anti-Sleep" : "Click to enable Anti-Sleep"}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isAntiSleepActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
            } ${isPowerLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {isPowerLoading ? (
              <Loader2 className="w-3 h-3 text-white absolute inset-0 m-auto animate-spin" />
            ) : (
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isAntiSleepActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            )}
          </button>
        </motion.div>

        {/* Profile Card */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center text-white text-xs font-bold shadow-sm">
              HA
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
              Morning Builder
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
              Ready to rise
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
