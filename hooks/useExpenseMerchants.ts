import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { merchantsService, type MerchantPickerOption } from "@/src/db/services/merchantsService";
import { onAccountsChanged, onMerchantsChanged } from "@/src/lib/dbSync";

export function useExpenseMerchants(query?: string) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [merchants, setMerchants] = useState<MerchantPickerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMerchants([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await merchantsService.search(userId, query);
      setMerchants(rows);
    } finally {
      setIsLoading(false);
    }
  }, [query, userId]);

  useEffect(() => {
    void refresh();

    const offMerchants = onMerchantsChanged(() => {
      void refresh();
    });
    const offAccounts = onAccountsChanged(() => {
      void refresh();
    });

    return () => {
      offMerchants();
      offAccounts();
    };
  }, [refresh]);

  return {
    merchants,
    isLoading,
    refresh,
  } as const;
}
