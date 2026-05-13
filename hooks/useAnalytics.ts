import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { useAccounts } from "@/hooks/useAccounts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { getBudgetProgress } from "@/src/db/queries/dashboard";
import {
  buildAnalyticsSnapshot,
  type AnalyticsFilterKey,
} from "@/src/lib/analytics";
import {
  onAccountsChanged,
  onCategoriesChanged,
  onGoalsChanged,
} from "@/src/lib/dbSync";

type BudgetProgressRow = Awaited<ReturnType<typeof getBudgetProgress>>[number];

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAnalytics(filter: AnalyticsFilterKey) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { goals, isLoading: isLoadingGoals } = useSavingsGoals();
  const [budgets, setBudgets] = useState<BudgetProgressRow[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);

  const refreshBudgets = useCallback(async () => {
    if (!userId) {
      setBudgets([]);
      setBudgetsError(null);
      setIsLoadingBudgets(false);
      return;
    }

    setIsLoadingBudgets(true);
    setBudgetsError(null);

    try {
      const rows = await getBudgetProgress(userId);
      setBudgets(rows);
    } catch (error) {
      setBudgetsError(describeError(error, "Unable to load analytics budgets."));
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshBudgets();
  }, [refreshBudgets]);

  useEffect(() => {
    const offAccounts = onAccountsChanged(() => {
      void refreshBudgets();
    });
    const offGoals = onGoalsChanged(() => {
      void refreshBudgets();
    });
    const offCategories = onCategoriesChanged(() => {
      void refreshBudgets();
    });

    return () => {
      offAccounts();
      offGoals();
      offCategories();
    };
  }, [refreshBudgets]);

  useFocusEffect(
    useCallback(() => {
      void refreshBudgets();
      return undefined;
    }, [refreshBudgets]),
  );

  const deferredTransactions = useDeferredValue(transactions);
  const deferredAccounts = useDeferredValue(accounts);
  const deferredGoals = useDeferredValue(goals);
  const deferredBudgets = useDeferredValue(budgets);

  const snapshot = useMemo(
    () =>
      buildAnalyticsSnapshot({
        filter,
        currencyCode: user?.currency_code,
        transactions: deferredTransactions,
        budgets: deferredBudgets,
        accounts: deferredAccounts,
        goals: deferredGoals,
      }),
    [
      deferredAccounts,
      deferredBudgets,
      deferredGoals,
      deferredTransactions,
      filter,
      user?.currency_code,
    ],
  );

  return {
    analytics: snapshot,
    isLoading:
      isLoadingTransactions ||
      isLoadingAccounts ||
      isLoadingGoals ||
      isLoadingBudgets,
    error: budgetsError,
    refresh: refreshBudgets,
  } as const;
}
