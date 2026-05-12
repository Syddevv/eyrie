import { and, desc, eq, gte, lte, ne } from "drizzle-orm";

import {
  getMonthlyAnalytics,
  getWeeklySpending,
} from "@/src/db/queries/dashboard";
import { db } from "@/src/db/client";
import { accounts, budgets, goals, transactions } from "@/src/db/schema";
import { roundMoney } from "@/src/db/utils/money";
import { addDaysIso, nowIso } from "@/src/db/utils/time";

import { ensureNotificationPreferences, upsertNotifications } from "./notifications-api";
import { buildNotificationCandidate, shouldNotifyViaPush } from "./notifications-metadata";
import { presentLocalNotification } from "./notifications-push";
import type { AppNotification, NotificationCandidate } from "./types";

const BUDGET_THRESHOLDS = [50, 80, 100] as const;
const GOAL_MILESTONES = [50, 75, 85, 100] as const;
const LOW_BALANCE_THRESHOLDS: Record<string, number> = {
  bank: 1000,
  ewallet: 500,
  cash: 500,
  credit: 0,
};

function monthKey(value: string) {
  return value.slice(0, 7);
}

function weekKey(anchor = new Date()) {
  const start = new Date(anchor);
  const day = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

function sanitizeMerchantName(value?: string | null) {
  return (value ?? "merchant").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

async function persistCandidates(userId: string, candidates: NotificationCandidate[]) {
  if (!candidates.length) {
    return [] as AppNotification[];
  }

  const inserted = await upsertNotifications(userId, candidates);
  if (!inserted.length) {
    return [];
  }

  const preferences = await ensureNotificationPreferences(userId);
  for (const notification of inserted) {
    if (shouldNotifyViaPush(notification, preferences)) {
      await presentLocalNotification(notification);
    }
  }

  return inserted;
}

async function buildBudgetThresholdCandidates(input: {
  userId: string;
  categoryId: string | null;
  transactionDate: string;
  previousExpenseAmount: number;
  nextExpenseAmount: number;
}) {
  if (!input.categoryId) {
    return [] as NotificationCandidate[];
  }

  const matchingBudgets = await db.query.budgets.findMany({
    where: and(
      eq(budgets.userId, input.userId),
      eq(budgets.categoryId, input.categoryId),
      lte(budgets.startDate, input.transactionDate),
      gte(budgets.endDate, input.transactionDate),
    ),
    with: {
      category: true,
    },
  });

  const candidates: NotificationCandidate[] = [];

  for (const budget of matchingBudgets) {
    if (budget.amount <= 0) {
      continue;
    }

    const previousSpent = budget.spent - input.nextExpenseAmount + input.previousExpenseAmount;
    const previousProgress = (previousSpent / budget.amount) * 100;
    const nextProgress = (budget.spent / budget.amount) * 100;

    for (const threshold of BUDGET_THRESHOLDS) {
      if (previousProgress < threshold && nextProgress >= threshold) {
        const isExceeded = threshold === 100;
        const categoryName = budget.category?.name ?? "Budget";
        candidates.push(
          buildNotificationCandidate({
            type: isExceeded ? "budget_exceeded" : "budget_warning",
            title: isExceeded
              ? `${categoryName} budget exceeded`
              : `${categoryName} budget at ${threshold}%`,
            message: isExceeded
              ? `You have fully used your ${categoryName} budget for this cycle.`
              : `You have reached ${threshold}% of your ${categoryName} budget.`,
            data: {
              budgetId: budget.id,
              categoryId: budget.categoryId,
              progress: roundMoney(nextProgress),
              periodKey: monthKey(budget.startDate),
              url: "/explore",
            },
            action_url: "/explore",
            dedupe_key: `budget:${budget.id}:${threshold}:${monthKey(budget.startDate)}`,
          }),
        );
      }
    }
  }

  return candidates;
}

async function buildUnusualSpendingCandidate(input: {
  userId: string;
  transactionId: string;
  amount: number;
  categoryId: string | null;
  merchantName?: string | null;
}) {
  if (!input.categoryId || input.amount <= 0) {
    return null;
  }

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, input.userId),
      eq(transactions.type, "expense"),
      eq(transactions.categoryId, input.categoryId),
      ne(transactions.id, input.transactionId),
    ),
    orderBy: [desc(transactions.transactionDate)],
    limit: 8,
  });

  const history = rows.map((row) => row.amount).filter((value) => value > 0);
  const average = history.length
    ? history.reduce((sum, value) => sum + value, 0) / history.length
    : 0;
  const threshold = history.length >= 3 ? Math.max(average * 2.2, 2500) : 6000;

  if (input.amount < threshold) {
    return null;
  }

  return buildNotificationCandidate({
    type: "unusual_spending",
    title: "Unusual spending detected",
    message: `A ${input.amount.toFixed(2)} expense${input.merchantName ? ` at ${input.merchantName}` : ""} is higher than your usual pattern.`,
    data: {
      transactionId: input.transactionId,
      categoryId: input.categoryId,
      amount: input.amount,
      url: "/transactions",
    },
    action_url: "/transactions",
    dedupe_key: `txn:unusual:${input.transactionId}`,
  });
}

