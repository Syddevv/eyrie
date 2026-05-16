import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAccounts } from "@/hooks/useAccounts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { budgetsService } from "@/src/db/services";
import { getBudgetProgress } from "@/src/db/queries/dashboard";
import { onAccountsChanged } from "@/src/lib/dbSync";
import { roundMoney } from "@/src/db/utils/money";
import { getBudgetCycleRange } from "@/src/db/utils/time";

export type BudgetCycle = "weekly" | "biweekly" | "monthly";
const BUDGETS_STALE_MS = 30_000;

export type BudgetCardItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIconType: "vector" | "emoji" | "uploaded_image";
  categoryIcon: string;
  categoryIconImageUri: string | null;
  categoryEmoji: string | null;
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

export type BudgetPlanningSnapshot = {
  availableFunds: number;
  currentTotalBudgeted: number;
  newTotalBudgetedAfterSave: number;
  difference: number;
  exceedsAvailableFunds: boolean;
  status: "healthy" | "warning";
};

function inRange(anchorDate: string, startDate: string, endDate: string) {
  return startDate <= anchorDate && anchorDate <= endDate;
}

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getActiveBudgets<T extends { period: string; startDate: string; endDate: string }>(
  rows: T[],
  selectedCycle: BudgetCycle,
  anchorIso: string,
) {
  return rows.filter(
    (budget) =>
      budget.period === selectedCycle &&
      inRange(anchorIso, budget.startDate, budget.endDate),
  );
}

export function calculateBudgetPlanningSnapshot(input: {
  availableFunds: number;
  currentTotalBudgeted: number;
  proposedBudgetAmount: number;
}): BudgetPlanningSnapshot {
  const availableFunds = roundMoney(Math.max(input.availableFunds, 0));
  const currentTotalBudgeted = roundMoney(Math.max(input.currentTotalBudgeted, 0));
  const proposedBudgetAmount = roundMoney(Math.max(input.proposedBudgetAmount, 0));
  const newTotalBudgetedAfterSave = roundMoney(currentTotalBudgeted + proposedBudgetAmount);
  const difference = roundMoney(availableFunds - newTotalBudgetedAfterSave);
  const exceedsAvailableFunds = difference < 0;

  return {
    availableFunds,
    currentTotalBudgeted,
    newTotalBudgetedAfterSave,
    difference,
    exceedsAvailableFunds,
    status: exceedsAvailableFunds ? "warning" : "healthy",
  };
}

export function useBudgets(selectedCycle: BudgetCycle, anchorDate?: Date) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const fallbackAnchorDateRef = useRef(new Date());
  const resolvedAnchorDate = anchorDate ?? fallbackAnchorDateRef.current;
  const anchorIso = resolvedAnchorDate.toISOString();
  const [budgets, setBudgets] = useState<BudgetCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!userId) {
      setBudgets([]);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setHasResolved(false);
      setLastLoadedAt(null);
      return;
    }

    const shouldRefreshInBackground = force && budgets.length > 0;
    setIsLoading((prev) => prev || budgets.length === 0);
    setIsRefreshing(shouldRefreshInBackground);
    setError(null);

    try {
      const rows = await getBudgetProgress(userId);
      const next = getActiveBudgets(rows, selectedCycle, anchorIso)
        .map((budget) => ({
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name ?? "Expense Category",
          categoryIconType: (budget.category?.iconType ?? "vector") as BudgetCardItem["categoryIconType"],
          categoryIcon: budget.category?.iconName ?? budget.category?.icon ?? "shape-outline",
          categoryIconImageUri: budget.category?.iconImageUri ?? null,
          categoryEmoji: budget.category?.emoji ?? null,
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
      setHasResolved(true);
      setLastLoadedAt(Date.now());
    } catch (error) {
      setError(describeError(error, "Unable to load budgets."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [anchorIso, budgets.length, selectedCycle, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      void refresh(true);
    });

    return () => {
      off();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      const shouldRefresh =
        !hasResolved ||
        lastLoadedAt === null ||
        Date.now() - lastLoadedAt > BUDGETS_STALE_MS;

      if (shouldRefresh) {
        void refresh(lastLoadedAt !== null);
      }

      return undefined;
    }, [hasResolved, lastLoadedAt, refresh]),
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
    isRefreshing,
    hasResolved,
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
  const [isLoading, setIsLoading] = useState(false);
  const [categoryIdsWithActiveBudget, setCategoryIdsWithActiveBudget] = useState<Set<string>>(new Set());
  const [currentTotalBudgeted, setCurrentTotalBudgeted] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategoryIdsWithActiveBudget(new Set());
      setCurrentTotalBudgeted(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const rows = await budgetsService.fetch(userId);
    const activeBudgets = getActiveBudgets(rows, selectedCycle, anchorIso);
    setCategoryIdsWithActiveBudget(
      new Set(activeBudgets.map((budget) => budget.categoryId)),
    );
    setCurrentTotalBudgeted(
      roundMoney(activeBudgets.reduce((sum, budget) => sum + budget.amount, 0)),
    );
    setIsLoading(false);
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
    currentTotalBudgeted,
    isLoading,
    refresh,
  } as const;
}

export function useBudgetPlanningOverview(
  selectedCycle: BudgetCycle,
  proposedBudgetAmount: number,
  anchorDate?: Date,
) {
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { currentTotalBudgeted, isLoading: isLoadingBudgets } = useAvailableBudgetCategories(
    selectedCycle,
    anchorDate,
  );

  const availableFunds = useMemo(
    () =>
      roundMoney(
        accounts.reduce((sum, account) => sum + (Number(account.balance) || 0), 0),
      ),
    [accounts],
  );

  const snapshot = useMemo(
    () =>
      calculateBudgetPlanningSnapshot({
        availableFunds,
        currentTotalBudgeted,
        proposedBudgetAmount,
      }),
    [availableFunds, currentTotalBudgeted, proposedBudgetAmount],
  );

  return {
    ...snapshot,
    isLoading: isLoadingAccounts || isLoadingBudgets,
  } as const;
}
