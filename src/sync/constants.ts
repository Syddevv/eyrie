import type { SyncStatus, SyncableTable } from "./types";

export const SYNCABLE_TABLES: SyncableTable[] = [
  "users",
  "accounts",
  "categories",
  "merchants",
  "budgets",
  "saving_goals",
  "transactions",
  "goal_contributions",
];

export const ACTIVE_SYNC_STATUSES: SyncStatus[] = ["pending", "synced", "failed"];
export const INITIAL_SYNC_STATUS: SyncStatus = "synced";
export const RETRY_BACKOFF_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000] as const;
export const MAX_SYNC_BATCH_SIZE = 50;
