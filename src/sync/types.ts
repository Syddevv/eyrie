export type SyncStatus = "pending" | "synced" | "failed";
export type SyncOperation = "upsert" | "delete";
export type SyncRunReason =
  | "launch"
  | "login"
  | "foreground"
  | "reconnect"
  | "manual"
  | "background";
export type SyncableTable =
  | "users"
  | "accounts"
  | "categories"
  | "merchants"
  | "transactions"
  | "paylaters"
  | "paylater_payments"
  | "budgets"
  | "saving_goals"
  | "goal_contributions";

export type SyncMetadata = {
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
};

export type SyncUiState =
  | "idle"
  | "restoring"
  | "syncing"
  | "offline"
  | "retrying"
  | "failed"
  | "schema_error";

export type SyncRunResult = {
  uploaded: number;
  downloaded: number;
  skipped: number;
  failed: number;
  reason: SyncRunReason;
  startedAt: string;
  finishedAt: string;
  state: SyncUiState;
  message: string | null;
};
