import React from "react";
import * as Slider from "@radix-ui/react-slider";
import { getBoostLabel, getBoostColorClass } from "../../lib/utils";
import { AlertTriangle, Volume2, Zap } from "lucide-react";

interface BoostSliderProps {
  value: number; // 100 to 400
  onChange: (value: number) => void;
  showPresets?: boolean;
  className?: string;
}

const PRESETS = [100, 150, 200, 300, 400];

export const BoostSlider: React.FC<BoostSliderProps> = ({
  value,
  onChange,
  showPresets = true,
  className = "",
}) => {
  const boost = Math.min(400, Math.max(100, value));
  const badgeClass = getBoostColorClass(boost);
  const badgeLabel = getBoostLabel(boost);

  // Determine accent color for slider track
  const trackColorClass =
    boost > 300
      ? "bg-red-500"
      : boost > 200
      ? "bg-amber-500"
      : "bg-blue-600";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">
            Volume Boost
          </span>
          <span className="text-xs text-slate-400 font-normal">
            (Web Audio API GainNode)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-blue-600">
            {boost}%
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* Radix Slider */}
      <div className="py-2">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
          value={[boost]}
          onValueChange={(val) => onChange(val[0])}
          min={100}
          max={400}
          step={25}
          aria-label="Volume Boost"
        >
          <Slider.Track className="bg-blue-100 relative grow rounded-full h-2.5 overflow-hidden">
            <Slider.Range className={`absolute h-full rounded-full transition-colors ${trackColorClass}`} />
          </Slider.Track>
          <Slider.Thumb
            className={`block w-6 h-6 bg-white border-2 shadow-md rounded-full focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
              boost > 300
                ? "border-red-500 shadow-red-200"
                : boost > 200
                ? "border-amber-500 shadow-amber-200"
                : "border-blue-600 shadow-blue-200"
            }`}
          />
        </Slider.Root>
      </div>

      {/* Quick Presets */}
      {showPresets && (
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {PRESETS.map((p) => {
            const isSelected = boost === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-105"
                    : "bg-blue-50/80 text-blue-700 hover:bg-blue-100 border border-blue-100"
                }`}
              >
                {p}%
              </button>
            );
          })}
        </div>
      )}

      {/* Warning Text for High Amplification */}
      {boost > 300 ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>
            🔴 Extreme boost (4.0×). Audio may clip or distort on standard laptop speakers.
          </span>
        </div>
      ) : boost > 200 ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium animate-fade-in">
          <Zap className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            ⚠️ High amplification (2.5×+). Signal boosted beyond standard 100% OS ceiling.
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          100% = normal system output. Values above 150% amplify the audio waveform signal.
        </p>
      )}
    </div>
  );
};
