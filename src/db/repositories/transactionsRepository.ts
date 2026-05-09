import { desc, eq } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";
import type { NewTransaction } from "../types";

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
      where: eq(transactions.userId, userId),
      orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
      with: {
        category: true,
        account: true,
        transferAccount: true,
      },
    });
  }

  async findById(id: string) {
    return db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        category: true,
        account: true,
        transferAccount: true,
      },
    });
  }
}

export const transactionsRepository = new TransactionsRepository();
