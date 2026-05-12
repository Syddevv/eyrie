import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getBudgetProgress } from "@/src/db/queries/dashboard";

export type BudgetWarning = {
  hasWarning: boolean;
  message: string | null;
  status: "limit" | "over" | null;
  budgetLimit: number | null;
  amountSpent: number | null;
};

/**
 * Hook that checks if a selected expense category has a budget that's at or over its limit.
 * Returns warning information to display to the user in the add expense modal.
 */
export function useBudgetWarning(categoryId: string | null): BudgetWarning {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [warning, setWarning] = useState<BudgetWarning>({
    hasWarning: false,
    message: null,
    status: null,
    budgetLimit: null,
    amountSpent: null,
  });

  const checkBudget = useCallback(async () => {
    if (!userId || !categoryId) {
      setWarning({
        hasWarning: false,
        message: null,
        status: null,
        budgetLimit: null,
        amountSpent: null,
      });
      return;
    }

    try {
      const budgets = await getBudgetProgress(userId);
      const currentBudget = budgets.find((b) => b.categoryId === categoryId);

      if (!currentBudget) {
        setWarning({
          hasWarning: false,
          message: null,
          status: null,
          budgetLimit: null,
          amountSpent: null,
        });
        return;
      }

      // Check if budget is at or over limit
      if (currentBudget.status === "limit" || currentBudget.status === "over") {
        const isOver = currentBudget.status === "over";
        const message = isOver
          ? `⚠️ Budget limit exceeded! You've already spent ₱${currentBudget.spent.toFixed(2)} of your ₱${currentBudget.amount.toFixed(2)} limit for this category.`
          : `⚠️ Budget limit reached! You've spent ₱${currentBudget.spent.toFixed(2)} of your ₱${currentBudget.amount.toFixed(2)} limit for this category.`;

        setWarning({
          hasWarning: true,
          message,
          status: currentBudget.status,
          budgetLimit: currentBudget.amount,
          amountSpent: currentBudget.spent,
        });
      } else {
        setWarning({
          hasWarning: false,
          message: null,
          status: null,
          budgetLimit: null,
          amountSpent: null,
        });
      }
    } catch (error) {
      console.error("Error checking budget:", error);
      setWarning({
        hasWarning: false,
        message: null,
        status: null,
        budgetLimit: null,
        amountSpent: null,
      });
    }
  }, [userId, categoryId]);

  useEffect(() => {
    void checkBudget();
  }, [checkBudget]);

  return warning;
}
