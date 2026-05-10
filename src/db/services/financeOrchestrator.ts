import { and, eq, inArray, lte, gte, sql } from "drizzle-orm";

import { accounts, budgets, goalContributions, goals, transactions } from "../schema";
import type { Transaction } from "../types";
import { roundMoney } from "../utils/money";
import { nowIso } from "../utils/time";

type Executor = any;

async function adjustAccountBalance(tx: Executor, accountId: string, delta: number) {
  if (!delta) {
    return;
  }

  const account = await tx.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found.`);
  }

  await tx
    .update(accounts)
    .set({
      balance: roundMoney(account.balance + delta),
      updatedAt: nowIso(),
    })
    .where(eq(accounts.id, accountId));
}

function getTransactionBalanceImpacts(entry: Pick<Transaction, "type" | "amount" | "accountId" | "transferAccountId">) {
  if (entry.type === "expense") {
    return [{ accountId: entry.accountId, delta: -entry.amount }];
  }

  if (entry.type === "income") {
    return [{ accountId: entry.accountId, delta: entry.amount }];
  }

  return [
    { accountId: entry.accountId, delta: -entry.amount },
    ...(entry.transferAccountId
      ? [{ accountId: entry.transferAccountId, delta: entry.amount }]
      : []),
  ];
}

export async function applyTransactionEffects(tx: Executor, entry: Transaction) {
  for (const impact of getTransactionBalanceImpacts(entry)) {
    await adjustAccountBalance(tx, impact.accountId, impact.delta);
  }
}

export async function reverseTransactionEffects(tx: Executor, entry: Transaction) {
  for (const impact of getTransactionBalanceImpacts(entry)) {
    await adjustAccountBalance(tx, impact.accountId, -impact.delta);
  }
}

export async function refreshBudgetsForExpense(tx: Executor, userId: string, categoryId: string, transactionDate: string) {
  const matchingBudgets = await tx.query.budgets.findMany({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, categoryId),
      lte(budgets.startDate, transactionDate),
      gte(budgets.endDate, transactionDate)
    ),
  });

  if (!matchingBudgets.length) {
    return;
  }

  for (const budget of matchingBudgets) {
    const [result] = await tx
      .select({
        total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, budget.userId),
          eq(transactions.type, "expense"),
          eq(transactions.categoryId, budget.categoryId),
          gte(transactions.transactionDate, budget.startDate),
          lte(transactions.transactionDate, budget.endDate)
        )
      );

    await tx
      .update(budgets)
      .set({
        spent: roundMoney(result?.total ?? 0),
        updatedAt: nowIso(),
      })
      .where(eq(budgets.id, budget.id));
  }
}

export async function refreshBudgetsForTransactionChange(
  tx: Executor,
  previousEntry?: Transaction | null,
  nextEntry?: Transaction | null
) {
  const candidates = [previousEntry, nextEntry].filter(
    (entry): entry is Transaction => Boolean(entry && entry.type === "expense" && entry.categoryId)
  );

  const uniqueKeys = [...new Set(candidates.map((entry) => `${entry.userId}|${entry.categoryId}|${entry.transactionDate}`))];

  for (const key of uniqueKeys) {
    const [userId, categoryId, transactionDate] = key.split("|");
    await refreshBudgetsForExpense(tx, userId, categoryId, transactionDate);
  }
}

export async function refreshGoalCurrentAmount(tx: Executor, goalId: string) {
  const [result] = await tx
    .select({
      total: sql<number>`coalesce(sum(${goalContributions.amount}), 0)`,
    })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId));

  await tx
    .update(goals)
    .set({
      currentAmount: roundMoney(result?.total ?? 0),
      isCompleted: sql`case when ${roundMoney(result?.total ?? 0)} >= ${goals.targetAmount} then 1 else 0 end`,
      updatedAt: nowIso(),
    })
    .where(eq(goals.id, goalId));
}

export async function adjustGoalContributionAccountBalance(tx: Executor, accountId: string, amountDelta: number) {
  await adjustAccountBalance(tx, accountId, amountDelta);
}

export async function refreshAccountsVisibilityTimestamp(tx: Executor, accountIds: string[]) {
  if (!accountIds.length) {
    return;
  }

  await tx
    .update(accounts)
    .set({ updatedAt: nowIso() })
    .where(inArray(accounts.id, accountIds));
}
