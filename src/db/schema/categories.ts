import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdx: index("categories_user_idx").on(table.userId),
    typeIdx: index("categories_type_idx").on(table.type),
    nameIdx: index("categories_name_idx").on(table.name),
  })
);
