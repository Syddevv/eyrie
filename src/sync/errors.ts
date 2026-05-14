export type SyncErrorKind =
  | "offline"
  | "auth"
  | "schema"
  | "network"
  | "unknown";

export function normalizeSyncError(error: unknown, fallback: string) {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error || fallback;
  }

  if (typeof error === "object") {
    const details = [
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : null,
      typeof (error as { details?: unknown }).details === "string"
        ? (error as { details: string }).details
        : null,
      typeof (error as { hint?: unknown }).hint === "string"
        ? (error as { hint: string }).hint
        : null,
    ].filter(Boolean);

    if (details.length) {
      return details.join(" | ");
    }
  }

  return fallback;
}

export function classifySyncError(error: unknown): SyncErrorKind {
  const message = normalizeSyncError(error, "Sync failed.").toLowerCase();

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("timed out") ||
    message.includes("network")
  ) {
    return "offline";
  }

  if (
    message.includes("jwt") ||
    message.includes("auth") ||
    message.includes("session") ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "auth";
  }

  if (
    message.includes("no column named") ||
    message.includes("prepareSync") ||
    message.includes("sqlite") ||
    message.includes("schema")
  ) {
    return "schema";
  }

  return "unknown";
}

export function isRetryableSyncError(kind: SyncErrorKind) {
  return kind === "offline" || kind === "network" || kind === "unknown";
}
