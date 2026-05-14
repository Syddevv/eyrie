import { and, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "../client";
import { budgets, transactions } from "../schema";
import { transactionsRepository } from "../repositories/transactionsRepository";
import { merchantsService } from "./merchantsService";
import {
  applyTransactionEffects,
  refreshBudgetsForTransactionChange,
  reverseTransactionEffects,
} from "./financeOrchestrator";
import {
  generatePeriodicNotifications,
  processTransactionNotificationEvent,
} from "@/services/notifications";
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
import { prepareCreateForSync, prepareDeleteForSync, prepareUpdateForSync } from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";

export type CreateTransactionInput = Omit<
  NewTransaction,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
  merchantDefaultCategoryId?: string | null;
};

export class TransactionsService {
  private async enqueueTransactionDependencies(entries: Array<Pick<NewTransaction, "userId" | "accountId" | "transferAccountId" | "type" | "categoryId" | "transactionDate"> | null | undefined>) {
    const accountIds = new Set<string>();
    const budgetIds = new Set<string>();
    let userId: string | null = null;

    for (const entry of entries) {
      if (!entry?.userId) {
        continue;
      }

      userId = entry.userId;
      accountIds.add(entry.accountId);
      if (entry.transferAccountId) {
        accountIds.add(entry.transferAccountId);
      }

      if (entry.type === "expense" && entry.categoryId) {
        const relatedBudgets = await db.query.budgets.findMany({
          where: and(
            eq(budgets.userId, entry.userId),
            eq(budgets.categoryId, entry.categoryId),
            isNull(budgets.deletedAt),
            lte(budgets.startDate, entry.transactionDate),
            gte(budgets.endDate, entry.transactionDate),
          ),
        });
        for (const budget of relatedBudgets) {
          budgetIds.add(budget.id);
        }
      }
    }

    if (!userId) {
      return;
    }

    for (const accountId of accountIds) {
      await enqueueSync("accounts", accountId, "upsert", userId);
    }

    for (const budgetId of budgetIds) {
      await enqueueSync("budgets", budgetId, "upsert", userId);
    }
  }

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
        ...prepareCreateForSync({
          ...input,
          merchantId: merchantPayload?.merchantId ?? input.merchantId ?? null,
          merchantName:
            input.type === "expense"
              ? merchantPayload?.merchantName ?? null
              : input.merchantName ?? null,
          id: transactionId,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
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

    processTransactionNotificationEvent({
      userId: created.userId,
      transactionId: created.id,
      amount: created.amount,
      categoryId: created.categoryId ?? null,
      transactionDate: created.transactionDate,
      merchantName: created.merchantName ?? null,
      accountId: created.accountId,
      type: created.type,
      previousExpenseAmount: 0,
      nextExpenseAmount: created.type === "expense" ? created.amount : 0,
      shouldCreateTransactionAdded: true,
    })
      .then(() => generatePeriodicNotifications(created.userId))
      .catch(() => undefined);

    emitAccountsChanged();
    emitMerchantsChanged();
    await enqueueSync("transactions", created.id, "upsert", created.userId);
    await this.enqueueTransactionDependencies([created]);
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
        ...prepareUpdateForSync({
          updatedAt: nowIso(),
        }),
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

    const updatedExpenseAmount = updated.type === "expense" ? updated.amount : 0;
    const existingExpenseAmount = existing.type === "expense" ? existing.amount : 0;

    processTransactionNotificationEvent({
      userId: updated.userId,
      transactionId: updated.id,
      amount: updated.amount,
      categoryId: updated.categoryId ?? null,
      transactionDate: updated.transactionDate,
      merchantName: updated.merchantName ?? null,
      accountId: updated.accountId,
      type: updated.type,
      previousExpenseAmount: existingExpenseAmount,
      nextExpenseAmount: updatedExpenseAmount,
      shouldCreateTransactionAdded: false,
    })
      .then(() => generatePeriodicNotifications(updated.userId))
      .catch(() => undefined);

    if (
      existing.type === "expense" &&
      (existing.categoryId !== updated.categoryId ||
        existing.transactionDate !== updated.transactionDate)
    ) {
      processTransactionNotificationEvent({
        userId: existing.userId,
        transactionId: existing.id,
        amount: existing.amount,
        categoryId: existing.categoryId ?? null,
        transactionDate: existing.transactionDate,
        merchantName: existing.merchantName ?? null,
        accountId: existing.accountId,
        type: existing.type,
        previousExpenseAmount: existingExpenseAmount,
        nextExpenseAmount: 0,
        shouldCreateTransactionAdded: false,
      }).catch(() => undefined);
    }

    emitAccountsChanged();
    emitMerchantsChanged();
    await enqueueSync("transactions", updated.id, "upsert", updated.userId);
    await this.enqueueTransactionDependencies([existing, updated]);
    return updated;
  }

  async delete(id: string) {
    const deleted = await db.transaction(async (tx) => {
      const existing = await tx.query.transactions.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, id),
      });

      if (!existing) {
        return null;
      }

      await reverseTransactionEffects(tx, existing);
      await tx.update(transactions).set(prepareDeleteForSync()).where(eq(transactions.id, id));
      await refreshBudgetsForTransactionChange(tx, existing, undefined);
      return existing;
    });

    if (deleted) {
      processTransactionNotificationEvent({
        userId: deleted.userId,
        transactionId: deleted.id,
        amount: deleted.amount,
        categoryId: deleted.categoryId ?? null,
        transactionDate: deleted.transactionDate,
        merchantName: deleted.merchantName ?? null,
        accountId: deleted.accountId,
        type: deleted.type,
        previousExpenseAmount: deleted.type === "expense" ? deleted.amount : 0,
        nextExpenseAmount: 0,
        shouldCreateTransactionAdded: false,
      })
        .then(() => generatePeriodicNotifications(deleted.userId))
        .catch(() => undefined);
    }

    emitAccountsChanged();
    if (deleted) {
      await enqueueSync("transactions", deleted.id, "delete", deleted.userId);
      await this.enqueueTransactionDependencies([deleted]);
    }
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
