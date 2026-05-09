import { useEffect, useState, useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { usersService } from "@/src/db/services";
import { accountsService } from "@/src/db/services";
import { useAuthStore } from "@/store/useAuthStore";

type CurrentUser = {
  id: string;
  full_name?: string | null;
  first_name?: string;
  email?: string | null;
  avatar_url?: string | null;
  currency_code?: string | null;
};

type CurrentUserSnapshot = {
  user: CurrentUser | null;
  isLoading: boolean;
};

const listeners = new Set<(snapshot: CurrentUserSnapshot) => void>();
let currentSnapshot: CurrentUserSnapshot = {
  user: null,
  isLoading: false,
};

function publishSnapshot(snapshot: CurrentUserSnapshot) {
  currentSnapshot = snapshot;
  for (const listener of Array.from(listeners)) {
    listener(snapshot);
  }
}

function firstName(fullName?: string | null) {
  if (!fullName) return undefined;
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? undefined;
}

export function useCurrentUser() {
  const supabaseUser = useAuthStore((s) => s.user) as SupabaseUser | null;
  const [snapshot, setSnapshot] = useState<CurrentUserSnapshot>(currentSnapshot);

  const refresh = useCallback(async () => {
    if (!supabaseUser) {
      publishSnapshot({
        user: null,
        isLoading: false,
      });
      return null;
    }

    publishSnapshot({
      user: currentSnapshot.user,
      isLoading: true,
    });

    try {
      const local = await usersService.syncFromSupabaseUser(
        supabaseUser as any,
      );

      if (!local) {
        publishSnapshot({
          user: null,
          isLoading: false,
        });
        return null;
      }

      const result: CurrentUser = {
        id: local.id,
        full_name: local.fullName ?? null,
        first_name: firstName(local.fullName ?? undefined),
        email: local.email ?? null,
        avatar_url: local.avatarUrl ?? null,
        currency_code: (local.currencyCode as string) ?? null,
      };

      await accountsService.ensureDefaultCashAccount(
        result.id,
        result.currency_code,
      );

      publishSnapshot({
        user: result,
        isLoading: false,
      });
      return result;
    } catch (error) {
      publishSnapshot({
        user: currentSnapshot.user,
        isLoading: false,
      });
      throw error;
    }
  }, [supabaseUser]);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(currentSnapshot);

    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      publishSnapshot({
        user: currentSnapshot.user,
        isLoading: false,
      });
    });
  }, [refresh]);

  return { user: snapshot.user, isLoading: snapshot.isLoading, refresh } as const;
}
