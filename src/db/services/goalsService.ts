import { eq } from "drizzle-orm";

import { db } from "../client";
import { goalsRepository } from "../repositories/goalsRepository";
import { goalContributions } from "../schema";
import {
  adjustGoalContributionAccountBalance,
  refreshGoalCurrentAmount,
} from "./financeOrchestrator";
import type { NewGoal, NewGoalContribution } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { assertNonNegativeAmount, assertPositiveAmount, assertRequiredText } from "../utils/validation";

export type CreateGoalInput = Omit<NewGoal, "id" | "createdAt" | "updatedAt" | "currentAmount"> & {
  id?: string;
  currentAmount?: number;
};

export type CreateGoalContributionInput = Omit<NewGoalContribution, "id" | "createdAt"> & {
  id?: string;
};

export class GoalsService {
  async create(input: CreateGoalInput) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.name, "goal name");
    assertPositiveAmount(input.targetAmount, "target amount");
    assertNonNegativeAmount(input.currentAmount ?? 0, "current amount");

    const timestamp = nowIso();

    return goalsRepository.create({
      ...input,
      id: input.id ?? createId("goal"),
      currentAmount: input.currentAmount ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async update(id: string, input: Partial<NewGoal>) {
    if (input.name) {
      assertRequiredText(input.name, "goal name");
    }

    if (typeof input.targetAmount === "number") {
      assertPositiveAmount(input.targetAmount, "target amount");
    }

    if (typeof input.currentAmount === "number") {
      assertNonNegativeAmount(input.currentAmount, "current amount");
    }

    return goalsRepository.update(id, input);
  }

  async delete(id: string) {
    await goalsRepository.delete(id);
  }

  async fetch(userId: string) {
    return goalsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return goalsRepository.findById(id);
  }

  async createContribution(input: CreateGoalContributionInput) {
    assertRequiredText(input.goalId, "goalId");
    assertRequiredText(input.accountId, "accountId");
    assertPositiveAmount(input.amount, "contribution amount");

    const timestamp = nowIso();

    return db.transaction(async (tx) => {
      const contributionId = input.id ?? createId("gcon");

      await tx.insert(goalContributions).values({
        ...input,
        id: contributionId,
        createdAt: timestamp,
      });

      await adjustGoalContributionAccountBalance(tx, input.accountId, -input.amount);
      await refreshGoalCurrentAmount(tx, input.goalId);

      return tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, contributionId),
      });
    });
  }

  async updateContribution(id: string, input: Partial<NewGoalContribution>) {
    return db.transaction(async (tx) => {
      const existing = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, id),
      });

      if (!existing) {
        throw new Error(`Goal contribution ${id} not found.`);
      }

      const next = { ...existing, ...input };
      assertPositiveAmount(next.amount, "contribution amount");

      await adjustGoalContributionAccountBalance(tx, existing.accountId, existing.amount);
      await tx.update(goalContributions).set(input).where(eq(goalContributions.id, id));
      await adjustGoalContributionAccountBalance(tx, next.accountId, -next.amount);
      await refreshGoalCurrentAmount(tx, existing.goalId);

      if (existing.goalId !== next.goalId) {
        await refreshGoalCurrentAmount(tx, next.goalId);
      }

      return tx.query.goalContributions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });
    });
  }

  async deleteContribution(id: string) {
    await db.transaction(async (tx) => {
      const existing = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, id),
      });

      if (!existing) {
        return;
      }

      await tx.delete(goalContributions).where(eq(goalContributions.id, id));
      await adjustGoalContributionAccountBalance(tx, existing.accountId, existing.amount);
      await refreshGoalCurrentAmount(tx, existing.goalId);
    });
  }

  async fetchContributionById(id: string) {
    return goalsRepository.findContributionById(id);
  }

  async fetchContributions(goalId: string) {
    return goalsRepository.findContributionsByGoal(goalId);
  }
}

export const goalsService = new GoalsService();
