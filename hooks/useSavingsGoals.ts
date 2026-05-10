import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { goalsService } from "@/src/db/services";
import { onAccountsChanged, onGoalsChanged } from "@/src/lib/dbSync";
import {
  getGoalInsights,
  getGoalMetrics,
  getGoalsOverview,
  groupGoalContributions,
  type GoalWithDetails,
} from "@/src/lib/goals";

type GoalSnapshot = GoalWithDetails & {
  metrics: ReturnType<typeof getGoalMetrics>;
  insights: ReturnType<typeof getGoalInsights>;
  contributionGroups: ReturnType<typeof groupGoalContributions>;
};

function hydrateGoal(goal: GoalWithDetails): GoalSnapshot {
  return {
    ...goal,
    metrics: getGoalMetrics(goal),
    insights: getGoalInsights(goal),
    contributionGroups: groupGoalContributions(goal.contributions),
  };
}

export function useSavingsGoals() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [goals, setGoals] = useState<GoalSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await goalsService.fetch(userId);
      setGoals((rows as GoalWithDetails[]).map(hydrateGoal));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh().catch(() => undefined);
    const offGoals = onGoalsChanged(() => {
      refresh().catch(() => undefined);
    });
    const offAccounts = onAccountsChanged(() => {
      refresh().catch(() => undefined);
    });

    return () => {
      offGoals();
      offAccounts();
    };
  }, [refresh]);

  const overview = useMemo(() => getGoalsOverview(goals), [goals]);

  return { goals, overview, isLoading, refresh } as const;
}

export function useSavingsGoal(goalId?: string | null) {
  const { goals, isLoading, refresh } = useSavingsGoals();
  const goal = useMemo(
    () => goals.find((entry) => entry.id === goalId) ?? null,
    [goalId, goals],
  );

  return { goal, isLoading, refresh } as const;
}
