import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { currencies } from "./currencies";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  currencyCode: text("currency_code")
    .notNull()
    .default(DEFAULT_CURRENCY_CODE)
    .references(() => currencies.code),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: text("last_synced_at"),
  syncError: text("sync_error"),
});
