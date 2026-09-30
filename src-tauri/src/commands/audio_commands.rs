use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Amri za kushughulikia mafaili ya sauti (Audio Commands).
///
/// Dhana ya Rust:
/// `&str` ni string slice (kumbukumbu iliyoazima / borrowed reference).
/// `Path::new(path).exists()` inachunguza kama faili lipo kwenye diski bila kulifungua.
#[tauri::command]
pub fn verify_audio_file(path: String) -> Result<bool, String> {
    let file_path = Path::new(&path);
    if file_path.exists() && file_path.is_file() {
        Ok(true)
    } else {
        Err("Faili la sauti halipatikani kwenye kompyuta yako".to_string())
    }
}

/// Copies an audio file from its original location into the app's
/// persistent sound library folder inside app_data_dir/sounds/.
/// Returns the new file path inside app_data_dir/sounds/.
///
/// Architecture note:
/// If the user's original file gets moved, renamed, or deleted,
/// the alarm would break. By copying to app_data_dir, the sound is
/// always available as long as the app is installed.
#[tauri::command]
pub async fn copy_audio_file(
    app: AppHandle,
    source_path: String,
) -> Result<String, String> {
    let source = Path::new(&source_path);
    if !source.exists() || !source.is_file() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let sounds_dir = app_data_dir.join("sounds");
    if !sounds_dir.exists() {
        fs::create_dir_all(&sounds_dir)
            .map_err(|e| format!("Failed to create sounds directory: {}", e))?;
    }

    // Generate unique filename to avoid collisions
    let file_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("alarm_sound.mp3");

    let unique_prefix = chrono::Utc::now().timestamp_millis();
    let sanitized_name = format!("{}_{}", unique_prefix, file_name.replace(' ', "_"));
    let destination: PathBuf = sounds_dir.join(sanitized_name);

    fs::copy(&source, &destination)
        .map_err(|e| format!("Failed to copy audio file: {}", e))?;

    Ok(destination.to_string_lossy().to_string())
}

/// Deletes a sound file from the app's sound library.
/// Called when user removes a track from their library.
#[tauri::command]
pub async fn delete_audio_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if path.exists() && path.is_file() {
        fs::remove_file(path).map_err(|e| format!("Failed to delete audio file: {}", e))?;
    }
    Ok(())
}

/// Inasoma faili la sauti moja kwa moja kutoka kwenye diski na kurudisha binary bytes (Vec<u8>).
/// Hii inaepuka kabisa vikwazo vya CORS na WebView2 asset protocol blocks kwenye Windows.
#[tauri::command]
pub fn read_audio_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Audio file not found: {}", file_path));
    }
    fs::read(path).map_err(|e| format!("Failed to read audio file: {}", e))
}

fn generate_melodic_wav(notes: &[f32], tempo_bpm: f32, duration_sec: f32) -> Vec<u8> {
    let sample_rate: u32 = 44100;
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    let mut pcm_data: Vec<i16> = Vec::with_capacity(num_samples);

    let seconds_per_beat = 60.0 / tempo_bpm;
    let note_duration = seconds_per_beat * 0.5;

    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        let note_idx = ((t / note_duration) as usize) % notes.len();
        let freq = notes[note_idx];

        let note_t = (t % note_duration) / note_duration;
        let env = (1.0 - note_t).powf(1.8).max(0.0);

        let sample_f = (
            (t * freq * 2.0 * std::f32::consts::PI).sin() * 0.6
            + (t * freq * 2.0 * 2.0 * std::f32::consts::PI).sin() * 0.25
            + (t * freq * 3.0 * 2.0 * std::f32::consts::PI).sin() * 0.15
        ) * env * 0.7;

        let sample_i16 = (sample_f * 32767.0).clamp(-32768.0, 32767.0) as i16;
        pcm_data.push(sample_i16);
    }

    let data_len = (pcm_data.len() * 2) as u32;
    let mut header = Vec::with_capacity(44 + data_len as usize);

    header.extend_from_slice(b"RIFF");
    header.extend_from_slice(&(data_len + 36).to_le_bytes());
    header.extend_from_slice(b"WAVE");
    header.extend_from_slice(b"fmt ");
    header.extend_from_slice(&16u32.to_le_bytes());
    header.extend_from_slice(&1u16.to_le_bytes());
    header.extend_from_slice(&1u16.to_le_bytes());
    header.extend_from_slice(&sample_rate.to_le_bytes());
    header.extend_from_slice(&(sample_rate * 2).to_le_bytes());
    header.extend_from_slice(&2u16.to_le_bytes());
    header.extend_from_slice(&16u16.to_le_bytes());
    header.extend_from_slice(b"data");
    header.extend_from_slice(&data_len.to_le_bytes());

    for s in pcm_data {
        header.extend_from_slice(&s.to_le_bytes());
    }

    header
}

/// Inahakikisha mafaili ya mfano (Morning Energy Mix na Focus Beats) yapo kwenye diski kama faili halisi za WAV.
/// Hii inazuia kabisa hitilafu ya "sample beeps" na inahakikisha wimbo halisi unacheza kila wakati.
#[tauri::command]
pub async fn ensure_sample_audio_files(app: AppHandle) -> Result<serde_json::Value, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let sounds_dir = app_data_dir.join("sounds");
    if !sounds_dir.exists() {
        fs::create_dir_all(&sounds_dir)
            .map_err(|e| format!("Failed to create sounds directory: {}", e))?;
    }

    let track1_path = sounds_dir.join("Morning_Energy_Mix.wav");
    if !track1_path.exists() {
        let notes1 = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 440.00, 523.25, 349.23, 440.00, 523.25, 392.00];
        let wav1 = generate_melodic_wav(&notes1, 128.0, 15.0);
        fs::write(&track1_path, wav1).map_err(|e| format!("Failed to write track 1: {}", e))?;
    }

    let track2_path = sounds_dir.join("Focus_Beats_Sun.wav");
    if !track2_path.exists() {
        let notes2 = [293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 493.88, 587.33, 392.00, 493.88, 587.33, 440.00];
        let wav2 = generate_melodic_wav(&notes2, 100.0, 15.0);
        fs::write(&track2_path, wav2).map_err(|e| format!("Failed to write track 2: {}", e))?;
    }

    Ok(serde_json::json!({
        "track1": track1_path.to_string_lossy().to_string(),
        "track2": track2_path.to_string_lossy().to_string(),
    }))
}



