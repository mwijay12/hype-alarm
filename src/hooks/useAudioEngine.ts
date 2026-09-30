import { useRef, useState, useCallback, useEffect } from "react";
import type { AudioEngineState } from "../lib/types";
import { loadAudioArrayBuffer } from "../services/audioService";

/**
 * HyperAlarm Pro Core Audio Engine Hook
 *
 * ARCHITECTURAL BOOST NOTE:
 * Normal Browser/OS audio:
 *   AudioElement -> OS Mixer -> Speakers (Capped at 100% system volume)
 *
 * HyperAlarm Pro Boosted Path:
 *   AudioBufferSourceNode / HTMLAudioElement
 *     -> MediaElementSourceNode (or BufferSource)
 *     -> GainNode (gain.value = 1.0 to 4.0 = 100% to 400%)
 *     -> AudioContext.destination
 *     -> OS Mixer -> Speakers
 *
 * By amplifying the audio signal through GainNode BEFORE it reaches
 * the OS mixer, we achieve true amplification up to 4x (400%) similar to VLC.
 */
export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Timing and tracking refs
  const playbackStartTimeRef = useRef<number>(0);
  const startOffsetSecRef = useRef<number>(0);
  const pausedAtSecRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<AudioEngineState>({
    config: {
      audioFile: null,
      trimRegion: { startMs: 0, endMs: 0 },
      volumeBoost: 100,
      fadeInSeconds: 0,
      loop: false,
    },
    playbackState: "idle",
    currentTimeMs: 0,
    error: null,
  });

  // Ensure AudioContext and GainNode are initialized and active
  const ensureContext = useCallback(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
      const gain = audioContextRef.current.createGain();
      gain.gain.value = state.config.volumeBoost / 100;
      gain.connect(audioContextRef.current.destination);
      gainNodeRef.current = gain;
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, [state.config.volumeBoost]);

  // Load audio file from path into AudioBuffer
  const loadAudio = useCallback(
    async (filePath: string) => {
      try {
        setState((prev) => ({
          ...prev,
          playbackState: "loading",
          error: null,
        }));

        const ctx = ensureContext();
        const arrayBuffer = await loadAudioArrayBuffer(filePath);
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        audioBufferRef.current = decodedBuffer;
        const totalDurationMs = Math.floor(decodedBuffer.duration * 1000);

        setState((prev) => ({
          ...prev,
          playbackState: "ready",
          currentTimeMs: 0,
          config: {
            ...prev.config,
            trimRegion: {
              startMs: 0,
              endMs: totalDurationMs,
            },
          },
        }));

        return decodedBuffer;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load audio file";
        setState((prev) => ({
          ...prev,
          playbackState: "error",
          error: errorMsg,
        }));
        return null;
      }
    },
    [ensureContext]
  );

  // Set volume boost (100% to 400%)
  // gain.value = boost / 100 (1.0 = 100%, 2.0 = 200%, 4.0 = 400%)
  const setVolumeBoost = useCallback((boost: number) => {
    const clamped = Math.min(400, Math.max(100, boost));

    if (gainNodeRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      const targetGain = clamped / 100;
      // Gentle ramp to prevent clicks
      gainNodeRef.current.gain.linearRampToValueAtTime(
        targetGain,
        ctx.currentTime + 0.05
      );
    }

    setState((prev) => ({
      ...prev,
      config: { ...prev.config, volumeBoost: clamped },
    }));
  }, []);

  // Update trim region
  const setTrimRegion = useCallback((startMs: number, endMs: number) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        trimRegion: { startMs, endMs },
      },
    }));
  }, []);

  // Track position animation frame
  const trackPosition = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    const ctx = audioContextRef.current;
    const elapsed = ctx.currentTime - playbackStartTimeRef.current;
    const currentSec = startOffsetSecRef.current + elapsed;
    const currentMs = Math.floor(currentSec * 1000);

    setState((prev) => ({
      ...prev,
      currentTimeMs: currentMs,
    }));

    animFrameRef.current = requestAnimationFrame(trackPosition);
  }, []);

  // Stop playback and cleanup source
  const stop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Source already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    pausedAtSecRef.current = 0;

    setState((prev) => ({
      ...prev,
      playbackState: "stopped",
      currentTimeMs: prev.config.trimRegion.startMs,
    }));
  }, []);

  // Play audio with trim, boost, and fade-in
  const play = useCallback(
    (
      startMs?: number,
      endMs?: number,
      fadeInSeconds?: number,
      loop?: boolean
    ) => {
      if (!audioBufferRef.current) return;

      stop();
      const ctx = ensureContext();

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;

      const targetStartMs = startMs ?? state.config.trimRegion.startMs;
      const targetEndMs =
        endMs && endMs > targetStartMs
          ? endMs
          : state.config.trimRegion.endMs ||
            Math.floor(audioBufferRef.current.duration * 1000);

      const startSec = Math.max(0, targetStartMs / 1000);
      const endSec = Math.min(
        audioBufferRef.current.duration,
        targetEndMs / 1000
      );
      const durationSec = Math.max(0.1, endSec - startSec);
      const shouldLoop = loop ?? state.config.loop;
      const fadeSec = fadeInSeconds ?? state.config.fadeInSeconds;

      if (shouldLoop) {
        source.loop = true;
        source.loopStart = startSec;
        source.loopEnd = endSec;
      }

      // Connect source to GainNode
      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);

        const targetGain = state.config.volumeBoost / 100;
        if (fadeSec > 0) {
          gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
          gainNodeRef.current.gain.setValueAtTime(0.001, ctx.currentTime);
          gainNodeRef.current.gain.exponentialRampToValueAtTime(
            targetGain,
            ctx.currentTime + Math.min(fadeSec, durationSec)
          );
        } else {
          gainNodeRef.current.gain.setValueAtTime(targetGain, ctx.currentTime);
        }
      }

      // Start buffer source
      source.start(0, startSec, shouldLoop ? undefined : durationSec);
      sourceNodeRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      startOffsetSecRef.current = startSec;

      source.onended = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          playbackState:
            prev.playbackState === "playing" ? "stopped" : prev.playbackState,
          currentTimeMs: prev.config.trimRegion.startMs,
        }));
      };

      setState((prev) => ({
        ...prev,
        playbackState: "playing",
        currentTimeMs: targetStartMs,
      }));

      // Start real-time position tracking
      animFrameRef.current = requestAnimationFrame(trackPosition);
    },
    [ensureContext, state.config, stop, trackPosition]
  );

  // Pause playback
  const pause = useCallback(() => {
    if (audioContextRef.current && state.playbackState === "playing") {
      audioContextRef.current.suspend();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setState((prev) => ({ ...prev, playbackState: "paused" }));
    }
  }, [state.playbackState]);

  // Resume playback from pause
  const resume = useCallback(() => {
    if (audioContextRef.current && state.playbackState === "paused") {
      audioContextRef.current.resume();
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      animFrameRef.current = requestAnimationFrame(trackPosition);
      setState((prev) => ({ ...prev, playbackState: "playing" }));
    }
  }, [state.playbackState, trackPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // ignore
        }
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    state,
    loadAudio,
    play,
    stop,
    pause,
    resume,
    setVolumeBoost,
    setTrimRegion,
    isPlaying: state.playbackState === "playing",
    isLoading: state.playbackState === "loading",
    isPaused: state.playbackState === "paused",
    isReady:
      state.playbackState === "ready" ||
      state.playbackState === "playing" ||
      state.playbackState === "paused" ||
      state.playbackState === "stopped",
    currentTimeMs: state.currentTimeMs,
    audioBuffer: audioBufferRef.current,
  };
}
