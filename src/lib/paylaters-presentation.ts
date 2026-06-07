import { PAYLATER_OPTIONS } from "@/constants/paylaters";
import type {
  PaylaterListItem,
  PaylaterPaymentListItem,
} from "@/src/db/services/paylatersService";
import {
  calculateDueInDays,
  formatCurrencyPHP,
  getPaylaterScheduledDueDate,
} from "@/src/db/utils/paylaters";
import {
  toPaylaterEstimatedCompletionLabel,
  toPaylaterProgressLabel,
} from "@/src/db/services/paylatersService";

export function getPaylaterOption(platform: string) {
  return (
    PAYLATER_OPTIONS.find((option) => option.platform === platform) ??
    PAYLATER_OPTIONS[PAYLATER_OPTIONS.length - 1]
  );
}

export function formatPaylaterDueDayLabel(dueDay: string | null) {
  const parsed = Number.parseInt(dueDay ?? "", 10);
  return Number.isFinite(parsed) ? `Day ${parsed} of month` : "No due day set";
}

export function getPaylaterStatusTone(status: string) {
  if (status === "overdue") {
    return "overdue";
  }

  if (status === "paid") {
    return "paid";
  }

  return "upcoming";
}

export function getPaylaterStatusLabel(status: string) {
  if (status === "overdue") {
    return "Overdue";
  }

  if (status === "paid") {
    return "Paid";
  }

  return "Upcoming";
}

export function getPaylaterProgressCopy(paylater: Pick<
  PaylaterListItem,
  "totalAmount" | "remainingBalance" | "installmentAmount"
>) {
  const { percentagePaid, installmentsRemaining } =
    toPaylaterProgressLabel(paylater);

  return `${percentagePaid}% paid • ${installmentsRemaining} installments remaining`;
}

export function getPaylaterNextDueCopy(paylater: Pick<
  PaylaterListItem,
  "status" | "remainingBalance" | "installmentAmount" | "dueDay" | "dueDate"
>) {
  const scheduledDueDate = getPaylaterScheduledDueDate({
    remainingBalance: Number(paylater.remainingBalance ?? 0),
    installmentAmount: Number(paylater.installmentAmount ?? 0),
    dueDay: paylater.dueDay,
    dueDate: paylater.dueDate,
  });

  if (paylater.status === "overdue" && scheduledDueDate) {
    const daysOverdue = Math.max(1, Math.abs(calculateDueInDays(scheduledDueDate)));

    return `Overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`;
  }

  if (!scheduledDueDate) {
    return "Due date unavailable";
  }

  const daysUntil = Math.max(0, calculateDueInDays(scheduledDueDate));

  return `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
}

export function getPaylaterSummaryProgressLabel(progress: number) {
  return `${Math.round(progress * 100)}% paid off`;
}

export function formatPaylaterAmount(amount: number) {
  return formatCurrencyPHP(amount);
}

export function formatPaylaterEstimatedCompletion(paylater: Pick<
  PaylaterListItem,
  "remainingBalance" | "installmentAmount" | "dueDay" | "dueDate"
>) {
  return toPaylaterEstimatedCompletionLabel(paylater);
}

export function formatPaylaterPaymentDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getPaylaterPaymentTitle(
  payment: Pick<PaylaterPaymentListItem, "paymentDate">,
  index: number,
) {
  return `Payment ${index + 1}`;
}
