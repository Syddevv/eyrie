import { eq } from "drizzle-orm";

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
import { SYSTEM_CATEGORY_USER_ID } from "@/src/db/utils/constants";
import { isValidDateKey } from "@/src/lib/streaks";
import type { SyncableTable } from "./types";

type RegistryEntry = {
  tableName: SyncableTable;
  shouldSyncRecord: (row: Record<string, unknown>) => boolean;
  toRemote: (row: Record<string, unknown>) => Record<string, unknown>;
  upsertLocal: (row: Record<string, unknown>) => Promise<void>;
};

function commonRemoteFields(row: Record<string, unknown>) {
  return {
    id: row.id,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
    last_synced_at: row.lastSyncedAt ?? null,
  };
}

function toStreakCount(value: unknown, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  return Math.max(0, Math.floor(Number(value) || 0));
}

function toStreakDate(value: unknown, fallback: string | null) {
  if (typeof value !== "string") {
    return fallback;
  }

  return isValidDateKey(value) ? value : fallback;
}

function shouldPreserveLocalStreak(
  existing: typeof users.$inferSelect | undefined,
  remoteUpdatedAt: string,
) {
  if (!existing) {
    return false;
  }

  if (existing.syncStatus === "pending" || existing.syncStatus === "failed") {
    return true;
  }

  return Boolean(
    existing.updatedAt &&
      remoteUpdatedAt &&
      new Date(existing.updatedAt).getTime() > new Date(remoteUpdatedAt).getTime(),
  );
}

function mergeUserStreakFields(
  existing: typeof users.$inferSelect | undefined,
  row: Record<string, unknown>,
) {
  const remoteUpdatedAt = String(row.updated_at ?? "");
  const preserveLocal = shouldPreserveLocalStreak(existing, remoteUpdatedAt);

  if (preserveLocal && existing) {
    console.log("[streak:sync] preserving newer local streak", {
      userId: existing.id,
      localUpdatedAt: existing.updatedAt,
      remoteUpdatedAt,
      syncStatus: existing.syncStatus,
      currentStreak: existing.currentStreak,
      lastActiveDate: existing.lastActiveDate,
    });

    return {
      preserveLocal,
      currentStreak: existing.currentStreak,
      lastActiveDate: existing.lastActiveDate,
      longestStreak: existing.longestStreak,
    };
  }

  return {
    preserveLocal,
    currentStreak: toStreakCount(row.current_streak, existing?.currentStreak ?? 0),
    lastActiveDate: toStreakDate(row.last_active_date, existing?.lastActiveDate ?? null),
    longestStreak: toStreakCount(row.longest_streak, existing?.longestStreak ?? 0),
  };
}

