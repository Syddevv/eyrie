import { useCallback, useEffect, useState } from "react";

import { getTotalBalance } from "@/src/db/queries/dashboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { onAccountsChanged } from "@/src/lib/dbSync";

export function useTotalAssets() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTotal = useCallback(async () => {
    if (!userId) {
      setTotal(0);
      return;
    }

    setIsLoading(true);
    try {
      const value = await getTotalBalance(userId);
      setTotal(value ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTotal().catch(() => undefined);
    const off = onAccountsChanged(() => {
      fetchTotal().catch(() => undefined);
    });

    return () => off();
  }, [fetchTotal]);

  return { total, isLoading, refresh: fetchTotal } as const;
}
