import React, { useState, useEffect } from "react";

interface DigitalClockProps {
  /** Ikiwa true, saa itaonyeshwa kwa saizi ndogo zaidi */
  compact?: boolean;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ compact = false }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Mzunguko wa maisha ya kipima muda (Timer Interval Lifecycle):
  // 1. Tunaweka setInterval inayoitwa kila milisekunde 1000 (sekunde 1).
  // 2. Kila tick inasasisha state ya `currentTime` kwa kutumia `new Date()`.
  // 3. Tunarudisha kazi ya usafishaji (cleanup function) `clearInterval(timerId)`
  //    ili kuzuia upotevu wa kumbukumbu (memory leaks) wakati component inapofungwa (unmount).
  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  // Umbizo la Saa (24-hour format): HH:MM:SS
  const hours = String(currentTime.getHours()).padStart(2, "0");
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");

  // Umbizo la Tarehe (Inter font): "Tuesday, September 8, 2026"
  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-baseline font-bold digital-text text-xl text-slate-800 dark:text-white">
          <span>{hours}:{minutes}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">:{seconds}</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none">
      {/* Time Display with live indicator */}
      <div className="flex items-baseline gap-1">
        <span className="digital-text text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-xs">
          {hours}:{minutes}
        </span>
        <span className="digital-text text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 ml-1">
          :{seconds}
        </span>

        {/* Live Pulse Dot */}
        <div className="flex items-center gap-1.5 ml-3 pb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-blue-400" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400">
            Live
          </span>
        </div>
      </div>

      {/* Date Display */}
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 font-sans">
        {formattedDate}
      </p>
    </div>
  );
};
