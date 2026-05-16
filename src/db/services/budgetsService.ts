import { db } from "../client";
import { budgetsRepository } from "../repositories/budgetsRepository";
import { refreshBudgetsForExpense } from "./financeOrchestrator";
import type { NewBudget } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
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
import { emitBudgetsChanged } from "@/src/lib/dbSync";

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

function rangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export class BudgetsService {
  async create(input: CreateBudgetInput, options: BudgetMutationOptions = {}) {
    const { notifySuccess = true } = options;
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.categoryId, "categoryId");
    assertBudgetPeriod(input.period);
    assertPositiveAmount(input.amount, "budget amount");

    const existingBudgets = await budgetsRepository.findByUserAndCategory(
      input.userId,
      input.categoryId,
    );
    const hasDuplicate = existingBudgets.some(
      (budget) =>
        budget.period === input.period &&
        rangesOverlap(
          budget.startDate,
          budget.endDate,
          input.startDate,
          input.endDate,
        ),
    );

    if (hasDuplicate) {
      throw new Error(
        "A budget already exists for this expense category in the selected cycle.",
      );
    }

    const timestamp = nowIso();
    const budget = await budgetsRepository.create({
      ...prepareCreateForSync({
        ...input,
        id: input.id ?? createId("budget"),
        spent: input.spent ?? 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (budget) {
      await db.transaction(async (tx) => {
        await refreshBudgetsForExpense(
          tx,
          budget.userId,
          budget.categoryId,
          budget.startDate,
        );
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
      await db.transaction(async (tx) => {
        await refreshBudgetsForExpense(
          tx,
          budget.userId,
          budget.categoryId,
          budget.startDate,
        );
      });
    }

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

  async fetchById(id: string) {
    return budgetsRepository.findById(id);
  }
}

export const budgetsService = new BudgetsService();
