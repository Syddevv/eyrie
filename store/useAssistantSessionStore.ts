import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AssistantChatMessage } from "@/services/assistant";

type AssistantUsageSnapshot = {
  remainingMessages: number | null;
  dailyLimit: number | null;
  cooldownUntil: number | null;
  resetAt: string | null;
  messageCount: number | null;
  reservedCount: number | null;
  lastReset: string | null;
  lastRequestAt: string | null;
  statusMessage: string | null;
  validationError: string | null;
  lastSyncedAt: number | null;
  isRefreshing: boolean;
  hasResolved: boolean;
};

type AssistantSessionState = {
  messages: AssistantChatMessage[];
  input: string;
  isSending: boolean;
  error: string | null;
  initialized: boolean;
};

type AssistantSessionStore = {
  sessions: Record<string, AssistantSessionState>;
  usageByUser: Record<string, AssistantUsageSnapshot>;
  initializeSession: (userId: string, initialMessage: AssistantChatMessage) => void;
  setInput: (userId: string, input: string) => void;
  setSending: (userId: string, isSending: boolean) => void;
  setError: (userId: string, error: string | null) => void;
  setUsageState: (
    userId: string,
    usage: AssistantUsageSnapshot | ((current: AssistantUsageSnapshot) => AssistantUsageSnapshot),
  ) => void;
  appendMessages: (userId: string, messages: AssistantChatMessage[]) => void;
  replaceMessage: (
    userId: string,
    messageId: string,
    nextMessage: AssistantChatMessage,
  ) => void;
  removeMessage: (userId: string, messageId: string) => void;
  resetSession: (userId: string, initialMessage?: AssistantChatMessage) => void;
};

function createEmptySession(): AssistantSessionState {
  return {
    messages: [],
    input: "",
    isSending: false,
    error: null,
    initialized: false,
  };
}

function createEmptyUsageState(): AssistantUsageSnapshot {
  return {
    remainingMessages: null,
    dailyLimit: 20,
    cooldownUntil: null,
    resetAt: null,
    messageCount: null,
    reservedCount: null,
    lastReset: null,
    lastRequestAt: null,
    statusMessage: null,
    validationError: null,
    lastSyncedAt: null,
    isRefreshing: false,
    hasResolved: false,
  };
}

export const useAssistantSessionStore = create<AssistantSessionStore>()(
  persist(
    (set) => ({
      sessions: {},
      usageByUser: {},
      initializeSession: (userId, initialMessage) =>
        set((state) => {
          const current = state.sessions[userId];
          if (current?.initialized) {
            return state;
          }

          return {
            sessions: {
              ...state.sessions,
              [userId]: {
                ...(current ?? createEmptySession()),
                messages: current?.messages.length
                  ? current.messages
                  : [initialMessage],
                initialized: true,
              },
            },
          };
        }),
      setInput: (userId, input) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              input,
            },
          },
        })),
      setSending: (userId, isSending) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              isSending,
            },
          },
        })),
      setError: (userId, error) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              error,
            },
          },
        })),
      setUsageState: (userId, usage) =>
        set((state) => {
          const current = state.usageByUser[userId] ?? createEmptyUsageState();
          const next = typeof usage === "function" ? usage(current) : usage;

          return {
            usageByUser: {
              ...state.usageByUser,
              [userId]: next,
            },
          };
        }),
      appendMessages: (userId, messages) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              messages: [...(state.sessions[userId]?.messages ?? []), ...messages],
            },
          },
        })),
      replaceMessage: (userId, messageId, nextMessage) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              messages: (state.sessions[userId]?.messages ?? []).map((message) =>
                message.id === messageId ? nextMessage : message,
              ),
            },
          },
        })),
      removeMessage: (userId, messageId) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...(state.sessions[userId] ?? createEmptySession()),
              messages: (state.sessions[userId]?.messages ?? []).filter(
                (message) => message.id !== messageId,
              ),
            },
          },
        })),
      resetSession: (userId, initialMessage) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [userId]: {
              ...createEmptySession(),
              messages: initialMessage ? [initialMessage] : [],
              initialized: Boolean(initialMessage),
            },
          },
        })),
    }),
    {
      name: "assistant-session-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        usageByUser: state.usageByUser,
      }),
    },
  ),
);
