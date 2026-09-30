import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DayOfWeek, Alarm, RepeatPattern, AlarmFormData, MathChallenge } from "./types";
import { DAYS_OF_WEEK } from "./constants";

// 1. Tailwind class merger
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// 2. Format time to 12-hour display ("06:30 AM", "02:00 PM")
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const formattedHour = String(displayHour).padStart(2, "0");
  const formattedMinute = String(minute).padStart(2, "0");
  return `${formattedHour}:${formattedMinute} ${period}`;
}

// 3. Format time to 24-hour display ("06:30", "14:05")
export function formatTime24(hour: number, minute: number): string {
  const formattedHour = String(hour).padStart(2, "0");
  const formattedMinute = String(minute).padStart(2, "0");
  return `${formattedHour}:${formattedMinute}`;
}

// 4. Get human-readable repeat label
export function getDayLabel(
  days: DayOfWeek[], 
  pattern: RepeatPattern
): string {
  if (pattern === "once") return "Once";
  if (pattern === "daily") return "Every day";
  if (pattern === "weekdays") return "Weekdays";
  if (pattern === "weekends") return "Weekends";

  // pattern === 'custom'
  if (!days || days.length === 0) return "Once";
  if (days.length === 7) return "Every day";

  const isWeekdays =
    days.length === 5 &&
    ["Mon", "Tue", "Wed", "Thu", "Fri"].every((d) => days.includes(d as DayOfWeek));
  if (isWeekdays) return "Weekdays";

  const isWeekends =
    days.length === 2 &&
    ["Sat", "Sun"].every((d) => days.includes(d as DayOfWeek));
  if (isWeekends) return "Weekends";

  // Retain standard weekday ordering
  const orderedDays = DAYS_OF_WEEK
    .filter((d) => days.includes(d.key))
    .map((d) => d.key);

  return orderedDays.join(", ");
}

// 5. Get current date as ISO string "YYYY-MM-DD"
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 6. Get time-based greeting
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

// 7. Get greeting emoji based on time
export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "☀️";
  if (hour >= 12 && hour < 17) return "🌤️";
  if (hour >= 17 && hour < 21) return "🌅";
  return "🌙";
}

// 8. Convert milliseconds to display string ("1:30", "60:00")
export function msToTimeString(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 9. Generate a random UUID v4 string
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper: Convert JS Day (0=Sun, 1=Mon, ..., 6=Sat) to DayOfWeek
const JS_DAY_MAP: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 10. Check if an alarm should fire at a given Date
export function shouldAlarmFire(alarm: Alarm, now: Date): boolean {
  if (!alarm.isActive) return false;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDayOfWeek = JS_DAY_MAP[now.getDay()];

  if (alarm.hour !== currentHour || alarm.minute !== currentMinute) {
    return false;
  }

  if (alarm.repeatPattern === "once") {
    return true;
  }

  if (alarm.repeatPattern === "daily") {
    return true;
  }

  if (alarm.repeatPattern === "weekdays") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(currentDayOfWeek);
  }

  if (alarm.repeatPattern === "weekends") {
    return ["Sat", "Sun"].includes(currentDayOfWeek);
  }

  if (alarm.repeatPattern === "custom") {
    return alarm.days.includes(currentDayOfWeek);
  }

  return false;
}

