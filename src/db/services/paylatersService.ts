import { eq } from "drizzle-orm";

import { db } from "../client";
import { paylaterPayments, paylaters } from "../schema";
import { paylaterPaymentsRepository } from "../repositories/paylaterPaymentsRepository";
import { paylatersRepository } from "../repositories/paylatersRepository";
import type {
  NewPaylater,
  NewPaylaterPayment,
  Paylater,
} from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import {
  calculateInstallmentsRemaining,
  calculatePaylaterProgress,
  estimateCompletionDate,
  getPaylaterScheduledDueDate,
  getPaylaterStatus,
} from "../utils/paylaters";
import {
  assertPositiveAmount,
  assertRequiredText,
} from "../utils/validation";
import { categoriesService } from "./categoriesService";
import { accountsService } from "./accountsService";
import { budgetsService } from "./budgetsService";
import { transactionsService } from "./transactionsService";
import {
  emitAccountsChanged,
  emitPaylatersChanged,
  emitTransactionsChanged,
} from "@/src/lib/dbSync";
import {
  prepareCreateForSync,
  prepareDeleteForSync,
  prepareUpdateForSync,
} from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { showSuccessToast } from "@/store/useToastStore";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";
import { PAYLATER_OPTIONS } from "@/constants/paylaters";

type CreatePaylaterInput = Omit<
  NewPaylater,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
  | "status"
  | "remainingBalance"
  | "startDate"
> & {
  id?: string;
};

type UpdatePaylaterInput = Partial<
  Pick<
    NewPaylater,
    | "itemName"
    | "totalAmount"
    | "remainingBalance"
    | "installmentAmount"
    | "dueDay"
    | "notes"
  >
>;

type RecordPaymentInput = {
  amount: number;
  paymentDate: string;
  accountId?: string | null;
  notes?: string | null;
};

type RepaymentSummary = {
  totalOutstanding: number;
  activePaylatersCount: number;
  nextInstallmentTotal: number;
  overallProgress: number;
};

const PREFERRED_REPAYMENT_CATEGORIES = [
  "PayLater",
  "Pay Later",
  "Debt",
  "Loans",
  "Repayments",
  "Bills & Utilities",
  "Bills",
  "Shopping",
] as const;

