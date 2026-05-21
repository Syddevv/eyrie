import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("VITE_GROQ_API_KEY") ?? "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const REQUEST_TIMEOUT_MS = 20_000;
const DEBUG_ERRORS =
  (Deno.env.get("ASSISTANT_DEBUG_ERRORS") ?? "true") === "true";

type AssistantRequest = {
  messages?: Array<{
    role?: "user" | "assistant";
    text?: string;
  }>;
  financialContext?: Record<string, unknown>;
  requestMeta?: Record<string, unknown>;
};

type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type UpstreamAttemptResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  payload: unknown;
  model: string;
  parsedErrorMessage: string | null;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeInput(value: string, maxLength = 600) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function truncate(value: string, maxLength = 1_500) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function stringifyContext(financialContext: Record<string, unknown>) {
  const summary = (financialContext.summary ?? {}) as Record<string, unknown>;
  const period = (financialContext.currentPeriod ?? {}) as Record<string, unknown>;
  const budgets = Array.isArray(financialContext.budgets)
    ? financialContext.budgets
    : [];
  const categories = Array.isArray(financialContext.categories)
    ? financialContext.categories
    : [];
  const transactions = Array.isArray(financialContext.recentTransactions)
    ? financialContext.recentTransactions
    : [];
  const goals = (financialContext.goals ?? {}) as Record<string, unknown>;
  const insights = Array.isArray(financialContext.insights)
    ? financialContext.insights
    : [];

  return [
    `Currency: ${financialContext.currencyCode ?? "PHP"}`,
    `Summary: balance=${summary.totalBalance ?? 0}, income=${summary.totalIncome ?? 0}, expenses=${summary.totalExpenses ?? 0}, cash_flow=${summary.netCashFlow ?? 0}`,
    `Current period: ${period.label ?? "This Month"}, income=${period.totalIncome ?? 0}, expenses=${period.totalExpenses ?? 0}, net_savings=${period.netSavings ?? 0}, top_category=${period.topCategory ?? "none"}, budget_health=${period.budgetHealthTone ?? "Unknown"} (${period.budgetHealthScore ?? 0})`,
    `Budgets: ${
      budgets.length
        ? budgets
            .map((item) => {
              const budget = item as Record<string, unknown>;
              return `${budget.title ?? "Budget"} ${budget.progress ?? 0}% ${budget.status ?? "healthy"}`;
            })
            .join("; ")
        : "none"
    }`,
    `Categories: ${
      categories.length
        ? categories
            .map((item) => {
              const category = item as Record<string, unknown>;
              return `${category.name ?? "Uncategorized"}=${category.total ?? 0}`;
            })
            .join("; ")
        : "none"
    }`,
    `Recent transactions: ${
      transactions.length
        ? transactions
            .map((item) => {
              const transaction = item as Record<string, unknown>;
              return `${transaction.typeLabel ?? "Entry"} ${transaction.amountLabel ?? ""} ${transaction.merchant ?? "Unknown"} (${transaction.category ?? "Uncategorized"}, ${transaction.dateLabel ?? "recent"})`;
            })
            .join("; ")
        : "none"
    }`,
    `Goals: active=${goals.activeGoalsCount ?? 0}, completed=${goals.completedGoalsCount ?? 0}, saved=${goals.totalSaved ?? 0}, target=${goals.totalTarget ?? 0}`,
    `Insights: ${insights.length ? insights.join(" | ") : "none"}`,
  ].join("\n");
}

function extractReply(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const choices = (payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  }).choices;
  const content = choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim() || null;
  }

  return null;
}

function extractUpstreamErrorMessage(payload: unknown, text: string) {
  if (payload && typeof payload === "object") {
    const errorValue = (payload as Record<string, unknown>).error;
    if (typeof errorValue === "string" && errorValue.trim()) {
      return errorValue.trim();
    }

    if (errorValue && typeof errorValue === "object") {
      const nestedMessage = (errorValue as Record<string, unknown>).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage.trim();
      }
      const nestedType = (errorValue as Record<string, unknown>).type;
      if (typeof nestedType === "string" && nestedType.trim()) {
        return nestedType.trim();
      }
    }

    const directMessage = (payload as Record<string, unknown>).message;
    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage.trim();
    }
  }

  const trimmed = text.trim();
  return trimmed ? truncate(trimmed, 400) : null;
}

function shouldRetryWithFallbackModel(status: number, errorMessage: string | null) {
  const normalized = (errorMessage ?? "").toLowerCase();
  return (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    normalized.includes("model") ||
    normalized.includes("unsupported") ||
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("access") ||
    normalized.includes("permission")
  );
}

