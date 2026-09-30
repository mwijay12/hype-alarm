use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, LogicalSize};

/**
 * Commands za kusimamia Dirisha la Desktop Widget (Windhawk-Style HUD)
 *
 * Dirisha hili lina sifa zifuatazo:
 * - Halina mipaka ya mfumo (decorations: false)
 * - Liko wazi/translucent (transparent: true)
 * - Liko juu ya madirisha yote (always_on_top: true)
 * - Halionekani kwenye Taskbar (skip_taskbar: true)
 * - Mtumiaji anaweza kulivuta popote kwenye kioo (draggable via data-tauri-drag-region)
 */

#[tauri::command]
pub fn toggle_desktop_widget(app: AppHandle, show: Option<bool>) -> Result<bool, String> {
    if let Some(widget_win) = app.get_webview_window("widget") {
        let is_visible = widget_win.is_visible().unwrap_or(false);
        let should_show = show.unwrap_or(!is_visible);

        if should_show {
            widget_win.show().map_err(|e| e.to_string())?;
            widget_win.unminimize().map_err(|e| e.to_string())?;
        } else {
            widget_win.hide().map_err(|e| e.to_string())?;
        }

        Ok(should_show)
    } else {
        // Kama dirisha halijaundwa bado, liunde mara moja
        let win = WebviewWindowBuilder::new(
            &app,
            "widget",
            WebviewUrl::App("index.html#/widget".into()),
        )
        .title("HyperAlarm Widget")
        .inner_size(380.0, 175.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .build()
        .map_err(|e| e.to_string())?;

        win.show().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn get_desktop_widget_state(app: AppHandle) -> Result<bool, String> {
    if let Some(widget_win) = app.get_webview_window("widget") {
        Ok(widget_win.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn set_widget_always_on_top(app: AppHandle, always_on_top: bool) -> Result<(), String> {
    if let Some(widget_win) = app.get_webview_window("widget") {
        widget_win.set_always_on_top(always_on_top).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_widget_size(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(widget_win) = app.get_webview_window("widget") {
        widget_win.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.unminimize();
        let _ = main_win.set_focus();
    }
    Ok(())
}
