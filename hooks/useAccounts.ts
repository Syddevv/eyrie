import { useCallback, useEffect, useState } from "react";

import { accountsService } from "@/src/db/services";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { onAccountsChanged } from "@/src/lib/dbSync";
import { useSyncStore } from "@/src/sync/store";

import type { Account } from "@/src/db/types";

export function useAccounts() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const hydrationReady = useSyncStore((state) => state.hydrationReady);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    if (!hydrationReady) {
      setAccounts([]);
      setIsLoading(true);
      return;
    }

    // Only show loading state if we don't already have data
    setIsLoading((prev) => prev || accounts.length === 0);
    try {
      const rows = await accountsService.fetch(userId);
      setAccounts(rows ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [userId, hydrationReady, accounts.length]);

  useEffect(() => {
    fetchAccounts().catch(() => undefined);
    const off = onAccountsChanged(() => {
      fetchAccounts().catch(() => undefined);
    });

    return () => off();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.log("[accounts:ui] snapshot", {
      userId,
      hydrationReady,
      isLoading,
      count: accounts.length,
    });
  }, [accounts.length, hydrationReady, isLoading, userId]);

  return { accounts, isLoading, refresh: fetchAccounts } as const;
}
