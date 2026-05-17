import type { User as SupabaseUser } from "@supabase/supabase-js";

import { usersRepository } from "../repositories/usersRepository";
import { nowIso } from "../utils/time";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";
import { prepareCreateForSync, prepareUpdateForSync } from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { emitUsersChanged } from "@/src/lib/dbSync";

type LocalUser = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  currencyCode?: string;
  currentStreak?: number;
  lastActiveDate?: string | null;
  longestStreak?: number;
  createdAt: string;
  updatedAt: string;
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

function diffDays(left: string, right: string) {
  const msPerDay = 86_400_000;
  return Math.round((parseDateKey(left) - parseDateKey(right)) / msPerDay);
}

export class UsersService {
  /**
   * Ensure a local user row exists for the given Supabase user. Creates or updates
   * the local record and returns it.
   */
  async syncFromSupabaseUser(
    supabaseUser: SupabaseUser | null,
  ): Promise<LocalUser | null> {
    if (!supabaseUser) return null;

    const now = nowIso();
    const id = supabaseUser.id;

    const metadata = (supabaseUser.user_metadata ?? {}) as Record<string, any>;
    const fullName =
      (metadata.full_name as string) ?? (metadata.fullName as string) ?? null;
    const avatarUrl =
      (metadata.avatar_url as string) ?? (metadata.avatarUrl as string) ?? null;
    const email = supabaseUser.email ?? null;

    const existing = await usersRepository.findById(id);

    if (!existing) {
      const created = await usersRepository.create({
        ...prepareCreateForSync({
          id,
          fullName,
          email,
          avatarUrl,
          currencyCode: undefined as any,
          currentStreak: 0,
          lastActiveDate: null,
          longestStreak: 0,
          createdAt: now,
          updatedAt: now,
        }),
      }) as LocalUser;
      emitUsersChanged();
      return created;
    }

    // Update changed fields if necessary
    const updates: Partial<LocalUser> = {};

    if (existing.fullName !== fullName) updates.fullName = fullName;
    if (existing.avatarUrl !== avatarUrl) updates.avatarUrl = avatarUrl;
    if (existing.email !== email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      const updated = (await usersRepository.update(id, updates)) as LocalUser;
      emitUsersChanged();
      return updated;
    }

    return existing as LocalUser;
  }

  async fetchLocalUser(id: string) {
    return usersRepository.findById(id);
  }

  async updateProfile(
    id: string,
    input: {
      fullName?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    },
  ) {
    const updates: Partial<LocalUser> = {
      updatedAt: nowIso(),
    };

    if ("fullName" in input) {
      updates.fullName = input.fullName?.trim() || null;
    }

    if ("email" in input) {
      updates.email = input.email?.trim().toLowerCase() || null;
    }

    if ("avatarUrl" in input) {
      updates.avatarUrl = input.avatarUrl || null;
    }

    const updated = (await usersRepository.update(
      id,
      prepareUpdateForSync(updates),
    )) as LocalUser;
    await enqueueSync("users", updated.id, "upsert", updated.id);
    emitUsersChanged();
    return updated;
  }

  async updateCurrency(id: string, currencyCode: string) {
    const normalizedCurrencyCode =
      currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY_CODE;

    const updated = (await usersRepository.update(
      id,
      prepareUpdateForSync({
        currencyCode: normalizedCurrencyCode,
        updatedAt: nowIso(),
      }),
    )) as LocalUser;
    await enqueueSync("users", updated.id, "upsert", updated.id);
    emitUsersChanged();
    return updated;
  }

  async markUserActive(id: string) {
    const existing = (await usersRepository.findById(id)) as LocalUser | null;
    if (!existing) {
      return null;
    }

    const today = getLocalDateKey();
    const previousDate = existing.lastActiveDate ?? null;

    if (previousDate === today) {
      return existing;
    }

    const previousStreak = existing.currentStreak ?? 0;
    const nextCurrentStreak =
      previousDate && diffDays(today, previousDate) === 1
        ? previousStreak + 1
        : 1;
    const nextLongestStreak = Math.max(
      existing.longestStreak ?? 0,
      nextCurrentStreak,
    );

    const updated = (await usersRepository.update(
      id,
      prepareUpdateForSync({
        currentStreak: nextCurrentStreak,
        lastActiveDate: today,
        longestStreak: nextLongestStreak,
        updatedAt: nowIso(),
      }),
    )) as LocalUser;

    await enqueueSync("users", updated.id, "upsert", updated.id);
    emitUsersChanged();
    return updated;
  }
}

export const usersService = new UsersService();
