import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { accounts, budgets, goals, transactions, users } from "@/src/db/schema";
import {
  getBudgetHealthScore,
  getBudgetProgress,
  getGoalsProgress,
} from "@/src/db/queries/dashboard";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function scoreBudgetAdherence(
  progress: Awaited<ReturnType<typeof getBudgetProgress>>,
) {
  if (!progress.length) {
    return 12;
  }

  const healthyCount = progress.filter((item) => item.status === "healthy").length;
  const limitCount = progress.filter((item) => item.status === "limit").length;
  const ratio =
    (healthyCount * 1 + limitCount * 0.6) / Math.max(progress.length, 1);

  return Math.round(clamp(ratio * 25, 0, 25));
}

function scoreGoalMomentum(
  goalRows: Awaited<ReturnType<typeof getGoalsProgress>>,
  activeGoalsCount: number,
) {
  if (!activeGoalsCount) {
    return 4;
  }

  const activeGoals = goalRows.filter((goal) => !goal.isCompleted);
  const avgProgress =
    activeGoals.reduce((sum, goal) => sum + goal.progress, 0) /
    Math.max(activeGoals.length, 1);

  return Math.round(
    clamp(activeGoalsCount * 4 + (avgProgress / 100) * 8, 0, 20),
  );
}

function scoreActivityFrequency(activeDays30: number, transactionCount: number) {
  const dayScore = clamp(activeDays30 / 15, 0, 1) * 10;
  const volumeScore = clamp(transactionCount / 20, 0, 1) * 5;
  return Math.round(dayScore + volumeScore);
}

function scoreSavingsBehavior(
  monthIncome: number,
  monthExpenses: number,
) {
  if (monthIncome <= 0 && monthExpenses <= 0) {
    return 8;
  }

  if (monthIncome <= 0) {
    return 0;
  }

  const ratio = clamp((monthIncome - monthExpenses) / monthIncome, -1, 1);
  return Math.round(clamp((ratio + 1) / 2, 0, 1) * 20);
}

function scoreBalanceHealth(positiveBalanceRatio: number) {
  return Math.round(clamp(positiveBalanceRatio, 0, 1) * 10);
}

function scoreStreakConsistency(currentStreak: number) {
  return Math.round(clamp(currentStreak, 0, 20) / 2);
}

export async function getTransactionCount(userId: string) {
  const [result] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

  return Number(result?.count ?? 0);
}

export async function getActiveGoalsCount(userId: string) {
  const [result] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.isArchived, false),
        eq(goals.isCompleted, false),
        isNull(goals.deletedAt),
      ),
    );

  return Number(result?.count ?? 0);
}

export async function getProfileStatsSnapshot(userId: string) {
  const [
    { startDate, endDate },
    userRow,
    transactionCount,
    activeGoalsCount,
    budgetRows,
    goalRows,
    budgetHealthScore,
  ] =
    await Promise.all([
      Promise.resolve(getCurrentMonthRange()),
      db.query.users.findFirst({
        where: and(eq(users.id, userId), isNull(users.deletedAt)),
      }),
      getTransactionCount(userId),
      getActiveGoalsCount(userId),
      getBudgetProgress(userId),
      getGoalsProgress(userId),
      getBudgetHealthScore(userId),
    ]);

  const [monthIncomeRow, monthExpensesRow, activityDaysRow, eligibleAccounts] =
    await Promise.all([
      db
        .select({
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "income"),
            isNull(transactions.deletedAt),
            sql`${transactions.transactionDate} >= ${startDate}`,
            sql`${transactions.transactionDate} <= ${endDate}`,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "expense"),
            isNull(transactions.deletedAt),
            sql`${transactions.transactionDate} >= ${startDate}`,
            sql`${transactions.transactionDate} <= ${endDate}`,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          count: sql<number>`count(distinct substr(${transactions.transactionDate}, 1, 10))`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            sql`${transactions.transactionDate} >= ${new Date(Date.now() - 29 * 86_400_000).toISOString()}`,
          ),
        )
        .then((rows) => rows[0]),
      db.query.accounts.findMany({
        where: and(
          eq(accounts.userId, userId),
          inArray(accounts.type, ["bank", "ewallet", "cash"]),
          isNull(accounts.deletedAt),
        ),
      }),
    ]);

  const positiveBalanceRatio = eligibleAccounts.length
    ? eligibleAccounts.filter((account) => Number(account.balance ?? 0) >= 0).length /
      eligibleAccounts.length
    : 1;

  const budgetScore = scoreBudgetAdherence(budgetRows);
  const goalScore = scoreGoalMomentum(goalRows, activeGoalsCount);
  const activityScore = scoreActivityFrequency(
    Number(activityDaysRow?.count ?? 0),
    transactionCount,
  );
  const savingsScore = scoreSavingsBehavior(
    Number(monthIncomeRow?.total ?? 0),
    Number(monthExpensesRow?.total ?? 0),
  );
  const balanceScore = scoreBalanceHealth(positiveBalanceRatio);
  const streakScore = scoreStreakConsistency(Number(userRow?.currentStreak ?? 0));

  const healthScore = clamp(
    budgetScore + goalScore + activityScore + savingsScore + balanceScore + streakScore,
    0,
    100,
  );

  return {
    currentStreak: Number(userRow?.currentStreak ?? 0),
    longestStreak: Number(userRow?.longestStreak ?? 0),
    transactionCount,
    activeGoalsCount,
    healthScore,
    budgetHealthScore,
  };
}
