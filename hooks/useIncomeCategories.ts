import { useCategories, type CategoryOption } from "@/hooks/useCategories";

export function useIncomeCategories() {
  return useCategories("income");
}

export type IncomeCategoryOption = CategoryOption;
