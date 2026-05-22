import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";

type IconLibrary = "feather" | "material";
type InsightTone =
  | "critical"
  | "goal"
  | "budget"
  | "savings"
  | "activity"
  | "onboarding";
type MascotVariant = 1 | 2 | 3;

type InsightIcon = {
  library: IconLibrary;
  name: string;
};

type InsightAction = "/transactions" | "/goals" | "/explore" | "/assistant";

type TransactionSnapshot = {
  id: string;
  amount: number;
  category: string;
  transactionDate: string;
  typeValue: "expense" | "income" | "transfer";
};

type BudgetSnapshot = {
  id: string;
  title: string;
  budgetLimit: number;
  amountSpent: number;
  remainingAmount: number;
  progress: number;
};

type GoalSnapshot = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
  isArchived: boolean;
  metrics?: {
    progressPercentage: number;
    remainingAmount: number;
    daysSinceLastContribution: number | null;
  };
};

type SpendingBreakdownItem = {
  categoryName: string | null;
  total: number;
};

type SummarySnapshot = {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
} | null;

type CurrentUserSnapshot = {
  currency_code?: string | null;
  current_streak?: number;
} | null;

export type HomeInsight = {
  id: string;
  priority: number;
  tone: InsightTone;
  title: string;
  headline: string;
  body: string;
  ctaLabel: string;
  route: InsightAction;
  pill: string;
  icon: InsightIcon;
  mascot: MascotVariant;
  gradient: readonly [string, string];
  pillBackground: string;
  pillTextColor: string;
  bubble: string;
};

