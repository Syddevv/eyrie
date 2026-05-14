import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import { accounts } from "../schema";
import type { NewAccount } from "../types";
import { nowIso } from "../utils/time";

export class AccountsRepository {
  async create(input: NewAccount) {
    await db.insert(accounts).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewAccount>) {
    await db
      .update(accounts)
      .set({
        ...input,
        updatedAt: input.updatedAt ?? nowIso(),
      })
      .where(eq(accounts.id, id));

    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async findAllByUser(userId: string) {
    return db.query.accounts.findMany({
      where: and(eq(accounts.userId, userId), isNull(accounts.deletedAt)),
      orderBy: [desc(accounts.updatedAt), desc(accounts.createdAt)],
    });
  }

  async findById(id: string) {
    return db.query.accounts.findFirst({
      where: and(eq(accounts.id, id), isNull(accounts.deletedAt)),
    });
  }
}

export const accountsRepository = new AccountsRepository();
