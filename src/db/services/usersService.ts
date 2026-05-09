import type { User as SupabaseUser } from "@supabase/supabase-js";

import { usersRepository } from "../repositories/usersRepository";
import { nowIso } from "../utils/time";

type LocalUser = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  currencyCode?: string;
  createdAt: string;
  updatedAt: string;
};

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
      return usersRepository.create({
        id,
        fullName,
        email,
        avatarUrl,
        currencyCode: undefined as any,
        createdAt: now,
        updatedAt: now,
      }) as Promise<LocalUser>;
    }

    // Update changed fields if necessary
    const updates: Partial<LocalUser> = {};

    if (existing.fullName !== fullName) updates.fullName = fullName;
    if (existing.avatarUrl !== avatarUrl) updates.avatarUrl = avatarUrl;
    if (existing.email !== email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      return usersRepository.update(id, updates) as Promise<LocalUser>;
    }

    return existing as LocalUser;
  }

  async fetchLocalUser(id: string) {
    return usersRepository.findById(id);
  }
}

export const usersService = new UsersService();
