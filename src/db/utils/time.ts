import type { BudgetPeriod } from "./constants";

const DAY_IN_MS = 86_400_000;

function asDate(value: string | Date) {
  return value instanceof Date ? new Date(value) : new Date(value);
}

function startOfUtcDay(value: string | Date) {
  const date = asDate(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfUtcDay(value: string | Date) {
  const date = asDate(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function getMonthlyOccurrence(
  createdAt: string | Date,
  monthOffset: number,
  mode: "start" | "end",
) {
  const created = asDate(createdAt);
  const baseMonthIndex = created.getUTCFullYear() * 12 + created.getUTCMonth();
  const targetMonthIndex = baseMonthIndex + monthOffset;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const targetDay = created.getUTCDate();
  const lastDayOfMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(targetDay, lastDayOfMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      mode === "start" ? 0 : 23,
      mode === "start" ? 0 : 59,
      mode === "start" ? 0 : 59,
      mode === "start" ? 0 : 999,
    ),
  );
}

export function nowIso() {
  return new Date().toISOString();
}

export function startOfDayIso(date: string | Date) {
  return startOfUtcDay(date).toISOString();
}

export function endOfDayIso(date: string | Date) {
  return endOfUtcDay(date).toISOString();
}

export function addDaysIso(date: string | Date, days: number) {
  const value = asDate(date);
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

export function calculateNextResetDate(input: {
  createdAt: string | Date;
  cycle: BudgetPeriod;
  currentDate: string | Date;
}) {
  const created = asDate(input.createdAt);
  const current = asDate(input.currentDate);
  let nextResetDate: Date;

  if (input.cycle === "monthly") {
    const monthsSinceCreation =
      (current.getUTCFullYear() - created.getUTCFullYear()) * 12 +
      (current.getUTCMonth() - created.getUTCMonth());
    let monthOffset = Math.max(1, monthsSinceCreation);
    nextResetDate = getMonthlyOccurrence(created, monthOffset, "end");

    while (nextResetDate.getTime() <= current.getTime()) {
      monthOffset += 1;
      nextResetDate = getMonthlyOccurrence(created, monthOffset, "end");
    }
  } else {
    const daysInterval = input.cycle === "biweekly" ? 14 : 7;
    const firstResetDate = endOfUtcDay(created);
    firstResetDate.setUTCDate(firstResetDate.getUTCDate() + daysInterval);

    if (current.getTime() < firstResetDate.getTime()) {
      nextResetDate = firstResetDate;
    } else {
      const diffMs = current.getTime() - firstResetDate.getTime();
      const cyclesPassed = Math.floor(diffMs / (daysInterval * DAY_IN_MS));
      nextResetDate = new Date(
        firstResetDate.getTime() + (cyclesPassed + 1) * daysInterval * DAY_IN_MS,
      );
    }
  }
  return nextResetDate.toISOString();
}

export function getBudgetCycleRange(input: {
  createdAt: string | Date;
  cycle: BudgetPeriod;
  currentDate: string | Date;
}) {
  const created = asDate(input.createdAt);
  const endDate = calculateNextResetDate(input);
  const end = asDate(endDate);
  let start: Date;

  if (input.cycle === "monthly") {
    const monthsSinceCreation =
      (end.getUTCFullYear() - created.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - created.getUTCMonth());
    start =
      monthsSinceCreation <= 1
        ? startOfUtcDay(created)
        : getMonthlyOccurrence(created, monthsSinceCreation - 1, "start");
  } else {
    const daysInterval = input.cycle === "biweekly" ? 14 : 7;
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - daysInterval);
    start.setUTCHours(0, 0, 0, 0);
  }

  const cycleRange = {
    startDate: start.toISOString(),
    endDate,
  };
  return cycleRange;
}

export function formatResetDateLabel(input: {
  createdAt: string | Date;
  cycle: BudgetPeriod;
  currentDate: string | Date;
}) {
  return formatResetDateLabelFromNextResetDate(
    calculateNextResetDate(input),
    input.currentDate,
    input.cycle,
  );
}

export function formatResetDateLabelFromNextResetDate(
  nextResetDate: string | Date,
  currentDate: string | Date = new Date(),
  cycle?: BudgetPeriod,
) {
  const current = asDate(currentDate);
  const resetDate = asDate(nextResetDate);

  if (cycle === "biweekly") {
    const diffDays = Math.max(
      0,
      Math.ceil((resetDate.getTime() - current.getTime()) / DAY_IN_MS),
    );

    return diffDays === 1 ? "Resets in 1 day" : `Resets in ${diffDays} days`;
  }

  const formattedDate = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(resetDate);

  return `Resets on ${formattedDate}`;
}

export function formatNextResetDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(asDate(value));
}

export function shouldResetBudget(
  nextResetDate: string,
  anchorDate: string | Date = new Date(),
) {
  const value = asDate(anchorDate);
  return value.getTime() >= asDate(nextResetDate).getTime();
}

export function resetBudgetIfNeeded(
  budget: { period: BudgetPeriod; endDate: string; createdAt: string },
  anchorDate: string | Date = new Date(),
) {
  if (!shouldResetBudget(budget.endDate, anchorDate)) {
    return {
      shouldReset: false as const,
      nextResetDate: budget.endDate,
      cycleRange: null,
    };
  }

  const cycleRange = getBudgetCycleRange({
    createdAt: budget.createdAt,
    cycle: budget.period,
    currentDate: anchorDate,
  });

  return {
    shouldReset: true as const,
    nextResetDate: cycleRange.endDate,
    cycleRange,
  };
}
