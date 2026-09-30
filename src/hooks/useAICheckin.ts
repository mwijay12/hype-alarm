import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  ChatMessage,
  MorningContext,
  MorningBriefing,
} from '../lib/types';
import { dbGetTodayMorningBriefing } from '../services/database';
import { generateOfflineBriefing } from '../services/offlineAiService';

export type CheckinPhase =
  | 'idle'
  | 'loading'
  | 'active'
  | 'streaming'
  | 'done'
  | 'error'
  | 'no_key';

export interface CheckinState {
  phase: CheckinPhase;
  messages: ChatMessage[];
  streamingText: string;
  conversationId: string;
  error: string | null;
  isSessionDone: boolean;
  exchangeCount: number;
  briefing: MorningBriefing | null;
}

interface AiStreamToken {
  token: string;
  is_done: boolean;
  full_text: string;
}

export function useAICheckin() {
  const [state, setState] = useState<CheckinState>({
    phase: 'idle',
    messages: [],
    streamingText: '',
    conversationId: '',
    error: null,
    isSessionDone: false,
    exchangeCount: 0,
    briefing: null,
  });

  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Setup streaming event listener
  useEffect(() => {
    let isMounted = true;

    const setupListener = async () => {
      try {
        const unlisten = await listen<AiStreamToken>(
          'ai:checkin:token',
          (event) => {
            if (!isMounted) return;
            const { token, is_done, full_text } = event.payload;

            if (is_done) {
              setState((prev) => {
                const isSessionDone = full_text.includes('|||DONE');
                const cleanText = full_text.replace('|||DONE', '').trim();

                // If already ended with assistant response, replace or append
                const lastMsg = prev.messages[prev.messages.length - 1];
                let newMessages: ChatMessage[];

                if (lastMsg && lastMsg.role === 'assistant') {
                  newMessages = [
                    ...prev.messages.slice(0, -1),
                    { role: 'assistant', content: cleanText },
                  ];
                } else {
                  newMessages = [
                    ...prev.messages,
                    { role: 'assistant', content: cleanText },
                  ];
                }

                return {
                  ...prev,
                  phase: isSessionDone ? 'done' : 'active',
                  messages: newMessages,
                  streamingText: '',
                  isSessionDone,
                };
              });
            } else {
              setState((prev) => ({
                ...prev,
                phase: 'streaming',
                streamingText: full_text || prev.streamingText + token,
              }));
            }
          }
        );

        unlistenRef.current = unlisten;
      } catch (e) {
        console.warn('Could not setup AI streaming listener:', e);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  // Start a new check-in session
  const startCheckin = useCallback(async (context: MorningContext) => {
    setState((prev) => ({ ...prev, phase: 'loading', error: null }));

    try {
      const openingMessage = await invoke<string>('start_morning_checkin', {
        context,
      });

      setState({
        phase: 'active',
        messages: [
          {
            role: 'assistant',
            content: openingMessage,
          },
        ],
        streamingText: '',
        conversationId: `conv-${Date.now()}`,
        error: null,
        isSessionDone: false,
        exchangeCount: 0,
        briefing: null,
      });
    } catch (err) {
      console.warn('[AICheckin] Cloud model offline, falling back to local offline AI:', err);
      // Offline fallback greeting
      const offlineGreeting = `Good morning champion! "${context.alarm_label || 'Rise & Build'}" is disarmed. You're holding a ${context.current_streak || 0}-day streak! How are you feeling right now? Ready to claim today's priorities?`;
      setState({
        phase: 'active',
        messages: [{ role: 'assistant', content: offlineGreeting }],
        streamingText: '',
        conversationId: `conv-${Date.now()}`,
        error: null,
        isSessionDone: false,
        exchangeCount: 0,
        briefing: null,
      });
    }
  }, []);

  // Send a user message
  const sendMessage = useCallback(
    async (userText: string, context: MorningContext) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
      };

      const nextExchangeCount = state.exchangeCount + 1;

      setState((prev) => ({
        ...prev,
        phase: 'streaming',
        messages: [...prev.messages, userMsg],
        streamingText: '',
        exchangeCount: nextExchangeCount,
      }));

      try {
        const response = await invoke<string>('send_checkin_message', {
          conversationId: state.conversationId,
          userMessage: trimmed,
          messageHistory: state.messages,
          context,
        });

        if (response.includes('|||DONE')) {
          const clean = response.replace('|||DONE', '').trim();
          setState((prev) => ({
            ...prev,
            phase: 'done',
            isSessionDone: true,
            streamingText: '',
            messages: [...prev.messages, { role: 'assistant', content: clean }],
          }));
        }
      } catch (err) {
        console.warn('[AICheckin] Cloud message send offline, using offline smart response:', err);
        const goalMention = context.today_goals && context.today_goals.length > 0
          ? `Let's tackle: "${context.today_goals[0]}" with complete focus!`
          : "Keep that momentum high all morning!";
        const offlineReply = `Love that energy. Drink 500ml water right now, avoid checking social feeds for 30 minutes, and own the morning. ${goalMention}`;
        setState((prev) => ({
          ...prev,
          phase: 'done',
          isSessionDone: true,
          streamingText: '',
          messages: [...prev.messages, { role: 'assistant', content: offlineReply }],
        }));
      }
    },
    [state.messages, state.conversationId, state.exchangeCount]
  );

  // Generate morning briefing
  const generateBriefing = useCallback(async (context: MorningContext) => {
    try {
      // First check local DB
      const existing = await dbGetTodayMorningBriefing();
      if (existing) {
        setState((prev) => ({ ...prev, briefing: existing }));
        return existing;
      }

      const res = await invoke<MorningBriefing>('generate_morning_briefing', {
        context,
      }).catch(() => generateOfflineBriefing(context));

      setState((prev) => ({ ...prev, briefing: res }));
      return res;
    } catch (e) {
      console.warn('Failed to generate briefing, using offline generator:', e);
      const fallback = generateOfflineBriefing(context);
      setState((prev) => ({ ...prev, briefing: fallback }));
      return fallback;
    }
  }, []);

  // Reset check-in
  const dismiss = useCallback(() => {
    setState({
      phase: 'idle',
      messages: [],
      streamingText: '',
      conversationId: '',
      error: null,
      isSessionDone: false,
      exchangeCount: 0,
      briefing: null,
    });
  }, []);

  return {
    state,
    startCheckin,
    sendMessage,
    generateBriefing,
    dismiss,
    isLoading: state.phase === 'loading',
    isStreaming: state.phase === 'streaming',
    isActive: state.phase === 'active' || state.phase === 'streaming',
    isDone: state.phase === 'done' || state.isSessionDone,
    hasError: state.phase === 'error',
    hasNoKey: state.phase === 'no_key',
  };
}
