import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "../client";
import { budgets, categories, transactions } from "../schema";
import type { NewCategory } from "../types";
import { SYSTEM_CATEGORY_USER_ID } from "../utils/constants";

export class CategoriesRepository {
  async create(input: NewCategory) {
    await db.insert(categories).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewCategory>) {
    await db.update(categories).set(input).where(eq(categories.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async findAllByUser(userId: string, type?: string, includeArchived = false) {
    return db.query.categories.findMany({
      where: type
        ? and(
            or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
            eq(categories.type, type),
            includeArchived ? undefined : eq(categories.isArchived, false),
          )
        : and(
            or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
            includeArchived ? undefined : eq(categories.isArchived, false),
          ),
      orderBy: [asc(categories.type), asc(categories.name)],
    });
  }

  async findAllManagedByUser(userId: string, includeArchived = true) {
    return db.query.categories.findMany({
      where: and(
        or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
        includeArchived ? undefined : eq(categories.isArchived, false),
      ),
      orderBy: [asc(categories.isArchived), asc(categories.type), asc(categories.name)],
    });
  }

  async findByUserAndName(userId: string, name: string, type: string) {
    return db.query.categories.findFirst({
      where: and(
        eq(categories.type, type),
        eq(categories.name, name),
        eq(categories.isArchived, false),
        or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
      ),
    });
  }

  async findById(id: string) {
    return db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
  }

  async getUsageCountsByCategoryIds(categoryIds: string[]) {
    if (!categoryIds.length) {
      return new Map<string, { transactions: number; budgets: number }>();
    }

    const [transactionCounts, budgetCounts] = await Promise.all([
      db
        .select({
          categoryId: transactions.categoryId,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(inArray(transactions.categoryId, categoryIds))
        .groupBy(transactions.categoryId),
      db
        .select({
          categoryId: budgets.categoryId,
          count: sql<number>`count(*)`,
        })
        .from(budgets)
        .where(inArray(budgets.categoryId, categoryIds))
        .groupBy(budgets.categoryId),
    ]);

    const counts = new Map<string, { transactions: number; budgets: number }>();

    for (const categoryId of categoryIds) {
      counts.set(categoryId, { transactions: 0, budgets: 0 });
    }

    for (const row of transactionCounts) {
      if (!row.categoryId) {
        continue;
      }

      counts.set(row.categoryId, {
        transactions: Number(row.count) || 0,
        budgets: counts.get(row.categoryId)?.budgets ?? 0,
      });
    }

    for (const row of budgetCounts) {
      if (!row.categoryId) {
        continue;
      }

      counts.set(row.categoryId, {
        transactions: counts.get(row.categoryId)?.transactions ?? 0,
        budgets: Number(row.count) || 0,
      });
    }

    return counts;
  }

  async reassignTransactions(sourceCategoryId: string, targetCategoryId: string) {
    await db
      .update(transactions)
      .set({ categoryId: targetCategoryId })
      .where(eq(transactions.categoryId, sourceCategoryId));
  }

  async reassignBudgets(sourceCategoryId: string, targetCategoryId: string) {
    await db
      .update(budgets)
      .set({ categoryId: targetCategoryId })
      .where(eq(budgets.categoryId, sourceCategoryId));
  }
}

export const categoriesRepository = new CategoriesRepository();
