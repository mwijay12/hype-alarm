//! Builds AI prompts for morning check-in and briefing.
//! All prompts are context-aware using real user data.

use crate::ai::types::{ChatMessage, MorningContext};

pub fn build_system_prompt(ctx: &MorningContext) -> String {
    let personality_desc = match ctx.ai_personality.to_lowercase().as_str() {
        "gentle" => {
            "You are a warm, supportive morning companion. Be calm, encouraging, and compassionate. Never rush the user. Use soft, reassuring language."
        }
        "military" => {
            "You are a no-nonsense performance coach. Be direct, brief, and disciplined. No fluff. Results only. Challenge the user to take action now."
        }
        "coach" => {
            "You are a high-performance morning coach. Be energetic, strategic, and focused on outcomes. Use sports and performance metaphors."
        }
        _ => {
            "You are an uplifting morning companion. Be positive, energetic, and motivating. Celebrate small wins. Inspire immediate morning action."
        }
    };

    let streak_context = if ctx.current_streak > 7 {
        format!(
            "The user is on an outstanding {}-day wake-up streak. Acknowledge this discipline.",
            ctx.current_streak
        )
    } else if ctx.current_streak > 0 {
        format!(
            "The user has an active {}-day streak going. Encourage them to keep building momentum.",
            ctx.current_streak
        )
    } else {
        "The user has no active streak. Today is a fresh start — be encouraging and forward-looking."
            .to_string()
    };

    let goals_context = if !ctx.today_goals.is_empty() {
        format!("Today's declared goals: {}.", ctx.today_goals.join(", "))
    } else {
        "No goals set yet for today. Consider gently suggesting they set one clear intention."
            .to_string()
    };

    let snooze_context = if ctx.snooze_count > 0 {
        format!(
            "They snoozed {} time(s) before waking. Acknowledge this without judgment — they still showed up.",
            ctx.snooze_count
        )
    } else {
        "They dismissed the alarm immediately with zero snoozes. This speed deserves recognition."
            .to_string()
    };

    format!(
        "ROLE: {personality}\n\n\
         CONTEXT:\n\
         - Alarm Label: {alarm}\n\
         - Time: {hour:02}:{minute:02}\n\
         - Week Performance Score: {score:.0}%\n\
         - Streak: {streak}\n\
         - Goals: {goals}\n\
         - Snooze Status: {snooze}\n\n\
         RULES:\n\
         - Keep responses CONCISE (2 to 4 sentences max, under 50 words)\n\
         - Be conversational, warm, and natural\n\
         - Do NOT repeat the exact same phrase every turn\n\
         - Do NOT use generic robotic filler like 'Sure!' or 'Of course!'\n\
         - Stay focused on their morning mindset and priorities\n\
         - End your reply with ONE crisp question or action\n\
         - If this is exchange 3 or beyond, suggest wrapping up to start the day",
        personality = personality_desc,
        alarm = ctx.alarm_label,
        hour = ctx.hour,
        minute = ctx.minute,
        score = ctx.this_week_score,
        streak = streak_context,
        goals = goals_context,
        snooze = snooze_context,
    )
}

pub fn build_opening_message(ctx: &MorningContext) -> String {
    match ctx.ai_personality.to_lowercase().as_str() {
        "gentle" => {
            if ctx.snooze_count > 1 {
                "Good morning. You made it out of bed, and that's what truly counts. Take a slow, deep breath. How are you feeling right now?".to_string()
            } else {
                "Good morning. You're up and beginning your day with clarity. How is your energy feeling today?".to_string()
            }
        }
        "military" => {
            if ctx.current_streak > 7 {
                format!(
                    "{} days unbroken. High standard maintained. What is the primary objective today?",
                    ctx.current_streak
                )
            } else {
                "You're up. That's step one. What are you attacking first this morning?".to_string()
            }
        }
        "coach" => {
            format!(
                "Morning, champion! Week score sitting at {:.0}%. We can push higher today. On a scale of 1 to 10, how is your readiness?",
                ctx.this_week_score
            )
        }
        _ => {
            if ctx.current_streak >= 7 {
                format!(
                    "Good morning! {} days in a row — you're building serious momentum. How are you feeling this morning?",
                    ctx.current_streak
                )
            } else if ctx.current_streak > 0 {
                format!(
                    "Morning! Day {} of your streak is here — let's keep that fire burning. What's on your mind as you wake up?",
                    ctx.current_streak + 1
                )
            } else {
                "Good morning! Today is a clean slate with zero limits. How are you feeling as you start the day?".to_string()
            }
        }
    }
}

pub fn build_briefing_prompt(ctx: &MorningContext) -> Vec<ChatMessage> {
    let system = format!(
        "You are a morning briefing generator for HyperAlarm Pro. \
         Generate a structured morning briefing as JSON.\n\
         Context:\n\
         - Alarm: {}\n\
         - Streak: {} days\n\
         - Week score: {:.0}%\n\
         - Goals today: {}\n\
         - Personality style: {}\n\n\
         Return ONLY a valid JSON object matching this schema without markdown fences:\n\
         {{\n\
           \"greeting\": \"short personalized greeting (under 12 words)\",\n\
           \"streak_message\": \"one punchy sentence about their streak and discipline\",\n\
           \"goals_message\": \"one sentence referencing today's priorities\",\n\
           \"ai_tip\": \"one actionable, high-impact tip for today's focus\",\n\
           \"motivational_close\": \"one memorable closing line\"\n\
         }}",
        ctx.alarm_label,
        ctx.current_streak,
        ctx.this_week_score,
        if ctx.today_goals.is_empty() {
            "No specific goals set yet".to_string()
        } else {
            ctx.today_goals.join(", ")
        },
        ctx.ai_personality,
    );

    vec![
        ChatMessage {
            role: "system".to_string(),
            content: system,
        },
        ChatMessage {
            role: "user".to_string(),
            content: "Generate my morning briefing now.".to_string(),
        },
    ]
}

pub fn build_closing_message(personality: &str, streak: i64) -> String {
    match personality.to_lowercase().as_str() {
        "military" => "Mission briefing complete. Stand tall and execute.".to_string(),
        "gentle" => "You are grounded and ready. Step into your day gently. I'll be here tomorrow morning.".to_string(),
        "coach" => format!("That's your warm-up. Now go execute your game plan. Day {} is yours to win.", streak + 1),
        _ => "You have everything you need to win today. Go build something great!".to_string(),
    }
}
