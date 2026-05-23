import type { User as SupabaseUser } from "@supabase/supabase-js";

import {
  processStreakLostNotificationEvent,
  processWelcomeNotificationEvent,
} from "@/services/notifications";
import { usersRepository } from "../repositories/usersRepository";
import { nowIso } from "../utils/time";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";
import { prepareCreateForSync, prepareUpdateForSync } from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { emitUsersChanged } from "@/src/lib/dbSync";
import {
  calculateStreakAfterActivity,
  getLocalDateKey,
  validateStreakState,
} from "@/src/lib/streaks";

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

const LOCAL_DUPLICATE_EMAIL_ERROR =
  "This email is already associated with an existing account.";

function logStreakChange(
  event: string,
  payload: Record<string, unknown>,
) {
  console.log(`[streak] ${event}`, payload);
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
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
    const email = normalizeEmail(supabaseUser.email ?? null);

    const existing = await usersRepository.findById(id);
    const existingByEmail = email
      ? await usersRepository.findByEmail(email)
      : null;

    if (existingByEmail && existingByEmail.id !== id) {
      throw new Error(LOCAL_DUPLICATE_EMAIL_ERROR);
    }

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
      await processWelcomeNotificationEvent({
        userId: created.id,
        fullName: created.fullName ?? null,
      }).catch(() => undefined);
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
    const normalizedEmail =
      "email" in input ? normalizeEmail(input.email ?? null) : undefined;

    if (normalizedEmail) {
      const existingByEmail = await usersRepository.findByEmail(normalizedEmail);

      if (existingByEmail && existingByEmail.id !== id) {
        throw new Error(LOCAL_DUPLICATE_EMAIL_ERROR);
      }
    }

    const updates: Partial<LocalUser> = {
      updatedAt: nowIso(),
    };

    if ("fullName" in input) {
      updates.fullName = input.fullName?.trim() || null;
    }

    if ("email" in input) {
      updates.email = normalizedEmail ?? null;
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
    const transition = calculateStreakAfterActivity(
      {
        currentStreak: existing.currentStreak ?? 0,
        lastActiveDate: existing.lastActiveDate ?? null,
        longestStreak: existing.longestStreak ?? 0,
      },
      today,
    );

    if (!transition.changed) {
      logStreakChange(
        transition.ignoredFutureDate
          ? "activity_preserved_future_date"
          : "activity_already_counted",
        {
          userId: id,
          currentStreak: transition.currentStreak,
          lastActiveDate: transition.lastActiveDate,
          daysSinceLastActivity: transition.daysSinceLastActivity,
        },
      );
      return existing;
    }

    const updated = (await usersRepository.update(
      id,
      prepareUpdateForSync({
        currentStreak: transition.currentStreak,
        lastActiveDate: transition.lastActiveDate,
        longestStreak: transition.longestStreak,
        updatedAt: nowIso(),
      }),
    )) as LocalUser;

    await enqueueSync("users", updated.id, "upsert", updated.id);
    emitUsersChanged();

    logStreakChange(
      transition.resetFromMissedPeriod ? "activity_reset_after_gap" : "activity_counted",
      {
        userId: id,
        previousStreak: transition.previousStreak,
        currentStreak: transition.currentStreak,
        previousLastActiveDate: transition.previousLastActiveDate,
        lastActiveDate: transition.lastActiveDate,
        daysSinceLastActivity: transition.daysSinceLastActivity,
        longestStreak: transition.longestStreak,
      },
    );

    if (transition.resetFromMissedPeriod && transition.previousLastActiveDate) {
      await processStreakLostNotificationEvent({
        userId: updated.id,
        previousActiveDate: transition.previousLastActiveDate,
        lostAt: today,
      }).catch(() => undefined);
    }

    return updated;
  }

  async validateCurrentStreak(
    id: string,
    existingUser?: LocalUser | null,
    today = getLocalDateKey(),
  ) {
    const existing =
      existingUser ?? ((await usersRepository.findById(id)) as LocalUser | null);
    if (!existing) {
      return null;
    }

    const validated = validateStreakState(
      {
        currentStreak: existing.currentStreak ?? 0,
        lastActiveDate: existing.lastActiveDate ?? null,
      },
      today,
    );

    if (validated.daysSinceLastActivity != null && validated.daysSinceLastActivity < 0) {
      logStreakChange("validation_preserved_future_date", {
        userId: id,
        currentStreak: existing.currentStreak ?? 0,
        lastActiveDate: existing.lastActiveDate ?? null,
        daysSinceLastActivity: validated.daysSinceLastActivity,
      });
    }

    if (validated.lostStreak) {
      logStreakChange("validation_detected_missed_period", {
        userId: id,
        currentStreak: existing.currentStreak ?? 0,
        lastActiveDate: existing.lastActiveDate ?? null,
        daysSinceLastActivity: validated.daysSinceLastActivity,
      });
    }

    return existing;
  }
}

export const usersService = new UsersService();
