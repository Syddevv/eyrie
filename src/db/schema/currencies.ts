import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const currencies = sqliteTable("currencies", {
  code: text("code").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimalPlaces: integer("decimal_places").notNull(),
});

export const exchangeRates = sqliteTable(
  "exchange_rates",
  {
    baseCurrency: text("base_currency")
      .notNull()
      .references(() => currencies.code, { onDelete: "cascade" }),
    targetCurrency: text("target_currency")
      .notNull()
      .references(() => currencies.code, { onDelete: "cascade" }),
    rate: real("rate").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.baseCurrency, table.targetCurrency] }),
    baseIdx: index("exchange_rates_base_idx").on(table.baseCurrency),
    targetIdx: index("exchange_rates_target_idx").on(table.targetCurrency),
  })
);
