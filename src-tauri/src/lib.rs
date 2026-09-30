pub mod ai;
pub mod commands;
pub mod models;
pub mod voice;

use commands::{
    ai_commands::*,
    alarm_commands::*,
    audio_commands::*,
    power_commands::*,
    streak_commands::*,
    voice_commands::*,
    widget_commands::*,
    window_commands::*,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Build system tray menu
            let open_item = MenuItem::with_id(app, "open", "Open HyperAlarm Pro", true, None::<&str>)?;
            let widget_item = MenuItem::with_id(app, "widget", "Toggle Desktop Widget", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit HyperAlarm Pro", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &widget_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "widget" => {
                        let _ = crate::commands::widget_commands::toggle_desktop_widget(app.clone(), None);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder.build(app)?;

            println!("⚡ HyperAlarm Pro started");
            println!("⏰ Alarm scheduler running");
            println!("🛡  Anti-Sleep engine ready");
            println!("🔔 System tray initialized");

            let app_handle_sounds = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = crate::commands::audio_commands::ensure_sample_audio_files(app_handle_sounds).await;
            });

            let app_handle_cache = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                println!("🎤 Running startup voice cache check...");
                let res = crate::voice::cache_manager::pre_cache_all_alarms(app_handle_cache).await;
                println!("🎤 Startup voice cache: {}", res.message);
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Minimize to system tray so alarms and scheduler keep running
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_alarms,
            save_alarm,
            toggle_alarm,
            delete_alarm,
            verify_audio_file,
            copy_audio_file,
            delete_audio_file,
            prevent_sleep,
            allow_sleep,
            enable_anti_sleep,
            disable_anti_sleep,
            get_anti_sleep_status,
            test_ai_connection,
            generate_voice_message,
            check_voice_cache,
            clear_old_voice_cache,
            send_ai_checkin,
            send_gemini_message,
            get_streak_history,
            get_streak_summary,
            record_habit_day,
            get_today_streak,
            get_goals_for_date,
            create_goal,
            complete_goal,
            delete_goal,
            // Phase 8: ElevenLabs Voice
            validate_elevenlabs_key,
            get_elevenlabs_voices,
            pre_cache_voice_messages,
            generate_voice_preview,
            get_voice_cache_path,
            generate_and_cache_alarm_voice,
            cleanup_voice_cache,
            // Phase 9: AI Check-in & Groq
            validate_openrouter_key,
            validate_gemini_key,
            validate_groq_key,
            get_groq_models,
            start_morning_checkin,
            send_checkin_message,
            generate_morning_briefing,
            get_today_morning_briefing,
            get_ai_conversations,
            test_groq_connection,
            // Phase 10: Windhawk-Style Desktop Widget
            toggle_desktop_widget,
            get_desktop_widget_state,
            set_widget_always_on_top,
            set_widget_size,
            show_main_window,
            // Window Controls & Audio streaming
            read_audio_file,
            ensure_sample_audio_files,
            minimize_window,
            toggle_maximize_window,
            close_window,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("Hitilafu ilitokea wakati wa kuanzisha programu ya HyperAlarm Pro");
}
