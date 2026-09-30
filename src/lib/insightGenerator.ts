import type { HabitStreak, StreakSummary } from "./types";

export interface ProductivityInsight {
  id: string;
  type: "streak" | "consistency" | "day_pattern" | "goals" | "general";
  title: string;
  message: string;
  badge: string;
  highlight?: string;
}

export function generateProductivityInsights(
  streaks: HabitStreak[],
  summary: StreakSummary | null
): ProductivityInsight[] {
  const insights: ProductivityInsight[] = [];

  // Handle sparse or empty data
  if (!streaks || streaks.length < 3 || !summary) {
    return [
      {
        id: "fresh_start",
        type: "general",
        title: "Build Your First 7-Day Streak",
        message:
          "Waking up without hitting snooze establishes your circadian rhythm and boosts your daily morning focus score.",
        badge: "Tip",
      },
      {
        id: "goal_focus",
        type: "goals",
        title: "Intention Setting",
        message:
          "Adding 2–3 focus goals for today gives you an immediate reason to step out of bed with momentum.",
        badge: "Clarity",
      },
      {
        id: "morning_momentum",
        type: "streak",
        title: "Morning Score Boost",
        message:
          "Dismissing your alarm promptly gives you an immediate +50 base morning score towards your daily mastery.",
        badge: "Score",
      },
    ];
  }

  // 1. Consistency / Success Rate Insight
  const rate = Math.round(summary.successRate);
  if (rate >= 80) {
    insights.push({
      id: "high_consistency",
      type: "consistency",
      title: "Iron Discipline",
      message: `You wake on time ${rate}% of the days tracked. That places you in the top tier of consistent morning risers.`,
      badge: `${rate}% On-Time`,
    });
  } else if (rate >= 60) {
    insights.push({
      id: "moderate_consistency",
      type: "consistency",
      title: "Steadily Building Momentum",
      message: `You're currently at a ${rate}% on-time wake rate. Reducing snoozes this week will push your morning score over 80.`,
      badge: `${rate}% On-Time`,
    });
  } else {
    insights.push({
      id: "improving_consistency",
      type: "consistency",
      title: "Opportunity for Growth",
      message:
        "Snoozing interrupts REM sleep cycles. Try placing your wake challenge difficulty one step higher to kickstart alertness.",
      badge: "Discipline",
    });
  }

  // 2. Day of Week Pattern Analysis
  const dayStats: Record<number, { total: number; onTime: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayStats[i] = { total: 0, onTime: 0 };
  }

  streaks.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    const day = d.getDay();
    dayStats[day].total += 1;
    const woke = s.wokeOnTime || s.woke_on_time || false;
    if (woke) dayStats[day].onTime += 1;
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let bestDay = -1;
  let bestRate = -1;

  for (let i = 0; i < 7; i++) {
    if (dayStats[i].total >= 2) {
      const dayRate = dayStats[i].onTime / dayStats[i].total;
      if (dayRate > bestRate) {
        bestRate = dayRate;
        bestDay = i;
      }
    }
  }

  if (bestDay !== -1 && bestRate >= 0.7) {
    insights.push({
      id: "best_day",
      type: "day_pattern",
      title: `${dayNames[bestDay]} Champion`,
      message: `Your strongest wake-up discipline happens on ${dayNames[bestDay]}s with an impressive ${Math.round(bestRate * 100)}% on-time record.`,
      badge: "Peak Day",
    });
  }

  // 3. Streak Milestone or Record Gap
  const current = summary.currentStreak;
  const longest = summary.longestStreak;

  if (current > 0 && current >= longest && longest >= 3) {
    insights.push({
      id: "all_time_record",
      type: "streak",
      title: "All-Time Best Streak!",
      message: `You are currently on your longest tracked streak of ${current} consecutive days! Every morning now sets a new personal best.`,
      badge: "Record Breaker",
    });
  } else if (current > 0 && longest > current) {
    const diff = longest - current;
    insights.push({
      id: "streak_chase",
      type: "streak",
      title: "Chasing Your Record",
      message: `You're on a ${current}-day streak, just ${diff} day${diff === 1 ? "" : "s"} away from matching your all-time record of ${longest} days.`,
      badge: `${diff} Days to Record`,
    });
  }

  // 4. Goals Correlation Insight
  const streaksWithGoals = streaks.filter(
    (s) => (s.goalsTotal || s.goals_total || 0) > 0
  );
  if (streaksWithGoals.length >= 3) {
    const highGoalDays = streaksWithGoals.filter(
      (s) =>
        (s.goalsCompleted || s.goals_completed || 0) ===
        (s.goalsTotal || s.goals_total || 0)
    );
    if (highGoalDays.length > 0) {
      const avgScore = Math.round(
        highGoalDays.reduce(
          (acc, s) => acc + (s.morningScore || s.morning_score || 0),
          0
        ) / highGoalDays.length
      );
      insights.push({
        id: "goals_correlation",
        type: "goals",
        title: "Focus Fuels Score",
        message: `Days when you complete 100% of your morning goals average an exceptional ${avgScore}/100 Morning Score.`,
        badge: "Clear Intent",
      });
    }
  }

  // Ensure we always return at least 3 insights
  if (insights.length < 3) {
    insights.push({
      id: "circadian_rhythm",
      type: "general",
      title: "Circadian Rhythm Lock",
      message:
        "Consistency in wake time matters even more than sleep duration for morning mental acuity and daytime energy.",
      badge: "Science",
    });
  }

  return insights.slice(0, 4);
}
