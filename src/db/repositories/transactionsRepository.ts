import { and, desc, eq, isNull, like, or } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";
import type { NewTransaction } from "../types";
import { buildPaylaterPaymentReferenceToken } from "../utils/paylaters";

export class TransactionsRepository {
  async create(input: NewTransaction) {
    await db.insert(transactions).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewTransaction>) {
    await db.update(transactions).set(input).where(eq(transactions.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async findAllByUser(userId: string) {
    return db.query.transactions.findMany({
      where: and(eq(transactions.userId, userId), isNull(transactions.deletedAt)),
      orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
      with: {
        category: true,
        merchant: {
          with: {
            defaultCategory: true,
          },
        },
        account: true,
        transferAccount: true,
      },
    });
  }

  async findById(id: string) {
    return db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), isNull(transactions.deletedAt)),
      with: {
        category: true,
        merchant: {
          with: {
            defaultCategory: true,
          },
        },
        account: true,
        transferAccount: true,
      },
    });
  }

  async findAnyById(id: string) {
    return db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        category: true,
        merchant: {
          with: {
            defaultCategory: true,
          },
        },
        account: true,
        transferAccount: true,
      },
    });
  }

  async findByReference(
    source: string,
    referenceType: string,
    referenceId: string,
    includeDeleted = true,
  ) {
    const referenceToken = buildPaylaterPaymentReferenceToken(referenceId);
    return db.query.transactions.findFirst({
      where: includeDeleted
        ? or(
            and(
              eq(transactions.source, source),
              eq(transactions.referenceType, referenceType),
              eq(transactions.referenceId, referenceId),
            ),
            like(transactions.notes, `%${referenceToken}%`),
          )
        : and(
            isNull(transactions.deletedAt),
            or(
              and(
                eq(transactions.source, source),
                eq(transactions.referenceType, referenceType),
                eq(transactions.referenceId, referenceId),
              ),
              like(transactions.notes, `%${referenceToken}%`),
            ),
          ),
      with: {
        category: true,
        merchant: {
          with: {
            defaultCategory: true,
          },
        },
        account: true,
        transferAccount: true,
      },
    });
  }
}

export const transactionsRepository = new TransactionsRepository();
