import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import { clamp, roundMoney } from "@/src/db/utils/money";
import {
  calculateBudgetHealthSummary,
  getBudgetHealthStatus,
} from "@/src/lib/budget-health";

type BudgetProgressRow = {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  category?: {
    name?: string | null;
    color?: string | null;
  } | null;
};

type EffectiveBudgetRow = BudgetProgressRow & {
  effectiveAmount: number;
  effectiveSpent: number;
};

type TransactionRow = {
  amount: number;
  currencyCode?: string;
  category?: string | null;
  categoryId?: string | null;
  transactionDate: string;
  typeValue: "expense" | "income" | "transfer";
};

type AccountRow = {
  id: string;
  balance: number;
  currencyCode?: string | null;
  isHidden?: boolean | null;
  type?: string | null;
};

type GoalRow = {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  isArchived?: boolean;
  isCompleted?: boolean;
};

export type AnalyticsFilterKey =
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear";

export type AnalyticsRange = {
  key: AnalyticsFilterKey;
  label: string;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
};

export type AnalyticsDonutSlice = {
  label: string;
  color: string;
  amount: number;
  percentage: number;
};

export type AnalyticsPoint = {
  label: string;
  shortLabel: string;
  amount: number;
};

export type IncomeExpensePoint = {
  label: string;
  income: number;
  expenses: number;
};

export type AnalyticsInsight = {
  id: string;
  message: string;
};

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  currencyCode: string;
  budgetHealth: {
    score: number;
    tone: "Excellent" | "Good" | "Warning" | "Critical";
    onTrackCount: number;
    warningCount: number;
    overBudgetCount: number;
  };
  spendingBreakdown: {
    totalSpent: number;
    topCategory: string | null;
    slices: AnalyticsDonutSlice[];
  };
  weeklySpending: {
    points: AnalyticsPoint[];
    total: number;
    changePercentage: number;
  };
  incomeVsExpenses: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    points: IncomeExpensePoint[];
  };
  insights: AnalyticsInsight[];
};

const DONUT_COLORS = ["#4F8CFF", "#3AD0A0", "#FF9640", "#9B63F8", "#D9D233"] as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayDiffInclusive(start: Date, end: Date) {
  const startTime = startOfDay(start).getTime();
  const endTime = startOfDay(end).getTime();
  return Math.max(1, Math.round((endTime - startTime) / 86400000) + 1);
}

function isWithinRange(value: string, start: Date, end: Date) {
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time >= start.getTime() && time <= end.getTime();
}

function getOverlapRange(leftStart: string, leftEnd: string, rightStart: Date, rightEnd: Date) {
  const start = new Date(leftStart);
  const end = new Date(leftEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const overlapStart = new Date(Math.max(start.getTime(), rightStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), rightEnd.getTime()));

  if (overlapStart > overlapEnd) {
    return null;
  }

  return { start: overlapStart, end: overlapEnd };
}

function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatShortMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
  }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
  }).format(date);
}

function safePercentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return roundMoney(((current - previous) / previous) * 100, 1);
}

function buildEffectiveBudgets(
  budgets: BudgetProgressRow[],
  transactions: TransactionRow[],
  range: AnalyticsRange,
) {
  return budgets.reduce<EffectiveBudgetRow[]>((items, budget) => {
    const overlap = getOverlapRange(budget.startDate, budget.endDate, range.start, range.end);
    if (!overlap) {
      return items;
    }

    const budgetStart = new Date(budget.startDate);
    const budgetEnd = new Date(budget.endDate);
    const totalDays = dayDiffInclusive(budgetStart, budgetEnd);
    const overlapDays = dayDiffInclusive(overlap.start, overlap.end);
    const effectiveAmount =
      totalDays > 0 ? roundMoney((budget.amount * overlapDays) / totalDays) : roundMoney(budget.amount);
    const effectiveSpent = roundMoney(
      transactions.reduce((sum, transaction) => {
        if (
          transaction.typeValue !== "expense" ||
          transaction.categoryId !== budget.categoryId ||
          !isWithinRange(transaction.transactionDate, overlap.start, overlap.end)
        ) {
          return sum;
        }

        return sum + transaction.amount;
      }, 0),
    );

    items.push({
      ...budget,
      effectiveAmount,
      effectiveSpent,
    });

    return items;
  }, []);
}

