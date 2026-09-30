import React, { useState, useRef, useCallback } from "react";
import { GlowButton } from "../components/ui/GlowButton";
import { useAudioStore } from "../store/audioStore";
import { useAlarmStore } from "../store/alarmStore";
import type { AudioLibraryEntry, Alarm } from "../lib/types";
import { msToDisplay, getBoostLabel, getBoostColorClass } from "../lib/utils";
import {
  pickAudioFile,
  copyAudioToLibrary,
  buildAudioFile,
  formatFileSize,
  loadAudioArrayBuffer,
} from "../services/audioService";
import { AudioEngine } from "../components/audio/AudioEngine";
import { showToast } from "../components/ui/Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Music2,
  Plus,
  Play,
  Square,
  Sparkles,
  Scissors,
  Pencil,
  Trash2,
  Bell,
  Check,
  Clock,
} from "lucide-react";

export const SoundLibrary: React.FC = () => {
  const {
    library,
    addToLibrary,
    removeFromLibrary,
    updateLibraryEntry,
    linkAlarmToAudio,
  } = useAudioStore();

  const { alarms, updateAlarm } = useAlarmStore();

  // Local state
  const [editingTrack, setEditingTrack] = useState<AudioLibraryEntry | null>(null);
  const [assigningTrack, setAssigningTrack] = useState<AudioLibraryEntry | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Real audio preview refs
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);

  // Import audio file from computer
  const handleImportAudio = async () => {
    try {
      setIsImporting(true);
      const filePath = await pickAudioFile();
      if (!filePath) return;

      const persistentPath = await copyAudioToLibrary(filePath);
      const audioFile = await buildAudioFile(persistentPath);
      const newTrack = await addToLibrary(audioFile);

      showToast(`Added "${newTrack.name}" to sound library`, "success");
    } catch (err) {
      showToast("Could not import audio file", "danger");
    } finally {
      setIsImporting(false);
    }
  };

  // Stop any playing preview and cleanup
  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
      try { previewSourceRef.current.stop(); } catch { /* already stopped */ }
      previewSourceRef.current.disconnect();
      previewSourceRef.current = null;
    }
    setPlayingTrackId(null);
  }, []);

  // Toggle mini in-card preview — plays REAL audio file
  const handleToggleMiniPreview = async (track: AudioLibraryEntry) => {
    // If already playing this track, stop it
    if (playingTrackId === track.id) {
      stopPreview();
      return;
    }

    // Stop any other playing preview first
    stopPreview();

    // Set playing immediately for UI feedback
    setPlayingTrackId(track.id);

    try {
      // Ensure AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (!previewCtxRef.current || previewCtxRef.current.state === "closed") {
        previewCtxRef.current = new AudioContextClass();
      }
      const ctx = previewCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Setup gain node for volume boost
      if (!previewGainRef.current) {
        previewGainRef.current = ctx.createGain();
        previewGainRef.current.connect(ctx.destination);
      }
      previewGainRef.current.gain.value = Math.max(0.1, track.volumeBoost / 100);

      // Load the real audio file via native buffer loader
      const arrayBuffer = await loadAudioArrayBuffer(track.file.path);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Create buffer source and play with trim points
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(previewGainRef.current);

      const startSec = Math.max(0, (track.trimStartMs || 0) / 1000);
      const endSec = track.trimEndMs > 0
        ? Math.min(audioBuffer.duration, track.trimEndMs / 1000)
        : audioBuffer.duration;
      const durationSec = Math.max(0.1, endSec - startSec);

      // Preview up to 15 seconds of the trimmed region
      const previewDuration = Math.min(15, durationSec);

      source.start(0, startSec, previewDuration);
      previewSourceRef.current = source;

      source.onended = () => {
        previewSourceRef.current = null;
        setPlayingTrackId((current) =>
          current === track.id ? null : current
        );
      };
    } catch (err) {
      console.warn("[SoundLibrary] Audio preview error:", err);
      showToast("Could not preview audio file", "danger");
      setPlayingTrackId(null);
    }
  };

  // Assign track to specific alarm
  const handleAssignToAlarm = (alarm: Alarm) => {
    if (!assigningTrack) return;

    updateAlarm(alarm.id, {
      audioPath: assigningTrack.file.path,
      audioFileName: assigningTrack.name,
      audioStartMs: assigningTrack.trimStartMs,
      audioEndMs: assigningTrack.trimEndMs,
      volumeBoost: assigningTrack.volumeBoost,
      fadeInSeconds: assigningTrack.fadeInSeconds,
    });

    linkAlarmToAudio(assigningTrack.id, alarm.id);
    showToast(`Assigned "${assigningTrack.name}" to ${alarm.label}`, "success");
    setAssigningTrack(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sound Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {library.length} {library.length === 1 ? "track" : "tracks"} available
            • Upload songs, trim waveforms, and boost volume up to 400%.
          </p>
        </div>

        <GlowButton
          onClick={handleImportAudio}
          disabled={isImporting}
          icon={<Plus className="w-4 h-4" />}
        >
          {isImporting ? "Importing..." : "+ Import Audio"}
        </GlowButton>
      </div>

      {/* Track Cards Grid or Empty State */}
      {library.length === 0 ? (
        <div className="py-20 px-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Music2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No audio files in your library
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Import your favorite MP3 or WAV songs from your computer to wake up
            to high-energy music.
          </p>
          <GlowButton onClick={handleImportAudio} icon={<Plus className="w-4 h-4" />}>
            + Import Your First Audio File
          </GlowButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {library.map((track) => {
            const isPlayingThis = playingTrackId === track.id;
            const boostBadgeClass = getBoostColorClass(track.volumeBoost);
            const boostLabel = getBoostLabel(track.volumeBoost);
            const isTrimmed =
              track.trimStartMs > 0 ||
              (track.trimEndMs > 0 &&
                track.trimEndMs !== track.file.durationMs);

            return (
              <div
                key={track.id}
                className="rounded-3xl bg-white dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/40 transition-all space-y-4"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                        isPlayingThis
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 animate-pulse"
                          : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50"
                      }`}
                    >
                      <Music2 className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {track.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="truncate max-w-[140px]">
                          {track.file.fileName}
                        </span>
                        <span>•</span>
                        <span className="uppercase font-semibold text-blue-600">
                          {track.file.format}
                        </span>
                        {track.file.fileSize > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(track.file.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      removeFromLibrary(track.id);
                      showToast(`Removed "${track.name}"`, "info");
                    }}
                    className="p-1.5 rounded-xl text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Remove from library"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Metadata Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50 dark:border-slate-800 text-xs">
                  {/* Duration */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{msToDisplay(track.file.durationMs)}</span>
                  </div>

                  {/* Volume Boost Badge */}
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border font-semibold ${boostBadgeClass}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{track.volumeBoost}% ({boostLabel})</span>
                  </div>

                  {/* Trim Badge */}
                  {isTrimmed && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                      <Scissors className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>
                        {msToDisplay(track.trimStartMs)} →{" "}
                        {msToDisplay(track.trimEndMs)}
                      </span>
                    </div>
                  )}

                  {/* Fade In */}
                  {track.fadeInSeconds > 0 && (
                    <div className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                      Fade: {track.fadeInSeconds}s
                    </div>
                  )}

                  {/* Used in Alarms Count */}
                  {track.usedByAlarmIds.length > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] ml-auto">
                      <Bell className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>Used in {track.usedByAlarmIds.length}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleMiniPreview(track)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isPlayingThis
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20"
                        : "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60"
                    }`}
                  >
                    {isPlayingThis ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Preview</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingTrack(track)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Edit & Trim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssigningTrack(track)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Use in Alarm</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Audio Modal / Drawer with AudioEngine */}
      {editingTrack && (
        <Dialog
          open={Boolean(editingTrack)}
          onOpenChange={(open) => !open && setEditingTrack(null)}
        >
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-3xl p-0 overflow-hidden shadow-2xl">
            <AudioEngine
              track={editingTrack}
              onSave={(updated) => {
                updateLibraryEntry(editingTrack.id, updated);
                setEditingTrack((prev) => (prev ? { ...prev, ...updated } : null));
              }}
              onClose={() => setEditingTrack(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Sound to Alarm Modal */}
      {assigningTrack && (
        <Dialog
          open={Boolean(assigningTrack)}
          onOpenChange={(open) => !open && setAssigningTrack(null)}
        >
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Assign "{assigningTrack.name}"</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select which alarm will play this audio track with its volume
                boost and trim points:
              </p>
            </DialogHeader>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {alarms.map((alarm) => {
                const isCurrentlyUsing =
                  alarm.audioFileName === assigningTrack.name;

                return (
                  <button
                    key={alarm.id}
                    type="button"
                    onClick={() => handleAssignToAlarm(alarm)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isCurrentlyUsing
                        ? "bg-blue-50/80 dark:bg-blue-950/60 border-blue-300 dark:border-blue-600 ring-2 ring-blue-500/20"
                        : "bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        {alarm.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {String(alarm.hour).padStart(2, "0")}:
                        {String(alarm.minute).padStart(2, "0")} •{" "}
                        {alarm.repeatPattern}
                      </span>
                    </div>

                    {isCurrentlyUsing ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Sound</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-xl transition-colors">
                        Select
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <GlowButton
                type="button"
                variant="ghost"
                onClick={() => setAssigningTrack(null)}
              >
                Cancel
              </GlowButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
