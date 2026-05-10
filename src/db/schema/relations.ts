import { relations } from "drizzle-orm";

import { accounts } from "./accounts";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { currencies, exchangeRates } from "./currencies";
import { goalContributions, goals } from "./goals";
import { insights } from "./insights";
import { notifications } from "./notifications";
import { transactions } from "./transactions";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  goals: many(goals),
  insights: many(insights),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions, { relationName: "sourceAccountTransactions" }),
  inboundTransfers: many(transactions, { relationName: "transferAccountTransactions" }),
  contributions: many(goalContributions),
  linkedGoals: many(goals),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    relationName: "sourceAccountTransactions",
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  transferAccount: one(accounts, {
    relationName: "transferAccountTransactions",
    fields: [transactions.transferAccountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  linkedWallet: one(accounts, {
    fields: [goals.linkedWalletId],
    references: [accounts.id],
  }),
  contributions: many(goalContributions),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, {
    fields: [goalContributions.goalId],
    references: [goals.id],
  }),
  wallet: one(accounts, {
    fields: [goalContributions.walletId],
    references: [accounts.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  user: one(users, {
    fields: [insights.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const currenciesRelations = relations(currencies, ({ many }) => ({
  baseExchangeRates: many(exchangeRates, { relationName: "baseCurrencyRates" }),
  targetExchangeRates: many(exchangeRates, { relationName: "targetCurrencyRates" }),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  baseCurrencyRelation: one(currencies, {
    relationName: "baseCurrencyRates",
    fields: [exchangeRates.baseCurrency],
    references: [currencies.code],
  }),
  targetCurrencyRelation: one(currencies, {
    relationName: "targetCurrencyRates",
    fields: [exchangeRates.targetCurrency],
    references: [currencies.code],
  }),
}));
