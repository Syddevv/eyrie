import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { ENV } from "@/lib/env";
import { db } from "@/src/db/client";
import {
  accounts,
  budgets,
  categories,
  goalContributions,
  goals,
  merchants,
  syncQueue,
  syncState,
  transactions,
  users,
} from "@/src/db/schema";
import { accountsService } from "@/src/db/services";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import { nowIso } from "@/src/db/utils/time";

export const OFFLINE_GUEST_USER_ID = "local-guest-user";

const OFFLINE_AUTH_STORAGE_KEY = "eyrie:offline-auth-snapshot";
const OFFLINE_PROBE_TIMEOUT_MS = 1200;

export type OfflineAuthSnapshot = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  currencyCode: string;
  isGuest: boolean;
};

export type OfflineAuthUser = Partial<User> & {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
  isGuest?: boolean;
};

export function isOfflineGuestUserId(userId?: string | null) {
  return userId === OFFLINE_GUEST_USER_ID;
}

function normalizeSnapshot(value: unknown): OfflineAuthSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Partial<OfflineAuthSnapshot>;
  if (!snapshot.id || typeof snapshot.id !== "string") {
    return null;
  }

  return {
    id: snapshot.id,
    email: snapshot.email ?? null,
    fullName: snapshot.fullName ?? null,
    avatarUrl: snapshot.avatarUrl ?? null,
    currencyCode: snapshot.currencyCode ?? DEFAULT_CURRENCY_CODE,
    isGuest: Boolean(snapshot.isGuest),
  };
}

export function snapshotFromSupabaseUser(user: User): OfflineAuthSnapshot {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.fullName === "string"
          ? metadata.fullName
          : null,
    avatarUrl:
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.avatarUrl === "string"
          ? metadata.avatarUrl
          : null,
    currencyCode: DEFAULT_CURRENCY_CODE,
    isGuest: false,
  };
}

export function userFromOfflineSnapshot(
  snapshot: OfflineAuthSnapshot,
): OfflineAuthUser {
  return {
    id: snapshot.id,
    email: snapshot.email ?? undefined,
    user_metadata: {
      full_name: snapshot.fullName,
      avatar_url: snapshot.avatarUrl,
      currency_code: snapshot.currencyCode,
    },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
    isGuest: snapshot.isGuest,
  };
}

export async function hydrateOfflineAuthSnapshot() {
  const raw = await AsyncStorage.getItem(OFFLINE_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function persistOfflineAuthSnapshot(
  snapshot: OfflineAuthSnapshot,
) {
  await AsyncStorage.setItem(
    OFFLINE_AUTH_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
}

export async function clearOfflineAuthSnapshot() {
  await AsyncStorage.removeItem(OFFLINE_AUTH_STORAGE_KEY);
}

export async function isLikelyOffline(timeoutMs = OFFLINE_PROBE_TIMEOUT_MS) {
  const url = ENV.SUPABASE_URL;
  if (!url) {
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return !response.ok;
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureOfflineGuestUser() {
  const timestamp = nowIso();
  const snapshot: OfflineAuthSnapshot = {
    id: OFFLINE_GUEST_USER_ID,
    email: "offline@local.eyrie",
    fullName: "Offline Guest",
    avatarUrl: null,
    currencyCode: DEFAULT_CURRENCY_CODE,
    isGuest: true,
  };

  await db
    .insert(users)
    .values({
      id: snapshot.id,
      fullName: snapshot.fullName,
      email: snapshot.email,
      avatarUrl: snapshot.avatarUrl,
      currencyCode: snapshot.currencyCode,
      currentStreak: 0,
      lastActiveDate: null,
      longestStreak: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      syncStatus: "pending",
      lastSyncedAt: null,
      syncError: null,
    })
    .onConflictDoNothing();

  await accountsService.ensureDefaultCashAccount(
    snapshot.id,
    snapshot.currencyCode,
  );
  await persistOfflineAuthSnapshot(snapshot);
  return snapshot;
}

async function ensureLocalUser(snapshot: OfflineAuthSnapshot) {
  const timestamp = nowIso();
  await db
    .insert(users)
    .values({
      id: snapshot.id,
      fullName: snapshot.fullName,
      email: snapshot.email,
      avatarUrl: snapshot.avatarUrl,
      currencyCode: snapshot.currencyCode,
      currentStreak: 0,
      lastActiveDate: null,
      longestStreak: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      syncStatus: "pending",
      lastSyncedAt: null,
      syncError: null,
    })
    .onConflictDoNothing();
}

export async function migrateGuestDataToUser(
  guestUserId: string,
  realUserSnapshot: OfflineAuthSnapshot,
) {
  if (
    !isOfflineGuestUserId(guestUserId) ||
    isOfflineGuestUserId(realUserSnapshot.id)
  ) {
    return;
  }

  const guest = await db.query.users.findFirst({
    where: eq(users.id, guestUserId),
  });
  if (!guest) {
    return;
  }

  await ensureLocalUser(realUserSnapshot);
  const timestamp = nowIso();
  const migrated = {
    userId: realUserSnapshot.id,
    syncStatus: "pending" as const,
    lastSyncedAt: null,
    syncError: null,
    updatedAt: timestamp,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set(migrated)
      .where(eq(accounts.userId, guestUserId));
    await tx
      .update(categories)
      .set(migrated)
      .where(eq(categories.userId, guestUserId));
    await tx
      .update(merchants)
      .set(migrated)
      .where(eq(merchants.userId, guestUserId));
    await tx
      .update(transactions)
      .set(migrated)
      .where(eq(transactions.userId, guestUserId));
    await tx
      .update(budgets)
      .set(migrated)
      .where(eq(budgets.userId, guestUserId));
    await tx
      .update(goals)
      .set(migrated)
      .where(eq(goals.userId, guestUserId));
    await tx
      .update(goalContributions)
      .set(migrated)
      .where(eq(goalContributions.userId, guestUserId));
    await tx
      .update(syncQueue)
      .set({
        userId: realUserSnapshot.id,
        updatedAt: timestamp,
      })
      .where(eq(syncQueue.userId, guestUserId));
    await tx.delete(syncState).where(eq(syncState.userId, guestUserId));
    await tx
      .update(users)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: "synced",
      })
      .where(eq(users.id, guestUserId));
  });

  accountsService.resetDefaultCashCache();
}
