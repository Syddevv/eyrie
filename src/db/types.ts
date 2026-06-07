import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  accounts,
  budgets,
  categories,
  currencies,
  exchangeRates,
  goalContributions,
  goals,
  insights,
  merchantCategoryHistory,
  merchants,
  notifications,
  paylaterPayments,
  paylaters,
  syncLocks,
  syncQueue,
  syncState,
  transactions,
  users,
} from "./schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;
export type Budget = InferSelectModel<typeof budgets>;
export type NewBudget = InferInsertModel<typeof budgets>;
export type Goal = InferSelectModel<typeof goals>;
export type NewGoal = InferInsertModel<typeof goals>;
export type GoalContribution = InferSelectModel<typeof goalContributions>;
export type NewGoalContribution = InferInsertModel<typeof goalContributions>;
export type Insight = InferSelectModel<typeof insights>;
export type NewInsight = InferInsertModel<typeof insights>;
export type Merchant = InferSelectModel<typeof merchants>;
export type NewMerchant = InferInsertModel<typeof merchants>;
export type MerchantCategoryHistory = InferSelectModel<typeof merchantCategoryHistory>;
export type NewMerchantCategoryHistory = InferInsertModel<typeof merchantCategoryHistory>;
export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
export type Paylater = InferSelectModel<typeof paylaters>;
export type NewPaylater = InferInsertModel<typeof paylaters>;
export type PaylaterPayment = InferSelectModel<typeof paylaterPayments>;
export type NewPaylaterPayment = InferInsertModel<typeof paylaterPayments>;
export type Currency = InferSelectModel<typeof currencies>;
export type NewCurrency = InferInsertModel<typeof currencies>;
export type ExchangeRate = InferSelectModel<typeof exchangeRates>;
export type NewExchangeRate = InferInsertModel<typeof exchangeRates>;
export type SyncQueueItem = InferSelectModel<typeof syncQueue>;
export type NewSyncQueueItem = InferInsertModel<typeof syncQueue>;
export type SyncStateRow = InferSelectModel<typeof syncState>;
export type NewSyncStateRow = InferInsertModel<typeof syncState>;
export type SyncLockRow = InferSelectModel<typeof syncLocks>;
export type NewSyncLockRow = InferInsertModel<typeof syncLocks>;
