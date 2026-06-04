import { supabase } from "@/lib/supabase";

import type {
  AssistantRequestInput,
  AssistantResponse,
  AssistantUsageStatus,
} from "./types";

const REQUEST_TIMEOUT_MS = 20_000;
export const ASSISTANT_FALLBACK_ERROR_MESSAGE =
  "I couldn't reach the AI service right now. Please try again in a moment.";

export class AssistantFunctionError extends Error {
  status?: number;
  remainingMessages?: number;
  dailyLimit?: number;
  cooldownRemaining?: number;
  resetAt?: string | null;
  messageCount?: number;
  reservedCount?: number;
  lastReset?: string | null;
  lastRequestAt?: string | null;

  constructor(
    message: string,
    options: {
      status?: number;
      remainingMessages?: number;
      dailyLimit?: number;
      cooldownRemaining?: number;
      resetAt?: string | null;
      messageCount?: number;
      reservedCount?: number;
      lastReset?: string | null;
      lastRequestAt?: string | null;
    } = {},
  ) {
    super(message);
    this.name = "AssistantFunctionError";
    this.status = options.status;
    this.remainingMessages = options.remainingMessages;
    this.dailyLimit = options.dailyLimit;
    this.cooldownRemaining = options.cooldownRemaining;
    this.resetAt = options.resetAt ?? null;
    this.messageCount = options.messageCount;
    this.reservedCount = options.reservedCount;
    this.lastReset = options.lastReset ?? null;
    this.lastRequestAt = options.lastRequestAt ?? null;
  }
}

function normalizeAssistantError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return ASSISTANT_FALLBACK_ERROR_MESSAGE;
}

function parseNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readFunctionError(error: unknown) {
  const response =
    error && typeof error === "object"
      ? ((error as { context?: unknown }).context as Response | undefined)
      : undefined;

  if (!(response instanceof Response)) {
    return null;
  }

  const text = await response
    .clone()
    .text()
    .catch(() => "");
  let payload: Record<string, unknown> | null = null;

  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    message:
      typeof payload?.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : text.trim() || ASSISTANT_FALLBACK_ERROR_MESSAGE,
    remainingMessages: parseNumber(payload?.remainingMessages),
    dailyLimit: parseNumber(payload?.dailyLimit),
    cooldownRemaining: parseNumber(payload?.cooldownRemaining),
    resetAt: parseString(payload?.resetAt) ?? null,
    messageCount: parseNumber(payload?.messageCount),
    reservedCount: parseNumber(payload?.reservedCount),
    lastReset: parseString(payload?.lastReset) ?? null,
    lastRequestAt: parseString(payload?.lastRequestAt) ?? null,
  };
}

export function sanitizeAssistantInput(value: string, maxLength = 600) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export async function askAssistant(
  input: AssistantRequestInput,
): Promise<AssistantResponse> {
  if (!supabase) {
    throw new Error(ASSISTANT_FALLBACK_ERROR_MESSAGE);
  }

  const userMessage =
    [...input.messages].reverse().find((message) => message.role === "user")
      ?.text ?? "";

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        message: userMessage,
        messages: input.messages,
        financialContext: input.financialContext,
        requestMeta: input.requestMeta,
      },
      signal: controller.signal,
    } as any);

    if (error) {
      console.error("AI Function Error:", error);
      const parsedError = await readFunctionError(error);

      if (parsedError) {
        throw new AssistantFunctionError(parsedError.message, parsedError);
      }

      throw error;
    }

    const aiReply = data?.reply ?? data?.choices?.[0]?.message?.content ?? "";

    if (!aiReply.trim()) {
      throw new Error(ASSISTANT_FALLBACK_ERROR_MESSAGE);
    }

    return {
      reply: aiReply.trim(),
      remainingMessages: parseNumber(data?.remainingMessages),
      dailyLimit: parseNumber(data?.dailyLimit),
      cooldownRemaining: parseNumber(data?.cooldownRemaining),
      resetAt: parseString(data?.resetAt) ?? null,
      messageCount: parseNumber(data?.messageCount),
      reservedCount: parseNumber(data?.reservedCount),
      lastReset: parseString(data?.lastReset) ?? null,
      lastRequestAt: parseString(data?.lastRequestAt) ?? null,
    };
  } catch (error) {
    if (error instanceof AssistantFunctionError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The AI assistant took too long to respond. Please try again.",
      );
    }

    throw new Error(normalizeAssistantError(error));
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAssistantUsageStatus(): Promise<AssistantUsageStatus> {
  if (!supabase) {
    throw new Error(ASSISTANT_FALLBACK_ERROR_MESSAGE);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        requestMeta: {
          action: "status",
        },
      },
      signal: controller.signal,
    } as any);

    if (error) {
      const parsedError = await readFunctionError(error);

      if (parsedError) {
        throw new AssistantFunctionError(parsedError.message, parsedError);
      }

      throw error;
    }

    return {
      remainingMessages: parseNumber(data?.remainingMessages),
      dailyLimit: parseNumber(data?.dailyLimit),
      cooldownRemaining: parseNumber(data?.cooldownRemaining),
      resetAt: parseString(data?.resetAt) ?? null,
      messageCount: parseNumber(data?.messageCount),
      reservedCount: parseNumber(data?.reservedCount),
      lastReset: parseString(data?.lastReset) ?? null,
      lastRequestAt: parseString(data?.lastRequestAt) ?? null,
    };
  } catch (error) {
    if (error instanceof AssistantFunctionError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The AI assistant took too long to respond. Please try again.",
      );
    }

    throw new Error(normalizeAssistantError(error));
  } finally {
    clearTimeout(timeout);
  }
}
