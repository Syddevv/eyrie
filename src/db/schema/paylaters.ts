import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const paylaters = sqliteTable(
  "paylaters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    platform: text("platform").notNull(),
    itemName: text("item_name").notNull(),
    totalAmount: real("total_amount").notNull(),
    remainingBalance: real("remaining_balance").notNull(),
    installmentAmount: real("installment_amount").notNull(),
    dueDay: text("due_day"),
    dueDate: text("due_date"),
    installmentCount: real("installment_count"),
    startDate: text("start_date").notNull(),
    status: text("status").notNull(),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("pending"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userUpdatedIdx: index("paylaters_user_updated_idx").on(
      table.userId,
      table.updatedAt,
      table.id,
    ),
    statusIdx: index("paylaters_status_idx").on(table.userId, table.status),
  }),
);

export const paylaterPayments = sqliteTable(
  "paylater_payments",
  {
    id: text("id").primaryKey(),
    paylaterId: text("paylater_id").notNull(),
    userId: text("user_id").notNull(),
    transactionId: text("transaction_id"),
    amount: real("amount").notNull(),
    paymentDate: text("payment_date").notNull(),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("pending"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userUpdatedIdx: index("paylater_payments_user_updated_idx").on(
      table.userId,
      table.updatedAt,
      table.id,
    ),
    paylaterIdx: index("paylater_payments_paylater_idx").on(table.paylaterId),
    transactionIdx: index("paylater_payments_transaction_idx").on(
      table.transactionId,
    ),
  }),
);