async function buildRecurringBillCandidate(input: {
  userId: string;
  transactionId: string;
  merchantName?: string | null;
  categoryId: string | null;
  amount: number;
}) {
  if (!input.merchantName || !input.categoryId) {
    return null;
  }

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, input.userId),
      eq(transactions.type, "expense"),
      eq(transactions.categoryId, input.categoryId),
      eq(transactions.merchantName, input.merchantName),
      ne(transactions.id, input.transactionId),
    ),
    orderBy: [desc(transactions.transactionDate)],
    limit: 6,
  });

  const similar = rows.filter((row) => {
    const difference = Math.abs(row.amount - input.amount);
    return difference <= Math.max(100, input.amount * 0.15);
  });

  if (similar.length < 3) {
    return null;
  }

  const dates = similar
    .map((row) => new Date(row.transactionDate).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  if (dates.length < 3) {
    return null;
  }

  const intervals: number[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    intervals.push((dates[index] - dates[index - 1]) / 86400000);
  }

  const averageInterval =
    intervals.reduce((sum, value) => sum + value, 0) / intervals.length;

  if (averageInterval < 20 || averageInterval > 40) {
    return null;
  }

  return buildNotificationCandidate({
    type: "recurring_bill",
    title: "Recurring bill recognized",
    message: `${input.merchantName} looks like a recurring expense. Keep it in mind for your next budget cycle.`,
    data: {
      transactionId: input.transactionId,
      categoryId: input.categoryId,
      merchantId: sanitizeMerchantName(input.merchantName),
      url: "/transactions",
    },
    action_url: "/transactions",
    dedupe_key: `txn:recurring:${sanitizeMerchantName(input.merchantName)}:${monthKey(nowIso())}`,
  });
}

async function buildLowBalanceCandidate(input: {
  accountId: string;
  userId: string;
}) {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, input.accountId),
  });

  if (!account) {
    return null;
  }

  const threshold = LOW_BALANCE_THRESHOLDS[account.type] ?? 0;
  if (threshold <= 0 || account.balance >= threshold) {
    return null;
  }

  return buildNotificationCandidate({
    type: "wallet_low_balance",
    title: `${account.name} is running low`,
    message: `Your ${account.name} balance is below ${threshold.toFixed(2)}.`,
    data: {
      accountId: account.id,
      amount: account.balance,
      url:
        account.type === "ewallet" || account.type === "cash"
          ? "/payment-wallet-details-modal"
          : "/payment-card-details-modal",
    },
    action_url:
      account.type === "ewallet" || account.type === "cash"
        ? `/payment-wallet-details-modal?accountId=${account.id}`
        : `/payment-card-details-modal?accountId=${account.id}`,
    dedupe_key: `wallet:low:${account.id}:${monthKey(nowIso())}`,
  });
}

