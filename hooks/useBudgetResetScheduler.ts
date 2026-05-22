import { AppState, type AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { budgetsService } from "@/src/db/services";
import { onBudgetsChanged } from "@/src/lib/dbSync";

function getSoonestResetDate(dates: string[]) {
  if (!dates.length) {
    return null;
  }

  return dates.reduce(
    (soonest, current) => {
      if (!soonest) {
        return current;
      }

      return new Date(current).getTime() < new Date(soonest).getTime()
        ? current
        : soonest;
    },
    null as string | null,
  );
}

export function useBudgetResetScheduler() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNextReset = useCallback(async () => {
    clearTimer();

    if (!userId) {
      return;
    }

    if (__DEV__) {
      console.log("[budgets] reset scheduler check", { userId });
    }

    await budgetsService
      .resetBudgetsIfNeeded(userId, new Date())
      .catch(() => undefined);

    const budgets = await budgetsService.fetch(userId).catch(() => []);
    const nextResetDate = getSoonestResetDate(
      budgets.map((budget) => budget.endDate),
    );

    if (!nextResetDate) {
      return;
    }

    const delayMs = Math.max(new Date(nextResetDate).getTime() - Date.now(), 0);

    timerRef.current = setTimeout(() => {
      void scheduleNextReset();
    }, delayMs);

    if (__DEV__) {
      console.log("[budgets] reset scheduler armed", {
        userId,
        nextResetDate,
        delayMs,
      });
    }
  }, [clearTimer, userId]);

  useEffect(() => {
    void scheduleNextReset();

    return clearTimer;
  }, [clearTimer, scheduleNextReset, userId]);

  useEffect(() => {
    const offBudgets = onBudgetsChanged(() => {
      void scheduleNextReset();
    });

    return () => {
      offBudgets();
    };
  }, [scheduleNextReset]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          void scheduleNextReset();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [scheduleNextReset]);
}
