import { create } from "zustand";
import type { AudioFile, AudioLibraryEntry } from "../lib/types";
import {
  dbGetAudioLibrary,
  dbAddToAudioLibrary,
  dbRemoveFromAudioLibrary,
} from "../services/database";

interface AudioStore {
  library: AudioLibraryEntry[];
  selectedTrackId: string | null;
  isLoading: boolean;

  // Actions
  loadTracks: () => Promise<void>;
  addToLibrary: (file: AudioFile, name?: string) => Promise<AudioLibraryEntry>;
  removeFromLibrary: (id: string) => Promise<void>;
  updateLibraryEntry: (id: string, updates: Partial<AudioLibraryEntry>) => void;
  getLibraryEntry: (id: string) => AudioLibraryEntry | undefined;
  linkAlarmToAudio: (audioId: string, alarmId: string) => void;
  unlinkAlarmFromAudio: (audioId: string, alarmId: string) => void;
  setSelectedTrackId: (id: string | null) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  library: [],
  selectedTrackId: null,
  isLoading: false,

  loadTracks: async () => {
    set({ isLoading: true });
    try {
      const tracks = await dbGetAudioLibrary();
      set({ library: tracks, isLoading: false });
    } catch (err) {
      console.error("[AudioStore] Failed to load audio library from DB:", err);
      set({ isLoading: false });
    }
  },

  addToLibrary: async (file: AudioFile, name?: string) => {
    try {
      const entry = await dbAddToAudioLibrary(file, name);
      set((state) => ({
        library: [entry, ...state.library],
        selectedTrackId: entry.id,
      }));
      return entry;
    } catch (err) {
      console.error("[AudioStore] Failed to add track to DB:", err);
      throw err;
    }
  },

  removeFromLibrary: async (id: string) => {
    try {
      await dbRemoveFromAudioLibrary(id);
      set((state) => ({
        library: state.library.filter((entry) => entry.id !== id),
        selectedTrackId:
          state.selectedTrackId === id ? null : state.selectedTrackId,
      }));
    } catch (err) {
      console.error("[AudioStore] Failed to remove track from DB:", err);
      throw err;
    }
  },

  updateLibraryEntry: (id: string, updates: Partial<AudioLibraryEntry>) => {
    set((state) => ({
      library: state.library.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));
  },

  getLibraryEntry: (id: string) => {
    return get().library.find((entry) => entry.id === id);
  },

  linkAlarmToAudio: (audioId: string, alarmId: string) => {
    set((state) => ({
      library: state.library.map((entry) => {
        if (entry.id === audioId) {
          if (!entry.usedByAlarmIds.includes(alarmId)) {
            return {
              ...entry,
              usedByAlarmIds: [...entry.usedByAlarmIds, alarmId],
            };
          }
        }
        return entry;
      }),
    }));
  },

  unlinkAlarmFromAudio: (audioId: string, alarmId: string) => {
    set((state) => ({
      library: state.library.map((entry) => {
        if (entry.id === audioId) {
          return {
            ...entry,
            usedByAlarmIds: entry.usedByAlarmIds.filter((id) => id !== alarmId),
          };
        }
        return entry;
      }),
    }));
  },

  setSelectedTrackId: (id: string | null) => {
    set({ selectedTrackId: id });
  },
}));