function buildGoalMilestoneCandidates(input: {
  goal: { id: string; title: string; targetAmount: number; currentAmount: number; targetDate: string };
  previousAmount: number;
}) {
  const nextProgress = clampProgress(
    (input.goal.currentAmount / input.goal.targetAmount) * 100,
  );
  const previousProgress = clampProgress(
    (input.previousAmount / input.goal.targetAmount) * 100,
  );
  const candidates: NotificationCandidate[] = [];

  for (const milestone of GOAL_MILESTONES) {
    if (previousProgress < milestone && nextProgress >= milestone) {
      candidates.push(
        buildNotificationCandidate({
          type: milestone === 100 ? "goal_completed" : "goal_progress",
          title:
            milestone === 100
              ? `${input.goal.title} completed`
              : `${input.goal.title} at ${milestone}%`,
          message:
            milestone === 100
              ? `You reached your ${input.goal.title} savings goal.`
              : `You are now ${milestone}% of the way to ${input.goal.title}.`,
          data: {
            goalId: input.goal.id,
            progress: milestone,
            url: `/goal-details-modal?goalId=${input.goal.id}`,
          },
          action_url: `/goal-details-modal?goalId=${input.goal.id}`,
          dedupe_key: `goal:${input.goal.id}:${milestone}`,
        }),
      );
    }
  }

  const now = new Date();
  const targetDate = new Date(input.goal.targetDate);
  const createdMonthsRemaining = Math.max(
    1,
    (targetDate.getTime() - now.getTime()) / (30 * 86400000),
  );
  const remaining = Math.max(0, input.goal.targetAmount - input.goal.currentAmount);
  const requiredMonthly = remaining / createdMonthsRemaining;
  const currentMonthlyPace = Math.max(0, input.goal.currentAmount - input.previousAmount);

  if (remaining > 0 && currentMonthlyPace > 0 && currentMonthlyPace < requiredMonthly) {
    candidates.push(
      buildNotificationCandidate({
        type: "reminder",
        title: `${input.goal.title} needs a little more pace`,
        message: `At your latest contribution pace, this goal may finish behind schedule.`,
        data: {
          goalId: input.goal.id,
          url: `/goal-details-modal?goalId=${input.goal.id}`,
        },
        action_url: `/goal-details-modal?goalId=${input.goal.id}`,
        dedupe_key: `goal:behind:${input.goal.id}:${monthKey(nowIso())}`,
      }),
    );
  }

  return candidates;
}

function buildContributionCandidate(input: {
  goalId: string;
  goalTitle: string;
  amount: number;
}) {
  return buildNotificationCandidate({
    type: "contribution_added",
    title: "Contribution added",
    message: `You added ${input.amount.toFixed(2)} to ${input.goalTitle}.`,
    data: {
      goalId: input.goalId,
      amount: input.amount,
      url: `/goal-details-modal?goalId=${input.goalId}`,
    },
    action_url: `/goal-details-modal?goalId=${input.goalId}`,
    dedupe_key: `goal:contribution:${input.goalId}:${nowIso()}`,
  });
}

async function buildPeriodicCandidates(userId: string) {
  const candidates: NotificationCandidate[] = [];
  const now = new Date();

  const weekly = await getWeeklySpending(userId, nowIso());
  const currentWeekTotal = weekly.reduce((sum, row) => sum + row.total, 0);
  const previousWeek = await getWeeklySpending(userId, addDaysIso(nowIso(), -7));
  const previousWeekTotal = previousWeek.reduce((sum, row) => sum + row.total, 0);

  candidates.push(
    buildNotificationCandidate({
      type: "weekly_report",
      title: "Weekly spending summary",
      message:
        previousWeekTotal > 0 && currentWeekTotal < previousWeekTotal
          ? `You spent ${Math.round(((previousWeekTotal - currentWeekTotal) / previousWeekTotal) * 100)}% less than last week.`
          : `Your spending this week totals ${currentWeekTotal.toFixed(2)}.`,
      data: {
        amount: currentWeekTotal,
        periodKey: weekKey(now),
        url: "/(tabs)",
      },
      action_url: "/(tabs)",
      dedupe_key: `report:weekly:${weekKey(now)}`,
    }),
  );

  const currentMonth = await getMonthlyAnalytics(userId, nowIso());
  const previousMonth = await getMonthlyAnalytics(userId, addDaysIso(nowIso(), -32));
  candidates.push(
    buildNotificationCandidate({
      type: "monthly_report",
      title: "Monthly savings summary",
      message:
        currentMonth.savings >= previousMonth.savings
          ? `Your savings improved to ${currentMonth.savings.toFixed(2)} this month.`
          : `This month you saved ${currentMonth.savings.toFixed(2)}.`,
      data: {
        amount: currentMonth.savings,
        periodKey: currentMonth.month,
        url: "/(tabs)",
      },
      action_url: "/(tabs)",
      dedupe_key: `report:monthly:${currentMonth.month}`,
    }),
  );

  const topCategory = currentMonth.breakdown[0];
  if (topCategory?.categoryName) {
    candidates.push(
      buildNotificationCandidate({
        type: "savings_tip",
        title: "Savings tip",
        message: `Your top spend is ${topCategory.categoryName}. A small cut there would improve next month’s savings fastest.`,
        data: {
          categoryId: topCategory.categoryId,
          periodKey: weekKey(now),
          url: "/explore",
        },
        action_url: "/explore",
        dedupe_key: `tip:${weekKey(now)}`,
      }),
    );
  }

  if (previousWeekTotal > 0 && currentWeekTotal < previousWeekTotal * 0.9) {
    candidates.push(
      buildNotificationCandidate({
        type: "achievement",
        title: "Spending streak unlocked",
        message: "You cut weekly spending by at least 10%. Keep the streak going.",
        data: {
          periodKey: weekKey(now),
          url: "/(tabs)",
        },
        action_url: "/(tabs)",
        dedupe_key: `achievement:spending-streak:${weekKey(now)}`,
      }),
    );
  }

  return candidates;
}

