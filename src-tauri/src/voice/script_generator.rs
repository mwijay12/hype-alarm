use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct VoiceScriptContext {
    pub alarm_label: String,
    pub hour: i64,
    pub minute: i64,
    pub current_streak: i64,
    pub today_goals: Vec<String>,
    pub personality: VoicePersonality,
    pub is_weekend: bool,
    pub user_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VoicePersonality {
    Motivational,
    Gentle,
    Military,
    Coach,
}

impl VoicePersonality {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "gentle" => Self::Gentle,
            "military" => Self::Military,
            "coach" => Self::Coach,
            _ => Self::Motivational,
        }
    }
}

/// Generate wake-up voice script based on context
/// Returns the text to send to ElevenLabs TTS API
pub fn generate_wake_script(ctx: &VoiceScriptContext) -> String {
    let time_str = format_time(ctx.hour, ctx.minute);
    let greeting = get_greeting(ctx.hour);

    match ctx.personality {
        VoicePersonality::Motivational => generate_motivational(ctx, &greeting, &time_str),
        VoicePersonality::Gentle => generate_gentle(ctx, &greeting, &time_str),
        VoicePersonality::Military => generate_military(ctx, &time_str),
        VoicePersonality::Coach => generate_coach(ctx, &greeting, &time_str),
    }
}

fn generate_motivational(ctx: &VoiceScriptContext, greeting: &str, time_str: &str) -> String {
    let streak_line = if ctx.current_streak > 7 {
        format!(
            "You are on a {}-day streak. That is not luck — that is discipline.",
            ctx.current_streak
        )
    } else if ctx.current_streak > 0 {
        format!(
            "You are {} days into your streak. Keep building.",
            ctx.current_streak
        )
    } else {
        "Today is a fresh start. Make it count.".to_string()
    };

    let goal_line = if !ctx.today_goals.is_empty() {
        format!(
            " You have {} goals for today. Start with the hardest one.",
            ctx.today_goals.len()
        )
    } else {
        " Set one clear intention for today before you move.".to_string()
    };

    let weekend_line = if ctx.is_weekend {
        " The weekend is your edge — most people rest while you build."
    } else {
        ""
    };

    format!(
        "{greeting}. {time_str}. Time for {label}. {streak_line}{goal_line}{weekend_line} Rise with purpose.",
        greeting = greeting,
        time_str = time_str,
        label = ctx.alarm_label,
        streak_line = streak_line,
        goal_line = goal_line,
        weekend_line = weekend_line,
    )
}

fn generate_gentle(ctx: &VoiceScriptContext, greeting: &str, time_str: &str) -> String {
    let goal_line = ctx
        .today_goals
        .first()
        .map(|g| format!(" When you are ready, remember: {}.", g))
        .unwrap_or_else(|| " Take a moment to set your intention for today.".to_string());

    format!(
        "{greeting}. It is {time_str}. Your {label} alarm is calling you, gently. Take a slow breath. Stretch. There is no rush — just a new beginning.{goal_line}",
        greeting = greeting,
        time_str = time_str,
        label = ctx.alarm_label,
        goal_line = goal_line,
    )
}

fn generate_military(ctx: &VoiceScriptContext, time_str: &str) -> String {
    let streak_line = if ctx.current_streak > 0 {
        format!("{} days strong. Do not break the chain.", ctx.current_streak)
    } else {
        "Reset starts now. No excuses.".to_string()
    };

    format!(
        "Attention. It is {time_str}. {label} — execute. {streak_line} Get up. Move. You do not negotiate with your alarm. Mission starts now.",
        time_str = time_str,
        label = ctx.alarm_label,
        streak_line = streak_line,
    )
}

fn generate_coach(ctx: &VoiceScriptContext, greeting: &str, time_str: &str) -> String {
    let performance_line = if ctx.current_streak >= 7 {
        "You are performing at a high level. Champions do not stop here."
    } else if ctx.current_streak >= 3 {
        "You are building the habit. Consistency is the real skill."
    } else {
        "Every expert was once a beginner. Today is your training."
    };

    let goals_count = ctx.today_goals.len();
    let goal_line = if goals_count > 0 {
        format!(
            " You have {} targets on the board today. Attack them in order.",
            goals_count
        )
    } else {
        " Before you do anything else — write down your top three priorities.".to_string()
    };

    format!(
        "{greeting}, champion. {time_str}. {label} is your signal to begin. {performance_line}{goal_line} I believe in your potential. Now prove it to yourself.",
        greeting = greeting,
        time_str = time_str,
        label = ctx.alarm_label,
        performance_line = performance_line,
        goal_line = goal_line,
    )
}

fn format_time(hour: i64, minute: i64) -> String {
    let period = if hour < 12 { "AM" } else { "PM" };
    let h = if hour == 0 {
        12
    } else if hour > 12 {
        hour - 12
    } else {
        hour
    };
    if minute == 0 {
        format!("{} {}", h, period)
    } else {
        format!("{}:{:02} {}", h, minute, period)
    }
}

fn get_greeting(hour: i64) -> &'static str {
    match hour {
        5..=11 => "Good morning",
        12..=16 => "Good afternoon",
        17..=20 => "Good evening",
        _ => "Rise up",
    }
}
