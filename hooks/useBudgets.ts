import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAccounts } from "@/hooks/useAccounts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { budgetsService } from "@/src/db/services";
import { getBudgetProgress } from "@/src/db/queries/dashboard";
import { onAccountsChanged, onBudgetsChanged } from "@/src/lib/dbSync";
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
  nextResetDate: string;
};

export type BudgetPlanningSnapshot = {
  availableFunds: number;
  currentTotalBudgeted: number;
  newTotalBudgetedAfterSave: number;
  difference: number;
  exceedsAvailableFunds: boolean;
  status: "healthy" | "warning";
};

type UseBudgetsOptions = {
  syncCycle?: boolean;
};

function inRange(anchorDate: string, startDate: string, endDate: string) {
  return startDate <= anchorDate && anchorDate <= endDate;
}

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getSharedBudgets<T extends { startDate: string; endDate: string }>(
  rows: T[],
  anchorIso: string,
) {
  return rows.filter((budget) => inRange(anchorIso, budget.startDate, budget.endDate));
}

type BudgetProgressRow = Awaited<ReturnType<typeof getBudgetProgress>>[number];

function getSoonestResetDate(rows: { endDate: string }[]) {
  return rows.reduce<string | null>((soonest, row) => {
    if (!soonest) {
      return row.endDate;
    }

    return new Date(row.endDate).getTime() < new Date(soonest).getTime()
      ? row.endDate
      : soonest;
  }, null);
}

