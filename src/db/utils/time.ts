import type { BudgetPeriod } from "./constants";

export function nowIso() {
  return new Date().toISOString();
}

export function startOfDayIso(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value.toISOString();
}

export function endOfDayIso(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value.toISOString();
}

export function addDaysIso(date: string | Date, days: number) {
  const value = typeof date === "string" ? new Date(date) : new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

export function toTransactionIso(
  date: Date = new Date(),
  referenceTime: Date = new Date(),
) {
  const value = new Date(date);
  value.setHours(
    referenceTime.getHours(),
    referenceTime.getMinutes(),
    referenceTime.getSeconds(),
    referenceTime.getMilliseconds(),
  );

  return value.toISOString();
}

export function getBudgetCycleRange(
  period: BudgetPeriod,
  anchorDate: string | Date = new Date(),
) {
  const value =
    typeof anchorDate === "string"
      ? new Date(anchorDate)
      : new Date(anchorDate);

  if (period === "monthly") {
    const start = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  const start = new Date(value);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  if (period === "biweekly") {
    const base = new Date(Date.UTC(start.getUTCFullYear(), 0, 7, 0, 0, 0, 0));
    const diffDays = Math.floor((start.getTime() - base.getTime()) / 86400000);
    const offset = ((diffDays % 14) + 14) % 14;
    start.setUTCDate(start.getUTCDate() - offset);
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (period === "weekly" ? 6 : 13));
  end.setUTCHours(23, 59, 59, 999);

  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function calculateNextResetDate(
  period: BudgetPeriod,
  anchorDate: string | Date = new Date(),
) {
  return getBudgetCycleRange(period, anchorDate).endDate;
}

export function shouldResetBudget(
  nextResetDate: string,
  anchorDate: string | Date = new Date(),
) {
  const value =
    typeof anchorDate === "string"
      ? new Date(anchorDate)
      : new Date(anchorDate);
  return value.getTime() >= new Date(nextResetDate).getTime();
}

export function resetBudgetIfNeeded(
  budget: { period: BudgetPeriod; endDate: string },
  anchorDate: string | Date = new Date(),
) {
  if (!shouldResetBudget(budget.endDate, anchorDate)) {
    return {
      shouldReset: false as const,
      nextResetDate: budget.endDate,
      cycleRange: null,
    };
  }

  const cycleRange = getBudgetCycleRange(budget.period, anchorDate);

  return {
    shouldReset: true as const,
    nextResetDate: cycleRange.endDate,
    cycleRange,
  };
}
