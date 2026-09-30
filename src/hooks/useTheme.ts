import { useEffect, useState, useCallback } from "react";
import { useSettingsStore } from "../store/settingsStore";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "hyperalarm_theme";

/**
 * Apply dark or light class to <html> (root document element)
 */
function applyThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function resolveSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const { settings, updateSetting } = useSettingsStore();
  const theme = (settings.theme || "dark") as ThemeMode;

  const [isDark, setIsDark] = useState<boolean>(() => {
    // Immediate check
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(THEME_STORAGE_KEY)) as ThemeMode | null;
    const active = saved || settings.theme || "dark";
    if (active === "dark") return true;
    if (active === "light") return false;
    return resolveSystemDark();
  });

  // Keep DOM class and state in sync whenever theme setting changes or system changes
  useEffect(() => {
    const handleThemeChange = () => {
      let resolvedDark: boolean;
      if (theme === "dark") {
        resolvedDark = true;
      } else if (theme === "light") {
        resolvedDark = false;
      } else {
        resolvedDark = resolveSystemDark();
      }

      setIsDark(resolvedDark);
      applyThemeClass(resolvedDark);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    };

    handleThemeChange();

    // If in system mode, listen to OS dark/light mode toggles in real-time
    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        applyThemeClass(e.matches);
      };

      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {}
      await updateSetting("theme", newTheme);
    },
    [updateSetting]
  );

  const toggleTheme = useCallback(async () => {
    // If currently dark, switch to light; if light, switch to dark
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    await setTheme(nextTheme);
  }, [isDark, setTheme]);

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
