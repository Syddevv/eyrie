import { eq } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";
import { transactionsRepository } from "../repositories/transactionsRepository";
import {
  applyTransactionEffects,
  refreshBudgetsForTransactionChange,
  reverseTransactionEffects,
} from "./financeOrchestrator";
import type { NewTransaction } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import {
  assertPositiveAmount,
  assertRequiredText,
  assertTransactionType,
  assertTransferAccounts,
} from "../utils/validation";
import { emitAccountsChanged } from "@/src/lib/dbSync";

export type CreateTransactionInput = Omit<
  NewTransaction,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export class TransactionsService {
  async create(input: CreateTransactionInput) {
    assertRequiredText(input.userId ?? "", "userId");
    assertRequiredText(input.accountId ?? "", "accountId");
    assertRequiredText(input.currencyCode ?? "", "currencyCode");
    assertTransactionType(input.type);
    assertPositiveAmount(input.amount, "transaction amount");

    if (input.type === "transfer") {
      assertTransferAccounts(input.accountId, input.transferAccountId);
    }

    const timestamp = nowIso();
    const transactionId = input.id ?? createId("txn");

    const created = await db.transaction(async (tx) => {
      const entry = {
        ...input,
        id: transactionId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await tx.insert(transactions).values(entry);
      const created = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, transactionId),
      });

      if (!created) {
        throw new Error("Unable to create transaction.");
      }

      await applyTransactionEffects(tx, created);
      await refreshBudgetsForTransactionChange(tx, undefined, created);

      return created;
    });

    emitAccountsChanged();
    return created;
  }

  async update(id: string, input: Partial<NewTransaction>) {
    const updated = await db.transaction(async (tx) => {
      const existing = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!existing) {
        throw new Error(`Transaction ${id} not found.`);
      }

      const next = {
        ...existing,
        ...input,
        updatedAt: nowIso(),
      };

      assertTransactionType(next.type);
      assertPositiveAmount(next.amount, "transaction amount");

      if (next.type === "transfer") {
        assertTransferAccounts(next.accountId, next.transferAccountId);
      }

      await reverseTransactionEffects(tx, existing);
      await tx.update(transactions).set(next).where(eq(transactions.id, id));

      const updated = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!updated) {
        throw new Error(`Transaction ${id} not found after update.`);
      }

      await applyTransactionEffects(tx, updated);
      await refreshBudgetsForTransactionChange(tx, existing, updated);

      return updated;
    });

    emitAccountsChanged();
    return updated;
  }

  async delete(id: string) {
    await db.transaction(async (tx) => {
      const existing = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!existing) {
        return;
      }

      await reverseTransactionEffects(tx, existing);
      await tx.delete(transactions).where(eq(transactions.id, id));
      await refreshBudgetsForTransactionChange(tx, existing, undefined);
    });

    emitAccountsChanged();
  }

  async fetch(userId: string) {
    return transactionsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return transactionsRepository.findById(id);
  }
}

export const transactionsService = new TransactionsService();