function deriveBudgetTone(score: number): AnalyticsSnapshot["budgetHealth"]["tone"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 45) return "Warning";
  return "Critical";
}

function toBucketKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function aggregateExpensesByCategory(
  transactions: TransactionRow[],
  start: Date,
  end: Date,
) {
  const totals = new Map<
    string,
    {
      label: string;
      amount: number;
    }
  >();

  for (const transaction of transactions) {
    if (transaction.typeValue !== "expense" || !isWithinRange(transaction.transactionDate, start, end)) {
      continue;
    }

    const key = transaction.categoryId ?? transaction.category ?? "uncategorized";
    const label = transaction.category?.trim() || "Uncategorized";
    const existing = totals.get(key);
    totals.set(key, {
      label,
      amount: roundMoney((existing?.amount ?? 0) + transaction.amount),
    });
  }

  return Array.from(totals.values()).sort((left, right) => right.amount - left.amount);
}

function buildBreakdown(
  transactions: TransactionRow[],
  start: Date,
  end: Date,
) {
  const totals = aggregateExpensesByCategory(transactions, start, end);
  const totalSpent = roundMoney(totals.reduce((sum, entry) => sum + entry.amount, 0));
  const topCategory = totals[0]?.label ?? null;

  if (!totalSpent) {
    return {
      totalSpent: 0,
      topCategory,
      slices: [] as AnalyticsDonutSlice[],
    };
  }

  const top = totals.slice(0, 4);
  const remainder = totals.slice(4);
  const slices = [...top];

  if (remainder.length) {
    slices.push({
      label: "Other",
      amount: roundMoney(remainder.reduce((sum, entry) => sum + entry.amount, 0)),
    });
  }

  return {
    totalSpent,
    topCategory,
    slices: slices.map((entry, index) => ({
      label: entry.label,
      color: DONUT_COLORS[index] ?? DONUT_COLORS[DONUT_COLORS.length - 1],
      amount: entry.amount,
      percentage: totalSpent > 0 ? roundMoney((entry.amount / totalSpent) * 100, 1) : 0,
    })),
  };
}

function buildWeeklySpendingPoints(
  transactions: TransactionRow[],
  range: AnalyticsRange,
) {
  const currentTotal = roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.typeValue !== "expense" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
        return sum;
      }
      return sum + transaction.amount;
    }, 0),
  );

  const previousTotal = roundMoney(
    transactions.reduce((sum, transaction) => {
      if (
        transaction.typeValue !== "expense" ||
        !isWithinRange(transaction.transactionDate, range.previousStart, range.previousEnd)
      ) {
        return sum;
      }
      return sum + transaction.amount;
    }, 0),
  );

  if (range.key === "thisWeek") {
    const map = new Map<string, number>();
    for (let index = 0; index < 7; index += 1) {
      const bucketDate = addDays(range.start, index);
      map.set(toBucketKey(bucketDate), 0);
    }

    for (const transaction of transactions) {
      if (transaction.typeValue !== "expense" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
        continue;
      }

      const key = toBucketKey(new Date(transaction.transactionDate));
      map.set(key, roundMoney((map.get(key) ?? 0) + transaction.amount));
    }

    return {
      points: Array.from(map.entries()).map(([key, amount]) => {
        const date = new Date(`${key}T00:00:00`);
        return {
          label: formatCompactDate(date),
          shortLabel: formatWeekday(date),
          amount,
        };
      }),
      total: currentTotal,
      changePercentage: safePercentChange(currentTotal, previousTotal),
    };
  }

  const bucketCount = 7;
  const map = new Map<string, AnalyticsPoint>();
  const daySpan = dayDiffInclusive(range.start, range.end);
  const bucketSize = Math.max(1, Math.ceil(daySpan / bucketCount));

  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = addDays(range.start, index * bucketSize);
    if (bucketStart > range.end) {
      break;
    }

    const bucketEnd = endOfDay(addDays(bucketStart, bucketSize - 1));
    const clampedBucketEnd = bucketEnd > range.end ? range.end : bucketEnd;
    const key = toBucketKey(bucketStart);
    map.set(key, {
      label: `${formatCompactDate(bucketStart)}-${formatCompactDate(clampedBucketEnd)}`,
      shortLabel: formatShortMonthDay(bucketStart),
      amount: 0,
    });
  }

  for (const transaction of transactions) {
    if (transaction.typeValue !== "expense" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
      continue;
    }

    const diffDays = Math.floor(
      (startOfDay(new Date(transaction.transactionDate)).getTime() - startOfDay(range.start).getTime()) / 86400000,
    );
    const bucketIndex = clamp(Math.floor(diffDays / bucketSize), 0, map.size - 1);
    const bucketStart = addDays(range.start, bucketIndex * bucketSize);
    const key = toBucketKey(bucketStart);
    const bucket = map.get(key);

    if (bucket) {
      bucket.amount = roundMoney(bucket.amount + transaction.amount);
    }
  }

  return {
    points: Array.from(map.values()),
    total: currentTotal,
    changePercentage: safePercentChange(currentTotal, previousTotal),
  };
}

