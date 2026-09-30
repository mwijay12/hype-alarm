import React, { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Mic, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settingsStore";
import { ELEVENLABS_VOICES } from "../../lib/constants";

interface VoicePlayerProps {
  cachedAudioPath: string | null;
  onComplete: () => void;
  autoPlay?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  cachedAudioPath,
  onComplete,
  autoPlay = true,
}) => {
  const { settings } = useSettingsStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voiceMeta =
    ELEVENLABS_VOICES.find((v) => v.id === settings.elevenLabsVoiceId) ||
    ELEVENLABS_VOICES[0];

  useEffect(() => {
    if (!cachedAudioPath) {
      // If no cached audio exists, complete immediately so the main alarm sound can fire
      console.log("[VoicePlayer] No cached audio path — completing voice step immediately");
      onComplete();
      return;
    }

    if (!autoPlay) return;

    try {
      const assetUrl = convertFileSrc(cachedAudioPath);
      const audio = new Audio(assetUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        onComplete();
      };
      audio.onerror = (e) => {
        console.warn("[VoicePlayer] Audio playback error:", e);
        setIsPlaying(false);
        onComplete();
      };

      audio.play().catch((err) => {
        console.warn("[VoicePlayer] Play attempt was rejected:", err);
        setIsPlaying(false);
        onComplete();
      });
    } catch (err) {
      console.warn("[VoicePlayer] Error initializing voice playback:", err);
      onComplete();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cachedAudioPath, autoPlay, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-blue-200/80 shadow-lg max-w-sm mx-auto select-none">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <Mic className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900 block leading-tight">
            AI Wake-up Companion
          </span>
          <span className="text-[10px] text-blue-600 font-medium">
            Voice: {voiceMeta.name} ({voiceMeta.description})
          </span>
        </div>
      </div>

      {/* Animated sound wave bars */}
      <div className="flex items-center gap-1 my-3 h-8">
        {[0.4, 0.9, 0.6, 1.0, 0.7, 0.85, 0.5, 0.95, 0.45].map((scale, i) => (
          <motion.div
            key={i}
            animate={{
              height: isPlaying
                ? [`${scale * 12}px`, `${scale * 30}px`, `${scale * 12}px`]
                : "10px",
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.08,
              ease: "easeInOut",
            }}
            className="w-1 rounded-full bg-blue-600"
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
        <Volume2 className="w-3.5 h-3.5 text-blue-500" />
        <span>{isPlaying ? "Speaking morning motivation..." : "Preparing voice..."}</span>
      </div>
    </div>
  );
};
