import { useCallback, useEffect, useMemo, useState } from "react";

import { categoriesService } from "@/src/db/services";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export type ExpenseCategoryOption = {
  id: string;
  label: string;
  icon: string;
  color: string;
  isDefault: boolean;
};

export function useExpenseCategories() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? "__system__";
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await categoriesService.fetch(userId, "expense");
      const next = (rows ?? [])
        .map((category) => ({
          id: category.id,
          label: category.name,
          icon: category.icon ?? "shape-outline",
          color: category.color ?? "#64748B",
          isDefault: Boolean(category.isDefault),
        }))
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return left.isDefault ? -1 : 1;
          }

          return left.label.localeCompare(right.label);
        });

      setCategories(next);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCategories().catch(() => undefined);
  }, [fetchCategories]);

  const defaultCategoryId = useMemo(
    () => categories[0]?.id ?? null,
    [categories],
  );

  return {
    categories,
    defaultCategoryId,
    isLoading,
    refresh: fetchCategories,
  } as const;
}
