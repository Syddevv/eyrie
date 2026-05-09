import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { accounts } from "./accounts";
import { currencies } from "./currencies";
import { users } from "./users";

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: real("target_amount").notNull(),
    currentAmount: real("current_amount").notNull().default(0),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    icon: text("icon"),
    color: text("color"),
    targetDate: text("target_date"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("goals_user_idx").on(table.userId),
    targetDateIdx: index("goals_target_date_idx").on(table.targetDate),
  })
);

export const goalContributions = sqliteTable(
  "goal_contributions",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code),
    contributionDate: text("contribution_date").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    goalIdx: index("goal_contributions_goal_idx").on(table.goalId),
    accountIdx: index("goal_contributions_account_idx").on(table.accountId),
    dateIdx: index("goal_contributions_date_idx").on(table.contributionDate),
  })
);
