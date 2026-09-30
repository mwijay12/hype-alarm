/// Amri za Kudhibiti Nguvu na Kuzuia Kompyuta Kulala (Windows Anti-Sleep Commands)
/// 
/// Dhana ya Rust:
/// `#[cfg(target_os = "windows")]` ni "Conditional Compilation". Inamwambia
/// compiler wa Rust kutafsiri kodi hii pale tu programu inapojengwa (compiled)
/// kwa ajili ya Windows OS pekee.
/// 
/// `unsafe { ... }`:
/// Rust inalinda kumbukumbu (memory safety) kwa asilimia 100. Lakini tunapowasiliana
/// moja kwa moja na API za mfumo wa uendeshaji wa Windows (Win32 FFI - Foreign Function Interface),
/// Rust hawezi kuhakiki tabia ya Windows yenyewe, hivyo tunatumia neno `unsafe`
/// kumaanisha: "Kama msanidi programu, nahakikisha wito huu wa Win32 API ni salama".

use std::sync::atomic::{AtomicBool, Ordering};

// Global state to track whether anti-sleep is active.
// We use std::sync::atomic for thread-safe state without a Mutex.
static ANTI_SLEEP_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Enables anti-sleep mode using the Windows API (SetThreadExecutionState).
///
/// SetThreadExecutionState tells Windows that this thread requires
/// the system and display to stay ON. Windows will NOT sleep or
/// dim the screen as long as this flag remains set.
#[tauri::command]
pub fn enable_anti_sleep() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Power::{
            SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
        };

        let prev_state = unsafe {
            SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED)
        };

        if prev_state.0 == 0 {
            Err("Failed to enable Windows Anti-Sleep".to_string())
        } else {
            ANTI_SLEEP_ACTIVE.store(true, Ordering::SeqCst);
            Ok("Anti-sleep enabled".to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        ANTI_SLEEP_ACTIVE.store(true, Ordering::SeqCst);
        Ok("Anti-sleep simulated for non-Windows OS".to_string())
    }
}

/// Disables anti-sleep mode, restoring normal Windows power behavior.
///
/// Calling SetThreadExecutionState with only ES_CONTINUOUS
/// clears all previous requirements and lets Windows manage
/// power normally again.
#[tauri::command]
pub fn disable_anti_sleep() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Power::{SetThreadExecutionState, ES_CONTINUOUS};

        let prev_state = unsafe { SetThreadExecutionState(ES_CONTINUOUS) };

        if prev_state.0 == 0 {
            Err("Failed to restore normal sleep mode".to_string())
        } else {
            ANTI_SLEEP_ACTIVE.store(false, Ordering::SeqCst);
            Ok("Anti-sleep disabled".to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        ANTI_SLEEP_ACTIVE.store(false, Ordering::SeqCst);
        Ok("Anti-sleep disabled".to_string())
    }
}

/// Returns the current anti-sleep status.
/// Used by the frontend to sync UI state on app load.
#[tauri::command]
pub fn get_anti_sleep_status() -> bool {
    ANTI_SLEEP_ACTIVE.load(Ordering::Relaxed)
}

// Backward-compatible wrappers for Phase 0/1 commands
#[tauri::command]
pub fn prevent_sleep() -> Result<String, String> {
    enable_anti_sleep()
}

#[tauri::command]
pub fn allow_sleep() -> Result<String, String> {
    disable_anti_sleep()
}