// 11. Get next alarm fire time as a display string
export function getNextFireLabel(alarm: Alarm): string {
  if (!alarm.isActive) {
    return "Alarm paused";
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ...

  const formattedTime = formatTime(alarm.hour, alarm.minute);

  // Check if it fires today
  const isLaterToday =
    alarm.hour > currentHour || (alarm.hour === currentHour && alarm.minute > currentMinute);

  const currentDay = JS_DAY_MAP[currentDayIndex];

  let willFireToday = false;
  if (alarm.repeatPattern === "once" && isLaterToday) {
    willFireToday = true;
  } else if (alarm.repeatPattern === "daily" && isLaterToday) {
    willFireToday = true;
  } else if (
    alarm.repeatPattern === "weekdays" &&
    ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(currentDay) &&
    isLaterToday
  ) {
    willFireToday = true;
  } else if (
    alarm.repeatPattern === "weekends" &&
    ["Sat", "Sun"].includes(currentDay) &&
    isLaterToday
  ) {
    willFireToday = true;
  } else if (
    alarm.repeatPattern === "custom" &&
    alarm.days.includes(currentDay) &&
    isLaterToday
  ) {
    willFireToday = true;
  }

  if (willFireToday) {
    return `Today at ${formattedTime}`;
  }

  // If once and time has passed today, it fires tomorrow
  if (alarm.repeatPattern === "once") {
    return `Tomorrow at ${formattedTime}`;
  }

  // Check upcoming days (1 to 7 days ahead)
  for (let offset = 1; offset <= 7; offset++) {
    const targetDayIndex = (currentDayIndex + offset) % 7;
    const targetDay = JS_DAY_MAP[targetDayIndex];

    let matches = false;
    if (alarm.repeatPattern === "daily") {
      matches = true;
    } else if (
      alarm.repeatPattern === "weekdays" &&
      ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(targetDay)
    ) {
      matches = true;
    } else if (
      alarm.repeatPattern === "weekends" &&
      ["Sat", "Sun"].includes(targetDay)
    ) {
      matches = true;
    } else if (alarm.repeatPattern === "custom" && alarm.days.includes(targetDay)) {
      matches = true;
    }

    if (matches) {
      if (offset === 1) {
        return `Tomorrow at ${formattedTime}`;
      }
      return `${DAYS_OF_WEEK.find((d) => d.key === targetDay)?.label || targetDay} at ${formattedTime}`;
    }
  }

  return `Next at ${formattedTime}`;
}

// 12. Sort alarms: active first, then by hour, then minute
export function sortAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });
}

// 13. Validate alarm form data
export function validateAlarmForm(data: Partial<AlarmFormData>): string[] {
  const errors: string[] = [];

  if (!data.label || data.label.trim().length === 0) {
    errors.push("Alarm label is required.");
  } else if (data.label.trim().length > 30) {
    errors.push("Alarm label must be 30 characters or fewer.");
  }

  if (data.hour === undefined || data.hour < 0 || data.hour > 23) {
    errors.push("Valid hour (0–23) is required.");
  }

  if (data.minute === undefined || data.minute < 0 || data.minute > 59) {
    errors.push("Valid minute (0–59) is required.");
  }

  if (data.repeatPattern === "custom" && (!data.days || data.days.length === 0)) {
    errors.push("Please select at least one day for custom repeat.");
  }

  return errors;
}

// 14. Generate Math Challenge based on difficulty
export function generateMathChallenge(
  difficulty: "easy" | "medium" | "hard" = "easy"
): MathChallenge {
  if (difficulty === "hard") {
    // Hard: multiplication (e.g. 14 × 7) or large 2-digit sums
    const isMultiplication = Math.random() > 0.35;
    if (isMultiplication) {
      const a = Math.floor(Math.random() * 12) + 6; // 6 to 17
      const b = Math.floor(Math.random() * 8) + 4;  // 4 to 11
      return {
        question: `${a} × ${b} = ?`,
        answer: a * b,
      };
    }
    const a = Math.floor(Math.random() * 60) + 30; // 30 to 89
    const b = Math.floor(Math.random() * 50) + 25; // 25 to 74
    return {
      question: `${a} + ${b} = ?`,
      answer: a + b,
    };
  }

  if (difficulty === "medium") {
    // Medium: 2-digit + 2-digit addition or subtraction
    const isAddition = Math.random() > 0.4;
    const a = Math.floor(Math.random() * 45) + 15;
    const b = Math.floor(Math.random() * 35) + 12;

    if (!isAddition) {
      const maxVal = Math.max(a, b);
      const minVal = Math.min(a, b);
      return {
        question: `${maxVal} - ${minVal} = ?`,
        answer: maxVal - minVal,
      };
    }

    return {
      question: `${a} + ${b} = ?`,
      answer: a + b,
    };
  }

  // Easy: single digits addition (e.g. 7 + 8) or simple subtraction
  const isAddition = Math.random() > 0.3;
  const a = Math.floor(Math.random() * 9) + 3;
  const b = Math.floor(Math.random() * 8) + 2;

  if (!isAddition && a !== b) {
    const maxVal = Math.max(a, b);
    const minVal = Math.min(a, b);
    return {
      question: `${maxVal} - ${minVal} = ?`,
      answer: maxVal - minVal,
    };
  }

  return {
    question: `${a} + ${b} = ?`,
    answer: a + b,
  };
}

