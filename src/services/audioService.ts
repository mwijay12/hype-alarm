import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { AudioFile } from "../lib/types";

// Supported audio formats for native file dialog
export const SUPPORTED_AUDIO_FORMATS = [
  {
    name: "Audio Files",
    extensions: ["mp3", "wav", "flac", "ogg", "m4a"],
  },
];

/**
 * Open native file picker to select an audio file on Windows
 */
export async function pickAudioFile(): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: SUPPORTED_AUDIO_FORMATS,
      title: "Select Alarm Sound",
    });

    if (typeof selected === "string") return selected;
    if (Array.isArray(selected) && (selected as unknown as string[]).length > 0) {
      return (selected as unknown as string[])[0];
    }
    return null;
  } catch (err) {
    console.warn("Native file picker unavailable or cancelled:", err);
    return null;
  }
}

/**
 * Copies selected file to persistent userData/sounds folder using Rust command
 */
export async function copyAudioToLibrary(sourcePath: string): Promise<string> {
  try {
    const persistentPath = await invoke<string>("copy_audio_file", {
      sourcePath,
    });
    return persistentPath;
  } catch (err) {
    console.warn("Persistent file copy fallback (using source path):", err);
    return sourcePath;
  }
}

/**
 * Deletes audio file from persistent storage using Rust command
 */
export async function deleteAudioFromLibrary(filePath: string): Promise<void> {
  try {
    await invoke("delete_audio_file", { filePath });
  } catch (err) {
    console.warn("Failed to delete audio file from library:", err);
  }
}

/**
 * Extract display name and format from file path
 */
export function extractFileInfo(filePath: string): Partial<AudioFile> {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const fileName = parts[parts.length - 1] || "alarm_sound.mp3";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "unknown";

  const validFormats = ["mp3", "wav", "flac", "ogg", "m4a"];
  const format = validFormats.includes(ext)
    ? (ext as AudioFile["format"])
    : "unknown";

  return { path: filePath, fileName, format };
}

/**
 * Get Tauri asset URL or web-friendly URL for local file
 */
export function getAssetUrl(filePath: string): string {
  if (!filePath) return "";
  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("blob:") ||
    filePath.startsWith("data:")
  ) {
    return filePath;
  }
  try {
    return convertFileSrc(filePath);
  } catch {
    return filePath;
  }
}

/**
 * Reads an audio file directly into an ArrayBuffer using native Rust command.
 * This completely bypasses WebView2 CORS and asset:// protocol restrictions on Windows.
 */
export async function loadAudioArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  if (!filePath) throw new Error("Empty audio file path");

  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("blob:") ||
    filePath.startsWith("data:")
  ) {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`HTTP fetch failed: ${res.statusText}`);
    return await res.arrayBuffer();
  }

  // 1. Jaribu kusoma kwa kutumia amri ya asili ya Rust (100% reliable)
  try {
    const bytes = await invoke<number[]>("read_audio_file", { filePath });
    return new Uint8Array(bytes).buffer;
  } catch (err1) {
    console.warn("[audioService] Rust read_audio_file failed, trying plugin-fs fallback:", err1);
  }

  // 2. Fallback: tauri-plugin-fs
  try {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const u8 = await readFile(filePath);
    return u8.buffer;
  } catch (err2) {
    console.warn("[audioService] plugin-fs fallback failed, trying fetch fallback:", err2);
  }

  // 3. Fallback: fetch convertFileSrc
  const url = getAssetUrl(filePath);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load audio: ${response.statusText}`);
  return await response.arrayBuffer();
}

/**
 * Creates a local Blob URL for WaveSurfer or HTML5 Audio elements.
 */
export async function getAudioBlobUrl(filePath: string): Promise<string> {
  if (!filePath) return "";
  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("blob:") ||
    filePath.startsWith("data:")
  ) {
    return filePath;
  }

  try {
    const buffer = await loadAudioArrayBuffer(filePath);
    // Detect basic mime type from file path extension
    const ext = filePath.split(".").pop()?.toLowerCase() || "mp3";
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      flac: "audio/flac",
      m4a: "audio/mp4",
    };
    const mime = mimeMap[ext] || "audio/mpeg";
    const blob = new Blob([buffer], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("[audioService] Failed to create blob URL, falling back to asset URL:", err);
    return getAssetUrl(filePath);
  }
}

/**
 * Format bytes into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Decode audio duration using Web Audio API and native file reading
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const arrayBuffer = await loadAudioArrayBuffer(filePath);
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const durationMs = Math.floor(buffer.duration * 1000);
    await ctx.close();
    return durationMs;
  } catch (err) {
    console.warn("Could not decode audio duration:", err);
    return 0;
  }
}

/**
 * Build a full AudioFile record from a file path
 */
export async function buildAudioFile(filePath: string): Promise<AudioFile> {
  const info = extractFileInfo(filePath);
  const durationMs = await getAudioDuration(filePath);

  return {
    path: filePath,
    fileName: info.fileName ?? "Custom Audio",
    fileSize: 0,
    durationMs: durationMs || 180000,
    format: info.format ?? "mp3",
  };
}

