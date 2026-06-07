import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const SYNC_STATUS_VALUES = ["pending", "synced", "failed"] as const;
export const SYNC_OPERATION_VALUES = ["upsert", "delete"] as const;
export const SYNCABLE_TABLE_VALUES = [
  "users",
  "accounts",
  "categories",
  "merchants",
  "transactions",
  "paylaters",
  "paylater_payments",
  "budgets",
  "saving_goals",
  "goal_contributions",
] as const;

export const syncQueue = sqliteTable(
  "sync_queue",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tableName: text("table_name", { enum: SYNCABLE_TABLE_VALUES }).notNull(),
    recordId: text("record_id").notNull(),
    operation: text("operation", { enum: SYNC_OPERATION_VALUES }).notNull(),
    payloadSnapshot: text("payload_snapshot"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextRetryAt: text("next_retry_at"),
    lockedAt: text("locked_at"),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    dueIdx: index("sync_queue_due_idx").on(table.userId, table.nextRetryAt, table.createdAt),
    recordIdx: uniqueIndex("sync_queue_record_idx").on(table.userId, table.tableName, table.recordId),
  }),
);

export const syncState = sqliteTable(
  "sync_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tableName: text("table_name", { enum: SYNCABLE_TABLE_VALUES }).notNull(),
    cursorUpdatedAt: text("cursor_updated_at"),
    cursorId: text("cursor_id"),
    lastFullSyncAt: text("last_full_sync_at"),
    lastSuccessAt: text("last_success_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    tableIdx: uniqueIndex("sync_state_table_idx").on(table.userId, table.tableName),
  }),
);

export const syncLocks = sqliteTable("sync_locks", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  userId: text("user_id").notNull(),
  lockedAt: text("locked_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
