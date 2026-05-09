import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories";
import { users } from "./users";

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    spent: real("spent").notNull().default(0),
    period: text("period").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("budgets_user_idx").on(table.userId),
    categoryIdx: index("budgets_category_idx").on(table.categoryId),
    rangeIdx: index("budgets_range_idx").on(table.startDate, table.endDate),
  })
);
