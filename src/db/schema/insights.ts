import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const insights = sqliteTable(
  "insights",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdx: index("insights_user_idx").on(table.userId),
    typeIdx: index("insights_type_idx").on(table.type),
  })
);