export function buildHomeInsights(input: {
  summary: SummarySnapshot;
  currentUser: CurrentUserSnapshot;
  transactions: TransactionSnapshot[];
  budgets: BudgetSnapshot[];
  goals: GoalSnapshot[];
  spendingBreakdown: SpendingBreakdownItem[];
  referenceDate?: Date;
}) {
  const referenceDate = input.referenceDate ?? new Date();
  const currencyCode =
    input.currentUser?.currency_code ?? DEFAULT_CURRENCY_CODE;
  const transactions = input.transactions
    .filter((item) => item.typeValue !== "transfer")
    .sort(
      (left, right) =>
        new Date(right.transactionDate).getTime() -
        new Date(left.transactionDate).getTime(),
    );
  const budgets = input.budgets;
  const goals = input.goals.filter((goal) => !goal.isArchived);
  const activeGoals = goals.filter((goal) => !goal.isCompleted);
  const insights: HomeInsight[] = [];

  const monthRange = getMonthRange(referenceDate);
  const previousMonthRange = getPreviousMonthRange(referenceDate);
  const todayIso = getDateKey(referenceDate);
  const yesterdayIso = getDateKey(addDays(referenceDate, -1));
  const thisWeekRange = getRollingDayRange(referenceDate, 6);
  const previousWeekRange = getRollingDayRange(addDays(referenceDate, -7), 6);

  const currentMonth = summarizeTransactions(transactions, monthRange);
  const previousMonth = summarizeTransactions(transactions, previousMonthRange);
  const thisWeek = summarizeTransactions(transactions, thisWeekRange);
  const previousWeek = summarizeTransactions(transactions, previousWeekRange);
  const todaySummary = summarizeTransactions(transactions, {
    start: todayIso,
    end: todayIso,
  });
  const yesterdaySummary = summarizeTransactions(transactions, {
    start: yesterdayIso,
    end: yesterdayIso,
  });

  const mostUsedBudget = budgets
    .filter((budget) => budget.budgetLimit > 0)
    .sort((left, right) => right.progress - left.progress)[0];
  const overBudget = budgets.find(
    (budget) => budget.amountSpent > budget.budgetLimit,
  );
  const nearGoal = activeGoals
    .filter(
      (goal) =>
        (goal.metrics?.progressPercentage ?? getGoalProgress(goal)) >= 75,
    )
    .sort(
      (left, right) =>
        (right.metrics?.progressPercentage ?? getGoalProgress(right)) -
        (left.metrics?.progressPercentage ?? getGoalProgress(left)),
    )[0];
  const staleGoal = activeGoals
    .filter((goal) => (goal.metrics?.daysSinceLastContribution ?? -1) >= 5)
    .sort(
      (left, right) =>
        (right.metrics?.daysSinceLastContribution ?? 0) -
        (left.metrics?.daysSinceLastContribution ?? 0),
    )[0];
  const topCategory = input.spendingBreakdown[0];
  const streak = Number(input.currentUser?.current_streak ?? 0);
  const weeklyChange = getPercentChange(
    thisWeek.expenses,
    previousWeek.expenses,
  );
  const monthlySavingsChange = currentMonth.net - previousMonth.net;

  if (overBudget) {
    insights.push({
      id: `budget-over:${overBudget.id}`,
      priority: 100,
      tone: "critical",
      title: "Budget Alert",
      headline: `${overBudget.title} is over budget`,
      body: `You've gone ${formatCurrency(overBudget.amountSpent - overBudget.budgetLimit, currencyCode)} above plan this cycle. Review spending before it grows further.`,
      ctaLabel: "Check Budget",
      route: "/explore",
      pill: "Critical alert",
      icon: { library: "feather", name: "alert-triangle" },
      mascot: 3,
      gradient: ["#F97316", "#EF4444"],
      pillBackground: "#FFF1F2",
      pillTextColor: "#B42318",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if ((input.summary?.totalBalance ?? 0) <= 0 && currentMonth.expenses > 0) {
    insights.push({
      id: "balance-low",
      priority: 96,
      tone: "critical",
      title: "Balance Alert",
      headline: "Your available balance is running low",
      body: `${formatCurrency(input.summary?.totalBalance ?? 0, currencyCode)} is left across your visible balance. Pause and review today's spending before the next charge lands.`,
      ctaLabel: "View Activity",
      route: "/transactions",
      pill: "Balance watch",
      icon: { library: "feather", name: "slash" },
      mascot: 3,
      gradient: ["#FB7185", "#EF4444"],
      pillBackground: "#FFF1F2",
      pillTextColor: "#B42318",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if (nearGoal) {
    const remaining =
      nearGoal.metrics?.remainingAmount ??
      Math.max(0, nearGoal.targetAmount - nearGoal.currentAmount);
    const progress =
      nearGoal.metrics?.progressPercentage ?? getGoalProgress(nearGoal);

    insights.push({
      id: `goal-near:${nearGoal.id}`,
      priority: 90,
      tone: "goal",
      title: "Goal Momentum",
      headline: `You're ${Math.round(progress)}% closer to ${nearGoal.title}`,
      body: `Only ${formatCurrency(remaining, currencyCode)} left before this goal is complete. A small contribution now keeps the momentum high.`,
      ctaLabel: "View Goal",
      route: "/goals",
      pill: "Milestone",
      icon: { library: "feather", name: "target" },
      mascot: 2,
      gradient: ["#34D399", "#14B8A6"],
      pillBackground: "#E8FFF8",
      pillTextColor: "#0F766E",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if (staleGoal) {
    const daysSince = staleGoal.metrics?.daysSinceLastContribution ?? 0;

    insights.push({
      id: `goal-stale:${staleGoal.id}`,
      priority: 84,
      tone: "goal",
      title: "Goal Reminder",
      headline: `${staleGoal.title} needs a fresh contribution`,
      body: `You haven't added to this goal in ${daysSince} day${daysSince === 1 ? "" : "s"}. Even a small save today will keep progress moving.`,
      ctaLabel: "Save Now",
      route: "/goals",
      pill: "Needs attention",
      icon: { library: "feather", name: "clock" },
      mascot: 1,
      gradient: ["#38BDF8", "#22C55E"],
      pillBackground: "#ECFEFF",
      pillTextColor: "#0F766E",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (mostUsedBudget) {
    const progress = Math.round(mostUsedBudget.progress * 100);
    const isWarning = mostUsedBudget.progress >= 0.65;

    insights.push({
      id: `budget-progress:${mostUsedBudget.id}`,
      priority: isWarning ? 80 : 62,
      tone: "budget",
      title: isWarning ? "Budget Watch" : "Budget Health",
      headline: `You've used ${progress}% of your ${mostUsedBudget.title} budget`,
      body: isWarning
        ? `${formatCurrency(Math.max(0, mostUsedBudget.remainingAmount), currencyCode)} remains for the rest of this cycle. Stay measured to finish under plan.`
        : `You still have ${formatCurrency(Math.max(0, mostUsedBudget.remainingAmount), currencyCode)} available, which keeps this category in a healthy range.`,
      ctaLabel: "Check Budget",
      route: "/explore",
      pill: isWarning ? "Budget pulse" : "On track",
      icon: {
        library: "feather",
        name: isWarning ? "pie-chart" : "shield",
      },
      mascot: isWarning ? 1 : 2,
      gradient: isWarning
        ? (["#60A5FA", "#2F7CF7"] as const)
        : (["#22C55E", "#14B8A6"] as const),
      pillBackground: isWarning ? "#E9F2FF" : "#E8FFF8",
      pillTextColor: isWarning ? "#1D4ED8" : "#0F766E",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (monthlySavingsChange > 0 && currentMonth.net > 0) {
    insights.push({
      id: "savings-improved",
      priority: 74,
      tone: "savings",
      title: "Savings Progress",
      headline: "You saved more this month than last month",
      body: `Net savings improved by ${formatCurrency(monthlySavingsChange, currencyCode)}. Your income is covering expenses more efficiently this month.`,
      ctaLabel: "See Insights",
      route: "/assistant",
      pill: "Savings up",
      icon: { library: "feather", name: "trending-up" },
      mascot: 2,
      gradient: ["#10B981", "#14B8A6"],
      pillBackground: "#E8FFF8",
      pillTextColor: "#0F766E",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if (weeklyChange >= 15 && thisWeek.expenses > 0) {
    insights.push({
      id: "weekly-spending-up",
      priority: 72,
      tone: "budget",
      title: "Weekly Trend",
      headline: `Spending is up ${weeklyChange}% this week`,
      body: `${formatCurrency(thisWeek.expenses, currencyCode)} has gone out over the last 7 days. Review recent purchases before this week outruns the last one.`,
      ctaLabel: "View Activity",
      route: "/transactions",
      pill: "Trend alert",
      icon: { library: "feather", name: "trending-up" },
      mascot: 1,
      gradient: ["#60A5FA", "#2F7CF7"],
      pillBackground: "#E9F2FF",
      pillTextColor: "#1D4ED8",
      bubble: "rgba(255,255,255,0.12)",
    });
  } else if (
    weeklyChange <= -15 &&
    yesterdaySummary.expenses + todaySummary.expenses > 0
  ) {
    insights.push({
      id: "weekly-spending-down",
      priority: 64,
      tone: "savings",
      title: "Weekly Trend",
      headline: `You cut spending by ${Math.abs(weeklyChange)}% this week`,
      body: `The last 7 days closed at ${formatCurrency(thisWeek.expenses, currencyCode)} versus ${formatCurrency(previousWeek.expenses, currencyCode)} in the prior period. That is a solid reset.`,
      ctaLabel: "See Insights",
      route: "/assistant",
      pill: "Trend win",
      icon: { library: "feather", name: "trending-down" },
      mascot: 2,
      gradient: ["#22C55E", "#14B8A6"],
      pillBackground: "#E8FFF8",
      pillTextColor: "#0F766E",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (topCategory && currentMonth.expenses > 0) {
    const share = Math.round((topCategory.total / currentMonth.expenses) * 100);

    insights.push({
      id: `spending-top:${topCategory.categoryName ?? "uncategorized"}`,
      priority: 68,
      tone: "activity",
      title: "Spending Behavior",
      headline: `Most of your spending went to ${topCategory.categoryName ?? "Uncategorized"}`,
      body: `${formatCurrency(topCategory.total, currencyCode)} landed there this month, or about ${share}% of all expenses so far.`,
      ctaLabel: "View Activity",
      route: "/transactions",
      pill: "Spending pulse",
      icon: { library: "material", name: "chart-donut" },
      mascot: 1,
      gradient: ["#38BDF8", "#2F7CF7"],
      pillBackground: "#E9F2FF",
      pillTextColor: "#1D4ED8",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (todaySummary.expenses === 0 && transactions.length > 0) {
    insights.push({
      id: "no-expenses-today",
      priority: 58,
      tone: "activity",
      title: "Daily Check-in",
      headline: "No expenses recorded today",
      body: "Keep tracking consistently so your insights stay accurate. If you already spent today, log it now while it is fresh.",
      ctaLabel: "Track Today",
      route: "/transactions",
      pill: "Daily habit",
      icon: { library: "feather", name: "calendar" },
      mascot: 1,
      gradient: ["#60A5FA", "#6366F1"],
      pillBackground: "#EEF2FF",
      pillTextColor: "#4338CA",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (
    todaySummary.expenses > 0 &&
    yesterdaySummary.expenses > todaySummary.expenses
  ) {
    insights.push({
      id: "spent-less-than-yesterday",
      priority: 57,
      tone: "activity",
      title: "Spending Behavior",
      headline: "You spent less today than yesterday",
      body: `${formatCurrency(todaySummary.expenses, currencyCode)} went out today versus ${formatCurrency(yesterdaySummary.expenses, currencyCode)} yesterday. That is a strong day-over-day adjustment.`,
      ctaLabel: "View Activity",
      route: "/transactions",
      pill: "Daily improvement",
      icon: { library: "feather", name: "arrow-down-right" },
      mascot: 2,
      gradient: ["#22C55E", "#14B8A6"],
      pillBackground: "#E8FFF8",
      pillTextColor: "#0F766E",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  if (streak >= 3) {
    insights.push({
      id: `streak:${streak}`,
      priority: 54,
      tone: "activity",
      title: "Tracking Streak",
      headline: `${streak}-day tracking streak`,
      body: "You have been logging activity consistently. Keep the streak alive to unlock more reliable spending patterns and insights.",
      ctaLabel: "Track Today",
      route: "/transactions",
      pill: "Consistency",
      icon: { library: "feather", name: "award" },
      mascot: 2,
      gradient: ["#A78BFA", "#60A5FA"],
      pillBackground: "#F3E8FF",
      pillTextColor: "#6D28D9",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if (thisWeek.activeDays >= 5) {
    insights.push({
      id: `active-week:${thisWeek.activeDays}`,
      priority: 52,
      tone: "activity",
      title: "Weekly Momentum",
      headline: "You logged activity consistently this week",
      body: `${thisWeek.activeDays} separate tracking day${thisWeek.activeDays === 1 ? "" : "s"} are already on the board. That consistency improves budget and trend accuracy.`,
      ctaLabel: "See Insights",
      route: "/assistant",
      pill: "Weekly habit",
      icon: { library: "feather", name: "activity" },
      mascot: 2,
      gradient: ["#818CF8", "#38BDF8"],
      pillBackground: "#EEF2FF",
      pillTextColor: "#4338CA",
      bubble: "rgba(255,255,255,0.14)",
    });
  }

  if (!transactions.length && !budgets.length && !goals.length) {
    insights.push({
      id: "onboarding-empty",
      priority: 40,
      tone: "onboarding",
      title: "Eyrie Insight",
      headline: "Your dashboard is ready",
      body: "Track your first expense to unlock personalized insights across budgets, savings goals, and spending habits.",
      ctaLabel: "Add Expense",
      route: "/transactions",
      pill: "Ready",
      icon: { library: "material", name: "star-outline" },
      mascot: 1,
      gradient: ["#37D3C2", "#2DBBBA"],
      pillBackground: "#D8FFF4",
      pillTextColor: "#0E7C74",
      bubble: "rgba(255,255,255,0.12)",
    });
  } else if (!goals.length) {
    insights.push({
      id: "onboarding-goal",
      priority: 38,
      tone: "onboarding",
      title: "Goal Planning",
      headline: "Create your first savings goal",
      body: "Goals unlock milestone insights and make your progress feel tangible. Start with one target you want to fund next.",
      ctaLabel: "View Goal",
      route: "/goals",
      pill: "Next step",
      icon: { library: "feather", name: "target" },
      mascot: 1,
      gradient: ["#38BDF8", "#2F7CF7"],
      pillBackground: "#E9F2FF",
      pillTextColor: "#1D4ED8",
      bubble: "rgba(255,255,255,0.12)",
    });
  } else if (!budgets.length) {
    insights.push({
      id: "onboarding-budget",
      priority: 37,
      tone: "onboarding",
      title: "Budget Setup",
      headline: "Add a budget to watch your spending",
      body: "Budgets unlock early warnings and healthier spending signals. Start with the category you spend on most often.",
      ctaLabel: "Check Budget",
      route: "/explore",
      pill: "Next step",
      icon: { library: "feather", name: "pie-chart" },
      mascot: 1,
      gradient: ["#60A5FA", "#2F7CF7"],
      pillBackground: "#E9F2FF",
      pillTextColor: "#1D4ED8",
      bubble: "rgba(255,255,255,0.12)",
    });
  }

  const deduped = Array.from(
    new Map(
      insights
        .sort((left, right) => right.priority - left.priority)
        .map((insight) => [insight.id, insight]),
    ).values(),
  );

  return deduped.slice(0, 6);
}

function formatCurrency(value: number, currencyCode = DEFAULT_CURRENCY_CODE) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function getMonthRange(referenceDate: Date) {
  return {
    start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    end: new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  };
}

function getPreviousMonthRange(referenceDate: Date) {
  return {
    start: new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
    )
      .toISOString()
      .slice(0, 10),
    end: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0)
      .toISOString()
      .slice(0, 10),
  };
}

function getRollingDayRange(referenceDate: Date, daysBack: number) {
  return {
    start: getDateKey(addDays(referenceDate, -daysBack)),
    end: getDateKey(referenceDate),
  };
}

function summarizeTransactions(
  transactions: TransactionSnapshot[],
  range: { start: string; end: string },
) {
  let income = 0;
  let expenses = 0;
  const activeDays = new Set<string>();

  for (const transaction of transactions) {
    const key = transaction.transactionDate.slice(0, 10);
    if (key < range.start || key > range.end) {
      continue;
    }

    activeDays.add(key);

    if (transaction.typeValue === "income") {
      income += transaction.amount;
    } else if (transaction.typeValue === "expense") {
      expenses += transaction.amount;
    }
  }

  return {
    income,
    expenses,
    net: income - expenses,
    activeDays: activeDays.size,
  };
}

function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getGoalProgress(goal: GoalSnapshot) {
  return goal.targetAmount > 0
    ? (goal.currentAmount / goal.targetAmount) * 100
    : 0;
}
