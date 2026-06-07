import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { currencies } from "./currencies";
import { merchants } from "./merchants";
import { users } from "./users";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amount: real("amount").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .default(DEFAULT_CURRENCY_CODE)
      .references(() => currencies.code),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    merchantId: text("merchant_id").references(() => merchants.id, { onDelete: "set null" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    transferAccountId: text("transfer_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    source: text("source"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    merchantName: text("merchant_name"),
    notes: text("notes"),
    transactionDate: text("transaction_date").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("transactions_user_idx").on(table.userId),
    accountIdx: index("transactions_account_idx").on(table.accountId),
    transferAccountIdx: index("transactions_transfer_account_idx").on(table.transferAccountId),
    categoryIdx: index("transactions_category_idx").on(table.categoryId),
    merchantIdx: index("transactions_merchant_idx").on(table.merchantId),
    dateIdx: index("transactions_date_idx").on(table.transactionDate),
    typeIdx: index("transactions_type_idx").on(table.type),
    referenceIdx: index("transactions_reference_idx").on(
      table.source,
      table.referenceType,
      table.referenceId,
    ),
  })
);