export async function generatePeriodicNotifications(userId: string) {
  const preferences = await ensureNotificationPreferences(userId);
  const candidates = (await buildPeriodicCandidates(userId)).filter((candidate) => {
    if (!preferences.notifications_enabled) {
      return false;
    }
    if (candidate.type === "weekly_report") {
      return preferences.weekly_reports;
    }
    if (candidate.type === "monthly_report") {
      return preferences.monthly_reports;
    }
    if (candidate.type === "savings_tip") {
      return preferences.savings_tips;
    }
    return true;
  });

  return persistCandidates(userId, candidates);
}

export async function processTransactionNotificationEvent(input: {
  userId: string;
  transactionId: string;
  amount: number;
  categoryId: string | null;
  transactionDate: string;
  merchantName?: string | null;
  accountId: string;
  type: string;
  previousExpenseAmount?: number;
  nextExpenseAmount?: number;
  shouldCreateTransactionAdded?: boolean;
}) {
  const candidates: NotificationCandidate[] = [];

  if (input.type === "expense") {
    candidates.push(
      ...(await buildBudgetThresholdCandidates({
        userId: input.userId,
        categoryId: input.categoryId,
        transactionDate: input.transactionDate,
        previousExpenseAmount: input.previousExpenseAmount ?? 0,
        nextExpenseAmount: input.nextExpenseAmount ?? input.amount,
      })),
    );

    const unusual = await buildUnusualSpendingCandidate({
      userId: input.userId,
      transactionId: input.transactionId,
      amount: input.amount,
      categoryId: input.categoryId,
      merchantName: input.merchantName,
    });
    if (unusual) {
      candidates.push(unusual);
    }

    const recurring = await buildRecurringBillCandidate({
      userId: input.userId,
      transactionId: input.transactionId,
      merchantName: input.merchantName,
      categoryId: input.categoryId,
      amount: input.amount,
    });
    if (recurring) {
      candidates.push(recurring);
    }
  }

  if (input.shouldCreateTransactionAdded) {
    candidates.push(
      buildNotificationCandidate({
        type: "transaction_added",
        title: "Transaction recorded",
        message: "Your latest transaction was added successfully.",
        data: {
          transactionId: input.transactionId,
          amount: input.amount,
          url: "/transactions",
        },
        action_url: "/transactions",
        dedupe_key: `txn:added:${input.transactionId}`,
      }),
    );
  }

  const lowBalance = await buildLowBalanceCandidate({
    accountId: input.accountId,
    userId: input.userId,
  });
  if (lowBalance) {
    candidates.push(lowBalance);
  }

  return persistCandidates(input.userId, candidates);
}

export async function processGoalContributionNotificationEvent(input: {
  userId: string;
  goalId: string;
  previousAmount: number;
  contributionAmount: number;
}) {
  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, input.goalId),
  });

  if (!goal) {
    return [] as AppNotification[];
  }

  const candidates = [
    buildContributionCandidate({
      goalId: goal.id,
      goalTitle: goal.title,
      amount: input.contributionAmount,
    }),
    ...buildGoalMilestoneCandidates({
      goal: {
        id: goal.id,
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
      },
      previousAmount: input.previousAmount,
    }),
  ];

  return persistCandidates(input.userId, candidates);
}

export async function processGoalStateNotificationEvent(input: {
  userId: string;
  goalId: string;
  previousAmount: number;
}) {
  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, input.goalId),
  });

  if (!goal) {
    return [] as AppNotification[];
  }

  return persistCandidates(
    input.userId,
    buildGoalMilestoneCandidates({
      goal: {
        id: goal.id,
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
      },
      previousAmount: input.previousAmount,
    }),
  );
}
