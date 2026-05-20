export type StreakState = {
  currentStreak: number;
  lastActiveDate: string | null;
};

export type ValidatedStreakState = StreakState & {
  lostStreak: boolean;
  daysSinceLastActivity: number | null;
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

export function diffCalendarDays(left: string, right: string) {
  const msPerDay = 86_400_000;
  return Math.round((parseDateKey(left) - parseDateKey(right)) / msPerDay);
}

export function validateStreakState(
  state: StreakState,
  today = getLocalDateKey(),
): ValidatedStreakState {
  if (!state.lastActiveDate) {
    return {
      currentStreak: 0,
      lastActiveDate: null,
      lostStreak: false,
      daysSinceLastActivity: null,
    };
  }

  const daysSinceLastActivity = diffCalendarDays(today, state.lastActiveDate);
  const lostStreak = daysSinceLastActivity > 1 && state.currentStreak > 0;

  return {
    currentStreak: lostStreak ? 0 : state.currentStreak,
    lastActiveDate: state.lastActiveDate,
    lostStreak,
    daysSinceLastActivity,
  };
}

export function getNextStreakAfterActivity(
  state: StreakState,
  today = getLocalDateKey(),
) {
  if (!state.lastActiveDate) {
    return 1;
  }

  const daysSinceLastActivity = diffCalendarDays(today, state.lastActiveDate);

  if (daysSinceLastActivity === 0) {
    return state.currentStreak;
  }

  if (daysSinceLastActivity === 1) {
    return state.currentStreak + 1;
  }

  return 1;
}
