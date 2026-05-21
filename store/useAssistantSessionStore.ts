import { create } from "zustand";

import type { AssistantChatMessage } from "@/services/assistant";

type AssistantSessionState = {
  messages: AssistantChatMessage[];
  input: string;
  isSending: boolean;
  error: string | null;
  initialized: boolean;
};

type AssistantSessionStore = {
  sessions: Record<string, AssistantSessionState>;
  initializeSession: (userId: string, initialMessage: AssistantChatMessage) => void;
  setInput: (userId: string, input: string) => void;
  setSending: (userId: string, isSending: boolean) => void;
  setError: (userId: string, error: string | null) => void;
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

export const useAssistantSessionStore = create<AssistantSessionStore>((set) => ({
  sessions: {},
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
            messages: current?.messages.length ? current.messages : [initialMessage],
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
}));
