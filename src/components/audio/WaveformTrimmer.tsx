import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { getAudioBlobUrl } from "../../services/audioService";
import { msToDisplay } from "../../lib/utils";
import { Scissors, RotateCcw, Loader2 } from "lucide-react";

interface WaveformTrimmerProps {
  audioFilePath: string;
  trimStartMs: number;
  trimEndMs: number;
  onTrimChange: (startMs: number, endMs: number) => void;
  onDurationLoaded?: (durationMs: number) => void;
  className?: string;
}

export const WaveformTrimmer: React.FC<WaveformTrimmerProps> = ({
  audioFilePath,
  trimStartMs,
  trimEndMs,
  onTrimChange,
  onDurationLoaded,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const activeRegionRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize WaveSurfer & Regions
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const regions = RegionsPlugin.create();
    regionsPluginRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#93C5FD",
      progressColor: "#2563EB",
      cursorColor: "#0EA5E9",
      cursorWidth: 2,
      height: 96,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      plugins: [regions],
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      setIsLoading(false);
      const dur = ws.getDuration();
      if (onDurationLoaded && dur > 0) {
        onDurationLoaded(Math.floor(dur * 1000));
      }

      // Add or update initial trim region
      regions.clearRegions();
      const initialStart = Math.max(0, trimStartMs / 1000);
      const initialEnd =
        trimEndMs > 0 && trimEndMs / 1000 <= dur
          ? trimEndMs / 1000
          : dur || 30;

      const region = regions.addRegion({
        start: initialStart,
        end: initialEnd,
        color: "rgba(37, 99, 235, 0.22)",
        drag: true,
        resize: true,
      });

      activeRegionRef.current = region;
    });

    // Listen for user resizing or dragging the trim region
    regions.on("region-updated", (region: any) => {
      activeRegionRef.current = region;
      const startMs = Math.floor(region.start * 1000);
      const endMs = Math.floor(region.end * 1000);
      onTrimChange(startMs, endMs);
    });

    ws.on("error", (err) => {
      console.warn("WaveSurfer load notice:", err);
      setIsLoading(false);
    });

    // Load file via local blob URL (bypasses CORS/asset protocol restrictions)
    if (audioFilePath) {
      setIsLoading(true);
      getAudioBlobUrl(audioFilePath)
        .then((blobUrl) => {
          if (wavesurferRef.current) {
            wavesurferRef.current.load(blobUrl).catch(() => {
              setIsLoading(false);
            });
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      // Create synthetic visual waveform bars when mock path or empty
      setIsLoading(false);
    }

    return () => {
      try {
        ws.destroy();
      } catch {
        // ignore
      }
    };
  }, [audioFilePath]);

  // Reset trim to entire track
  const handleResetTrim = useCallback(() => {
    if (wavesurferRef.current && regionsPluginRef.current) {
      const dur = wavesurferRef.current.getDuration() || 60;
      regionsPluginRef.current.clearRegions();
      const region = regionsPluginRef.current.addRegion({
        start: 0,
        end: dur,
        color: "rgba(37, 99, 235, 0.22)",
        drag: true,
        resize: true,
      });
      activeRegionRef.current = region;
      onTrimChange(0, Math.floor(dur * 1000));
    } else {
      onTrimChange(0, trimEndMs || 180000);
    }
  }, [trimEndMs, onTrimChange]);

  const selectedDurationMs = Math.max(0, trimEndMs - trimStartMs);

  return (
    <div
      className={`rounded-2xl bg-blue-50/60 border border-blue-200/70 p-4 space-y-3 ${className}`}
    >
      {/* Top Bar with Labels */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Scissors className="w-3.5 h-3.5 text-blue-600" />
          <span>Interactive Waveform Trimmer</span>
        </div>

        <button
          type="button"
          onClick={handleResetTrim}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Trim</span>
        </button>
      </div>

      {/* Waveform Canvas Area */}
      <div className="relative rounded-xl bg-white/80 border border-blue-100 p-2 overflow-hidden shadow-inner">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Decoding waveform...</span>
          </div>
        )}

        {/* WaveSurfer rendering container */}
        <div ref={containerRef} className="w-full min-h-[96px]" />

        {/* Synthetic preview bars if no active wavesurfer track */}
        {!audioFilePath && (
          <div className="flex items-center justify-between gap-1 h-[96px] px-4 py-2">
            {Array.from({ length: 48 }).map((_, i) => {
              const heightPct = Math.max(
                15,
                Math.sin(i * 0.35) * 45 + Math.cos(i * 0.7) * 35 + 30
              );
              const isTrimmed =
                i >= 6 && i <= 36;
              return (
                <div
                  key={i}
                  style={{ height: `${heightPct}%` }}
                  className={`w-1 rounded-full transition-all ${
                    isTrimmed
                      ? "bg-blue-600 shadow-sm shadow-blue-500/20"
                      : "bg-blue-200"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Trim Status Info Bar */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100/70">
        <div className="flex items-center gap-2">
          <span className="font-mono px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold">
            Start: {msToDisplay(trimStartMs)}
          </span>
          <span className="text-slate-400">→</span>
          <span className="font-mono px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold">
            End: {msToDisplay(trimEndMs || 180000)}
          </span>
        </div>

        <div className="text-slate-500 font-medium">
          Playing:{" "}
          <span className="font-bold text-slate-800 font-mono">
            {msToDisplay(selectedDurationMs)}
          </span>
        </div>
      </div>
    </div>
  );
};
