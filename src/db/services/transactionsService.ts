import { eq } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";
import { transactionsRepository } from "../repositories/transactionsRepository";
import { merchantsService } from "./merchantsService";
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
import { emitAccountsChanged, emitMerchantsChanged } from "@/src/lib/dbSync";

export type CreateTransactionInput = Omit<
  NewTransaction,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  merchantDefaultCategoryId?: string | null;
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
    const merchantPayload =
      input.type === "expense"
        ? await this.resolveExpenseMerchant({
            userId: input.userId,
            merchantId: input.merchantId ?? null,
            merchantName: input.merchantName ?? null,
            categoryId: input.categoryId ?? null,
            merchantDefaultCategoryId: input.merchantDefaultCategoryId ?? input.categoryId ?? null,
          })
        : null;

    const created = await db.transaction(async (tx) => {
      const entry = {
        ...input,
        merchantId: merchantPayload?.merchantId ?? input.merchantId ?? null,
        merchantName:
          input.type === "expense"
            ? merchantPayload?.merchantName ?? null
            : input.merchantName ?? null,
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

    if (created.type === "expense" && created.merchantId && created.categoryId) {
      await merchantsService.learnMerchantCategory(created.merchantId, created.categoryId);
    }

    emitAccountsChanged();
    emitMerchantsChanged();
    return created;
  }

  async update(id: string, input: Partial<NewTransaction>) {
    const existing = await db.query.transactions.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.id, id),
    });

    if (!existing) {
      throw new Error(`Transaction ${id} not found.`);
    }

    const previewNext = {
      ...existing,
      ...input,
    };
    const merchantPayload =
      previewNext.type === "expense"
        ? await this.resolveExpenseMerchant({
            userId: previewNext.userId,
            merchantId: previewNext.merchantId ?? null,
            merchantName: previewNext.merchantName ?? null,
            categoryId: previewNext.categoryId ?? null,
            merchantDefaultCategoryId: previewNext.categoryId ?? null,
          })
        : null;

    const updated = await db.transaction(async (tx) => {
      const current = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!current) {
        throw new Error(`Transaction ${id} not found.`);
      }

      const next = {
        ...current,
        ...input,
        updatedAt: nowIso(),
      };

      if (next.type === "expense") {
        next.merchantId = merchantPayload?.merchantId ?? null;
        next.merchantName = merchantPayload?.merchantName ?? null;
      }

      assertTransactionType(next.type);
      assertPositiveAmount(next.amount, "transaction amount");

      if (next.type === "transfer") {
        assertTransferAccounts(next.accountId, next.transferAccountId);
      }

      await reverseTransactionEffects(tx, current);
      await tx.update(transactions).set(next).where(eq(transactions.id, id));

      const updated = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!updated) {
        throw new Error(`Transaction ${id} not found after update.`);
      }

      await applyTransactionEffects(tx, updated);
      await refreshBudgetsForTransactionChange(tx, current, updated);

      return updated;
    });

    if (
      updated.type === "expense" &&
      updated.merchantId &&
      updated.categoryId &&
      (existing.merchantId !== updated.merchantId || existing.categoryId !== updated.categoryId)
    ) {
      await merchantsService.learnMerchantCategory(updated.merchantId, updated.categoryId);
    }

    emitAccountsChanged();
    emitMerchantsChanged();
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

  private async resolveExpenseMerchant(input: {
    userId: string;
    merchantId: string | null;
    merchantName: string | null;
    categoryId: string | null;
    merchantDefaultCategoryId: string | null;
  }) {
    const name = input.merchantName?.trim() ?? "";

    if (!input.merchantId && !name) {
      return null;
    }

    const merchant = await merchantsService.ensureMerchant({
      userId: input.userId,
      name,
      defaultCategoryId: input.merchantDefaultCategoryId ?? input.categoryId ?? null,
    });

    return merchant
      ? {
          merchantId: merchant.id,
          merchantName: merchant.name,
        }
      : null;
  }
}

export const transactionsService = new TransactionsService();