export const syncRegistry: Record<SyncableTable, RegistryEntry> = {
  users: {
    tableName: "users",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      full_name: row.fullName ?? null,
      email: row.email ?? null,
      avatar_url: row.avatarUrl ?? null,
      currency_code: row.currencyCode ?? null,
      current_streak: row.currentStreak ?? 0,
      last_active_date: row.lastActiveDate ?? null,
      longest_streak: row.longestStreak ?? 0,
    }),
    upsertLocal: async (row) => {
      const id = String(row.id);
      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      const streakFields = mergeUserStreakFields(existing, row);
      const updatedAt =
        streakFields.preserveLocal && existing
          ? existing.updatedAt
          : String(row.updated_at);
      const lastSyncedAt =
        streakFields.preserveLocal && existing
          ? existing.lastSyncedAt
          : ((row.last_synced_at as string | null) ?? null);
      const syncStatus =
        streakFields.preserveLocal && existing
          ? existing.syncStatus
          : "synced";
      const syncError =
        streakFields.preserveLocal && existing
          ? existing.syncError
          : null;

      await db
        .insert(users)
        .values({
          id,
          fullName: (row.full_name as string | null) ?? null,
          email: (row.email as string | null) ?? null,
          avatarUrl: (row.avatar_url as string | null) ?? null,
          currencyCode: (row.currency_code as string | null) ?? undefined,
          currentStreak: streakFields.currentStreak,
          lastActiveDate: streakFields.lastActiveDate,
          longestStreak: streakFields.longestStreak,
          createdAt: String(row.created_at),
          updatedAt,
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt,
          syncStatus,
          syncError,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            fullName: (row.full_name as string | null) ?? null,
            email: (row.email as string | null) ?? null,
            avatarUrl: (row.avatar_url as string | null) ?? null,
            currencyCode: (row.currency_code as string | null) ?? undefined,
            currentStreak: streakFields.currentStreak,
            lastActiveDate: streakFields.lastActiveDate,
            longestStreak: streakFields.longestStreak,
            updatedAt,
            deletedAt: (row.deleted_at as string | null) ?? null,
            lastSyncedAt,
            syncStatus,
            syncError,
          },
        });
    },
  },
  accounts: {
    tableName: "accounts",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      type: row.type,
      name: row.name,
      account_holder_name: row.accountHolderName ?? null,
      balance: row.balance,
      currency_code: row.currencyCode,
      account_number_last4: row.accountNumberLast4 ?? null,
      color: row.color ?? null,
      icon: row.icon ?? null,
      is_default: row.isDefault,
      is_hidden: row.isHidden,
    }),
    upsertLocal: async (row) => {
      await db.insert(accounts).values({
        id: String(row.id),
        userId: String(row.user_id),
        type: String(row.type),
        name: String(row.name),
        accountHolderName: (row.account_holder_name as string | null) ?? null,
        balance: Number(row.balance ?? 0),
        currencyCode: String(row.currency_code),
        accountNumberLast4: (row.account_number_last4 as string | null) ?? null,
        color: (row.color as string | null) ?? null,
        icon: (row.icon as string | null) ?? null,
        isDefault: Boolean(row.is_default),
        isHidden: Boolean(row.is_hidden),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: accounts.id,
        set: {
          userId: String(row.user_id),
          type: String(row.type),
          name: String(row.name),
          accountHolderName: (row.account_holder_name as string | null) ?? null,
          balance: Number(row.balance ?? 0),
          currencyCode: String(row.currency_code),
          accountNumberLast4: (row.account_number_last4 as string | null) ?? null,
          color: (row.color as string | null) ?? null,
          icon: (row.icon as string | null) ?? null,
          isDefault: Boolean(row.is_default),
          isHidden: Boolean(row.is_hidden),
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  categories: {
    tableName: "categories",
    shouldSyncRecord: (row) => String(row.userId) !== SYSTEM_CATEGORY_USER_ID && !row.isSystem,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      type: row.type,
      name: row.name,
      icon: row.icon ?? null,
      icon_type: row.iconType ?? "vector",
      icon_name: row.iconName ?? null,
      icon_image_uri: row.iconImageUri ?? null,
      emoji: row.emoji ?? null,
      color: row.color ?? null,
      is_default: row.isDefault,
      is_system: false,
      is_archived: row.isArchived,
    }),
    upsertLocal: async (row) => {
      await db.insert(categories).values({
        id: String(row.id),
        userId: String(row.user_id),
        type: String(row.type),
        name: String(row.name),
        icon: (row.icon as string | null) ?? null,
        iconType: (row.icon_type as string | null) ?? "vector",
        iconName: (row.icon_name as string | null) ?? null,
        iconImageUri: (row.icon_image_uri as string | null) ?? null,
        emoji: (row.emoji as string | null) ?? null,
        color: (row.color as string | null) ?? null,
        isDefault: Boolean(row.is_default),
        isSystem: Boolean(row.is_system),
        isArchived: Boolean(row.is_archived),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: categories.id,
        set: {
          userId: String(row.user_id),
          type: String(row.type),
          name: String(row.name),
          icon: (row.icon as string | null) ?? null,
          iconType: (row.icon_type as string | null) ?? "vector",
          iconName: (row.icon_name as string | null) ?? null,
          iconImageUri: (row.icon_image_uri as string | null) ?? null,
          emoji: (row.emoji as string | null) ?? null,
          color: (row.color as string | null) ?? null,
          isDefault: Boolean(row.is_default),
          isArchived: Boolean(row.is_archived),
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  merchants: {
    tableName: "merchants",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      name: row.name,
      logo_uri: row.logoUri ?? null,
      default_category_id: row.defaultCategoryId ?? null,
    }),
    upsertLocal: async (row) => {
      await db.insert(merchants).values({
        id: String(row.id),
        userId: String(row.user_id),
        name: String(row.name),
        logoUri: (row.logo_uri as string | null) ?? null,
        defaultCategoryId: (row.default_category_id as string | null) ?? null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: merchants.id,
        set: {
          userId: String(row.user_id),
          name: String(row.name),
          logoUri: (row.logo_uri as string | null) ?? null,
          defaultCategoryId: (row.default_category_id as string | null) ?? null,
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  transactions: {
    tableName: "transactions",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      type: row.type,
      amount: row.amount,
      currency_code: row.currencyCode,
      category_id: row.categoryId ?? null,
      merchant_id: row.merchantId ?? null,
      account_id: row.accountId,
      transfer_account_id: row.transferAccountId ?? null,
      merchant_name: row.merchantName ?? null,
      notes: row.notes ?? null,
      transaction_date: row.transactionDate,
    }),
    upsertLocal: async (row) => {
      await db.insert(transactions).values({
        id: String(row.id),
        userId: String(row.user_id),
        type: String(row.type),
        amount: Number(row.amount ?? 0),
        currencyCode: String(row.currency_code),
        categoryId: (row.category_id as string | null) ?? null,
        merchantId: (row.merchant_id as string | null) ?? null,
        accountId: String(row.account_id),
        transferAccountId: (row.transfer_account_id as string | null) ?? null,
        merchantName: (row.merchant_name as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        transactionDate: String(row.transaction_date),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: transactions.id,
        set: {
          userId: String(row.user_id),
          type: String(row.type),
          amount: Number(row.amount ?? 0),
          currencyCode: String(row.currency_code),
          categoryId: (row.category_id as string | null) ?? null,
          merchantId: (row.merchant_id as string | null) ?? null,
          accountId: String(row.account_id),
          transferAccountId: (row.transfer_account_id as string | null) ?? null,
          merchantName: (row.merchant_name as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          transactionDate: String(row.transaction_date),
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  budgets: {
    tableName: "budgets",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      category_id: row.categoryId,
      amount: row.amount,
      spent: row.spent,
      period: row.period,
      start_date: row.startDate,
      end_date: row.endDate,
    }),
    upsertLocal: async (row) => {
      await db.insert(budgets).values({
        id: String(row.id),
        userId: String(row.user_id),
        categoryId: String(row.category_id),
        amount: Number(row.amount ?? 0),
        spent: Number(row.spent ?? 0),
        period: String(row.period),
        startDate: String(row.start_date),
        endDate: String(row.end_date),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: budgets.id,
        set: {
          userId: String(row.user_id),
          categoryId: String(row.category_id),
          amount: Number(row.amount ?? 0),
          spent: Number(row.spent ?? 0),
          period: String(row.period),
          startDate: String(row.start_date),
          endDate: String(row.end_date),
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  saving_goals: {
    tableName: "saving_goals",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      title: row.title,
      target_amount: row.targetAmount,
      current_amount: row.currentAmount,
      target_date: row.targetDate,
      icon_type: row.iconType,
      icon_name: row.iconName ?? null,
      icon_image_uri: row.iconImageUri ?? null,
      emoji: row.emoji ?? null,
      color: row.color ?? null,
      linked_wallet_id: row.linkedWalletId ?? null,
      is_completed: row.isCompleted,
      is_archived: row.isArchived,
    }),
    upsertLocal: async (row) => {
      await db.insert(goals).values({
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title),
        targetAmount: Number(row.target_amount ?? 0),
        currentAmount: Number(row.current_amount ?? 0),
        targetDate: String(row.target_date),
        iconType: String(row.icon_type ?? "vector") as any,
        iconName: (row.icon_name as string | null) ?? null,
        iconImageUri: (row.icon_image_uri as string | null) ?? null,
        emoji: (row.emoji as string | null) ?? null,
        color: (row.color as string | null) ?? null,
        linkedWalletId: (row.linked_wallet_id as string | null) ?? null,
        isCompleted: Boolean(row.is_completed),
        isArchived: Boolean(row.is_archived),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: goals.id,
        set: {
          userId: String(row.user_id),
          title: String(row.title),
          targetAmount: Number(row.target_amount ?? 0),
          currentAmount: Number(row.current_amount ?? 0),
          targetDate: String(row.target_date),
          iconType: String(row.icon_type ?? "vector") as any,
          iconName: (row.icon_name as string | null) ?? null,
          iconImageUri: (row.icon_image_uri as string | null) ?? null,
          emoji: (row.emoji as string | null) ?? null,
          color: (row.color as string | null) ?? null,
          linkedWalletId: (row.linked_wallet_id as string | null) ?? null,
          isCompleted: Boolean(row.is_completed),
          isArchived: Boolean(row.is_archived),
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
  goal_contributions: {
    tableName: "goal_contributions",
    shouldSyncRecord: () => true,
    toRemote: (row) => ({
      ...commonRemoteFields(row),
      user_id: row.userId,
      goal_id: row.goalId,
      wallet_id: row.walletId ?? null,
      amount: row.amount,
      note: row.note ?? null,
    }),
    upsertLocal: async (row) => {
      await db.insert(goalContributions).values({
        id: String(row.id),
        userId: String(row.user_id),
        goalId: String(row.goal_id),
        walletId: (row.wallet_id as string | null) ?? null,
        amount: Number(row.amount ?? 0),
        note: (row.note as string | null) ?? null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
        syncStatus: "synced",
        syncError: null,
      }).onConflictDoUpdate({
        target: goalContributions.id,
        set: {
          userId: String(row.user_id),
          goalId: String(row.goal_id),
          walletId: (row.wallet_id as string | null) ?? null,
          amount: Number(row.amount ?? 0),
          note: (row.note as string | null) ?? null,
          updatedAt: String(row.updated_at),
          deletedAt: (row.deleted_at as string | null) ?? null,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          syncStatus: "synced",
          syncError: null,
        },
      });
    },
  },
};

export async function markLocalRecordDeleted(tableName: SyncableTable, id: string, deletedAt: string) {
  if (tableName === "users") {
    await db.update(users).set({ deletedAt, updatedAt: deletedAt }).where(eq(users.id, id));
    return;
  }

  const table = {
    accounts,
    categories,
    merchants,
    transactions,
    budgets,
    saving_goals: goals,
    goal_contributions: goalContributions,
  }[tableName];

  await db.update(table).set({ deletedAt, updatedAt: deletedAt } as never).where(eq(table.id, id));
}
