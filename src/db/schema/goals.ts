import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";
import { users } from "./users";
import { CATEGORY_ICON_TYPES } from "../utils/constants";

export const goals = sqliteTable(
  "saving_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetAmount: real("target_amount").notNull(),
    currentAmount: real("current_amount").notNull().default(0),
    targetDate: text("target_date").notNull(),
    iconType: text("icon_type", { enum: CATEGORY_ICON_TYPES }).notNull().default("vector"),
    iconName: text("icon_name"),
    iconImageUri: text("icon_image_uri"),
    emoji: text("emoji"),
    color: text("color"),
    linkedWalletId: text("linked_wallet_id").references(() => accounts.id, { onDelete: "set null" }),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("goals_user_idx").on(table.userId),
    targetDateIdx: index("goals_target_date_idx").on(table.targetDate),
    linkedWalletIdx: index("goals_linked_wallet_idx").on(table.linkedWalletId),
  })
);

export const goalContributions = sqliteTable(
  "goal_contributions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    walletId: text("wallet_id").references(() => accounts.id, { onDelete: "set null" }),
    amount: real("amount").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("goal_contributions_user_idx").on(table.userId),
    goalIdx: index("goal_contributions_goal_idx").on(table.goalId),
    walletIdx: index("goal_contributions_wallet_idx").on(table.walletId),
    dateIdx: index("goal_contributions_date_idx").on(table.createdAt),
  })
);
