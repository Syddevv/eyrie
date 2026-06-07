const DAY_IN_MS = 86_400_000;

export const PAYLATER_TRANSACTION_SOURCE = "paylater";
export const PAYLATER_TRANSACTION_REFERENCE_TYPE = "paylater_payment";
const PAYLATER_REFERENCE_TOKEN_PREFIX = "#paylater_payment:";

function parseDayOfMonth(value: string | number | null | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
    return null;
  }

  return parsed;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function buildClampedDueDate(year: number, month: number, dueDay: number) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(dueDay, lastDayOfMonth);
  return new Date(year, month, clampedDay);
}

export function formatCurrencyPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculatePaylaterProgress(
  totalAmount: number,
  remainingBalance: number,
) {
  if (totalAmount <= 0) {
    return 0;
  }

  const paidAmount = Math.max(0, totalAmount - Math.max(0, remainingBalance));
  return Math.min(1, paidAmount / totalAmount);
}

export function calculateInstallmentsRemaining(
  remainingBalance: number,
  installmentAmount: number,
) {
  if (remainingBalance <= 0 || installmentAmount <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil(remainingBalance / installmentAmount));
}

export function getCurrentCycleDueDate(
  dueDay: string | number | null | undefined,
  today = new Date(),
) {
  const parsed = parseDayOfMonth(dueDay);
  if (!parsed) {
    return null;
  }

  return buildClampedDueDate(today.getFullYear(), today.getMonth(), parsed);
}

export function getNextUpcomingDueDate(
  dueDay: string | number | null | undefined,
  today = new Date(),
) {
  const parsed = parseDayOfMonth(dueDay);
  if (!parsed) {
    return null;
  }

  const todayStart = startOfLocalDay(today);
  const currentCycleDueDate = buildClampedDueDate(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    parsed,
  );

  if (currentCycleDueDate.getTime() >= todayStart.getTime()) {
    return currentCycleDueDate;
  }

  const nextMonth = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
  return buildClampedDueDate(nextMonth.getFullYear(), nextMonth.getMonth(), parsed);
}

export function getPaylaterStatus(input: {
  remainingBalance: number;
  dueDay?: string | number | null;
  today?: Date;
}) {
  if (input.remainingBalance <= 0) {
    return "paid" as const;
  }

  const today = input.today ?? new Date();
  const todayStart = startOfLocalDay(today);
  const currentCycleDueDate = getCurrentCycleDueDate(input.dueDay, todayStart);

  if (currentCycleDueDate && currentCycleDueDate.getTime() < todayStart.getTime()) {
    return "overdue" as const;
  }

  return "upcoming" as const;
}

export function calculateDueInDays(targetDate: Date, today = new Date()) {
  const targetStart = startOfLocalDay(targetDate);
  const todayStart = startOfLocalDay(today);
  return Math.round((targetStart.getTime() - todayStart.getTime()) / DAY_IN_MS);
}

export function estimateCompletionDate(input: {
  remainingBalance: number;
  installmentAmount: number;
  dueDay?: string | number | null;
  fromDate?: Date;
}) {
  const installmentsRemaining = calculateInstallmentsRemaining(
    input.remainingBalance,
    input.installmentAmount,
  );
  if (installmentsRemaining <= 0) {
    return null;
  }

  const fromDate = input.fromDate ?? new Date();
  const firstDueDate = getNextUpcomingDueDate(input.dueDay, fromDate);
  if (!firstDueDate) {
    return null;
  }

  if (installmentsRemaining === 1) {
    return firstDueDate;
  }

  const finalMonth = new Date(
    firstDueDate.getFullYear(),
    firstDueDate.getMonth() + installmentsRemaining - 1,
    1,
  );

  return getCurrentCycleDueDate(input.dueDay, finalMonth);
}

export function buildPaylaterPaymentReferenceToken(paymentId: string) {
  return `${PAYLATER_REFERENCE_TOKEN_PREFIX}${paymentId}`;
}

export function extractPaylaterPaymentReferenceToken(notes?: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/#paylater_payment:([A-Za-z0-9-]+)/);
  return match?.[1] ?? null;
}

export function buildRepaymentTransactionNotes(input: {
  paymentId: string;
  itemName: string;
  platformLabel: string;
  userNotes?: string | null;
}) {
  const parts = [
    input.userNotes?.trim() || "",
    `PayLater repayment for ${input.itemName} via ${input.platformLabel}`,
    buildPaylaterPaymentReferenceToken(input.paymentId),
  ].filter(Boolean);

  return parts.join("\n\n");
}
