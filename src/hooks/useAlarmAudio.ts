import { useEffect, useRef } from "react";
import type { Alarm } from "../lib/types";
import { useAudioEngine } from "./useAudioEngine";

/**
 * Custom alarm audio playback controller (Phase 3 implementation)
 *
 * Plays custom boosted audio if alarm.audioPath is set.
 * Falls back to Web Audio API tone if no audio path is provided or if file cannot be loaded.
 */
export function useAlarmAudio(alarm: Alarm | null, isFiring: boolean) {
  const engine = useAudioEngine();
  const oscIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isFiring || !alarm) {
      engine.stop();
      if (oscIntervalRef.current) {
        clearInterval(oscIntervalRef.current);
        oscIntervalRef.current = null;
      }
      if (fallbackCtxRef.current && fallbackCtxRef.current.state !== "closed") {
        fallbackCtxRef.current.close().catch(() => {});
        fallbackCtxRef.current = null;
      }
      return;
    }

    if (alarm.audioPath) {
      engine.setVolumeBoost(alarm.volumeBoost || 150);
      engine.loadAudio(alarm.audioPath).then((buffer) => {
        if (buffer) {
          engine.play(
            alarm.audioStartMs || 0,
            alarm.audioEndMs || 0,
            alarm.fadeInSeconds || 0,
            true // loop during alarm
          );
        } else {
          startFallbackBeep(alarm.volumeBoost || 150);
        }
      });
    } else {
      startFallbackBeep(alarm.volumeBoost || 150);
    }

    function startFallbackBeep(volumeBoost: number) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioContextClass();
        fallbackCtxRef.current = ctx;

        const playBeep = () => {
          if (ctx.state === "closed") return;
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 alert tone
          gain.gain.setValueAtTime((volumeBoost / 100) * 0.3, ctx.currentTime);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        };

        playBeep();
        oscIntervalRef.current = setInterval(playBeep, 600);
      } catch (err) {
        console.warn("Fallback oscillator error:", err);
      }
    }

    return () => {
      engine.stop();
      if (oscIntervalRef.current) {
        clearInterval(oscIntervalRef.current);
        oscIntervalRef.current = null;
      }
      if (fallbackCtxRef.current && fallbackCtxRef.current.state !== "closed") {
        fallbackCtxRef.current.close().catch(() => {});
        fallbackCtxRef.current = null;
      }
    };
  }, [isFiring, alarm?.id]);

  return {
    stopAudio: engine.stop,
  };
}
