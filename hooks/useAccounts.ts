import { useCallback, useEffect, useState } from "react";

import { accountsService } from "@/src/db/services";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { onAccountsChanged } from "@/src/lib/dbSync";

import type { Account } from "@/src/db/types";

export function useAccounts() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await accountsService.fetch(userId);
      setAccounts(rows ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAccounts().catch(() => undefined);
    const off = onAccountsChanged(() => {
      fetchAccounts().catch(() => undefined);
    });

    return () => off();
  }, [fetchAccounts]);

  return { accounts, isLoading, refresh: fetchAccounts } as const;
}
