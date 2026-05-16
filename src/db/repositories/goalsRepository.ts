import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import { goalContributions, goals } from "../schema";
import type { NewGoal, NewGoalContribution } from "../types";
import { nowIso } from "../utils/time";

export class GoalsRepository {
  async create(input: NewGoal) {
    await db.insert(goals).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewGoal>) {
    await db
      .update(goals)
      .set({
        ...input,
        updatedAt: input.updatedAt ?? nowIso(),
      })
      .where(eq(goals.id, id));

    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async findAllByUser(userId: string) {
    return db.query.goals.findMany({
      where: and(eq(goals.userId, userId), isNull(goals.deletedAt)),
      orderBy: [
        asc(goals.isArchived),
        asc(goals.isCompleted),
        asc(goals.targetDate),
        desc(goals.createdAt),
      ],
      with: {
        linkedWallet: true,
        contributions: {
          where: isNull(goalContributions.deletedAt),
          orderBy: [desc(goalContributions.createdAt)],
          with: {
            wallet: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return db.query.goals.findFirst({
      where: and(eq(goals.id, id), isNull(goals.deletedAt)),
      with: {
        linkedWallet: true,
        contributions: {
          where: isNull(goalContributions.deletedAt),
          orderBy: [desc(goalContributions.createdAt)],
          with: {
            wallet: true,
          },
        },
      },
    });
  }

  async createContribution(input: NewGoalContribution) {
    await db.insert(goalContributions).values(input);
    return this.findContributionById(input.id);
  }

  async updateContribution(id: string, input: Partial<NewGoalContribution>) {
    await db
      .update(goalContributions)
      .set(input)
      .where(eq(goalContributions.id, id));
    return this.findContributionById(id);
  }

  async deleteContribution(id: string) {
    await db.delete(goalContributions).where(eq(goalContributions.id, id));
  }

  async findContributionById(id: string) {
    return db.query.goalContributions.findFirst({
      where: and(
        eq(goalContributions.id, id),
        isNull(goalContributions.deletedAt),
      ),
    });
  }

  async findContributionsByGoal(goalId: string) {
    return db.query.goalContributions.findMany({
      where: and(
        eq(goalContributions.goalId, goalId),
        isNull(goalContributions.deletedAt),
      ),
      orderBy: [desc(goalContributions.createdAt)],
      with: {
        wallet: true,
      },
    });
  }
}

export const goalsRepository = new GoalsRepository();
