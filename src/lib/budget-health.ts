import { clamp } from "@/src/db/utils/money";

export type BudgetHealthRow = {
  amount: number;
  spent: number;
};

export type BudgetHealthStatus = "onTrack" | "warning" | "overBudget";
export type BudgetProgressStatus = "healthy" | "limit" | "over";

export const BUDGET_WARNING_THRESHOLD = 0.8;

export type BudgetHealthSummary = {
  score: number;
  onTrackCount: number;
  warningCount: number;
  overBudgetCount: number;
};

export function getBudgetHealthStatus(
  spent: number,
  amount: number,
): BudgetHealthStatus {
  if (amount <= 0) {
    return "onTrack";
  }

  const ratio = spent / amount;
  if (ratio > 1) {
    return "overBudget";
  }
  if (ratio >= BUDGET_WARNING_THRESHOLD) {
    return "warning";
  }
  return "onTrack";
}

export function getBudgetProgressStatus(
  spent: number,
  amount: number,
): BudgetProgressStatus {
  const status = getBudgetHealthStatus(spent, amount);

  if (status === "overBudget") {
    return "over";
  }

  if (status === "warning") {
    return "limit";
  }

  return "healthy";
}

export function calculateBudgetHealthSummary(
  rows: BudgetHealthRow[],
): BudgetHealthSummary {
  if (!rows.length) {
    return {
      score: 100,
      onTrackCount: 0,
      warningCount: 0,
      overBudgetCount: 0,
    };
  }

  const aggregate = rows.reduce(
    (summary, row) => {
      const status = getBudgetHealthStatus(row.spent, row.amount);
      if (status === "onTrack") {
        summary.onTrackCount += 1;
      } else if (status === "warning") {
        summary.warningCount += 1;
      } else {
        summary.overBudgetCount += 1;
      }

      if (row.amount <= 0) {
        summary.totalScore += 100;
      } else {
        const remainingRatio = clamp((row.amount - row.spent) / row.amount, -1, 1);
        summary.totalScore += clamp(remainingRatio * 100, 0, 100);
      }

      return summary;
    },
    {
      onTrackCount: 0,
      warningCount: 0,
      overBudgetCount: 0,
      totalScore: 0,
    },
  );

  return {
    score: Math.round(clamp(aggregate.totalScore / rows.length, 0, 100)),
    onTrackCount: aggregate.onTrackCount,
    warningCount: aggregate.warningCount,
    overBudgetCount: aggregate.overBudgetCount,
  };
}
