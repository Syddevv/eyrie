export type StreakState = {
  currentStreak: number;
  lastActiveDate: string | null;
};

export type ValidatedStreakState = StreakState & {
  lostStreak: boolean;
  daysSinceLastActivity: number | null;
};

export type StreakActivityResult = StreakState & {
  changed: boolean;
  countedToday: boolean;
  resetFromMissedPeriod: boolean;
  ignoredFutureDate: boolean;
  previousStreak: number;
  previousLastActiveDate: string | null;
  daysSinceLastActivity: number | null;
};

export type StreakActivityInput = StreakState & {
  longestStreak?: number | null;
};

export type StreakActivityTransition = StreakActivityResult & {
  longestStreak: number;
  previousLongestStreak: number;
};

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

export function isValidDateKey(value?: string | null) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeStreakState(state: Partial<StreakState>): StreakState {
  return {
    currentStreak: Math.max(0, Math.floor(Number(state.currentStreak) || 0)),
    lastActiveDate: isValidDateKey(state.lastActiveDate)
      ? state.lastActiveDate!
      : null,
  };
}

function normalizeStreakCount(value?: number | null) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function diffCalendarDays(left: string, right: string) {
  const msPerDay = 86_400_000;
  return Math.round((parseDateKey(left) - parseDateKey(right)) / msPerDay);
}

export function validateStreakState(
  state: StreakState,
  today = getLocalDateKey(),
): ValidatedStreakState {
  const normalized = normalizeStreakState(state);

  if (!normalized.lastActiveDate) {
    return {
      currentStreak: 0,
      lastActiveDate: null,
      lostStreak: false,
      daysSinceLastActivity: null,
    };
  }

  const daysSinceLastActivity = diffCalendarDays(
    today,
    normalized.lastActiveDate,
  );
  const lostStreak =
    daysSinceLastActivity > 1 && normalized.currentStreak > 0;

  return {
    currentStreak: normalized.currentStreak,
    lastActiveDate: normalized.lastActiveDate,
    lostStreak,
    daysSinceLastActivity,
  };
}

export function calculateStreakAfterActivity(
  state: StreakActivityInput,
  today = getLocalDateKey(),
): StreakActivityTransition {
  const normalized = normalizeStreakState(state);
  const previousStreak = normalized.currentStreak;
  const previousLastActiveDate = normalized.lastActiveDate;
  const previousLongestStreak = normalizeStreakCount(state.longestStreak);

  if (!normalized.lastActiveDate) {
    return {
      currentStreak: 1,
      lastActiveDate: today,
      longestStreak: Math.max(previousLongestStreak, 1),
      previousLongestStreak,
      changed: true,
      countedToday: true,
      resetFromMissedPeriod: false,
      ignoredFutureDate: false,
      previousStreak,
      previousLastActiveDate,
      daysSinceLastActivity: null,
    };
  }

  const daysSinceLastActivity = diffCalendarDays(
    today,
    normalized.lastActiveDate,
  );

  if (daysSinceLastActivity === 0) {
    return {
      ...normalized,
      longestStreak: previousLongestStreak,
      previousLongestStreak,
      changed: false,
      countedToday: false,
      resetFromMissedPeriod: false,
      ignoredFutureDate: false,
      previousStreak,
      previousLastActiveDate,
      daysSinceLastActivity,
    };
  }

  if (daysSinceLastActivity === 1) {
    const currentStreak = normalized.currentStreak + 1;
    return {
      currentStreak,
      lastActiveDate: today,
      longestStreak: Math.max(previousLongestStreak, currentStreak),
      previousLongestStreak,
      changed: true,
      countedToday: true,
      resetFromMissedPeriod: false,
      ignoredFutureDate: false,
      previousStreak,
      previousLastActiveDate,
      daysSinceLastActivity,
    };
  }

  if (daysSinceLastActivity < 0) {
    return {
      ...normalized,
      longestStreak: previousLongestStreak,
      previousLongestStreak,
      changed: false,
      countedToday: false,
      resetFromMissedPeriod: false,
      ignoredFutureDate: true,
      previousStreak,
      previousLastActiveDate,
      daysSinceLastActivity,
    };
  }

  return {
    currentStreak: 1,
    lastActiveDate: today,
    longestStreak: Math.max(previousLongestStreak, 1),
    previousLongestStreak,
    changed: true,
    countedToday: true,
    resetFromMissedPeriod: true,
    ignoredFutureDate: false,
    previousStreak,
    previousLastActiveDate,
    daysSinceLastActivity,
  };
}

export function getNextStreakAfterActivity(
  state: StreakState,
  today = getLocalDateKey(),
) {
  return calculateStreakAfterActivity(state, today).currentStreak;
}
