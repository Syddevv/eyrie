import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { categoriesService, type ManagedCategory } from "@/src/db/services";
import { onCategoriesChanged } from "@/src/lib/dbSync";
import {
  SYSTEM_CATEGORY_USER_ID,
  type CategoryType,
} from "@/src/db/utils/constants";

export type CategoryIconType = "vector" | "emoji" | "uploaded_image";

export type CategoryOption = {
  id: string;
  label: string;
  type: CategoryType;
  iconType: CategoryIconType;
  icon: string;
  iconName: string | null;
  iconImageUri: string | null;
  emoji: string | null;
  color: string;
  isDefault: boolean;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
};

function mapCategoryOption(category: {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  iconType?: string | null;
  iconName?: string | null;
  iconImageUri?: string | null;
  emoji?: string | null;
  color?: string | null;
  isDefault?: boolean | null;
  isSystem?: boolean | null;
  isArchived?: boolean | null;
  createdAt?: string;
}): CategoryOption {
  const iconType = (category.iconType ?? "vector") as CategoryIconType;
  const iconName = category.iconName ?? category.icon ?? "shape-outline";
  const emoji = category.emoji ?? null;
  const iconImageUri = category.iconImageUri ?? null;

  return {
    id: category.id,
    label: category.name,
    type: category.type as CategoryType,
    iconType,
    icon:
      iconType === "emoji"
        ? (emoji ?? "🏷️")
        : iconType === "uploaded_image"
          ? (iconImageUri ?? "")
          : iconName,
    iconName,
    iconImageUri,
    emoji,
    color: category.color ?? "#64748B",
    isDefault: Boolean(category.isDefault),
    isSystem: Boolean(category.isSystem),
    isArchived: Boolean(category.isArchived),
    createdAt: category.createdAt ?? new Date().toISOString(),
  };
}

function sortCategoryOptions(left: CategoryOption, right: CategoryOption) {
  if (left.isSystem !== right.isSystem) {
    return left.isSystem ? -1 : 1;
  }

  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  // Sort by creation date (newest first), then alphabetically
  const dateComparison =
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return left.label.localeCompare(right.label);
}

export function useCategories(type?: CategoryType, includeArchived = false) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? SYSTEM_CATEGORY_USER_ID;
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await categoriesService.fetch(userId, type, includeArchived);
      const next = (rows ?? [])
        .map(mapCategoryOption)
        .sort(sortCategoryOptions);
      setCategories(next);
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived, type, userId]);

  useEffect(() => {
    fetchCategories().catch(() => undefined);
    const off = onCategoriesChanged(() => {
      fetchCategories().catch(() => undefined);
    });

    return off;
  }, [fetchCategories]);

  const defaultCategoryId = useMemo(
    () => categories.find((category) => !category.isArchived)?.id ?? null,
    [categories],
  );

  return {
    categories,
    defaultCategoryId,
    isLoading,
    refresh: fetchCategories,
  } as const;
}

export function useManagedCategories(includeArchived = true) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? SYSTEM_CATEGORY_USER_ID;
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await categoriesService.fetchManaged(
        userId,
        includeArchived,
      );
      setCategories(rows);
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived, userId]);

  useEffect(() => {
    refresh().catch(() => undefined);
    const off = onCategoriesChanged(() => {
      refresh().catch(() => undefined);
    });

    return off;
  }, [refresh]);

  return {
    categories,
    isLoading,
    refresh,
  } as const;
}
