import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { budgetsService } from "@/src/db/services";
import { getBudgetProgress } from "@/src/db/queries/dashboard";
import { onAccountsChanged } from "@/src/lib/dbSync";
import { getBudgetCycleRange } from "@/src/db/utils/time";

export type BudgetCycle = "weekly" | "biweekly" | "monthly";

export type BudgetCardItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgetLimit: number;
  amountSpent: number;
  remainingAmount: number;
  progress: number;
  transactionCount: number;
  cycle: BudgetCycle;
  startDate: string;
  endDate: string;
};

function inRange(anchorDate: string, startDate: string, endDate: string) {
  return startDate <= anchorDate && anchorDate <= endDate;
}

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useBudgets(selectedCycle: BudgetCycle, anchorDate?: Date) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const fallbackAnchorDateRef = useRef(new Date());
  const resolvedAnchorDate = anchorDate ?? fallbackAnchorDateRef.current;
  const anchorIso = resolvedAnchorDate.toISOString();
  const [budgets, setBudgets] = useState<BudgetCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBudgets([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rows = await getBudgetProgress(userId);
      const next = rows
        .filter(
          (budget) =>
            budget.period === selectedCycle &&
            inRange(anchorIso, budget.startDate, budget.endDate),
        )
        .map((budget) => ({
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name ?? "Expense Category",
          categoryIcon: budget.category?.icon ?? "shape-outline",
          categoryColor: budget.category?.color ?? "#64748B",
          budgetLimit: budget.amount,
          amountSpent: budget.spent,
          remainingAmount: budget.remaining,
          progress: budget.progress / 100,
          transactionCount: budget.transactionCount ?? 0,
          cycle: budget.period as BudgetCycle,
          startDate: budget.startDate,
          endDate: budget.endDate,
        }));

      setBudgets(next);
    } catch (error) {
      setError(describeError(error, "Unable to load budgets."));
    } finally {
      setIsLoading(false);
    }
  }, [anchorIso, selectedCycle, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      void refresh();
    });

    return () => {
      off();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh]),
  );

  const summary = useMemo(() => {
    return budgets.reduce(
      (totals, budget) => {
        totals.limit += budget.budgetLimit;
        totals.spent += budget.amountSpent;
        totals.transactions += budget.transactionCount;
        return totals;
      },
      { limit: 0, spent: 0, transactions: 0 },
    );
  }, [budgets]);

  return {
    budgets,
    summary,
    isLoading,
    error,
    refresh,
  } as const;
}

export function useAvailableBudgetCategories(selectedCycle: BudgetCycle, anchorDate?: Date) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const fallbackAnchorDateRef = useRef(new Date());
  const resolvedAnchorDate = anchorDate ?? fallbackAnchorDateRef.current;
  const anchorIso = resolvedAnchorDate.toISOString();
  const [categoryIdsWithActiveBudget, setCategoryIdsWithActiveBudget] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategoryIdsWithActiveBudget(new Set());
      return;
    }

    const rows = await budgetsService.fetch(userId);
    const next = new Set(
      rows
        .filter(
          (budget) =>
            budget.period === selectedCycle &&
            inRange(anchorIso, budget.startDate, budget.endDate),
        )
        .map((budget) => budget.categoryId),
    );
    setCategoryIdsWithActiveBudget(next);
  }, [anchorIso, selectedCycle, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      void refresh();
    });

    return () => {
      off();
    };
  }, [refresh]);

  const cycleRange = useMemo(
    () => getBudgetCycleRange(selectedCycle, resolvedAnchorDate),
    [resolvedAnchorDate, selectedCycle],
  );

  return {
    categoryIdsWithActiveBudget,
    cycleRange,
    refresh,
  } as const;
}
