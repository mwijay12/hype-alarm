import type { MorningBriefing, MorningContext } from "../lib/types";

/**
 * Offline AI Service
 * Generates dynamic, intelligent, personality-driven morning briefings and wake scripts
 * with 0 network latency, 0 external API dependencies, and 100% offline reliability.
 */

export function generateOfflineBriefing(context: MorningContext): MorningBriefing {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const streak = context.current_streak || 0;
  const personality = (context.ai_personality || "motivational").toLowerCase();
  const goals = context.today_goals || [];
  const alarmLabel = context.alarm_label || "Rise & Build";

  // 1. Dynamic Greeting
  let greeting = "";
  if (personality === "gentle" || personality === "calm") {
    greeting = `Good morning. It is ${context.hour}:${context.minute < 10 ? "0" + context.minute : context.minute} on ${dayName}. Take a deep breath — today is yours to shape peacefully.`;
  } else if (personality === "coach") {
    greeting = `Time to execute. It's ${dayName} morning and "${alarmLabel}" just fired. Standard set.`;
  } else {
    // Motivational (Default)
    greeting = `Good morning champion! It's ${dayName} and "${alarmLabel}" is live. The day belongs to those who claim the morning!`;
  }

  // 2. Streak Message
  let streak_message = "";
  if (streak > 0) {
    const plural = streak === 1 ? "day" : "days";
    streak_message = `You're holding a strong ${streak}-${plural} on-time streak! Momentum compounds every single sunrise — do not break the chain today.`;
  } else {
    streak_message = `Day 1 starts right now. A legendary streak begins with the decision to get out of bed immediately.`;
  }

  // 3. Goals Message
  let goals_message = "";
  if (goals.length > 0) {
    const listFormatted = goals
      .slice(0, 3)
      .map((g, idx) => `${idx + 1}) ${g}`)
      .join(" • ");
    goals_message = `Your morning focus targets: ${listFormatted}. Knock out the first one before your mind negotiates.`;
  } else {
    goals_message = `Lock in your 3 key focus priorities in the Hub to align your daily intention.`;
  }

  // 4. Strategic AI Tip (Personalized & Science-backed)
  const TIPS = [
    "Drink 500ml of cold or ambient water right now. Your brain is 75% water and dehydration lowers cognitive reaction time by 15%.",
    "Expose your eyes to morning light or bright room lamps immediately to suppress melatonin and kickstart cortisol production.",
    "Do 60 seconds of gentle spinal stretches or air squats to force circulation from sleep state to active state.",
    "Avoid checking email or social feeds for the first 30 minutes. Retain ownership of your mental bandwidth.",
    "Take 3 deep box breaths (4s inhale, 4s hold, 4s exhale, 4s hold) to stabilize resting heart rate and center your focus.",
  ];
  const ai_tip = TIPS[now.getDate() % TIPS.length];

  // 5. Motivational Close
  let motivational_close = "";
  if (isWeekend) {
    motivational_close = "Weekend warrior mode activated: Rest with intention, build with joy.";
  } else if (personality === "coach") {
    motivational_close = "Speed of execution separates intention from results. Move now.";
  } else if (personality === "gentle") {
    motivational_close = "Move with grace and presence today. You have everything you need.";
  } else {
    motivational_close = "Rise and build. The world is built by those who show up early!";
  }

  return {
    greeting,
    streak_message,
    goals_message,
    ai_tip,
    motivational_close,
    generated_at: now.toISOString(),
  };
}
