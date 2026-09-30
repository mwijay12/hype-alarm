import { invoke } from "@tauri-apps/api/core";
import { dbAddGoal, dbGetTodayGoals } from "../services/database";

export async function seedDemoHabitData(): Promise<{ success: boolean; daysSeeded: number }> {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  const today = new Date();
  const totalDays = 90;

  console.log(`[DataSeeder] Seeding ${totalDays} days of realistic demo habit data...`);

  // We build realistic patterns:
  // - Current active streak: ~12 consecutive days up to yesterday/today
  // - Weekdays: 85% on time, 0-1 snoozes
  // - Weekends: 60% on time, 0-2 snoozes
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    let wokeOnTime = true;
    let snoozes = 0;

    if (i <= 12) {
      // Within current active winning streak!
      wokeOnTime = true;
      snoozes = i % 4 === 0 ? 1 : 0;
    } else {
      const rand = Math.random();
      if (isWeekend) {
        wokeOnTime = rand < 0.65;
        snoozes = wokeOnTime ? (rand < 0.3 ? 1 : 0) : Math.floor(Math.random() * 3) + 1;
      } else {
        wokeOnTime = rand < 0.88;
        snoozes = wokeOnTime ? (rand < 0.2 ? 1 : 0) : Math.floor(Math.random() * 2) + 1;
      }
    }

    const goalsTotal = Math.floor(Math.random() * 3) + 2; // 2 to 4 goals
    const goalsCompleted = wokeOnTime
      ? Math.min(goalsTotal, Math.floor(Math.random() * 2) + (goalsTotal - 1))
      : Math.floor(Math.random() * (goalsTotal - 1));

    if (isTauri) {
      try {
        await invoke("record_habit_day", {
          date: dateStr,
          wokeOnTime,
          alarmsFired: 1,
          alarmsSnoozed: snoozes,
          goalsCompleted,
          goalsTotal,
        });
      } catch (err) {
        console.warn(`[DataSeeder] Failed invoke for ${dateStr}:`, err);
      }
    }
  }

  // Also seed today's goals
  await seedTodayGoals();

  console.log("[DataSeeder] Demo habit data and today goals seeded successfully.");
  return { success: true, daysSeeded: totalDays };
}

export async function seedTodayGoals(): Promise<void> {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  const todayStr = new Date().toISOString().split("T")[0];

  const sampleGoals = [
    { text: "Wake up at 6:00 AM without snoozing", isCompleted: true },
    { text: "Drink 500ml water & 10-min sunlight exposure", isCompleted: true },
    { text: "Review key sprint priorities for HyperAlarm Pro", isCompleted: false },
    { text: "Complete 90-minute deep work block", isCompleted: false },
    { text: "Afternoon 20-minute movement & stretch", isCompleted: false },
  ];

  if (isTauri) {
    try {
      const existing = await invoke<Array<{ id: string }>>("get_goals_for_date", {
        date: todayStr,
      });

      if (!existing || existing.length === 0) {
        for (const g of sampleGoals) {
          const created = await invoke<{ id: string }>("create_goal", {
            dto: { date: todayStr, text: g.text },
          });
          if (g.isCompleted && created?.id) {
            await invoke("complete_goal", { id: created.id, completed: true });
          }
        }
      }
    } catch (e) {
      console.warn("[DataSeeder] Error seeding today goals via Tauri:", e);
    }
  } else {
    // Web fallback
    const existing = await dbGetTodayGoals();
    if (existing.length === 0) {
      for (const g of sampleGoals) {
        await dbAddGoal(g.text);
      }
    }
  }
}