function buildIncomeExpensePoints(
  transactions: TransactionRow[],
  range: AnalyticsRange,
) {
  const buckets = new Map<string, IncomeExpensePoint>();

  if (range.key === "thisWeek") {
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(range.start, index);
      const key = toBucketKey(date);
      buckets.set(key, {
        label: formatWeekday(date),
        income: 0,
        expenses: 0,
      });
    }

    for (const transaction of transactions) {
      if (transaction.typeValue === "transfer" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
        continue;
      }

      const key = toBucketKey(new Date(transaction.transactionDate));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (transaction.typeValue === "income") {
        bucket.income = roundMoney(bucket.income + transaction.amount);
      } else {
        bucket.expenses = roundMoney(bucket.expenses + transaction.amount);
      }
    }

    return Array.from(buckets.values());
  }

  if (range.key === "thisMonth" || range.key === "lastMonth") {
    const cursor = startOfDay(range.start);
    let index = 1;

    while (cursor <= range.end) {
      const bucketStart = new Date(cursor);
      const bucketEnd = endOfDay(addDays(bucketStart, 6));
      const key = toBucketKey(bucketStart);
      buckets.set(key, {
        label: `W${index}`,
        income: 0,
        expenses: 0,
      });
      cursor.setDate(cursor.getDate() + 7);
      index += 1;
      if (bucketEnd >= range.end) {
        break;
      }
    }

    for (const transaction of transactions) {
      if (transaction.typeValue === "transfer" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
        continue;
      }

      const diffDays = Math.floor(
        (startOfDay(new Date(transaction.transactionDate)).getTime() - startOfDay(range.start).getTime()) / 86400000,
      );
      const bucketIndex = clamp(Math.floor(diffDays / 7), 0, buckets.size - 1);
      const bucketStart = addDays(range.start, bucketIndex * 7);
      const key = toBucketKey(bucketStart);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (transaction.typeValue === "income") {
        bucket.income = roundMoney(bucket.income + transaction.amount);
      } else {
        bucket.expenses = roundMoney(bucket.expenses + transaction.amount);
      }
    }

    return Array.from(buckets.values());
  }

  const startMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  const cursor = new Date(startMonth);

  while (cursor <= endMonth) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      label: formatMonth(cursor),
      income: 0,
      expenses: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const transaction of transactions) {
    if (transaction.typeValue === "transfer" || !isWithinRange(transaction.transactionDate, range.start, range.end)) {
      continue;
    }

    const date = new Date(transaction.transactionDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (transaction.typeValue === "income") {
      bucket.income = roundMoney(bucket.income + transaction.amount);
    } else {
      bucket.expenses = roundMoney(bucket.expenses + transaction.amount);
    }
  }

  return Array.from(buckets.values());
}

