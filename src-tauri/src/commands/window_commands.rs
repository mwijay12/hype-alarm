use tauri::{AppHandle, Window};

/**
 * Commands za kusimamia Dirisha Kuu la Programu (Window Controls)
 *
 * Kwa kuwa programu inatumia frameless custom titlebar (decorations: false),
 * vitufe vya Minimize, Maximize, na Close vinahitaji kutumia amri za asili za Rust
 * ili kuhakikisha utekelezaji wa 100% bila kukwazwa na sera za IPC za WebView2.
 */

#[tauri::command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: Window) -> Result<bool, String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn close_window(window: Window) -> Result<(), String> {
    // Ficha kwenye system tray ili scheduler na kengele ziendelee kufanya kazi
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
