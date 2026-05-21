import type {
  DashboardBudgetProgress,
  DashboardGoalProgress,
  DashboardRecentTransaction,
  DashboardSpendingBreakdownItem,
  DashboardSummary,
} from "@/hooks/use-dashboard";
import type { AnalyticsSnapshot } from "@/src/lib/analytics";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";

import type { AssistantFinancialContext } from "./types";

type BuildAssistantContextInput = {
  currencyCode?: string | null;
  summary: DashboardSummary | null;
  budgets: DashboardBudgetProgress[];
  spendingBreakdown: DashboardSpendingBreakdownItem[];
  recentTransactions: DashboardRecentTransaction[];
  goals: DashboardGoalProgress[];
  analytics: AnalyticsSnapshot;
};

function round(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function buildAssistantContext(
  input: BuildAssistantContextInput,
): AssistantFinancialContext {
  const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const summary = input.summary ?? {
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
  };
  const topGoals = input.goals.slice(0, 3).map((goal) => ({
    title: goal.title,
    progress: round(goal.progress),
    remaining: round(goal.remaining),
  }));

  return {
    currencyCode,
    summary: {
      totalBalance: round(summary.totalBalance),
      totalIncome: round(summary.totalIncome),
      totalExpenses: round(summary.totalExpenses),
      netCashFlow: round(summary.netCashFlow),
    },
    currentPeriod: {
      label: input.analytics.range.label,
      budgetHealthScore: round(input.analytics.budgetHealth.score),
      budgetHealthTone: input.analytics.budgetHealth.tone,
      totalIncome: round(input.analytics.incomeVsExpenses.totalIncome),
      totalExpenses: round(input.analytics.incomeVsExpenses.totalExpenses),
      netSavings: round(input.analytics.incomeVsExpenses.netSavings),
      topCategory: input.analytics.spendingBreakdown.topCategory,
    },
    budgets: input.budgets.slice(0, 4).map((budget) => ({
      title: budget.title,
      progress: round(budget.progress),
      status: budget.status,
      spentLabel: budget.spentLabel,
      remainingLabel: budget.remainingLabel,
    })),
    categories: input.spendingBreakdown.slice(0, 5).map((item) => ({
      name: item.categoryName?.trim() || "Uncategorized",
      total: round(item.total),
    })),
    recentTransactions: input.recentTransactions.slice(0, 5).map((item) => ({
      merchant: item.merchant,
      category: item.category,
      amountLabel: item.amountLabel,
      dateLabel: item.dateLabel,
      typeLabel: item.typeLabel,
    })),
    goals: {
      activeGoalsCount: input.goals.filter((goal) => !goal.isCompleted).length,
      completedGoalsCount: input.goals.filter((goal) => goal.isCompleted).length,
      totalSaved: round(
        input.goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
      ),
      totalTarget: round(
        input.goals.reduce((sum, goal) => sum + goal.targetAmount, 0),
      ),
      topGoals,
    },
    insights: input.analytics.insights.slice(0, 3).map((item) => item.message),
  };
}
