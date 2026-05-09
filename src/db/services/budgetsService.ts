import { db } from "../client";
import { budgetsRepository } from "../repositories/budgetsRepository";
import { refreshBudgetsForExpense } from "./financeOrchestrator";
import type { NewBudget } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { assertBudgetPeriod, assertNonNegativeAmount, assertPositiveAmount, assertRequiredText } from "../utils/validation";

export type CreateBudgetInput = Omit<NewBudget, "id" | "createdAt" | "updatedAt" | "spent"> & {
  id?: string;
  spent?: number;
};

export class BudgetsService {
  async create(input: CreateBudgetInput) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.categoryId, "categoryId");
    assertBudgetPeriod(input.period);
    assertPositiveAmount(input.amount, "budget amount");

    const timestamp = nowIso();
    const budget = await budgetsRepository.create({
      ...input,
      id: input.id ?? createId("budget"),
      spent: input.spent ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (budget) {
      await db.transaction(async (tx) => {
        await refreshBudgetsForExpense(tx, budget.userId, budget.categoryId, budget.startDate);
      });
    }

    return budgetsRepository.findById(budget!.id);
  }

  async update(id: string, input: Partial<NewBudget>) {
    if (input.period) {
      assertBudgetPeriod(input.period);
    }

    if (typeof input.amount === "number") {
      assertPositiveAmount(input.amount, "budget amount");
    }

    if (typeof input.spent === "number") {
      assertNonNegativeAmount(input.spent, "spent amount");
    }

    const budget = await budgetsRepository.update(id, input);

    if (budget) {
      await db.transaction(async (tx) => {
        await refreshBudgetsForExpense(tx, budget.userId, budget.categoryId, budget.startDate);
      });
    }

    return budget;
  }

  async delete(id: string) {
    await budgetsRepository.delete(id);
  }

  async fetch(userId: string) {
    return budgetsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return budgetsRepository.findById(id);
  }
}

export const budgetsService = new BudgetsService();