export function calculateBudgetPlanningSnapshot(input: {
  availableFunds: number;
  currentTotalBudgeted: number;
  proposedBudgetAmount: number;
}): BudgetPlanningSnapshot {
  const availableFunds = roundMoney(Math.max(input.availableFunds, 0));
  const currentTotalBudgeted = roundMoney(
    Math.max(input.currentTotalBudgeted, 0),
  );
  const proposedBudgetAmount = roundMoney(
    Math.max(input.proposedBudgetAmount, 0),
  );
  const newTotalBudgetedAfterSave = roundMoney(
    currentTotalBudgeted + proposedBudgetAmount,
  );
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

export function useBudgets(
  selectedCycle: BudgetCycle,
  anchorDate?: Date,
  options: UseBudgetsOptions = {},
) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const { syncCycle = false } = options;
  const fallbackAnchorDateRef = useRef(new Date());
  const resolvedAnchorDate = anchorDate ?? fallbackAnchorDateRef.current;
  const anchorIso = resolvedAnchorDate.toISOString();
  const [budgetRows, setBudgetRows] = useState<BudgetProgressRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const budgetRowsRef = useRef<BudgetProgressRow[]>([]);
  const selectedCycleRef = useRef(selectedCycle);

  useEffect(() => {
    selectedCycleRef.current = selectedCycle;
  }, [selectedCycle]);

  const refresh = useCallback(
    async (force = false) => {
      if (!userId) {
        budgetRowsRef.current = [];
        setBudgetRows([]);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        setHasResolved(false);
        setLastLoadedAt(null);
        return;
      }

      const shouldRefreshInBackground =
        force && budgetRowsRef.current.length > 0;
      setIsLoading((prev) => prev || budgetRowsRef.current.length === 0);
      setIsRefreshing(shouldRefreshInBackground);
      setError(null);

      try {
        if (syncCycle) {
          await budgetsService
            .ensureActiveCycleBudgets(
              userId,
              selectedCycleRef.current,
              resolvedAnchorDate,
            )
            .catch(() => undefined);
        }
        const rows = await getBudgetProgress(userId);
        budgetRowsRef.current = rows;
        setBudgetRows(rows);
        setHasResolved(true);
        setLastLoadedAt(Date.now());
      } catch (error) {
        setError(describeError(error, "Unable to load budgets."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resolvedAnchorDate, syncCycle, userId],
  );

  useEffect(() => {
    if (!syncCycle || !userId || !hasResolved) {
      return;
    }

    void refresh(true);
  }, [hasResolved, refresh, selectedCycle, syncCycle, userId]);

  useEffect(() => {
    const offAccounts = onAccountsChanged(() => {
      void refresh(true);
    });

    const offBudgets = onBudgetsChanged(() => {
      void refresh(true);
    });

    return () => {
      offAccounts();
      offBudgets();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        void budgetsService
          .resetBudgetsIfNeeded(userId, resolvedAnchorDate)
          .catch(() => undefined);
      }

      const shouldRefresh =
        !hasResolved ||
        lastLoadedAt === null ||
        Date.now() - lastLoadedAt > BUDGETS_STALE_MS;

      if (shouldRefresh) {
        void refresh(lastLoadedAt !== null);
      }

      return undefined;
    }, [hasResolved, lastLoadedAt, refresh, resolvedAnchorDate, userId]),
  );

  const activeBudgetRows = useMemo(
    () => getSharedBudgets(budgetRows, anchorIso),
    [anchorIso, budgetRows],
  );

  useEffect(() => {
    if (__DEV__ && hasResolved) {
      console.log("[budgets] shared budget hydration", {
        selectedCycle,
        rowCount: activeBudgetRows.length,
        totalBudget: activeBudgetRows.reduce(
          (sum, budget) => sum + (Number(budget.amount) || 0),
          0,
        ),
      });
    }
  }, [activeBudgetRows, hasResolved, selectedCycle]);

  const budgets = useMemo(
    () =>
      activeBudgetRows.map((budget) => ({
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category?.name ?? "Expense Category",
        categoryIconType: (budget.category?.iconType ??
          "vector") as BudgetCardItem["categoryIconType"],
        categoryIcon:
          budget.category?.iconName ?? budget.category?.icon ?? "shape-outline",
        categoryIconImageUri: budget.category?.iconImageUri ?? null,
        categoryEmoji: budget.category?.emoji ?? null,
        categoryColor: budget.category?.color ?? "#64748B",
        budgetLimit: budget.amount,
        amountSpent: budget.spent,
        remainingAmount: budget.remaining,
        progress: budget.progress / 100,
        transactionCount: budget.transactionCount ?? 0,
        cycle: selectedCycle,
        startDate: budget.startDate,
        endDate: budget.endDate,
        nextResetDate: budget.endDate,
      })),
    [activeBudgetRows, selectedCycle],
  );

  const cycleRange = useMemo(
    () =>
      getBudgetCycleRange({
        createdAt: resolvedAnchorDate,
        cycle: selectedCycle,
        currentDate: resolvedAnchorDate,
      }),
    [resolvedAnchorDate, selectedCycle],
  );

  const nextResetDate = useMemo(
    () => getSoonestResetDate(activeBudgetRows) ?? cycleRange.endDate,
    [activeBudgetRows, cycleRange.endDate],
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
    cycleRange,
    nextResetDate,
  } as const;
}

export function useAvailableBudgetCategories(
  selectedCycle: BudgetCycle,
  anchorDate?: Date,
) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const fallbackAnchorDateRef = useRef(new Date());
  const resolvedAnchorDate = anchorDate ?? fallbackAnchorDateRef.current;
  const anchorIso = resolvedAnchorDate.toISOString();
  const [isLoading, setIsLoading] = useState(false);
  const [categoryIdsWithActiveBudget, setCategoryIdsWithActiveBudget] =
    useState<Set<string>>(new Set());
  const [currentTotalBudgeted, setCurrentTotalBudgeted] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategoryIdsWithActiveBudget(new Set());
      setCurrentTotalBudgeted(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    await budgetsService
      .ensureActiveCycleBudgets(userId, selectedCycle, resolvedAnchorDate)
      .catch(() => undefined);
    await budgetsService
      .resetBudgetsIfNeeded(userId, resolvedAnchorDate)
      .catch(() => undefined);
    const rows = await budgetsService.fetch(userId);
    const activeBudgets = getSharedBudgets(rows, anchorIso);
    setCategoryIdsWithActiveBudget(
      new Set(activeBudgets.map((budget) => budget.categoryId)),
    );
    setCurrentTotalBudgeted(
      roundMoney(activeBudgets.reduce((sum, budget) => sum + budget.amount, 0)),
    );

    if (__DEV__) {
      console.log("[budgets] shared planning hydration", {
        selectedCycle,
        rowCount: activeBudgets.length,
        currentTotalBudgeted: roundMoney(
          activeBudgets.reduce((sum, budget) => sum + budget.amount, 0),
        ),
      });
    }
    setIsLoading(false);
  }, [anchorIso, resolvedAnchorDate, selectedCycle, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offAccounts = onAccountsChanged(() => {
      void refresh();
    });

    const offBudgets = onBudgetsChanged(() => {
      void refresh();
    });

    return () => {
      offAccounts();
      offBudgets();
    };
  }, [refresh]);

  const cycleRange = useMemo(
    () =>
      getBudgetCycleRange({
        createdAt: resolvedAnchorDate,
        cycle: selectedCycle,
        currentDate: resolvedAnchorDate,
      }),
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
  const { currentTotalBudgeted, isLoading: isLoadingBudgets } =
    useAvailableBudgetCategories(selectedCycle, anchorDate);

  const availableFunds = useMemo(
    () =>
      roundMoney(
        accounts.reduce(
          (sum, account) => sum + (Number(account.balance) || 0),
          0,
        ),
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
