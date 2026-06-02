import { useCallback, useEffect, useMemo, useState } from "react";

import { useAnalytics } from "@/hooks/useAnalytics";
import {
  useBudgetProgress,
  useDashboardBootstrap,
  useGoalsProgress,
  useRecentTransactions,
  useDashboardSummary,
  useSpendingBreakdown,
} from "@/hooks/use-dashboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  ASSISTANT_FALLBACK_ERROR_MESSAGE,
  AssistantFunctionError,
  askAssistant,
  buildAssistantContext,
  sanitizeAssistantInput,
  type AssistantChatMessage,
  type AssistantMessageSource,
} from "@/services/assistant";
import { useAssistantSessionStore } from "@/store/useAssistantSessionStore";
import { useOfflineState } from "@/src/sync/hooks";

const MAX_CONVERSATION_MESSAGES = 12;
const DEFAULT_DAILY_LIMIT = 20;
const EMPTY_SESSION = {
  messages: [],
  input: "",
  isSending: false,
  error: null,
  initialized: false,
} as const;

type AssistantUsageState = {
  remainingMessages: number | null;
  dailyLimit: number | null;
  cooldownUntil: number | null;
  resetAt: string | null;
  statusMessage: string | null;
};

function createMessageId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(
  role: AssistantChatMessage["role"],
  text: string,
  status: AssistantChatMessage["status"],
  source: AssistantMessageSource,
): AssistantChatMessage {
  return {
    id: createMessageId(role),
    role,
    text,
    createdAt: new Date().toISOString(),
    status,
    source,
  };
}

function buildInitialGreeting(firstName?: string) {
  const greetingName = firstName?.trim() ? `, ${firstName.trim()}` : "";
  return createMessage(
    "assistant",
    `Hello${greetingName}! I'm your Eyrie financial assistant. Ask me about your spending, budgets, savings goals, or how to plan the rest of this month.`,
    "sent",
    "system",
  );
}

function toConversationWindow(messages: AssistantChatMessage[]) {
  return messages
    .filter((message) => message.status === "sent")
    .slice(-MAX_CONVERSATION_MESSAGES)
    .map((message) => ({
      role: message.role,
      text: message.text,
    }));
}

