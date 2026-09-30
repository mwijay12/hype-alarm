import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export type VoicePlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'done'
  | 'error'
  | 'no_cache';

export interface VoicePlayerState {
  playbackState: VoicePlaybackState;
  error: string | null;
  isPlaying: boolean;
}

export function useVoicePlayer() {
  const [state, setState] = useState<VoicePlayerState>({
    playbackState: 'idle',
    error: null,
    isPlaying: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Play audio file via Web Audio API with volume boost
  const playAudioFile = useCallback(async (filePath: string, volumeBoost: number) => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.connect(ctx.destination);
    }
    gainRef.current.gain.value = Math.max(0.1, volumeBoost / 100);

    const assetUrl = convertFileSrc(filePath);
    const response = await fetch(assetUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore already stopped
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainRef.current);
    source.start(0);
    sourceRef.current = source;
  }, []);

  // Play cached voice file for an alarm
  const playVoiceForAlarm = useCallback(
    async (
      alarmId: string,
      volumeBoost: number = 150,
      onComplete?: () => void
    ) => {
      setState({ playbackState: 'loading', error: null, isPlaying: false });

      try {
        const cachePath = await invoke<string | null>('get_voice_cache_path', {
          alarmId,
        });

        if (!cachePath) {
          setState({
            playbackState: 'no_cache',
            error: 'Voice not cached — skipping',
            isPlaying: false,
          });
          onComplete?.();
          return;
        }

        await playAudioFile(cachePath, volumeBoost);

        setState({
          playbackState: 'playing',
          error: null,
          isPlaying: true,
        });

        if (sourceRef.current) {
          sourceRef.current.onended = () => {
            setState({
              playbackState: 'done',
              error: null,
              isPlaying: false,
            });
            onComplete?.();
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to play voice';
        setState({
          playbackState: 'error',
          error: msg,
          isPlaying: false,
        });
        onComplete?.();
      }
    },
    [playAudioFile]
  );

  // Play a preview file (for Settings page preview)
  const playPreviewFile = useCallback(
    async (filePath: string, volumeBoost: number = 100, onComplete?: () => void) => {
      setState({ playbackState: 'loading', error: null, isPlaying: false });
      try {
        await playAudioFile(filePath, volumeBoost);
        setState({ playbackState: 'playing', error: null, isPlaying: true });

        if (sourceRef.current) {
          sourceRef.current.onended = () => {
            setState({ playbackState: 'done', error: null, isPlaying: false });
            onComplete?.();
          };
        }
      } catch (err) {
        setState({
          playbackState: 'error',
          error: String(err),
          isPlaying: false,
        });
        onComplete?.();
      }
    },
    [playAudioFile]
  );

  // Stop voice playback
  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }
    setState({
      playbackState: 'idle',
      error: null,
      isPlaying: false,
    });
  }, []);

  return {
    state,
    playVoiceForAlarm,
    playPreviewFile,
    stop,
    isPlaying: state.isPlaying,
    isLoading: state.playbackState === 'loading',
  };
}
