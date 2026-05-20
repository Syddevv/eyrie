import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "../client";
import { accounts, budgets, categories, goals, transactions } from "../schema";
import { calculateBudgetHealthSummary } from "@/src/lib/budget-health";
import { dedupeCashAccountsForDisplay } from "../services/accountsService";
import { clamp, roundMoney } from "../utils/money";
import { addDaysIso, endOfDayIso, nowIso, startOfDayIso } from "../utils/time";

export async function getTotalBalance(userId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(accounts.type, ["bank", "ewallet", "cash"]),
        isNull(accounts.deletedAt),
      ),
    );

  const total = dedupeCashAccountsForDisplay(rows).reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0,
  );

  return roundMoney(total);
}

export async function getTotalIncome(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        isNull(transactions.deletedAt),
        startDate ? gte(transactions.transactionDate, startDate) : undefined,
        endDate ? lte(transactions.transactionDate, endDate) : undefined,
      ),
    );

  return roundMoney(result?.total ?? 0);
}

export async function getTotalExpenses(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
        startDate ? gte(transactions.transactionDate, startDate) : undefined,
        endDate ? lte(transactions.transactionDate, endDate) : undefined,
      ),
    );

  return roundMoney(result?.total ?? 0);
}

export async function getRecentTransactions(userId: string, limit = 10) {
  return db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), isNull(transactions.deletedAt)),
    orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
    limit,
    with: {
      category: true,
      merchant: true,
      account: true,
      transferAccount: true,
    },
  });
}

export async function getBudgetProgress(userId: string) {
  const rows = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), isNull(budgets.deletedAt)),
    with: {
      category: true,
    },
    orderBy: [desc(budgets.startDate)],
  });

  return Promise.all(
    rows.map(async (budget) => {
      const [countResult] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, budget.userId),
            eq(transactions.type, "expense"),
            eq(transactions.categoryId, budget.categoryId),
            isNull(transactions.deletedAt),
            gte(transactions.transactionDate, budget.startDate),
            lte(transactions.transactionDate, budget.endDate),
          ),
        );

      const rawRemaining = roundMoney(budget.amount - budget.spent);
      const remaining = Math.max(0, rawRemaining);
      const progress =
        budget.amount > 0
          ? clamp((budget.spent / budget.amount) * 100, 0, 999)
          : 0;

      return {
        ...budget,
        remaining,
        progress,
        transactionCount: countResult?.count ?? 0,
        status:
          rawRemaining < 0 ? "over" : remaining === 0 ? "limit" : "healthy",
      };
    }),
  );
}

export async function getSpendingBreakdown(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
        startDate ? gte(transactions.transactionDate, startDate) : undefined,
        endDate ? lte(transactions.transactionDate, endDate) : undefined,
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(sql`total desc`);

  return rows.map((row) => ({
    ...row,
    total: roundMoney(row.total ?? 0),
  }));
}

export async function getWeeklySpending(userId: string, anchorDate = nowIso()) {
  const endDate = endOfDayIso(anchorDate);
  const startDate = startOfDayIso(addDaysIso(anchorDate, -6));

  const rows = await db
    .select({
      day: sql<string>`substr(${transactions.transactionDate}, 1, 10)`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
      ),
    )
    .groupBy(sql`substr(${transactions.transactionDate}, 1, 10)`)
    .orderBy(sql`day asc`);

  return rows.map((row) => ({
    date: row.day,
    total: roundMoney(row.total ?? 0),
  }));
}

export async function getMonthlyAnalytics(
  userId: string,
  anchorDate = nowIso(),
) {
  const monthPrefix = anchorDate.slice(0, 7);
  const startDate = `${monthPrefix}-01T00:00:00.000Z`;
  const endDate = endOfDayIso(
    new Date(
      Date.UTC(
        Number(monthPrefix.slice(0, 4)),
        Number(monthPrefix.slice(5, 7)),
        0,
      ),
    ),
  );

  const [income, expenses, breakdown] = await Promise.all([
    getTotalIncome(userId, startDate, endDate),
    getTotalExpenses(userId, startDate, endDate),
    getSpendingBreakdown(userId, startDate, endDate),
  ]);

  return {
    month: monthPrefix,
    income,
    expenses,
    savings: roundMoney(income - expenses),
    breakdown,
  };
}

export async function getGoalsProgress(userId: string) {
  const rows = await db.query.goals.findMany({
    where: and(eq(goals.userId, userId), eq(goals.isArchived, false)),
    orderBy: [
      asc(goals.isCompleted),
      asc(goals.targetDate),
      desc(goals.createdAt),
    ],
  });

  return rows.map((goal) => ({
    ...goal,
    remaining: roundMoney(goal.targetAmount - goal.currentAmount),
    progress:
      goal.targetAmount > 0
        ? clamp((goal.currentAmount / goal.targetAmount) * 100, 0, 100)
        : 0,
  }));
}

export async function getBudgetHealthScore(userId: string) {
  const progress = await getBudgetProgress(userId);
  return calculateBudgetHealthSummary(
    progress.map((budget) => ({
      amount: budget.amount,
      spent: budget.spent,
    })),
  ).score;
}
