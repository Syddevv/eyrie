import { supabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";

import type { AssistantRequestInput, AssistantResponse } from "./types";

const REQUEST_TIMEOUT_MS = 20_000;
export const ASSISTANT_FALLBACK_ERROR_MESSAGE =
  "I couldn't reach the AI service right now. Please try again in a moment.";

function normalizeAssistantError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return ASSISTANT_FALLBACK_ERROR_MESSAGE;
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You need to be signed in to use the AI assistant.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/assistant-chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabasePublishableKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | AssistantResponse
      | {
          error?: string;
          message?: string;
          details?: string | null;
        }
      | null;

    if (!response.ok) {
      const errorMessage =
        payload && typeof payload === "object"
          ? payload.error ?? payload.message ?? ASSISTANT_FALLBACK_ERROR_MESSAGE
          : ASSISTANT_FALLBACK_ERROR_MESSAGE;
      const errorDetails =
        payload && typeof payload === "object" && "details" in payload
          ? payload.details
          : null;

      throw new Error(
        typeof errorDetails === "string" && errorDetails.trim()
          ? `${errorMessage} (${errorDetails})`
          : errorMessage,
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.reply !== "string"
    ) {
      throw new Error(ASSISTANT_FALLBACK_ERROR_MESSAGE);
    }

    return {
      reply: payload.reply.trim(),
    };
  } catch (error) {
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
