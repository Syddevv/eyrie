import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { currencies } from "./currencies";
import { users } from "./users";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    balance: real("balance").notNull().default(0),
    currencyCode: text("currency_code")
      .notNull()
      .default(DEFAULT_CURRENCY_CODE)
      .references(() => currencies.code),
    accountNumberLast4: text("account_number_last4"),
    color: text("color"),
    icon: text("icon"),
    isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),
    typeIdx: index("accounts_type_idx").on(table.type),
  })
);
