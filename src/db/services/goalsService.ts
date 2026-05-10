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
import {
  assertCategoryIconType,
  assertNonNegativeAmount,
  assertPositiveAmount,
  assertRequiredText,
} from "../utils/validation";
import { emitAccountsChanged, emitGoalsChanged } from "@/src/lib/dbSync";

export type CreateGoalInput = Omit<NewGoal, "id" | "createdAt" | "updatedAt" | "currentAmount"> & {
  id?: string;
  currentAmount?: number;
};

export type CreateGoalContributionInput = Omit<NewGoalContribution, "id" | "createdAt"> & {
  id?: string;
  allowOverdraft?: boolean;
};

export class GoalsService {
  async create(input: CreateGoalInput) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.title ?? "", "goal name");
    assertPositiveAmount(input.targetAmount, "target amount");
    assertNonNegativeAmount(input.currentAmount ?? 0, "current amount");
    assertRequiredText(input.targetDate ?? "", "target date");
    assertCategoryIconType(input.iconType);

    const timestamp = nowIso();

    const created = await goalsRepository.create({
      ...input,
      id: input.id ?? createId("goal"),
      currentAmount: input.currentAmount ?? 0,
      isCompleted: (input.currentAmount ?? 0) >= input.targetAmount,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    emitGoalsChanged();
    return created;
  }

  async update(id: string, input: Partial<NewGoal>) {
    if (input.title) {
      assertRequiredText(input.title, "goal name");
    }

    if (typeof input.targetAmount === "number") {
      assertPositiveAmount(input.targetAmount, "target amount");
    }

    if (typeof input.currentAmount === "number") {
      assertNonNegativeAmount(input.currentAmount, "current amount");
    }

    if (input.targetDate) {
      assertRequiredText(input.targetDate, "target date");
    }

    if (input.iconType) {
      assertCategoryIconType(input.iconType);
    }

    const existing = await goalsRepository.findById(id);
    if (!existing) {
      throw new Error("Goal not found.");
    }

    const nextTarget = typeof input.targetAmount === "number" ? input.targetAmount : existing.targetAmount;
    const nextCurrent = typeof input.currentAmount === "number" ? input.currentAmount : existing.currentAmount;

    const updated = await goalsRepository.update(id, {
      ...input,
      isCompleted: nextTarget > 0 ? nextCurrent >= nextTarget : false,
    });
    emitGoalsChanged();
    return updated;
  }

  async delete(id: string) {
    await goalsRepository.delete(id);
    emitGoalsChanged();
  }

  async archive(id: string) {
    const archived = await goalsRepository.update(id, {
      isArchived: true,
      updatedAt: nowIso(),
    });
    emitGoalsChanged();
    return archived;
  }

  async restore(id: string) {
    const restored = await goalsRepository.update(id, {
      isArchived: false,
      updatedAt: nowIso(),
    });
    emitGoalsChanged();
    return restored;
  }

  async fetch(userId: string) {
    return goalsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return goalsRepository.findById(id);
  }

  async createContribution(input: CreateGoalContributionInput) {
    assertRequiredText(input.goalId, "goalId");
    assertPositiveAmount(input.amount, "contribution amount");
    const { allowOverdraft = false, ...payload } = input;

    const timestamp = nowIso();

    const created = await db.transaction(async (tx) => {
      const goal = await tx.query.goals.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, payload.goalId),
      });

      if (!goal) {
        throw new Error("Goal not found.");
      }

      if (payload.walletId) {
        const wallet = await tx.query.accounts.findFirst({
          where: (table, { eq: innerEq }) => innerEq(table.id, payload.walletId ?? ""),
        });

        if (!wallet) {
          throw new Error("Wallet not found.");
        }

        if (!allowOverdraft && wallet.type !== "credit" && wallet.balance < payload.amount) {
          throw new Error("Contribution is greater than the selected wallet balance.");
        }
      }

      const contributionId = input.id ?? createId("gcon");

      await tx.insert(goalContributions).values({
        ...payload,
        id: contributionId,
        createdAt: timestamp,
      });

      if (payload.walletId) {
        await adjustGoalContributionAccountBalance(tx, payload.walletId, -payload.amount);
      }
      await refreshGoalCurrentAmount(tx, payload.goalId);

      const created = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, contributionId),
        with: {
          wallet: true,
        },
      });

      return created;
    });

    emitGoalsChanged();
    if (payload.walletId) {
      emitAccountsChanged();
    }
    return created;
  }

  async updateContribution(id: string, input: Partial<NewGoalContribution>) {
    const updated = await db.transaction(async (tx) => {
      const existing = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, id),
      });

      if (!existing) {
        throw new Error(`Goal contribution ${id} not found.`);
      }

      const next = { ...existing, ...input };
      assertPositiveAmount(next.amount, "contribution amount");

      if (existing.walletId) {
        await adjustGoalContributionAccountBalance(tx, existing.walletId, existing.amount);
      }
      await tx.update(goalContributions).set(input).where(eq(goalContributions.id, id));
      if (next.walletId) {
        await adjustGoalContributionAccountBalance(tx, next.walletId, -next.amount);
      }
      await refreshGoalCurrentAmount(tx, existing.goalId);

      if (existing.goalId !== next.goalId) {
        await refreshGoalCurrentAmount(tx, next.goalId);
      }

      return tx.query.goalContributions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
        with: {
          wallet: true,
        },
      });
    });

    emitGoalsChanged();
    emitAccountsChanged();
    return updated;
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
      if (existing.walletId) {
        await adjustGoalContributionAccountBalance(tx, existing.walletId, existing.amount);
      }
      await refreshGoalCurrentAmount(tx, existing.goalId);
    });

    emitGoalsChanged();
    emitAccountsChanged();
  }

  async fetchContributionById(id: string) {
    return goalsRepository.findContributionById(id);
  }

  async fetchContributions(goalId: string) {
    return goalsRepository.findContributionsByGoal(goalId);
  }
}

export const goalsService = new GoalsService();
