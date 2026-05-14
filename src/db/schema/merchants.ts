import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories";
import { users } from "./users";

export const merchants = sqliteTable(
  "merchants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logoUri: text("logo_uri"),
    defaultCategoryId: text("default_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("merchants_user_idx").on(table.userId),
    nameIdx: index("merchants_name_idx").on(table.name),
    defaultCategoryIdx: index("merchants_default_category_idx").on(table.defaultCategoryId),
  }),
);

export const merchantCategoryHistory = sqliteTable(
  "merchant_category_history",
  {
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: text("last_used_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.merchantId, table.categoryId] }),
    merchantIdx: index("merchant_category_history_merchant_idx").on(table.merchantId),
    categoryIdx: index("merchant_category_history_category_idx").on(table.categoryId),
    lastUsedIdx: index("merchant_category_history_last_used_idx").on(table.lastUsedAt),
  }),
);
