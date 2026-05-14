import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";

import { db } from "../client";
import { merchantCategoryHistory, merchants, transactions } from "../schema";
import type { NewMerchant, NewMerchantCategoryHistory } from "../types";

function escapeLike(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

export class MerchantsRepository {
  async create(input: NewMerchant) {
    await db.insert(merchants).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewMerchant>) {
    await db.update(merchants).set(input).where(eq(merchants.id, id));
    return this.findById(id);
  }

  async findById(id: string) {
    return db.query.merchants.findFirst({
      where: and(eq(merchants.id, id), isNull(merchants.deletedAt)),
      with: {
        defaultCategory: true,
      },
    });
  }

  async findByUserAndName(userId: string, name: string) {
    const normalized = name.trim().toLowerCase();
    return db.query.merchants.findFirst({
      where: and(
        eq(merchants.userId, userId),
        isNull(merchants.deletedAt),
        sql`lower(trim(${merchants.name})) = ${normalized}`,
      ),
      with: {
        defaultCategory: true,
      },
    });
  }

  async findAllByUser(userId: string, query?: string) {
    const normalizedQuery = query?.trim().toLowerCase();
    return db.query.merchants.findMany({
      where: and(
        eq(merchants.userId, userId),
        isNull(merchants.deletedAt),
        normalizedQuery
          ? like(sql`lower(${merchants.name})`, `%${escapeLike(normalizedQuery)}%`)
          : undefined,
      ),
      orderBy: [desc(merchants.updatedAt), merchants.name],
      with: {
        defaultCategory: true,
      },
    });
  }

  async getRecentUsageByUser(userId: string) {
    const rows = await db
      .select({
        merchantId: transactions.merchantId,
        lastUsedAt: sql<string>`max(${transactions.transactionDate})`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt), sql`${transactions.merchantId} is not null`))
      .groupBy(transactions.merchantId);

    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.merchantId && row.lastUsedAt) {
        map.set(row.merchantId, row.lastUsedAt);
      }
    }

    return map;
  }

  async getTopHistoryByMerchantIds(merchantIds: string[]) {
    if (!merchantIds.length) {
      return new Map<string, { categoryId: string; categoryName: string | null; usageCount: number; lastUsedAt: string }>();
    }

    const rows = await db.query.merchantCategoryHistory.findMany({
      where: or(...merchantIds.map((merchantId) => eq(merchantCategoryHistory.merchantId, merchantId))),
      orderBy: [desc(merchantCategoryHistory.usageCount), desc(merchantCategoryHistory.lastUsedAt)],
      with: {
        category: true,
      },
    });

    const map = new Map<string, { categoryId: string; categoryName: string | null; usageCount: number; lastUsedAt: string }>();
    for (const row of rows) {
      if (!map.has(row.merchantId)) {
        map.set(row.merchantId, {
          categoryId: row.categoryId,
          categoryName: row.category?.name ?? null,
          usageCount: row.usageCount,
          lastUsedAt: row.lastUsedAt,
        });
      }
    }

    return map;
  }

  async recordCategoryUsage(input: NewMerchantCategoryHistory) {
    await db
      .insert(merchantCategoryHistory)
      .values(input)
      .onConflictDoUpdate({
        target: [merchantCategoryHistory.merchantId, merchantCategoryHistory.categoryId],
        set: {
          usageCount: sql`${merchantCategoryHistory.usageCount} + 1`,
          lastUsedAt: input.lastUsedAt,
        },
      });
  }

  async getTopCategoryForMerchant(merchantId: string) {
    return db.query.merchantCategoryHistory.findFirst({
      where: eq(merchantCategoryHistory.merchantId, merchantId),
      orderBy: [desc(merchantCategoryHistory.usageCount), desc(merchantCategoryHistory.lastUsedAt)],
      with: {
        category: true,
      },
    });
  }
}

export const merchantsRepository = new MerchantsRepository();
