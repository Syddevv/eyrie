import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import { budgets } from "../schema";
import type { NewBudget } from "../types";
import { nowIso } from "../utils/time";

export class BudgetsRepository {
  async create(input: NewBudget) {
    await db.insert(budgets).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewBudget>) {
    await db
      .update(budgets)
      .set({
        ...input,
        updatedAt: input.updatedAt ?? nowIso(),
      })
      .where(eq(budgets.id, id));

    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(budgets).where(eq(budgets.id, id));
  }

  async findAllByUser(userId: string) {
    return db.query.budgets.findMany({
      where: eq(budgets.userId, userId),
      orderBy: [desc(budgets.startDate), desc(budgets.createdAt)],
    });
  }

  async findByUserAndCategory(userId: string, categoryId: string) {
    return db.query.budgets.findMany({
      where: and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId)),
      orderBy: [desc(budgets.startDate)],
    });
  }

  async findById(id: string) {
    return db.query.budgets.findFirst({
      where: eq(budgets.id, id),
    });
  }
}

export const budgetsRepository = new BudgetsRepository();
