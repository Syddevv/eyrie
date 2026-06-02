import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import { budgets, transactions } from "../schema";
import { budgetsRepository } from "../repositories/budgetsRepository";
import type { NewBudget } from "../types";
import { createId } from "../utils/ids";
import {
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
import { categoriesService } from "./categoriesService";

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

    const canonicalCategoryId =
      await categoriesService.resolveCanonicalCategoryId(input.categoryId);
    const normalizedInput = {
      ...input,
      categoryId: canonicalCategoryId ?? input.categoryId,
    };

    const timestamp = nowIso();
    const existingBudget =
      (
        await budgetsRepository.findByUserAndCategory(
          normalizedInput.userId,
          normalizedInput.categoryId,
        )
      )[0] ?? null;

    if (existingBudget) {
      const cycleRange = getBudgetCycleRange({
        createdAt: existingBudget.createdAt,
        cycle: normalizedInput.period,
        currentDate: timestamp,
      });

      if (__DEV__) {
        console.log("[budgets] update existing budget from original anchor", {
          budgetId: existingBudget.id,
          categoryId: existingBudget.categoryId,
          createdAt: existingBudget.createdAt,
          previousCycle: existingBudget.period,
          nextCycle: normalizedInput.period,
          nextResetDate: cycleRange.endDate,
        });
      }

      const updated = await this.update(
        existingBudget.id,
        prepareUpdateForSync({
          amount: normalizedInput.amount,
          period: normalizedInput.period,
          startDate: cycleRange.startDate,
          endDate: cycleRange.endDate,
          updatedAt: timestamp,
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

    const cycleRange = getBudgetCycleRange({
      createdAt: timestamp,
      cycle: normalizedInput.period,
      currentDate: timestamp,
    });

    if (__DEV__) {
      console.log("[budgets] create budget with original anchor", {
        categoryId: normalizedInput.categoryId,
        cycle: normalizedInput.period,
        createdAt: timestamp,
        nextResetDate: cycleRange.endDate,
      });
    }

    const budget = await budgetsRepository.create({
      ...prepareCreateForSync({
        ...normalizedInput,
        id: input.id ?? createId("budget"),
        spent: input.spent ?? 0,
        startDate: cycleRange.startDate,
        endDate: cycleRange.endDate,
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
    const nextInput = { ...input };
    delete nextInput.createdAt;

    const existingBudget =
      nextInput.period || nextInput.startDate || nextInput.endDate
        ? await budgetsRepository.findById(id)
        : null;

    if (nextInput.period) {
      assertBudgetPeriod(nextInput.period);

      if (!existingBudget) {
        return null;
      }

      const cycleRange = getBudgetCycleRange({
        createdAt: existingBudget.createdAt,
        cycle: nextInput.period,
        currentDate: nextInput.updatedAt ?? nowIso(),
      });

      nextInput.startDate = cycleRange.startDate;
      nextInput.endDate = cycleRange.endDate;

      if (__DEV__) {
        console.log("[budgets] recalculate cycle from original anchor", {
          budgetId: id,
          createdAt: existingBudget.createdAt,
          previousCycle: existingBudget.period,
          nextCycle: nextInput.period,
          startDate: cycleRange.startDate,
          nextResetDate: cycleRange.endDate,
        });
      }
    }

    if (typeof nextInput.amount === "number") {
      assertPositiveAmount(nextInput.amount, "budget amount");
    }

    if (typeof nextInput.spent === "number") {
      assertNonNegativeAmount(nextInput.spent, "spent amount");
    }

    const budget = await budgetsRepository.update(
      id,
      prepareUpdateForSync(nextInput),
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

    const budgets = await budgetsRepository.findAllByUser(userId);
    const updatedBudgets = [] as Awaited<
      ReturnType<typeof budgetsRepository.update>
    >[];

    for (const budget of budgets) {
      const cycleRange = getBudgetCycleRange({
        createdAt: budget.createdAt,
        cycle: period,
        currentDate: anchorDate,
      });

      if (
        budget.period === period &&
        budget.startDate === cycleRange.startDate &&
        budget.endDate === cycleRange.endDate
      ) {
        continue;
      }

      if (__DEV__) {
        console.log("[budgets] sync budget cycle from original anchor", {
          budgetId: budget.id,
          createdAt: budget.createdAt,
          previousCycle: budget.period,
          nextCycle: period,
          startDate: cycleRange.startDate,
          nextResetDate: cycleRange.endDate,
        });
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
      assertBudgetPeriod(budget.period);
      const resetState = resetBudgetIfNeeded(
        {
          period: budget.period,
          endDate: budget.endDate,
          createdAt: budget.createdAt,
        },
        anchorDate,
      );
      if (!resetState.shouldReset || !resetState.cycleRange) {
        continue;
      }

      console.log("[budgets] resetting budget", {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        createdAt: budget.createdAt,
        cycle: budget.period,
        currentDate:
          anchorDate instanceof Date ? anchorDate.toISOString() : anchorDate,
        previousResetDate: budget.endDate,
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
