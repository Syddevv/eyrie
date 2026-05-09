import { useEffect, useState, useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { usersService } from "@/src/db/services";
import { useAuthStore } from "@/store/useAuthStore";

type CurrentUser = {
  id: string;
  full_name?: string | null;
  first_name?: string;
  email?: string | null;
  avatar_url?: string | null;
  currency_code?: string | null;
};

function firstName(fullName?: string | null) {
  if (!fullName) return undefined;
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? undefined;
}

export function useCurrentUser() {
  const supabaseUser = useAuthStore((s) => s.user) as SupabaseUser | null;
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseUser) {
      setUser(null);
      return null;
    }

    setIsLoading(true);
    try {
      const local = await usersService.syncFromSupabaseUser(
        supabaseUser as any,
      );

      if (!local) {
        setUser(null);
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

      setUser(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [supabaseUser]);

  useEffect(() => {
    refresh().catch(() => {
      setIsLoading(false);
    });
  }, [refresh]);

  return { user, isLoading, refresh } as const;
}
