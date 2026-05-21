import { formatCurrency } from "@/hooks/use-dashboard";
import { getBudgetHealthStatus } from "@/src/lib/budget-health";

export type BudgetVisualState = "safe" | "warning" | "over";

export function getBudgetVisualState(
  spent: number,
  amount: number,
): BudgetVisualState {
  const status = getBudgetHealthStatus(spent, amount);
  if (status === "overBudget") {
    return "over";
  }

  if (status === "warning") {
    return "warning";
  }

  return "safe";
}

export function getBudgetStatusCopy(
  state: BudgetVisualState,
  overAmount: number,
  usagePercent: number,
) {
  if (state === "over") {
    return {
      short: "Over budget",
      long: `Exceeded by ${formatCurrency(overAmount)}`,
      usageLabel: `${Math.round(usagePercent)}% used`,
      icon: "alert-triangle" as const,
    };
  }

  if (state === "warning") {
    return {
      short: "Budget running low",
      long: "Almost at limit",
      usageLabel: `You've used ${Math.round(usagePercent)}% of your budget`,
      icon: "alert-circle" as const,
    };
  }

  return {
    short: "",
    long: "",
    usageLabel: `${Math.round(usagePercent)}% used`,
    icon: "check-circle" as const,
  };
}

export function formatBudgetBalanceLabel(remainingAmount: number) {
  if (remainingAmount < 0) {
    return {
      value: formatCurrency(Math.abs(remainingAmount)),
      suffix: "over",
    };
  }

  return {
    value: formatCurrency(Math.max(remainingAmount, 0)),
    suffix: "remaining",
  };
}

export function getBudgetUsagePercent(spent: number, amount: number) {
  if (amount <= 0) {
    return 0;
  }

  return Math.max(0, (spent / amount) * 100);
}

export function getBudgetProgressRatio(spent: number, amount: number) {
  if (amount <= 0) {
    return 0;
  }

  return Math.max(0, spent / amount);
}
