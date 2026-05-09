import { useMemo } from "react";

import { getMerchantsForCategory } from "@/constants/expense-merchants";

export function useMerchantsByCategory(categoryName?: string | null) {
  return useMemo(() => {
    if (!categoryName) {
      return [];
    }

    return getMerchantsForCategory(categoryName);
  }, [categoryName]);
}
