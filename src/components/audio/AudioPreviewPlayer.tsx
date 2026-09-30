import React, { useEffect, useState, useRef } from "react";
import { useAudioEngine } from "../../hooks/useAudioEngine";
import type { AudioFile } from "../../lib/types";
import { msToDisplay, getBoostLabel } from "../../lib/utils";
import {
  Play,
  Square,
  Volume2,
  Sparkles,
  Scissors,
  Loader2,
} from "lucide-react";

interface AudioPreviewPlayerProps {
  audioFile: AudioFile | null;
  trimStartMs: number;
  trimEndMs: number;
  volumeBoost: number;
  fadeInSeconds: number;
  onClose?: () => void;
  className?: string;
}

export const AudioPreviewPlayer: React.FC<AudioPreviewPlayerProps> = ({
  audioFile,
  trimStartMs,
  trimEndMs,
  volumeBoost,
  fadeInSeconds,
  className = "",
}) => {
  const engine = useAudioEngine();
  const [syntheticPlaying, setSyntheticPlaying] = useState(false);
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthPositionRef = useRef<number>(trimStartMs);
  const [synthDisplayPos, setSynthDisplayPos] = useState<number>(trimStartMs);

  // Sync volume boost with audio engine
  useEffect(() => {
    engine.setVolumeBoost(volumeBoost);
  }, [volumeBoost, engine]);

  // Load audio file when path exists
  useEffect(() => {
    if (audioFile?.path) {
      engine.loadAudio(audioFile.path);
    }
  }, [audioFile?.path]);

  // Handle Play/Stop
  const handleTogglePlay = () => {
    if (engine.isPlaying || syntheticPlaying) {
      // Stop
      engine.stop();
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      setSyntheticPlaying(false);
      setSynthDisplayPos(trimStartMs);
    } else {
      // Play
      if (audioFile?.path) {
        engine.play(trimStartMs, trimEndMs, fadeInSeconds, false);
      } else {
        // Play synthetic preview tone for mock/empty file
        setSyntheticPlaying(true);
        synthPositionRef.current = trimStartMs;
        setSynthDisplayPos(trimStartMs);

        // Web Audio API fallback tone with GainNode
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
          gain.gain.setValueAtTime((volumeBoost / 100) * 0.25, ctx.currentTime);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();

          const durationMs = Math.max(1000, (trimEndMs || 60000) - trimStartMs);
          setTimeout(() => {
            try {
              osc.stop();
              ctx.close();
            } catch {}
            setSyntheticPlaying(false);
            setSynthDisplayPos(trimStartMs);
          }, Math.min(5000, durationMs)); // Preview up to 5s for synthetic
        } catch {
          // ignore
        }

        synthTimerRef.current = setInterval(() => {
          synthPositionRef.current += 100;
          setSynthDisplayPos(synthPositionRef.current);
        }, 100);
      }
    }
  };

  const isCurrentlyPlaying = engine.isPlaying || syntheticPlaying;
  const currentPos = isCurrentlyPlaying
    ? engine.isPlaying
      ? engine.currentTimeMs
      : synthDisplayPos
    : trimStartMs;

  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 shadow-xl shadow-blue-950/20 border border-blue-800/60 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Track Title and Time */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center ${
              isCurrentlyPlaying ? "animate-pulse" : ""
            }`}
          >
            <Volume2 className="w-5 h-5 text-blue-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white line-clamp-1">
                {audioFile?.fileName || "Preview Mode (Default Tone)"}
              </span>
              {isCurrentlyPlaying && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  PLAYING
                </span>
              )}
            </div>

            <div className="font-mono text-xs text-blue-200/80 font-medium">
              {msToDisplay(currentPos)} / {msToDisplay(trimEndMs || 180000)}
            </div>
          </div>
        </div>

        {/* Play / Stop Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={engine.isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 ${
              isCurrentlyPlaying
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/40"
            }`}
          >
            {engine.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : isCurrentlyPlaying ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Preview</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play Trimmed Preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-blue-800/70 text-[11px]">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-800/50 border border-blue-700/50 font-semibold text-blue-200">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Boost: {volumeBoost}%</span>
          <span className="text-[10px] text-blue-300 font-normal">
            ({getBoostLabel(volumeBoost)})
          </span>
        </div>

        {fadeInSeconds > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-800/50 border border-blue-700/50 font-semibold text-blue-200">
            <span>Fade In: {fadeInSeconds}s</span>
          </div>
        )}

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-800/50 border border-blue-700/50 font-semibold text-blue-200">
          <Scissors className="w-3 h-3 text-blue-400" />
          <span>
            {msToDisplay(trimStartMs)} → {msToDisplay(trimEndMs || 180000)}
          </span>
        </div>
      </div>
    </div>
  );
};
