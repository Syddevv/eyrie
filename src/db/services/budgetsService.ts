import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import { budgets, transactions } from "../schema";
import { budgetsRepository } from "../repositories/budgetsRepository";
import type { NewBudget } from "../types";
import { createId } from "../utils/ids";
import {
  calculateNextResetDate,
  getBudgetCycleRange,
  resetBudgetIfNeeded,
  nowIso,
} from "../utils/time";
import {
  assertBudgetPeriod,
  assertNonNegativeAmount,
  assertPositiveAmount,
  assertRequiredText,
} from "../utils/validation";
import {
  prepareCreateForSync,
  prepareDeleteForSync,
  prepareUpdateForSync,
} from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { showSuccessToast } from "@/store/useToastStore";
import { emitBudgetsChanged, emitNotificationsChanged } from "@/src/lib/dbSync";
import {
  buildNotificationCandidate,
  createNotification,
} from "@/services/notifications";

export type BudgetMutationOptions = {
  notifySuccess?: boolean;
};

export type CreateBudgetInput = Omit<
  NewBudget,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "spent"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
  spent?: number;
};

export class BudgetsService {
  async create(input: CreateBudgetInput, options: BudgetMutationOptions = {}) {
    const { notifySuccess = true } = options;
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.categoryId, "categoryId");
    assertBudgetPeriod(input.period);
    assertPositiveAmount(input.amount, "budget amount");

    const cycleRange = getBudgetCycleRange(input.period, input.startDate);
    const existingBudget =
      (
        await budgetsRepository.findByUserAndCategory(
          input.userId,
          input.categoryId,
        )
      )[0] ?? null;

    if (existingBudget) {
      const updated = await this.update(
        existingBudget.id,
        prepareUpdateForSync({
          amount: input.amount,
          period: input.period,
          startDate: cycleRange.startDate,
          endDate: cycleRange.endDate,
          updatedAt: nowIso(),
        }),
        { notifySuccess: false },
      );

      emitBudgetsChanged();

      if (notifySuccess && updated) {
        showSuccessToast({
          title: "Budget Updated",
          message: "Your budget has been updated.",
          dedupeKey: "budget:create",
          source: "budgets-service",
        });
      }

      return updated;
    }

