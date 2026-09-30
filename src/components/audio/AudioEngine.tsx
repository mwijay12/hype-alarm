import React, { useState } from "react";
import type { AudioLibraryEntry } from "../../lib/types";
import { WaveformTrimmer } from "./WaveformTrimmer";
import { BoostSlider } from "./BoostSlider";
import { AudioPreviewPlayer } from "./AudioPreviewPlayer";
import { msToDisplay } from "../../lib/utils";
import {
  Music2,
  X,
  Check,
  Edit2,
  Clock,
  Save,
} from "lucide-react";
import { showToast } from "../ui/Toast";

interface AudioEngineProps {
  track: AudioLibraryEntry;
  onSave?: (updated: Partial<AudioLibraryEntry>) => void;
  onClose?: () => void;
}

const FADE_OPTIONS = [
  { label: "None", value: 0 },
  { label: "2s", value: 2 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
];

export const AudioEngine: React.FC<AudioEngineProps> = ({
  track,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(track.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [trimStartMs, setTrimStartMs] = useState(track.trimStartMs || 0);
  const [trimEndMs, setTrimEndMs] = useState(
    track.trimEndMs || track.file.durationMs || 180000
  );
  const [volumeBoost, setVolumeBoost] = useState(track.volumeBoost || 150);
  const [fadeInSeconds, setFadeInSeconds] = useState(
    track.fadeInSeconds || 0
  );

  const handleSave = () => {
    const updates: Partial<AudioLibraryEntry> = {
      name,
      trimStartMs,
      trimEndMs,
      volumeBoost,
      fadeInSeconds,
    };

    if (onSave) {
      onSave(updates);
    }
    showToast(`Saved settings for "${name}"`, "success");
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-100 dark:border-slate-800 shadow-2xl p-6 space-y-6 animate-scale-up">
      {/* Track Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-blue-50 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <Music2 className="w-6 h-6" />
          </div>

          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-1 text-base font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1 rounded-lg bg-blue-600 text-white"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{track.file.fileName}</span>
              <span>•</span>
              <span className="uppercase font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                {track.file.format}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{msToDisplay(track.file.durationMs)} total</span>
              </div>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Waveform Trimmer */}
      <div>
        <WaveformTrimmer
          audioFilePath={track.file.path}
          trimStartMs={trimStartMs}
          trimEndMs={trimEndMs}
          onTrimChange={(start, end) => {
            setTrimStartMs(start);
            setTrimEndMs(end);
          }}
          onDurationLoaded={(dur) => {
            if (trimEndMs === 0 || trimEndMs > dur) {
              setTrimEndMs(dur);
            }
          }}
        />
      </div>

      {/* Boost Slider */}
      <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-slate-800/50 border border-blue-100/70 dark:border-slate-700/60">
        <BoostSlider
          value={volumeBoost}
          onChange={setVolumeBoost}
          showPresets={true}
        />
      </div>

      {/* Fade In Settings */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
        <div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Fade In Duration
          </span>
          <p className="text-xs text-slate-400">
            Gradually ramps volume up from 0 to full boost level
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {FADE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFadeInSeconds(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                fadeInSeconds === opt.value
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Preview Player */}
      <AudioPreviewPlayer
        audioFile={track.file}
        trimStartMs={trimStartMs}
        trimEndMs={trimEndMs}
        volumeBoost={volumeBoost}
        fadeInSeconds={fadeInSeconds}
      />

      {/* Save Action Row */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Audio Settings</span>
        </button>
      </div>
    </div>
  );
};