function buildGroqMessages(input: {
  financialContext: Record<string, unknown>;
  messages: Array<{
    role: "assistant" | "user";
    text: string;
  }>;
}) {
  return [
    {
      role: "system",
      content: [
        "You are Eyrie, a concise personal finance assistant inside a mobile expense and budget tracker.",
        "Use the provided financial context first.",
        "Be practical, supportive, and specific.",
        "Keep answers short to medium length.",
        "Avoid markdown tables.",
        "Do not invent transactions or data that were not provided.",
        "Do not provide legal, tax, or investment advice beyond general educational guidance.",
        "",
        "User financial context:",
        stringifyContext(input.financialContext),
      ].join("\n"),
    },
    ...input.messages.map((message) => ({
      role: message.role,
      content: message.text,
    })),
  ] satisfies GroqChatMessage[];
}

async function callGroqChatCompletion(input: {
  model: string;
  messages: GroqChatMessage[];
  signal: AbortSignal;
}) {
  const requestBody = {
    model: input.model,
    messages: input.messages,
    temperature: 0.7,
  };

  const bodyText = JSON.stringify(requestBody);
  const promptSize = input.messages.reduce(
    (sum, item) => sum + item.content.length,
    0,
  );

  console.log(
    `[assistant-chat] upstream request provider=groq model=${input.model} prompt_chars=${promptSize} body_bytes=${bodyText.length} message_count=${input.messages.length}`,
  );

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: bodyText,
    signal: input.signal,
  });

  const upstreamText = await upstream.text();
  const upstreamPayload = safeJsonParse(upstreamText);
  const parsedErrorMessage = extractUpstreamErrorMessage(
    upstreamPayload,
    upstreamText,
  );

  console.log(
    `[assistant-chat] upstream response provider=groq status=${upstream.status} statusText=${upstream.statusText} model=${input.model}`,
  );

  if (!upstream.ok) {
    console.error(
      `[assistant-chat] upstream error provider=groq model=${input.model} status=${upstream.status} body=${truncate(upstreamText)}`,
    );
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    statusText: upstream.statusText,
    text: upstreamText,
    payload: upstreamPayload,
    model: input.model,
    parsedErrorMessage,
  } satisfies UpstreamAttemptResult;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GROQ_API_KEY) {
    return jsonResponse(500, { error: "Groq API is not configured." });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(500, {
      error: "Supabase environment is not configured.",
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, {
        error: "You need to be signed in to use the AI assistant.",
      });
    }

    const body = (await request.json()) as AssistantRequest;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const financialContext =
      body.financialContext && typeof body.financialContext === "object"
        ? body.financialContext
        : {};

    const messages = rawMessages
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        text: sanitizeInput(message.text ?? ""),
      }))
      .filter((message) => message.text.length > 0)
      .slice(-12);

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return jsonResponse(400, {
        error: "Please enter a message before sending.",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const groqMessages = buildGroqMessages({
        financialContext,
        messages,
      });

      const modelCandidates = Array.from(
        new Set([
          GROQ_MODEL,
          "llama-3.1-8b-instant",
          "llama-3.3-70b-versatile",
          "meta-llama/llama-4-scout-17b-16e-instruct",
        ]),
      ).filter(Boolean);

      let upstreamResult: UpstreamAttemptResult | null = null;

      for (const model of modelCandidates) {
        upstreamResult = await callGroqChatCompletion({
          model,
          messages: groqMessages,
          signal: controller.signal,
        });

        if (upstreamResult.ok) {
          break;
        }

        if (
          !shouldRetryWithFallbackModel(
            upstreamResult.status,
            upstreamResult.parsedErrorMessage,
          )
        ) {
          break;
        }
      }

      if (!upstreamResult) {
        return jsonResponse(502, {
          error: "No upstream response was received from Groq.",
        });
      }

      if (!upstreamResult.ok) {
        return jsonResponse(502, {
          error:
            upstreamResult.parsedErrorMessage ??
            "The Groq service is temporarily unavailable. Please try again later.",
          upstream_status: upstreamResult.status,
          upstream_status_text: upstreamResult.statusText,
          upstream_model: upstreamResult.model,
          details: DEBUG_ERRORS ? truncate(upstreamResult.text) : null,
        });
      }

      const reply = extractReply(upstreamResult.payload);

      console.log(
        `[assistant-chat] parsed response provider=groq model=${upstreamResult.model} reply_chars=${reply?.length ?? 0}`,
      );

      if (!reply) {
        return jsonResponse(502, {
          error: "Groq returned an empty or malformed response. Please try again.",
          upstream_model: upstreamResult.model,
          details: DEBUG_ERRORS ? truncate(upstreamResult.text) : null,
        });
      }

      return jsonResponse(200, {
        reply,
        model: upstreamResult.model,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return jsonResponse(504, {
          error: "The AI assistant took too long to respond. Please try again.",
        });
      }

      console.error("[assistant-chat] uncaught upstream error", error);
      return jsonResponse(502, {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "The Groq service is temporarily unavailable. Please try again later.",
        details: DEBUG_ERRORS
          ? error instanceof Error
            ? String(error.stack ?? error.message)
            : String(error)
          : null,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[assistant-chat] request processing error", error);
    return jsonResponse(500, {
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "The assistant request could not be processed. Please try again.",
      details: DEBUG_ERRORS
        ? error instanceof Error
          ? String(error.stack ?? error.message)
          : String(error)
        : null,
    });
  }
});
