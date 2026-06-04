// @ts-nocheck
/// <reference lib="deno.ns" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_CONVERSATION_MESSAGES = 12;
const FREE_DAILY_MESSAGE_LIMIT = 20;
const COOLDOWN_SECONDS = 3;
const AI_USAGE_LIMIT_MESSAGE = "AI assistant limit reached.";
const AI_COOLDOWN_MESSAGE =
  "You're sending messages too quickly. Please wait a few seconds before trying again.";

// TODO: extend this per-user tracker with cooldowns, daily quotas, token accounting, and abuse detection.
const requestTracker = new Map<
  string,
  {
    userId: string;
    requestCount: number;
    lastRequestAt: string;
    lastDurationMs?: number;
    lastErrorType?: string;
    tokenUsage?: number;
  }
>();

type AssistantRequest = {
  message?: string;
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

type AiUsageRow = {
  user_id: string;
  plan_tier: string;
  daily_limit: number;
  message_count: number;
  reserved_count: number;
  last_reset: string;
  last_request_at: string | null;
  limit_reset_at: string | null;
  created_at: string;
  updated_at: string;
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

function safeErrorResponse(status: number, error: string) {
  return jsonResponse(status, { error });
}

function sanitizeInput(value: string, maxLength = 600) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function truncate(value: string, maxLength = 1_500) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function normalizeUsageRow(
  row: Partial<AiUsageRow> | null,
  userId: string,
  currentDate: string,
): AiUsageRow {
  const now = new Date().toISOString();

  return {
    user_id: typeof row?.user_id === "string" ? row.user_id : userId,
    plan_tier:
      typeof row?.plan_tier === "string" && row.plan_tier.trim()
        ? row.plan_tier.trim()
        : "free",
    daily_limit:
      typeof row?.daily_limit === "number" && row.daily_limit > 0
        ? row.daily_limit
        : FREE_DAILY_MESSAGE_LIMIT,
    message_count:
      typeof row?.message_count === "number" && row.message_count >= 0
        ? row.message_count
        : 0,
    reserved_count:
      typeof row?.reserved_count === "number" && row.reserved_count >= 0
        ? row.reserved_count
        : 0,
    last_reset:
      typeof row?.last_reset === "string" && row.last_reset.trim()
        ? row.last_reset.trim()
        : currentDate,
    last_request_at:
      typeof row?.last_request_at === "string" && row.last_request_at.trim()
        ? row.last_request_at.trim()
        : null,
    limit_reset_at:
      typeof row?.limit_reset_at === "string" && row.limit_reset_at.trim()
        ? row.limit_reset_at.trim()
        : null,
    created_at:
      typeof row?.created_at === "string" && row.created_at.trim()
        ? row.created_at.trim()
        : now,
    updated_at:
      typeof row?.updated_at === "string" && row.updated_at.trim()
        ? row.updated_at.trim()
        : now,
  };
}

function usageWindowExpired(row: AiUsageRow, now = new Date()) {
  if (!row.limit_reset_at) {
    return false;
  }

  const resetAt = new Date(row.limit_reset_at);
  if (Number.isNaN(resetAt.getTime())) {
    return false;
  }

  return resetAt.getTime() <= now.getTime();
}

function getUsedDailyMessages(row: AiUsageRow, now = new Date()) {
  if (usageWindowExpired(row, now)) {
    return 0;
  }

  return Math.max(row.message_count + row.reserved_count, 0);
}

function getRemainingDailyMessages(row: AiUsageRow, now = new Date()) {
  if (usageWindowExpired(row, now)) {
    return row.daily_limit;
  }

  return Math.max(row.daily_limit - getUsedDailyMessages(row, now), 0);
}

function usageMetadata(row: AiUsageRow) {
  return {
    planTier: row.plan_tier,
    dailyLimit: row.daily_limit,
    messageCount: row.message_count,
    reservedCount: row.reserved_count,
    remainingDailyMessages: getRemainingDailyMessages(row),
    lastReset: row.last_reset,
    lastRequestAt: row.last_request_at,
    resetAt: row.limit_reset_at,
  };
}

function cooldownRemainingSeconds(row: AiUsageRow, now = new Date()) {
  if (!row.last_request_at) {
    return 0;
  }

  const lastRequestAt = new Date(row.last_request_at);
  if (Number.isNaN(lastRequestAt.getTime())) {
    return 0;
  }

  const elapsedSeconds = (now.getTime() - lastRequestAt.getTime()) / 1000;
  if (elapsedSeconds >= COOLDOWN_SECONDS) {
    return 0;
  }

  return Math.max(COOLDOWN_SECONDS - Math.floor(elapsedSeconds), 1);
}

function usageResponseMetadata(row: AiUsageRow) {
  return {
    reply: undefined,
    remainingMessages: getRemainingDailyMessages(row),
    dailyLimit: row.daily_limit,
    resetAt: row.limit_reset_at,
    messageCount: row.message_count,
    reservedCount: row.reserved_count,
    lastReset: row.last_reset,
    lastRequestAt: row.last_request_at,
  };
}

function logUsageSnapshot(args: {
  requestId: string;
  userId: string;
  source: "status" | "reset" | "limit_reached";
  row: AiUsageRow;
}) {
  console.log(
    JSON.stringify({
      scope: "ai-chat",
      requestId: args.requestId,
      userId: args.userId,
      event: "usage_snapshot",
      source: args.source,
      messageCount: args.row.message_count,
      reservedCount: args.row.reserved_count,
      dailyLimit: args.row.daily_limit,
      lastReset: args.row.last_reset,
      resetAt: args.row.limit_reset_at,
      timestamp: new Date().toISOString(),
    }),
  );
}

function stringifyContext(financialContext: Record<string, unknown>) {
  const summary = (financialContext.summary ?? {}) as Record<string, unknown>;
  const budgetsSummary = (financialContext.budgetsSummary ?? {}) as Record<
    string,
    unknown
  >;
  const period = (financialContext.currentPeriod ?? {}) as Record<
    string,
    unknown
  >;
  const budgets = Array.isArray(financialContext.budgets)
    ? financialContext.budgets
    : [];
  const budgetedCategories = Array.isArray(financialContext.budgetedCategories)
    ? financialContext.budgetedCategories
    : [];
  const categories = Array.isArray(financialContext.categories)
    ? financialContext.categories
    : [];
  const transactions = Array.isArray(financialContext.recentTransactions)
    ? financialContext.recentTransactions
    : [];
  const goals = (financialContext.goals ?? {}) as Record<string, unknown>;
  const goalItems = Array.isArray(goals.items) ? goals.items : [];
  const insights = Array.isArray(financialContext.insights)
    ? financialContext.insights
    : [];

  return [
    `Currency: ${financialContext.currencyCode ?? "PHP"}`,
    `Summary: balance=${summary.totalBalance ?? 0}, income=${summary.totalIncome ?? 0}, expenses=${summary.totalExpenses ?? 0}, cash_flow=${summary.netCashFlow ?? 0}`,
    `Current period: ${period.label ?? "This Month"}, income=${period.totalIncome ?? 0}, expenses=${period.totalExpenses ?? 0}, net_savings=${period.netSavings ?? 0}, top_category=${period.topCategory ?? "none"}, budget_health=${period.budgetHealthTone ?? "Unknown"} (${period.budgetHealthScore ?? 0})`,
    `Budget totals: active=${budgetsSummary.activeBudgetCount ?? 0}, total_budgeted=${budgetsSummary.totalBudgeted ?? 0}, total_spent=${budgetsSummary.totalSpent ?? 0}, total_remaining=${budgetsSummary.totalRemaining ?? 0}`,
    `Budgeted categories: ${
      budgetedCategories.length ? budgetedCategories.join("; ") : "none"
    }`,
    `Budgets: ${
      budgets.length
        ? budgets
            .map((item) => {
              const budget = item as Record<string, unknown>;
              return `${budget.categoryName ?? budget.title ?? "Budget"} amount=${budget.amount ?? 0} spent=${budget.spent ?? 0} remaining=${budget.remaining ?? 0} progress=${budget.progressPercent ?? 0}% status=${budget.status ?? "healthy"}`;
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
    `Goals: active=${goals.activeGoalsCount ?? 0}, completed=${goals.completedGoalsCount ?? 0}, saved=${goals.totalSaved ?? 0}, target=${goals.totalTarget ?? 0}, remaining=${goals.totalRemaining ?? 0}`,
    `Goal items: ${
      goalItems.length
        ? goalItems
            .map((item) => {
              const goal = item as Record<string, unknown>;
              return `${goal.title ?? "Goal"} saved=${goal.currentAmount ?? 0} target=${goal.targetAmount ?? 0} remaining=${goal.remaining ?? 0} progress=${goal.progressPercent ?? 0}% completed=${goal.isCompleted ? "yes" : "no"}`;
            })
            .join("; ")
        : "none"
    }`,
    `Insights: ${insights.length ? insights.join(" | ") : "none"}`,
  ].join("\n");
}

function normalizeMessages(input: AssistantRequest) {
  const rawMessages = Array.isArray(input.messages) ? input.messages : [];
  const messages = rawMessages
    .map((message) => ({
      role:
        message.role === "assistant"
          ? ("assistant" as const)
          : ("user" as const),
      text: sanitizeInput(message.text ?? ""),
    }))
    .filter((message) => message.text.length > 0)
    .slice(-MAX_CONVERSATION_MESSAGES);

  const fallbackMessage = sanitizeInput(input.message ?? "");
  if (!messages.length && fallbackMessage) {
    messages.push({ role: "user", text: fallbackMessage });
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  return {
    messages,
    latestUserMessage: latestUserMessage?.text ?? fallbackMessage,
    financialContext:
      input.financialContext && typeof input.financialContext === "object"
        ? input.financialContext
        : {},
  };
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
        "When the user asks about budgets or goals, answer from the exact numeric values in the context before giving advice.",
        "Treat only categories listed under 'Budgeted categories' or 'Budgets' as having a budget set.",
        "Do not say a category has no budget if that category appears in the budget list, even if it also appears in the spending categories list.",
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

function extractReply(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const choices = (
    payload as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    }
  ).choices;
  const content = choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim() || null;
  }

  return null;
}

function extractTokenUsage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const usage = (payload as { usage?: { total_tokens?: unknown } }).usage;
  return typeof usage?.total_tokens === "number" ? usage.total_tokens : null;
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

function shouldRetryWithFallbackModel(
  status: number,
  errorMessage: string | null,
) {
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

function logRequestLifecycle(entry: {
  requestId: string;
  userId: string;
  event: string;
  durationMs?: number;
  errorType?: string;
  tokenUsage?: number | null;
}) {
  console.log(
    JSON.stringify({
      scope: "ai-chat",
      requestId: entry.requestId,
      userId: entry.userId,
      event: entry.event,
      durationMs: entry.durationMs,
      errorType: entry.errorType,
      tokenUsage: entry.tokenUsage,
      timestamp: new Date().toISOString(),
    }),
  );
}

function recordRequestStart(userId: string, requestId: string) {
  const now = new Date().toISOString();
  const current = requestTracker.get(userId);

  requestTracker.set(userId, {
    userId,
    requestCount: (current?.requestCount ?? 0) + 1,
    lastRequestAt: now,
    lastDurationMs: current?.lastDurationMs,
    lastErrorType: current?.lastErrorType,
    tokenUsage: current?.tokenUsage,
  });

  logRequestLifecycle({ requestId, userId, event: "request_started" });
}

function recordRequestEnd(args: {
  userId: string;
  requestId: string;
  durationMs: number;
  errorType?: string;
  tokenUsage?: number | null;
}) {
  const current = requestTracker.get(args.userId);

  requestTracker.set(args.userId, {
    userId: args.userId,
    requestCount: current?.requestCount ?? 1,
    lastRequestAt: new Date().toISOString(),
    lastDurationMs: args.durationMs,
    lastErrorType: args.errorType,
    tokenUsage:
      typeof args.tokenUsage === "number"
        ? args.tokenUsage
        : current?.tokenUsage,
  });

  logRequestLifecycle({
    requestId: args.requestId,
    userId: args.userId,
    event: args.errorType ? "request_failed" : "request_completed",
    durationMs: args.durationMs,
    errorType: args.errorType,
    tokenUsage: args.tokenUsage,
  });
}

function selectUsageFields(client: ReturnType<typeof createClient>) {
  return client
    .from("ai_usage")
    .select(
      "user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset, last_request_at, limit_reset_at, created_at, updated_at",
    );
}

async function fetchOrCreateUsageRow(
  client: ReturnType<typeof createClient>,
  userId: string,
  currentDate: string,
) {
  const { data, error } = await selectUsageFields(client)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const insertResult = await client
      .from("ai_usage")
      .insert({
        user_id: userId,
        plan_tier: "free",
        daily_limit: FREE_DAILY_MESSAGE_LIMIT,
        message_count: 0,
        reserved_count: 0,
        last_reset: currentDate,
        last_request_at: null,
        limit_reset_at: null,
      })
      .select(
        "user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset, last_request_at, limit_reset_at, created_at, updated_at",
      )
      .maybeSingle();

    if (insertResult.error) {
      if (insertResult.error.code !== "23505") {
        throw insertResult.error;
      }

      const retry = await selectUsageFields(client)
        .eq("user_id", userId)
        .maybeSingle();
      if (retry.error) {
        throw retry.error;
      }

      const canonicalRow = await ensureCanonicalDailyLimit(
        client,
        normalizeUsageRow(retry.data ?? null, userId, currentDate),
      );
      return resetUsageWindowIfExpired(client, canonicalRow, currentDate);
    }

    const canonicalRow = await ensureCanonicalDailyLimit(
      client,
      normalizeUsageRow(insertResult.data ?? null, userId, currentDate),
    );
    return resetUsageWindowIfExpired(client, canonicalRow, currentDate);
  }

  const canonicalRow = await ensureCanonicalDailyLimit(
    client,
    normalizeUsageRow(data, userId, currentDate),
  );
  return resetUsageWindowIfExpired(client, canonicalRow, currentDate);
}

async function ensureCanonicalDailyLimit(
  client: ReturnType<typeof createClient>,
  row: AiUsageRow,
) {
  if (row.daily_limit === FREE_DAILY_MESSAGE_LIMIT) {
    return row;
  }

  const { data, error } = await client
    .from("ai_usage")
    .update({
      daily_limit: FREE_DAILY_MESSAGE_LIMIT,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id)
    .neq("daily_limit", FREE_DAILY_MESSAGE_LIMIT)
    .select(
      "user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset, last_request_at, limit_reset_at, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUsageRow(
    (data as Partial<AiUsageRow> | null) ??
      {
        ...row,
        daily_limit: FREE_DAILY_MESSAGE_LIMIT,
      },
    row.user_id,
    row.last_reset,
  );
}

async function resetUsageWindowIfExpired(
  client: ReturnType<typeof createClient>,
  row: AiUsageRow,
  currentDate: string,
) {
  if (!usageWindowExpired(row)) {
    return row;
  }

  const nextUpdatedAt = new Date().toISOString();
  const { data, error } = await client
    .from("ai_usage")
    .update({
      message_count: 0,
      reserved_count: 0,
      last_reset: currentDate,
      last_request_at: null,
      limit_reset_at: null,
      updated_at: nextUpdatedAt,
    })
    .eq("user_id", row.user_id)
    .select(
      "user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset, last_request_at, limit_reset_at, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUsageRow(
    (data as Partial<AiUsageRow> | null) ?? {
      ...row,
      message_count: 0,
      reserved_count: 0,
      last_reset: currentDate,
      last_request_at: null,
      limit_reset_at: null,
      updated_at: nextUpdatedAt,
    },
    row.user_id,
    currentDate,
  );
}

async function reserveUsageSlot(
  client: ReturnType<typeof createClient>,
  limit: number,
) {
  const { data, error } = await client.rpc("reserve_ai_usage_slot", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ? (data as AiUsageRow) : null;
}

async function finalizeUsageSlot(
  client: ReturnType<typeof createClient>,
  increment: boolean,
) {
  const { data, error } = await client.rpc("finalize_ai_usage_slot", {
    p_increment: increment,
  });

  if (error) {
    throw error;
  }

  return data ? (data as AiUsageRow) : null;
}

async function releaseUsageSlot(client: ReturnType<typeof createClient>) {
  return finalizeUsageSlot(client, false);
}

function appendUsageMetadata(
  payload: Record<string, unknown>,
  row: AiUsageRow,
) {
  return {
    ...payload,
    usage: usageMetadata(row),
  };
}

async function callGroqChatCompletion(input: {
  model: string;
  messages: GroqChatMessage[];
  signal: AbortSignal;
}) {
  const upstream = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: input.signal,
    },
  );

  const text = await upstream.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    statusText: upstream.statusText,
    text,
    payload,
    model: input.model,
    parsedErrorMessage: extractUpstreamErrorMessage(payload, text),
  };
}

Deno.serve(async (request: Request) => {
  const startedAt = performance.now();
  const requestId = globalThis.crypto.randomUUID();
  const authHeader = request.headers.get("Authorization");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!authHeader) {
    return safeErrorResponse(
      401,
      "You need to be signed in to use the AI assistant.",
    );
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[ai-chat] missing Supabase environment", {
      hasUrl: Boolean(SUPABASE_URL),
      hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    });
    return safeErrorResponse(
      500,
      "The AI assistant is temporarily unavailable.",
    );
  }

  if (!GROQ_API_KEY) {
    console.error("[ai-chat] missing Groq configuration");
    return safeErrorResponse(
      500,
      "The AI assistant is temporarily unavailable.",
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[ai-chat] auth validation failed", {
        requestId,
        errorType: authError?.name ?? "unauthenticated",
      });
      return safeErrorResponse(
        401,
        "You need to be signed in to use the AI assistant.",
      );
    }

    recordRequestStart(user.id, requestId);

    if (request.method === "GET") {
      const currentDate = new Date().toISOString().slice(0, 10);

      try {
        const usageRow = await fetchOrCreateUsageRow(
          supabase,
          user.id,
          currentDate,
        );
        const cooldownRemaining = cooldownRemainingSeconds(usageRow);
        logUsageSnapshot({
          requestId,
          userId: user.id,
          source: "status",
          row: usageRow,
        });

        return jsonResponse(200, {
          ...usageResponseMetadata(usageRow),
          cooldownRemaining,
        });
      } catch (error) {
        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "usage_status_failed",
        });
        console.error("[ai-chat] usage status failed", {
          requestId,
          userId: user.id,
          error,
        });
        return safeErrorResponse(
          500,
          "The AI assistant is temporarily unavailable.",
        );
      }
    }

    let body: AssistantRequest;
    try {
      body = (await request.json()) as AssistantRequest;
    } catch (error) {
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType: "invalid_json",
      });
      console.error("[ai-chat] invalid JSON body", {
        requestId,
        userId: user.id,
        error,
      });
      return safeErrorResponse(
        400,
        "The assistant request could not be processed.",
      );
    }

    const requestAction =
      body.requestMeta &&
      typeof body.requestMeta === "object" &&
      typeof (body.requestMeta as Record<string, unknown>).action === "string"
        ? ((body.requestMeta as Record<string, unknown>).action as string)
        : null;

    if (requestAction === "status") {
      const currentDate = new Date().toISOString().slice(0, 10);

      try {
        const usageRow = await fetchOrCreateUsageRow(
          supabase,
          user.id,
          currentDate,
        );
        const cooldownRemaining = cooldownRemainingSeconds(usageRow);
        logUsageSnapshot({
          requestId,
          userId: user.id,
          source: "status",
          row: usageRow,
        });

        return jsonResponse(200, {
          ...usageResponseMetadata(usageRow),
          cooldownRemaining,
        });
      } catch (error) {
        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "usage_status_failed",
        });
        console.error("[ai-chat] usage status failed", {
          requestId,
          userId: user.id,
          error,
        });
        return safeErrorResponse(
          500,
          "The AI assistant is temporarily unavailable.",
        );
      }
    }

    const { messages, latestUserMessage, financialContext } =
      normalizeMessages(body);

    if (!latestUserMessage) {
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType: "missing_message",
      });
      return safeErrorResponse(400, "Please enter a message before sending.");
    }

    const currentDate = new Date().toISOString().slice(0, 10);

    let usageRowForRequest: AiUsageRow | null = null;
    try {
      const usageRow = await fetchOrCreateUsageRow(supabase, user.id, currentDate);
      usageRowForRequest = usageRow;

      const cooldownRemaining = cooldownRemainingSeconds(usageRow);
      if (cooldownRemaining > 0) {
        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "cooldown_active",
        });
        return jsonResponse(429, {
          error: AI_COOLDOWN_MESSAGE,
          cooldownRemaining,
          ...usageResponseMetadata(usageRow),
        });
      }
    } catch (error) {
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType: "usage_lookup_failed",
      });
      console.error("[ai-chat] usage lookup failed", {
        requestId,
        userId: user.id,
        error,
      });
      return safeErrorResponse(
        500,
        "The AI assistant is temporarily unavailable.",
      );
    }

    let reservedUsage: AiUsageRow | null = null;
    try {
      reservedUsage = await reserveUsageSlot(
        supabase,
        FREE_DAILY_MESSAGE_LIMIT,
      );
    } catch (error) {
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType: "usage_reservation_failed",
      });
      console.error("[ai-chat] usage reservation failed", {
        requestId,
        userId: user.id,
        error,
      });
      return safeErrorResponse(
        500,
        "The AI assistant is temporarily unavailable.",
      );
    }

    if (!reservedUsage) {
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType: "usage_limit_exceeded",
      });
      const usageRow = await fetchOrCreateUsageRow(
        supabase,
        user.id,
        currentDate,
      )
        .catch(() => null);
      if (usageRow?.limit_reset_at) {
        logUsageSnapshot({
          requestId,
          userId: user.id,
          source: "limit_reached",
          row: usageRow,
        });
      }
      return jsonResponse(429, {
        error: AI_USAGE_LIMIT_MESSAGE,
        ...(usageRow
          ? usageResponseMetadata(usageRow)
          : {
              remainingMessages: 0,
              dailyLimit: FREE_DAILY_MESSAGE_LIMIT,
              resetAt: null,
              messageCount: null,
              reservedCount: null,
              lastReset: currentDate,
              lastRequestAt: null,
            }),
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const groqMessages = buildGroqMessages({ financialContext, messages });
      const modelCandidates = Array.from(
        new Set([
          GROQ_MODEL,
          "llama-3.1-8b-instant",
          "llama-3.3-70b-versatile",
          "meta-llama/llama-4-scout-17b-16e-instruct",
        ]),
      ).filter(Boolean);

      let upstreamResult: Awaited<
        ReturnType<typeof callGroqChatCompletion>
      > | null = null;

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
        await releaseUsageSlot(supabase).catch((releaseError) => {
          console.error(
            "[ai-chat] usage release failed after missing upstream",
            {
              requestId,
              userId: user.id,
              releaseError,
            },
          );
        });

        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "no_upstream_response",
        });
        return safeErrorResponse(
          502,
          "The AI service is temporarily unavailable.",
        );
      }

      if (!upstreamResult.ok) {
        await releaseUsageSlot(supabase).catch((releaseError) => {
          console.error("[ai-chat] usage release failed after upstream error", {
            requestId,
            userId: user.id,
            releaseError,
          });
        });

        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: `groq_${upstreamResult.status}`,
        });

        console.error("[ai-chat] upstream error", {
          requestId,
          userId: user.id,
          status: upstreamResult.status,
          statusText: upstreamResult.statusText,
          model: upstreamResult.model,
          body: truncate(upstreamResult.text),
        });
        return safeErrorResponse(
          502,
          "The AI service is temporarily unavailable.",
        );
      }

      const reply = extractReply(upstreamResult.payload);
      const tokenUsage = extractTokenUsage(upstreamResult.payload);

      if (!reply) {
        await releaseUsageSlot(supabase).catch((releaseError) => {
          console.error(
            "[ai-chat] usage release failed after malformed response",
            {
              requestId,
              userId: user.id,
              releaseError,
            },
          );
        });

        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "malformed_response",
          tokenUsage,
        });
        console.error("[ai-chat] malformed upstream response", {
          requestId,
          userId: user.id,
          model: upstreamResult.model,
        });
        return safeErrorResponse(
          502,
          "The AI service returned an invalid response.",
        );
      }

      let finalizedUsage: AiUsageRow | null = null;
      try {
        finalizedUsage = await finalizeUsageSlot(supabase, true);
        if (usageRowForRequest && usageWindowExpired(usageRowForRequest)) {
          logUsageSnapshot({
            requestId,
            userId: user.id,
            source: "reset",
            row: finalizedUsage,
          });
        }
        if (
          reservedUsage &&
          finalizedUsage.limit_reset_at &&
          finalizedUsage.limit_reset_at !== reservedUsage.limit_reset_at
        ) {
          logUsageSnapshot({
            requestId,
            userId: user.id,
            source: "limit_reached",
            row: finalizedUsage,
          });
        }
      } catch (finalizeError) {
        await releaseUsageSlot(supabase).catch((releaseError) => {
          console.error(
            "[ai-chat] usage release failed after finalize failure",
            {
              requestId,
              userId: user.id,
              releaseError,
            },
          );
        });

        recordRequestEnd({
          userId: user.id,
          requestId,
          durationMs: performance.now() - startedAt,
          errorType: "usage_finalize_failed",
          tokenUsage,
        });
        console.error("[ai-chat] usage finalization failed", {
          requestId,
          userId: user.id,
          finalizeError,
        });
        return safeErrorResponse(
          500,
          "The AI assistant is temporarily unavailable.",
        );
      }

      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        tokenUsage,
      });

      console.log(
        JSON.stringify({
          scope: "ai-chat",
          requestId,
          userId: user.id,
          event: "parsed_response",
          model: upstreamResult.model,
          replyChars: reply.length,
          tokenUsage,
          timestamp: new Date().toISOString(),
        }),
      );

      return jsonResponse(200, {
        ...(upstreamResult.payload as Record<string, unknown>),
        reply: reply,
        ...usageResponseMetadata(finalizedUsage ?? reservedUsage),
      });
    } catch (error) {
      await releaseUsageSlot(supabase).catch((releaseError) => {
        console.error(
          "[ai-chat] usage release failed after upstream/timeout error",
          {
            requestId,
            userId: user.id,
            releaseError,
          },
        );
      });

      const errorType =
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "upstream_error";
      recordRequestEnd({
        userId: user.id,
        requestId,
        durationMs: performance.now() - startedAt,
        errorType,
      });

      if (error instanceof Error && error.name === "AbortError") {
        return safeErrorResponse(
          504,
          "The AI assistant took too long to respond. Please try again.",
        );
      }

      console.error("[ai-chat] uncaught upstream error", {
        requestId,
        userId: user.id,
        error,
      });
      return safeErrorResponse(
        502,
        "The AI service is temporarily unavailable.",
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[ai-chat] request processing error", { requestId, error });
    return safeErrorResponse(
      500,
      "The assistant request could not be processed.",
    );
  }
});
