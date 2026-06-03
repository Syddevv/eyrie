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
  const activeGoals = input.goals.filter((goal) => !goal.isCompleted);
  const completedGoals = input.goals.filter((goal) => goal.isCompleted);
  const totalBudgeted = round(
    input.budgets.reduce((sum, budget) => sum + budget.amount, 0),
  );
  const totalSpent = round(
    input.budgets.reduce((sum, budget) => sum + budget.spent, 0),
  );
  const totalRemaining = round(
    input.goals.reduce((sum, goal) => sum + goal.remaining, 0),
  );
  const totalSaved = round(
    input.goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
  );
  const totalTarget = round(
    input.goals.reduce((sum, goal) => sum + goal.targetAmount, 0),
  );
  const totalBudgetRemaining = round(
    input.budgets.reduce((sum, budget) => sum + budget.remaining, 0),
  );
  const budgetedCategories = input.budgets
    .map((budget) => budget.title.trim())
    .filter(Boolean);

  return {
    currencyCode,
    summary: {
      totalBalance: round(summary.totalBalance),
      totalIncome: round(summary.totalIncome),
      totalExpenses: round(summary.totalExpenses),
      netCashFlow: round(summary.netCashFlow),
    },
    budgetsSummary: {
      activeBudgetCount: input.budgets.length,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgetRemaining,
    },
    budgetedCategories,
    currentPeriod: {
      label: input.analytics.range.label,
      budgetHealthScore: round(input.analytics.budgetHealth.score),
      budgetHealthTone: input.analytics.budgetHealth.tone,
      totalIncome: round(input.analytics.incomeVsExpenses.totalIncome),
      totalExpenses: round(input.analytics.incomeVsExpenses.totalExpenses),
      netSavings: round(input.analytics.incomeVsExpenses.netSavings),
      topCategory: input.analytics.spendingBreakdown.topCategory,
    },
    budgets: input.budgets.map((budget) => ({
      categoryName: budget.title,
      title: budget.title,
      amount: round(budget.amount),
      spent: round(budget.spent),
      remaining: round(budget.remaining),
      progressPercent: round(budget.progress * 100),
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
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      totalSaved,
      totalTarget,
      totalRemaining,
      items: input.goals.map((goal) => ({
        title: goal.title,
        currentAmount: round(goal.currentAmount),
        targetAmount: round(goal.targetAmount),
        remaining: round(goal.remaining),
        progressPercent: round(goal.progress),
        isCompleted: Boolean(goal.isCompleted),
      })),
    },
    insights: input.analytics.insights.slice(0, 3).map((item) => item.message),
  };
}
