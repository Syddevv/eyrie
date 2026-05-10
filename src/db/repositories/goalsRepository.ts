import { asc, desc, eq } from "drizzle-orm";

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
      where: eq(goals.userId, userId),
      orderBy: [asc(goals.isArchived), asc(goals.isCompleted), asc(goals.targetDate), desc(goals.createdAt)],
      with: {
        linkedWallet: true,
        contributions: {
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
      where: eq(goals.id, id),
      with: {
        linkedWallet: true,
        contributions: {
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
    await db.update(goalContributions).set(input).where(eq(goalContributions.id, id));
    return this.findContributionById(id);
  }

  async deleteContribution(id: string) {
    await db.delete(goalContributions).where(eq(goalContributions.id, id));
  }

  async findContributionById(id: string) {
    return db.query.goalContributions.findFirst({
      where: eq(goalContributions.id, id),
    });
  }

  async findContributionsByGoal(goalId: string) {
    return db.query.goalContributions.findMany({
      where: eq(goalContributions.goalId, goalId),
      orderBy: [desc(goalContributions.createdAt)],
      with: {
        wallet: true,
      },
    });
  }
}

export const goalsRepository = new GoalsRepository();