function normalizeName(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function toPlatformLabel(platform: string) {
  return (
    PAYLATER_OPTIONS.find((option) => option.platform === platform)?.name ??
    "PayLater"
  );
}

function toEffectiveStatus(
  paylater: Pick<
    Paylater,
    "remainingBalance" | "installmentAmount" | "dueDay" | "dueDate" | "status"
  >,
) {
  return getPaylaterStatus({
    remainingBalance: Number(paylater.remainingBalance ?? 0),
    installmentAmount: Number(paylater.installmentAmount ?? 0),
    dueDay: paylater.dueDay,
    dueDate: paylater.dueDate,
  });
}

function asDateParts(date: string | Date | null | undefined) {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class PaylatersService {
  async create(input: CreatePaylaterInput) {
    assertRequiredText(input.userId ?? "", "userId");
    assertRequiredText(input.platform ?? "", "platform");
    assertRequiredText(input.itemName ?? "", "item name");
    assertPositiveAmount(input.totalAmount, "total amount");
    assertPositiveAmount(input.installmentAmount, "installment amount");
    assertPositiveAmount(input.installmentCount ?? 0, "installment count");
    this.assertDueDay(input.dueDay ?? null);

    const timestamp = nowIso();
    const created = await paylatersRepository.create({
      ...prepareCreateForSync({
        ...input,
        id: input.id ?? createId("paylater"),
        remainingBalance: input.totalAmount,
        startDate: timestamp,
        status: getPaylaterStatus({
          remainingBalance: input.totalAmount,
          installmentAmount: input.installmentAmount,
          dueDay: input.dueDay,
          dueDate: input.dueDate,
        }),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (created) {
      await enqueueSync("paylaters", created.id, "upsert", created.userId);
      emitPaylatersChanged();
      showSuccessToast({
        title: "Paylater added",
        message: "Your paylater purchase is now being tracked.",
        dedupeKey: `paylater:create:${created.id}`,
        source: "paylaters-service",
      });
    }

    return created;
  }

  async update(id: string, input: UpdatePaylaterInput) {
    const existing = await paylatersRepository.findById(id);
    if (!existing) {
      throw new Error("Paylater not found.");
    }

    const nextItemName = input.itemName ?? existing.itemName;
    const nextTotalAmount = input.totalAmount ?? existing.totalAmount;
    const nextRemainingBalance =
      input.remainingBalance ?? existing.remainingBalance;
    const nextInstallmentAmount =
      input.installmentAmount ?? existing.installmentAmount;
    const nextDueDay = input.dueDay ?? existing.dueDay;

    assertRequiredText(nextItemName, "item name");
    assertPositiveAmount(nextTotalAmount, "total amount");
    this.assertDueDay(nextDueDay ?? null);
    if (
      nextRemainingBalance < 0 ||
      nextRemainingBalance > nextTotalAmount
    ) {
      throw new Error("Remaining balance must be between 0 and the total amount.");
    }
    assertPositiveAmount(nextInstallmentAmount, "installment amount");

    const updated = await paylatersRepository.update(
      id,
      prepareUpdateForSync({
        ...input,
        itemName: nextItemName,
        totalAmount: nextTotalAmount,
        remainingBalance: nextRemainingBalance,
        installmentAmount: nextInstallmentAmount,
        dueDay: nextDueDay,
        status: getPaylaterStatus({
          remainingBalance: nextRemainingBalance,
          installmentAmount: nextInstallmentAmount,
          dueDay: nextDueDay,
          dueDate: existing.dueDate,
        }),
        updatedAt: nowIso(),
      }),
    );

    if (updated) {
      await enqueueSync("paylaters", updated.id, "upsert", updated.userId);
      emitPaylatersChanged();
      showSuccessToast({
        title: "Paylater updated",
        message: "Your paylater changes were saved successfully.",
        dedupeKey: `paylater:update:${updated.id}:${updated.updatedAt}`,
        source: "paylaters-service",
      });
    }

    return updated;
  }

  async recordPayment(paylaterId: string, input: RecordPaymentInput) {
    const existing = await paylatersRepository.findById(paylaterId);
    if (!existing) {
      throw new Error("Paylater not found.");
    }

    assertPositiveAmount(input.amount, "payment amount");
    assertRequiredText(input.paymentDate ?? "", "payment date");
    this.assertPaymentNotes(input.notes ?? null);

    if (input.amount > existing.remainingBalance) {
      throw new Error("Payment amount cannot exceed the remaining balance.");
    }

    const categoryId = await this.resolveRepaymentCategoryId(existing.userId);
    const selectedAccount =
      input.accountId != null
        ? await accountsService.fetchById(input.accountId)
        : null;

    if (input.accountId && !selectedAccount) {
      throw new Error("Selected payment account was not found.");
    }

    if (selectedAccount && selectedAccount.userId !== existing.userId) {
      throw new Error("Selected payment account does not belong to this user.");
    }

    const repaymentAccount =
      selectedAccount ??
      (await accountsService.ensureDefaultCashAccount(
        existing.userId,
        DEFAULT_CURRENCY_CODE,
      ));

    if (!repaymentAccount) {
      throw new Error("Unable to resolve a payment account for the repayment.");
    }

    await this.resetBudgetCycleIfNeeded(existing.userId, input.paymentDate);

    const timestamp = nowIso();
    const paymentId = createId("pylpay");
    const result = await db.transaction(async (tx) => {
      const payment = {
        ...prepareCreateForSync({
          id: paymentId,
          paylaterId: existing.id,
          userId: existing.userId,
          transactionId: null,
          amount: input.amount,
          paymentDate: input.paymentDate,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      } satisfies NewPaylaterPayment;

      const nextRemainingBalance = Math.max(
        0,
        Number(existing.remainingBalance) - input.amount,
      );
      const nextStatus = getPaylaterStatus({
        remainingBalance: nextRemainingBalance,
        installmentAmount: existing.installmentAmount,
        dueDay: existing.dueDay,
        dueDate: existing.dueDate,
      });

      await tx.insert(paylaterPayments).values(payment);
      await tx
        .update(paylaters)
        .set(
          prepareUpdateForSync({
            remainingBalance: nextRemainingBalance,
            status: nextStatus,
            updatedAt: timestamp,
          }),
        )
        .where(eq(paylaters.id, existing.id));

      const linkedTransaction =
        await transactionsService.upsertLinkedPaylaterRepaymentInTransaction(tx, {
          paymentId,
          userId: existing.userId,
          amount: input.amount,
          paymentDate: input.paymentDate,
          accountId: repaymentAccount.id,
          currencyCode: repaymentAccount.currencyCode ?? DEFAULT_CURRENCY_CODE,
          categoryId,
          itemName: existing.itemName,
          platformLabel: toPlatformLabel(existing.platform),
          userNotes: input.notes ?? null,
        });

      await tx
        .update(paylaterPayments)
        .set(
          prepareUpdateForSync({
            transactionId: linkedTransaction.id,
            updatedAt: timestamp,
          }),
        )
        .where(eq(paylaterPayments.id, paymentId));

      await enqueueSync("paylaters", existing.id, "upsert", existing.userId, null, tx);
      await enqueueSync(
        "paylater_payments",
        paymentId,
        "upsert",
        existing.userId,
        null,
        tx,
      );
      await enqueueSync(
        "transactions",
        linkedTransaction.id,
        "upsert",
        existing.userId,
        null,
        tx,
      );

      return {
        paymentId,
        transactionId: linkedTransaction.id,
      };
    });

    emitPaylatersChanged();
    emitAccountsChanged();
    emitTransactionsChanged();
    showSuccessToast({
      title: "Payment recorded",
      message: "The repayment has been saved and counted as an expense.",
      dedupeKey: `paylater:payment:${result.paymentId}`,
      source: "paylaters-service",
    });

    return result;
  }

  async deletePayment(paymentId: string) {
    const existingPayment = await paylaterPaymentsRepository.findById(paymentId);
    if (!existingPayment) {
      throw new Error("Payment history entry not found.");
    }

    const existingPaylater = await paylatersRepository.findById(
      existingPayment.paylaterId,
    );
    if (!existingPaylater) {
      throw new Error("Paylater not found.");
    }

    const timestamp = nowIso();
    await db.transaction(async (tx) => {
      const linkedTransaction =
        await transactionsService.softDeleteLinkedPaylaterRepaymentInTransaction(tx, {
          paymentId: existingPayment.id,
          transactionId: existingPayment.transactionId,
        });

      const nextRemainingBalance = Math.min(
        existingPaylater.totalAmount,
        Number(existingPaylater.remainingBalance) + Number(existingPayment.amount),
      );

      await tx
        .update(paylaterPayments)
        .set(prepareDeleteForSync(timestamp))
        .where(eq(paylaterPayments.id, existingPayment.id));
      await tx
        .update(paylaters)
        .set(
          prepareUpdateForSync({
            remainingBalance: nextRemainingBalance,
            status: getPaylaterStatus({
              remainingBalance: nextRemainingBalance,
              installmentAmount: existingPaylater.installmentAmount,
              dueDay: existingPaylater.dueDay,
              dueDate: existingPaylater.dueDate,
            }),
            updatedAt: timestamp,
          }),
        )
        .where(eq(paylaters.id, existingPaylater.id));

      await enqueueSync(
        "paylaters",
        existingPaylater.id,
        "upsert",
        existingPaylater.userId,
        null,
        tx,
      );
      await enqueueSync(
        "paylater_payments",
        existingPayment.id,
        "delete",
        existingPayment.userId,
        null,
        tx,
      );
      if (linkedTransaction) {
        await enqueueSync(
          "transactions",
          linkedTransaction.id,
          "delete",
          linkedTransaction.userId,
          null,
          tx,
        );
      }
    });

    emitPaylatersChanged();
    emitAccountsChanged();
    emitTransactionsChanged();
    showSuccessToast({
      title: "Payment removed",
      message: "The repayment entry and linked expense were reversed.",
      dedupeKey: `paylater:payment:delete:${existingPayment.id}`,
      source: "paylaters-service",
    });
  }

  async markPaylaterAsPaid(id: string) {
    return this.markPaylaterAsPaidWithAccount(id, null);
  }

  async markPaylaterAsPaidWithAccount(
    id: string,
    accountId: string | null,
  ) {
    const existing = await paylatersRepository.findById(id);
    if (!existing) {
      throw new Error("Paylater not found.");
    }

    if (existing.remainingBalance <= 0) {
      return existing;
    }

    await this.recordPayment(id, {
      amount: existing.remainingBalance,
      paymentDate: nowIso(),
      accountId,
      notes: "Marked as paid",
    });

    return paylatersRepository.findById(id);
  }

  async delete(id: string) {
    const existing = await paylatersRepository.findById(id);
    if (!existing) {
      return;
    }

    const payments =
      await paylaterPaymentsRepository.findAllByPaylaterIdIncludingDeleted(id);
    const activePayments = payments.filter((payment) => !payment.deletedAt);
    const timestamp = nowIso();

    await db.transaction(async (tx) => {
      if (activePayments.length > 0) {
        for (const payment of activePayments) {
          const linkedTransaction =
            await transactionsService.softDeleteLinkedPaylaterRepaymentInTransaction(tx, {
              paymentId: payment.id,
              transactionId: payment.transactionId,
            });

          await tx
            .update(paylaterPayments)
            .set(prepareDeleteForSync(timestamp))
            .where(eq(paylaterPayments.id, payment.id));

          await enqueueSync(
            "paylater_payments",
            payment.id,
            "delete",
            payment.userId,
            null,
            tx,
          );
          if (linkedTransaction) {
            await enqueueSync(
              "transactions",
              linkedTransaction.id,
              "delete",
              linkedTransaction.userId,
              null,
              tx,
            );
          }
        }
      }

      await tx
        .update(paylaters)
        .set(prepareDeleteForSync(timestamp))
        .where(eq(paylaters.id, existing.id));
      await enqueueSync("paylaters", existing.id, "delete", existing.userId, null, tx);
    });

    emitPaylatersChanged();
    emitAccountsChanged();
    emitTransactionsChanged();
    showSuccessToast({
      title: "Paylater deleted",
      message: "The paylater and its linked repayment expenses were removed.",
      dedupeKey: `paylater:delete:${existing.id}`,
      source: "paylaters-service",
    });
  }

  async fetch(userId: string) {
    return paylatersRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return paylatersRepository.findById(id);
  }

  async fetchPayments(paylaterId: string) {
    return paylaterPaymentsRepository.findAllByPaylaterId(paylaterId);
  }

  async getPaylaterSummary(userId: string): Promise<RepaymentSummary> {
    const rows = await this.fetch(userId);
    const activeRows = rows.filter((row) => toEffectiveStatus(row) !== "paid");
    const totalAmount = activeRows.reduce(
      (sum, row) => sum + Number(row.totalAmount ?? 0),
      0,
    );
    const totalOutstanding = activeRows.reduce(
      (sum, row) => sum + Number(row.remainingBalance ?? 0),
      0,
    );
    const nextInstallmentTotal = activeRows.reduce(
      (sum, row) => sum + Number(row.installmentAmount ?? 0),
      0,
    );

    return {
      totalOutstanding,
      activePaylatersCount: activeRows.length,
      nextInstallmentTotal,
      overallProgress: calculatePaylaterProgress(totalAmount, totalOutstanding),
    };
  }

  async getNextPaymentDue(userId: string) {
    const rows = await this.fetch(userId);
    const activeRows = rows
      .filter((row) => toEffectiveStatus(row) !== "paid")
      .map((row) => {
        const effectiveStatus = toEffectiveStatus(row);
        const dueDate = getPaylaterScheduledDueDate({
          remainingBalance: Number(row.remainingBalance ?? 0),
          installmentAmount: Number(row.installmentAmount ?? 0),
          dueDay: row.dueDay,
          dueDate: row.dueDate,
        });
        return {
          row,
          effectiveStatus,
          dueDate,
        };
      })
      .filter((item) => item.dueDate !== null)
      .sort(
        (left, right) =>
          left.dueDate!.getTime() - right.dueDate!.getTime(),
      );

    return activeRows[0] ?? null;
  }

  private assertDueDay(value: string | null) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
      throw new Error("Due day must be between 1 and 31.");
    }
  }

  private assertPaymentNotes(value: string | null) {
    if (value && value.length > 100) {
      throw new Error("Payment notes must be 100 characters or less.");
    }
  }

  private async resolveRepaymentCategoryId(userId: string) {
    const categories = await categoriesService.fetch(userId, "expense");

    for (const preferredName of PREFERRED_REPAYMENT_CATEGORIES) {
      const match = categories.find(
        (category) => normalizeName(category.name) === normalizeName(preferredName),
      );
      if (match) {
        return categoriesService.resolveCanonicalCategoryId(match.id);
      }
    }

    if (categories[0]) {
      return categoriesService.resolveCanonicalCategoryId(categories[0].id);
    }

    const created = await categoriesService.create({
      userId,
      type: "expense",
      name: "PayLater",
      icon: "credit-card",
      iconType: "vector",
      iconName: "credit-card",
      iconImageUri: null,
      emoji: null,
      color: "#168CF3",
      isDefault: false,
      isSystem: false,
      isArchived: false,
    });

    return created?.id ?? null;
  }

  private async resetBudgetCycleIfNeeded(userId: string, anchorDate: string) {
    await budgetsService.resetBudgetsIfNeeded(userId, anchorDate).catch(() => undefined);
  }
}

export const paylatersService = new PaylatersService();

export type PaylaterListItem = Awaited<ReturnType<PaylatersService["fetch"]>>[number];
export type PaylaterPaymentListItem = Awaited<
  ReturnType<PaylatersService["fetchPayments"]>
>[number];

export function toPaylaterProgressLabel(paylater: Pick<
  Paylater,
  "totalAmount" | "remainingBalance" | "installmentAmount"
>) {
  const progress = calculatePaylaterProgress(
    paylater.totalAmount,
    paylater.remainingBalance,
  );
  const installmentsRemaining = calculateInstallmentsRemaining(
    paylater.remainingBalance,
    paylater.installmentAmount,
  );
  return {
    progress,
    percentagePaid: Math.round(progress * 100),
    installmentsRemaining,
  };
}

export function toPaylaterEstimatedCompletionLabel(paylater: Pick<
  Paylater,
  "remainingBalance" | "installmentAmount" | "dueDay" | "dueDate"
>) {
  const dueDate = asDateParts(paylater.dueDate);
  if (dueDate) {
    return `Target completion: ${new Intl.DateTimeFormat("en-PH", {
      month: "short",
      year: "numeric",
    }).format(dueDate)}`;
  }

  const estimate = estimateCompletionDate({
    remainingBalance: paylater.remainingBalance,
    installmentAmount: paylater.installmentAmount,
    dueDay: paylater.dueDay,
  });
  if (!estimate) {
    return "Target completion date not set";
  }

  return `Estimated completion: ${new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(estimate)}`;
}
