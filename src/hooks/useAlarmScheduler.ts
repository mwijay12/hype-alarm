import { useEffect, useRef, useCallback } from "react";
import { useAlarmStore } from "../store/alarmStore";
import { usePowerStore } from "../store/powerStore";
import { useSettingsStore } from "../store/settingsStore";
import { useAICompanion } from "./useAICompanion";
import { shouldAlarmFire, formatTime } from "../lib/utils";
import { WAKE_UP_MESSAGES } from "../lib/constants";
import type { Alarm } from "../lib/types";

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

export function useAlarmScheduler() {
  const { alarms, firingAlarm, setFiringAlarm, snoozedAlarms, cancelSnooze } = useAlarmStore();
  const { isAntiSleepActive, enableAntiSleep, disableAntiSleep } = usePowerStore();
  const { settings } = useSettingsStore();
  const { generateVoice, checkVoiceCache } = useAICompanion();
  const hasInitializedRef = useRef(false);
  const lastPreCacheDayRef = useRef<string>("");
  const lastFiredMinuteMapRef = useRef<Map<string, string>>(new Map());

  // Wake up & bring window to front and send native notification
  const wakeUpWindowAndNotify = useCallback(async (alarm: Alarm) => {
    if (!isTauri()) return;

    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.show();
      await win.unminimize();
      await win.setFocus();
      await win.setAlwaysOnTop(true);
    } catch (err) {
      console.warn("[Scheduler] Window focus error:", err);
    }

    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import(
        "@tauri-apps/plugin-notification"
      );
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (granted) {
        sendNotification({
          title: `⏰ HyperAlarm Pro: ${alarm.label}`,
          body: `It's ${formatTime(alarm.hour, alarm.minute)}! Time to wake up and conquer your day!`,
        });
      }
    } catch (err) {
      console.warn("[Scheduler] Notification error:", err);
    }
  }, []);

  // Trigger alarm firing
  const triggerAlarm = useCallback(
    async (alarm: Alarm, snoozeCount = 0) => {
      setFiringAlarm(alarm, snoozeCount);
      enableAntiSleep();
      await wakeUpWindowAndNotify(alarm);
    },
    [setFiringAlarm, enableAntiSleep, wakeUpWindowAndNotify]
  );

  // Restore setAlwaysOnTop(false) when alarm is dismissed or snoozed
  useEffect(() => {
    if (!firingAlarm && isTauri()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => getCurrentWindow().setAlwaysOnTop(false))
        .catch(() => {});
    } else if (firingAlarm && isTauri()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          const win = getCurrentWindow();
          win.show();
          win.unminimize();
          win.setFocus();
          win.setAlwaysOnTop(true);
        })
        .catch(() => {});
    }
  }, [firingAlarm]);

  // Auto-manage Anti-Sleep state based on active alarms, snoozes, and firing status
  useEffect(() => {
    const activeAlarmsCount = alarms.filter((a) => a.isActive).length;
    const shouldBeActive =
      activeAlarmsCount > 0 || firingAlarm !== null || snoozedAlarms.length > 0;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (shouldBeActive && !isAntiSleepActive) {
        enableAntiSleep();
      }
      return;
    }

    if (shouldBeActive && !isAntiSleepActive) {
      enableAntiSleep();
    } else if (!shouldBeActive && isAntiSleepActive) {
      disableAntiSleep();
    }
  }, [alarms, firingAlarm, snoozedAlarms.length, isAntiSleepActive, enableAntiSleep, disableAntiSleep]);

  // Periodic scheduler loop checking every second
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const currentMinuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}:${now.getMinutes()}`;

      // 1. Check active snoozes first
      const nowMs = Date.now();
      for (const item of snoozedAlarms) {
        if (nowMs >= item.snoozeUntil) {
          console.log(
            `[Scheduler] Snooze timer fired for "${item.alarm.label}"! Re-firing with snooze count ${item.snoozeCount}.`
          );
          cancelSnooze(item.alarmId);
          triggerAlarm(item.alarm, item.snoozeCount);
          return; // Process one trigger per tick
        }
      }

      // 2. Check scheduled alarm firing (if not already firing)
      if (!firingAlarm) {
        for (const alarm of alarms) {
          // Do not fire if this alarm is currently snoozed
          if (snoozedAlarms.some((s) => s.alarmId === alarm.id)) {
            continue;
          }

          if (shouldAlarmFire(alarm, now)) {
            const lastFired = lastFiredMinuteMapRef.current.get(alarm.id);
            if (lastFired !== currentMinuteKey) {
              lastFiredMinuteMapRef.current.set(alarm.id, currentMinuteKey);
              console.log(
                `[Scheduler] Firing scheduled alarm: "${alarm.label}" (${alarm.hour}:${alarm.minute})`
              );
              triggerAlarm(alarm, 0);
              break; // Fire one alarm at a time
            }
          }
        }
      }

      // 3. Nightly pre-caching routine at 23:00 (11 PM) for ElevenLabs voice
      if (settings.aiVoiceEnabled && settings.elevenLabsApiKey) {
        const todayStr = now.toISOString().split("T")[0];
        if (now.getHours() === 23 && lastPreCacheDayRef.current !== todayStr) {
          lastPreCacheDayRef.current = todayStr;
          console.log("[Scheduler] 11 PM: Running nightly voice pre-caching for tomorrow...");

          const tomorrow = new Date(now.getTime() + 86400000);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];
          const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "long" });

          for (const alarm of alarms.filter((a) => a.isActive)) {
            const cacheKey = `${tomorrowStr}_${alarm.id}`;
            const alreadyCached = await checkVoiceCache(cacheKey);

            if (!alreadyCached) {
              const randomTemplate =
                WAKE_UP_MESSAGES[Math.floor(Math.random() * WAKE_UP_MESSAGES.length)];
              const timeStr = formatTime(alarm.hour, alarm.minute);
              const messageText = randomTemplate
                .replace(/{time}/g, timeStr)
                .replace(/{day}/g, tomorrowDay)
                .replace(/{name}/g, alarm.label);

              await generateVoice(messageText, cacheKey);
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    alarms,
    firingAlarm,
    snoozedAlarms,
    cancelSnooze,
    triggerAlarm,
    settings.aiVoiceEnabled,
    settings.elevenLabsApiKey,
    generateVoice,
    checkVoiceCache,
  ]);
}
