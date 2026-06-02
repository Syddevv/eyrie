import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/src/db/client";
import {
  accounts,
  budgets,
  categories,
  goalContributions,
  goals,
  merchants,
  transactions,
  users,
} from "@/src/db/schema";
import { createId } from "@/src/db/utils/ids";
import { nowIso } from "@/src/db/utils/time";
import type { SyncOperation, SyncStatus, SyncableTable } from "./types";

const TABLES = {
  users,
  accounts,
  categories,
  merchants,
  transactions,
  budgets,
  saving_goals: goals,
  goal_contributions: goalContributions,
} as const;

const QUERY_HANDLERS = {
  users: (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }),
  accounts: (id: string) => db.query.accounts.findFirst({ where: eq(accounts.id, id) }),
  categories: (id: string) => db.query.categories.findFirst({ where: eq(categories.id, id) }),
  merchants: (id: string) => db.query.merchants.findFirst({ where: eq(merchants.id, id) }),
  transactions: (id: string) => db.query.transactions.findFirst({ where: eq(transactions.id, id) }),
  budgets: (id: string) => db.query.budgets.findFirst({ where: eq(budgets.id, id) }),
  saving_goals: (id: string) => db.query.goals.findFirst({ where: eq(goals.id, id) }),
  goal_contributions: (id: string) =>
    db.query.goalContributions.findFirst({ where: eq(goalContributions.id, id) }),
} as const;

const ACTIVE_QUERY_HANDLERS = {
  users: (id: string) =>
    db.query.users.findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)) }),
  accounts: (id: string) =>
    db.query.accounts.findFirst({ where: and(eq(accounts.id, id), isNull(accounts.deletedAt)) }),
  categories: (id: string) =>
    db.query.categories.findFirst({ where: and(eq(categories.id, id), isNull(categories.deletedAt)) }),
  merchants: (id: string) =>
    db.query.merchants.findFirst({ where: and(eq(merchants.id, id), isNull(merchants.deletedAt)) }),
  transactions: (id: string) =>
    db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), isNull(transactions.deletedAt)),
    }),
  budgets: (id: string) =>
    db.query.budgets.findFirst({ where: and(eq(budgets.id, id), isNull(budgets.deletedAt)) }),
  saving_goals: (id: string) =>
    db.query.goals.findFirst({ where: and(eq(goals.id, id), isNull(goals.deletedAt)) }),
  goal_contributions: (id: string) =>
    db.query.goalContributions.findFirst({
      where: and(eq(goalContributions.id, id), isNull(goalContributions.deletedAt)),
    }),
} as const;

export function prepareCreateForSync<T extends Record<string, unknown>>(input: T) {
  return {
    ...input,
    deletedAt: null,
    syncStatus: "pending" as SyncStatus,
    lastSyncedAt: null,
    syncError: null,
  };
}

export function prepareUpdateForSync<T extends Record<string, unknown>>(input: T) {
  return {
    ...input,
    syncStatus: "pending" as SyncStatus,
    lastSyncedAt: null,
    syncError: null,
  };
}

export function prepareDeleteForSync(timestamp = nowIso()) {
  return {
    deletedAt: timestamp,
    updatedAt: timestamp,
    syncStatus: "pending" as SyncStatus,
    lastSyncedAt: null,
    syncError: null,
  };
}

export async function markRecordSyncResult(
  tableName: SyncableTable,
  id: string,
  input: {
    syncStatus: SyncStatus;
    lastSyncedAt?: string | null;
    syncError?: string | null;
    updatedAt?: string;
  },
) {
  const table = TABLES[tableName];
  await db
    .update(table)
    .set({
      syncStatus: input.syncStatus,
      lastSyncedAt: input.lastSyncedAt ?? null,
      syncError: input.syncError ?? null,
      ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
    } as never)
    .where(eq(table.id, id));
}

export async function fetchRecordById(tableName: SyncableTable, id: string) {
  return QUERY_HANDLERS[tableName](id);
}

export async function fetchActiveRecordById(tableName: SyncableTable, id: string) {
  return ACTIVE_QUERY_HANDLERS[tableName](id);
}

export async function fetchBootstrapRecordIds(tableName: SyncableTable, userId: string) {
  switch (tableName) {
    case "users": {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "accounts": {
      const rows = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "categories": {
      const rows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "merchants": {
      const rows = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(and(eq(merchants.userId, userId), isNull(merchants.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "transactions": {
      const rows = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "budgets": {
      const rows = await db
        .select({ id: budgets.id })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), isNull(budgets.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "saving_goals": {
      const rows = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.userId, userId), isNull(goals.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "goal_contributions": {
      const rows = await db
        .select({ id: goalContributions.id })
        .from(goalContributions)
        .where(and(eq(goalContributions.userId, userId), isNull(goalContributions.deletedAt)));
      return rows.map((row) => row.id);
    }
  }
}

export async function fetchFailedRecordIds(tableName: SyncableTable, userId: string) {
  switch (tableName) {
    case "users": {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.syncStatus, "failed"), isNull(users.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "accounts": {
      const rows = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.syncStatus, "failed"), isNull(accounts.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "categories": {
      const rows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.syncStatus, "failed"), isNull(categories.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "merchants": {
      const rows = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(and(eq(merchants.userId, userId), eq(merchants.syncStatus, "failed"), isNull(merchants.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "transactions": {
      const rows = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.syncStatus, "failed"), isNull(transactions.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "budgets": {
      const rows = await db
        .select({ id: budgets.id })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.syncStatus, "failed"), isNull(budgets.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "saving_goals": {
      const rows = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.syncStatus, "failed"), isNull(goals.deletedAt)));
      return rows.map((row) => row.id);
    }
    case "goal_contributions": {
      const rows = await db
        .select({ id: goalContributions.id })
        .from(goalContributions)
        .where(and(eq(goalContributions.userId, userId), eq(goalContributions.syncStatus, "failed"), isNull(goalContributions.deletedAt)));
      return rows.map((row) => row.id);
    }
  }
}

export function createSyncQueueId() {
  return createId();
}

export function normalizeSyncError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function nextRetryAt(attemptCount: number, timestamp = Date.now()) {
  const wait =
    attemptCount < 0
      ? RETRY_BACKOFF_MS[0]
      : RETRY_BACKOFF_MS[Math.min(attemptCount, RETRY_BACKOFF_MS.length - 1)];
  return new Date(timestamp + wait).toISOString();
}

const RETRY_BACKOFF_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000] as const;

export function tableSupportsUserOwnership(tableName: SyncableTable) {
  return tableName !== "users";
}

export function syncOperationForDeletedAt(deletedAt?: string | null): SyncOperation {
  return deletedAt ? "delete" : "upsert";
}