// 15. Format milliseconds to MM:SS or M:SS display
export function msToDisplay(ms: number): string {
  if (isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 16. Get Volume Boost label
export function getBoostLabel(boost: number): string {
  if (boost <= 150) return "Normal";
  if (boost <= 225) return "Boosted";
  if (boost <= 300) return "Loud";
  return "Extreme ⚠️";
}

// 17. Get Volume Boost color class
export function getBoostColorClass(boost: number): string {
  if (boost <= 150) return "text-blue-600 bg-blue-50 border-blue-200";
  if (boost <= 225) return "text-sky-600 bg-sky-50 border-sky-200";
  if (boost <= 300) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

// 18. Validate audio trim region
export function validateTrimRegion(
  startMs: number,
  endMs: number,
  durationMs: number
): string | null {
  if (startMs < 0) return "Start time cannot be negative.";
  if (endMs <= startMs) return "End time must be greater than start time.";
  if (durationMs > 0 && endMs > durationMs) {
    return "End time cannot exceed track duration.";
  }
  return null;
}

// 19. Supported audio formats string
export function getSupportedFormats(): string {
  return "MP3 · WAV · FLAC · OGG · M4A";
}

// 20. Calculate Morning Score (0 - 100)
export function calculateMorningScore(
  wokeOnTime: boolean,
  alarmsSnoozed: number,
  goalsCompleted: number,
  goalsTotal: number
): number {
  let score = wokeOnTime && alarmsSnoozed === 0 ? 50 : wokeOnTime ? 30 : 10;

  if (goalsTotal > 0) {
    const goalRate = goalsCompleted / goalsTotal;
    score += Math.round(goalRate * 30);
    if (goalsCompleted === goalsTotal) {
      score += 20;
    }
  }

  score -= alarmsSnoozed * 5;
  return Math.min(100, Math.max(0, score));
}

// 21. Get score grade and color styling
export function getScoreGrade(score: number): {
  grade: string;
  color: string;
  bg: string;
  label: string;
} {
  if (score >= 90) {
    return {
      grade: "A+",
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      label: "Mastery",
    };
  }
  if (score >= 80) {
    return {
      grade: "A",
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      label: "Excellent",
    };
  }
  if (score >= 65) {
    return {
      grade: "B",
      color: "text-sky-600",
      bg: "bg-sky-50 border-sky-200",
      label: "Consistent",
    };
  }
  if (score >= 50) {
    return {
      grade: "C",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      label: "Progressing",
    };
  }
  return {
    grade: "D",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    label: "Building",
  };
}

// 22. Get streak milestone tier
export function getStreakTier(streak: number): {
  title: string;
  color: string;
  gradient: string;
  message: string;
} {
  if (streak >= 30) {
    return {
      title: "Legendary Momentum",
      color: "text-amber-500",
      gradient: "from-amber-500 via-orange-500 to-red-500",
      message: "30+ Days! You have built unbreakable morning discipline.",
    };
  }
  if (streak >= 14) {
    return {
      title: "Unstoppable Flow",
      color: "text-orange-500",
      gradient: "from-orange-500 to-amber-500",
      message: "2 Weeks strong! Your body clock is locked into excellence.",
    };
  }
  if (streak >= 7) {
    return {
      title: "Weekly Habit Master",
      color: "text-blue-600",
      gradient: "from-blue-600 to-sky-500",
      message: "7 Days on time! You have surpassed the hardest barrier.",
    };
  }
  if (streak >= 3) {
    return {
      title: "Momentum Building",
      color: "text-blue-500",
      gradient: "from-blue-500 to-blue-600",
      message: "3 Days in a row! You are cementing a winning morning habit.",
    };
  }
  if (streak >= 1) {
    return {
      title: "Ignition",
      color: "text-blue-600",
      gradient: "from-blue-600 to-indigo-600",
      message: "Great wake-up! Keep this momentum alive tomorrow.",
    };
  }
  return {
    title: "Fresh Start",
    color: "text-slate-500",
    gradient: "from-slate-400 to-slate-500",
    message: "Dismiss on time tomorrow to start a brand new streak!",
  };
}