function buildInsights(input: {
  range: AnalyticsRange;
  spendingBreakdown: AnalyticsSnapshot["spendingBreakdown"];
  weeklySpending: AnalyticsSnapshot["weeklySpending"];
  incomeVsExpenses: AnalyticsSnapshot["incomeVsExpenses"];
  budgetRows: EffectiveBudgetRow[];
  accounts: AccountRow[];
  goals: GoalRow[];
}) {
  const messages: AnalyticsInsight[] = [];
  const { budgetRows, spendingBreakdown, weeklySpending, incomeVsExpenses, accounts, goals } = input;

  const warningBudget = budgetRows.find(
    (budget) => getBudgetHealthStatus(budget.effectiveSpent, budget.effectiveAmount) === "warning",
  );
  const overBudget = budgetRows.find(
    (budget) => getBudgetHealthStatus(budget.effectiveSpent, budget.effectiveAmount) === "overBudget",
  );

  if (overBudget) {
    messages.push({
      id: "budget-over",
      message: `${overBudget.category?.name ?? "A category"} is over budget by ${formatCurrency(Math.max(0, overBudget.effectiveSpent - overBudget.effectiveAmount))}.`,
    });
  } else if (warningBudget) {
    const remaining = Math.max(0, warningBudget.effectiveAmount - warningBudget.effectiveSpent);
    messages.push({
      id: "budget-warning",
      message: `${warningBudget.category?.name ?? "A category"} is close to its limit with ${formatCurrency(remaining)} left.`,
    });
  }

  if (spendingBreakdown.topCategory && spendingBreakdown.totalSpent > 0) {
    const topSlice = spendingBreakdown.slices[0];
    messages.push({
      id: "top-category",
      message: `${spendingBreakdown.topCategory} leads spending at ${topSlice?.percentage ?? 0}% of this period's expenses.`,
    });
  }

  if (weeklySpending.changePercentage !== 0) {
    const direction = weeklySpending.changePercentage > 0 ? "increased" : "decreased";
    const amount = Math.abs(weeklySpending.changePercentage);
    messages.push({
      id: "weekly-change",
      message: `Weekly spending ${direction} by ${amount}% versus the previous matching period.`,
    });
  }

  if (incomeVsExpenses.netSavings > 0) {
    messages.push({
      id: "savings-positive",
      message: `You saved ${formatCurrency(incomeVsExpenses.netSavings)} after expenses in this period.`,
    });
  } else if (incomeVsExpenses.totalExpenses > incomeVsExpenses.totalIncome) {
    messages.push({
      id: "savings-negative",
      message: `Expenses exceeded income by ${formatCurrency(Math.abs(incomeVsExpenses.netSavings))} in this period.`,
    });
  }

  const visibleAccounts = accounts.filter((account) => !account.isHidden && account.type !== "credit");
  const totalBalance = roundMoney(
    visibleAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.balance) || 0), 0),
  );

  if (totalBalance > 0 && visibleAccounts.length) {
    messages.push({
      id: "balance",
      message: `${formatCurrency(totalBalance)} is currently spread across ${visibleAccounts.length} active wallet/account${visibleAccounts.length === 1 ? "" : "s"}.`,
    });
  }

  const activeGoal = goals.find((goal) => !goal.isArchived && !goal.isCompleted && goal.targetAmount > goal.currentAmount);
  if (activeGoal) {
    const progress = roundMoney((activeGoal.currentAmount / activeGoal.targetAmount) * 100, 0);
    messages.push({
      id: "goal",
      message: `${activeGoal.title} is ${progress}% funded with ${formatCurrency(Math.max(0, activeGoal.targetAmount - activeGoal.currentAmount))} left to save.`,
    });
  }

  if (!messages.length) {
    messages.push({
      id: "empty",
      message: "Add income, expenses, budgets, and goals to unlock richer financial insights here.",
    });
  }

  return messages.slice(0, 3);
}

