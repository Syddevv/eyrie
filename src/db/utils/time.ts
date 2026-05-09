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