export function useAssistantSession() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const { isOffline } = useOfflineState();
  const summary = useDashboardSummary();
  const budgets = useBudgetProgress();
  const spendingBreakdown = useSpendingBreakdown();
  const recentTransactions = useRecentTransactions();
  const goals = useGoalsProgress();
  const { analytics } = useAnalytics("thisMonth");
  const [usageState, setUsageState] = useState<AssistantUsageState>({
    remainingMessages: null,
    dailyLimit: DEFAULT_DAILY_LIMIT,
    cooldownUntil: null,
    resetAt: null,
    statusMessage: null,
  });
  const [clockTick, setClockTick] = useState(() => Date.now());

  useDashboardBootstrap(userId);

  const session = useAssistantSessionStore(
    useCallback(
      (state) =>
        userId ? (state.sessions[userId] ?? EMPTY_SESSION) : EMPTY_SESSION,
      [userId],
    ),
  );

  const initializeSession = useAssistantSessionStore(
    (state) => state.initializeSession,
  );
  const setStoreInput = useAssistantSessionStore((state) => state.setInput);
  const setSending = useAssistantSessionStore((state) => state.setSending);
  const setError = useAssistantSessionStore((state) => state.setError);
  const appendMessages = useAssistantSessionStore(
    (state) => state.appendMessages,
  );
  const replaceMessage = useAssistantSessionStore(
    (state) => state.replaceMessage,
  );
  const removeMessage = useAssistantSessionStore(
    (state) => state.removeMessage,
  );
  const resetSession = useAssistantSessionStore((state) => state.resetSession);

  useEffect(() => {
    if (!userId) {
      return;
    }

    initializeSession(userId, buildInitialGreeting(user?.first_name));
  }, [initializeSession, user?.first_name, userId]);

  useEffect(() => {
    if (!usageState.cooldownUntil) {
      return;
    }

    const interval = setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [usageState.cooldownUntil]);

  const cooldownRemaining = usageState.cooldownUntil
    ? Math.max(Math.ceil((usageState.cooldownUntil - clockTick) / 1000), 0)
    : 0;
  const remainingMessages = usageState.remainingMessages;
  const dailyLimit = usageState.dailyLimit;
  const resetAt = usageState.resetAt;
  const assistantStatusMessage = usageState.statusMessage;

  useEffect(() => {
    if (!usageState.cooldownUntil || cooldownRemaining > 0) {
      return;
    }

    setUsageState((current) =>
      current.cooldownUntil
        ? {
            ...current,
            cooldownUntil: null,
          }
        : current,
    );
  }, [cooldownRemaining, usageState.cooldownUntil]);

  const financialContext = useMemo(
    () =>
      buildAssistantContext({
        currencyCode: user?.currency_code,
        summary,
        budgets,
        spendingBreakdown,
        recentTransactions,
        goals,
        analytics,
      }),
    [
      analytics,
      budgets,
      goals,
      recentTransactions,
      spendingBreakdown,
      summary,
      user?.currency_code,
    ],
  );

  const submitPrompt = useCallback(
    async (rawValue: string, source: AssistantMessageSource) => {
      if (!userId || session.isSending || isOffline) {
        return;
      }

      const prompt = sanitizeAssistantInput(rawValue);
      if (!prompt) {
        return;
      }

      const userMessage = createMessage("user", prompt, "sent", source);
      const loadingMessage = createMessage(
        "assistant",
        "Thinking...",
        "loading",
        "system",
      );

      setStoreInput(userId, "");
      setError(userId, null);
      setSending(userId, true);
      appendMessages(userId, [userMessage, loadingMessage]);

      try {
        const result = await askAssistant({
          messages: toConversationWindow([...session.messages, userMessage]),
          financialContext,
          requestMeta: {
            screen: "assistant",
            source,
            localTimestamp: new Date().toISOString(),
          },
        });

        setUsageState((current) => ({
          remainingMessages:
            typeof result.remainingMessages === "number"
              ? result.remainingMessages
              : current.remainingMessages,
          dailyLimit:
            typeof result.dailyLimit === "number"
              ? result.dailyLimit
              : current.dailyLimit,
          cooldownUntil: null,
          resetAt: result.resetAt ?? current.resetAt,
          statusMessage: null,
        }));

        replaceMessage(
          userId,
          loadingMessage.id,
          createMessage(
            "assistant",
            sanitizeAssistantInput(result.reply, 1_500) ||
              ASSISTANT_FALLBACK_ERROR_MESSAGE,
            "sent",
            "system",
          ),
        );
      } catch (error) {
        removeMessage(userId, loadingMessage.id);
        const assistantError =
          error instanceof AssistantFunctionError ? error : null;
        const message =
          assistantError?.message?.trim() ||
          (error instanceof Error && error.message.trim()
            ? error.message
            : ASSISTANT_FALLBACK_ERROR_MESSAGE);

        setUsageState((current) => ({
          remainingMessages:
            typeof assistantError?.remainingMessages === "number"
              ? assistantError.remainingMessages
              : current.remainingMessages,
          dailyLimit:
            typeof assistantError?.dailyLimit === "number"
              ? assistantError.dailyLimit
              : current.dailyLimit,
          cooldownUntil:
            typeof assistantError?.cooldownRemaining === "number" &&
            assistantError.cooldownRemaining > 0
              ? Date.now() + assistantError.cooldownRemaining * 1000
              : current.cooldownUntil,
          resetAt: assistantError?.resetAt ?? current.resetAt,
          statusMessage: message,
        }));

        appendMessages(userId, [
          createMessage("assistant", message, "error", "system"),
        ]);
        setError(userId, message);
      } finally {
        setSending(userId, false);
      }
    },
    [
      appendMessages,
      financialContext,
      isOffline,
      removeMessage,
      replaceMessage,
      session.isSending,
      session.messages,
      setError,
      setSending,
      setStoreInput,
      userId,
    ],
  );

  const setInput = useCallback(
    (value: string) => {
      if (!userId) {
        return;
      }

      setStoreInput(userId, value);
    },
    [setStoreInput, userId],
  );

  const sendMessage = useCallback(
    async (value?: string) => {
      await submitPrompt(value ?? session.input, "manual");
    },
    [session.input, submitPrompt],
  );

  const sendSuggestion = useCallback(
    async (prompt: string) => {
      await submitPrompt(prompt, "suggestion");
    },
    [submitPrompt],
  );

  const reset = useCallback(() => {
    if (!userId) {
      return;
    }

    resetSession(userId, buildInitialGreeting(user?.first_name));
  }, [resetSession, user?.first_name, userId]);

  return {
    messages: session.messages,
    input: session.input,
    setInput,
    sendMessage,
    sendSuggestion,
    isSending: session.isSending,
    isOffline,
    error: session.error,
    remainingMessages,
    dailyLimit,
    cooldownRemaining,
    resetAt,
    assistantStatusMessage,
    resetSession: reset,
  } as const;
}