export function formatCurrency(value: number, currencyCode = DEFAULT_CURRENCY_CODE) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getAnalyticsRange(
  key: AnalyticsFilterKey,
  referenceDate = new Date(),
): AnalyticsRange {
  const today = new Date(referenceDate);

  if (key === "thisWeek") {
    const start = startOfDay(addDays(today, -today.getDay()));
    const end = endOfDay(addDays(start, 6));
    return {
      key,
      label: "This Week",
      start,
      end,
      previousStart: startOfDay(addDays(start, -7)),
      previousEnd: endOfDay(addDays(start, -1)),
    };
  }

  if (key === "thisMonth") {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const end = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const previousStart = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const previousEnd = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    return {
      key,
      label: "This Month",
      start,
      end,
      previousStart,
      previousEnd,
    };
  }

  if (key === "lastMonth") {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    const previousStart = startOfDay(new Date(today.getFullYear(), today.getMonth() - 2, 1));
    const previousEnd = endOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 0));
    return {
      key,
      label: "Last Month",
      start,
      end,
      previousStart,
      previousEnd,
    };
  }

  if (key === "last3Months") {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 2, 1));
    const end = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const previousStart = startOfDay(new Date(today.getFullYear(), today.getMonth() - 5, 1));
    const previousEnd = endOfDay(new Date(today.getFullYear(), today.getMonth() - 2, 0));
    return {
      key,
      label: "Last 3 Months",
      start,
      end,
      previousStart,
      previousEnd,
    };
  }

  const start = startOfDay(new Date(today.getFullYear(), 0, 1));
  const end = endOfDay(new Date(today.getFullYear(), 11, 31));
  const previousStart = startOfDay(new Date(today.getFullYear() - 1, 0, 1));
  const previousEnd = endOfDay(new Date(today.getFullYear() - 1, 11, 31));

  return {
    key,
    label: "This Year",
    start,
    end,
    previousStart,
    previousEnd,
  };
}

export function buildAnalyticsSnapshot(input: {
  filter: AnalyticsFilterKey;
  currencyCode?: string | null;
  transactions: TransactionRow[];
  budgets: BudgetProgressRow[];
  accounts: AccountRow[];
  goals: GoalRow[];
  referenceDate?: Date;
}): AnalyticsSnapshot {
  const range = getAnalyticsRange(input.filter, input.referenceDate);
  const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const budgetRows = buildEffectiveBudgets(input.budgets, input.transactions, range);

  const budgetHealthSummary = calculateBudgetHealthSummary(
    budgetRows.map((budget) => ({
      amount: budget.effectiveAmount,
      spent: budget.effectiveSpent,
    })),
  );
  const score = budgetHealthSummary.score;

  const spendingBreakdown = buildBreakdown(input.transactions, range.start, range.end);
  const weeklySpending = buildWeeklySpendingPoints(input.transactions, range);
  const incomePoints = buildIncomeExpensePoints(input.transactions, range);
  const totalIncome = roundMoney(incomePoints.reduce((sum, point) => sum + point.income, 0));
  const totalExpenses = roundMoney(incomePoints.reduce((sum, point) => sum + point.expenses, 0));
  const netSavings = roundMoney(totalIncome - totalExpenses);

  const incomeVsExpenses = {
    totalIncome,
    totalExpenses,
    netSavings,
    points: incomePoints,
  };

  return {
    range,
    currencyCode,
    budgetHealth: {
      score,
      tone: deriveBudgetTone(score),
      onTrackCount: budgetHealthSummary.onTrackCount,
      warningCount: budgetHealthSummary.warningCount,
      overBudgetCount: budgetHealthSummary.overBudgetCount,
    },
    spendingBreakdown,
    weeklySpending,
    incomeVsExpenses,
    insights: buildInsights({
      range,
      spendingBreakdown,
      weeklySpending,
      incomeVsExpenses,
      budgetRows,
      accounts: input.accounts,
      goals: input.goals,
    }),
  };
}