    const timestamp = nowIso();
    const budget = await budgetsRepository.create({
      ...prepareCreateForSync({
        ...input,
        id: input.id ?? createId("budget"),
        spent: input.spent ?? 0,
        startDate: cycleRange.startDate,
        endDate: calculateNextResetDate(input.period, input.startDate),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (budget) {
      await db.transaction(async (tx) => {
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
              isNull(transactions.deletedAt),
              gte(transactions.transactionDate, budget.startDate),
              lte(transactions.transactionDate, budget.endDate),
            ),
          );

        await tx
          .update(budgets)
          .set({
            spent: Math.max(0, result?.total ?? 0),
            updatedAt: nowIso(),
          })
          .where(eq(budgets.id, budget.id));
      });
    }

    const created = await budgetsRepository.findById(budget!.id);
    if (created) {
      await enqueueSync("budgets", created.id, "upsert", created.userId);
    }

    emitBudgetsChanged();

    if (notifySuccess) {
      showSuccessToast({
        title: "Budget Added",
        message: "Your budget has been created.",
        dedupeKey: "budget:create",
        source: "budgets-service",
      });
    }

    return created;
  }

  async update(
    id: string,
    input: Partial<NewBudget>,
    options: BudgetMutationOptions = {},
  ) {
    const { notifySuccess = true } = options;
    if (input.period) {
      assertBudgetPeriod(input.period);
    }

    if (typeof input.amount === "number") {
      assertPositiveAmount(input.amount, "budget amount");
    }

    if (typeof input.spent === "number") {
      assertNonNegativeAmount(input.spent, "spent amount");
    }

    const budget = await budgetsRepository.update(
      id,
      prepareUpdateForSync(input),
    );

    if (budget) {
      await enqueueSync("budgets", budget.id, "upsert", budget.userId);
    }

    if (budget) {
      emitBudgetsChanged();

      if (notifySuccess) {
        showSuccessToast({
          title: "Budget Updated",
          message: "Your budget has been updated.",
          dedupeKey: "budget:update",
          source: "budgets-service",
        });
      }
    }

    return budget;
  }

  async syncBudgetsToCycle(
    userId: string,
    period: NewBudget["period"],
    anchorDate: string | Date = new Date(),
  ) {
    assertRequiredText(userId, "userId");
    assertBudgetPeriod(period);

    const cycleRange = getBudgetCycleRange(period, anchorDate);
    const budgets = await budgetsRepository.findAllByUser(userId);
    const updatedBudgets = [] as Awaited<
      ReturnType<typeof budgetsRepository.update>
    >[];

    for (const budget of budgets) {
      if (
        budget.period === period &&
        budget.startDate === cycleRange.startDate &&
        budget.endDate === cycleRange.endDate
      ) {
        continue;
      }

      const updated = await budgetsRepository.update(budget.id, {
        period,
        startDate: cycleRange.startDate,
        endDate: cycleRange.endDate,
      });

      if (updated) {
        updatedBudgets.push(updated);
        await enqueueSync("budgets", updated.id, "upsert", updated.userId);
      }
    }

    if (updatedBudgets.length > 0) {
      emitBudgetsChanged();
    }

    return updatedBudgets;
  }

  async resetBudgetsIfNeeded(
    userId: string,
    anchorDate: string | Date = new Date(),
  ) {
    assertRequiredText(userId, "userId");

    const budgets = await budgetsRepository.findAllByUser(userId);
    const resetBudgets = [] as Awaited<
      ReturnType<typeof budgetsRepository.update>
    >[];

    for (const budget of budgets) {
      const resetState = resetBudgetIfNeeded(budget, anchorDate);
      if (!resetState.shouldReset || !resetState.cycleRange) {
        continue;
      }

      console.log("[budgets] resetting budget", {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        cycle: budget.period,
        nextResetDate: resetState.nextResetDate,
      });

      const updated = await budgetsRepository.update(budget.id, {
        spent: 0,
        startDate: resetState.cycleRange.startDate,
        endDate: resetState.cycleRange.endDate,
      });

      if (!updated) {
        continue;
      }

      resetBudgets.push(updated);

      const notification = buildNotificationCandidate({
        type: "budget_reset",
        title: "Budget Reset Complete",
        message: `Your ${updated.period === "biweekly" ? "Bi-Weekly" : updated.period === "weekly" ? "Weekly" : "Monthly"} budget has been refreshed and is ready for a new cycle.`,
        data: {
          budgetId: updated.id,
          categoryId: updated.categoryId,
          cycle: updated.period,
          nextResetDate: resetState.nextResetDate,
          url: "/(tabs)/explore",
        },
        action_url: "/(tabs)/explore",
        dedupe_key: `budget-reset:${updated.id}:${resetState.nextResetDate}`,
      });

      await createNotification(userId, notification).catch((error) => {
        console.error("[budgets] failed to create budget reset notification", {
          budgetId: updated.id,
          error,
        });
      });

      await enqueueSync("budgets", updated.id, "upsert", updated.userId);
    }

    if (resetBudgets.length > 0) {
      emitBudgetsChanged();
      emitNotificationsChanged();
    }

    return resetBudgets;
  }

  async delete(id: string, options: BudgetMutationOptions = {}) {
    const { notifySuccess = true } = options;
    const existing = await budgetsRepository.findById(id);
    if (!existing) {
      return;
    }

    await budgetsRepository.update(id, prepareDeleteForSync());
    await enqueueSync("budgets", existing.id, "delete", existing.userId);
    emitBudgetsChanged();

    if (notifySuccess) {
      showSuccessToast({
        title: "Budget Deleted",
        message: "The budget has been removed.",
        dedupeKey: "budget:delete",
        source: "budgets-service",
      });
    }
  }

  async fetch(userId: string) {
    return budgetsRepository.findAllByUser(userId);
  }

  async ensureActiveCycleBudgets(
    userId: string,
    period: NewBudget["period"],
    anchorDate: string | Date = new Date(),
  ) {
    return this.syncBudgetsToCycle(userId, period, anchorDate);
  }

  async fetchById(id: string) {
    return budgetsRepository.findById(id);
  }
}

export const budgetsService = new BudgetsService();
