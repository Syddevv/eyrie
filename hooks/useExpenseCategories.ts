import { useCategories, type CategoryOption } from "@/hooks/useCategories";

export function useExpenseCategories() {
  return useCategories("expense");
}

export type ExpenseCategoryOption = CategoryOption;
