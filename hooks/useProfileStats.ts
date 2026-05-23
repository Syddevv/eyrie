import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getProfileStatsSnapshot } from "@/src/db/queries/profile";
import {
  onAccountsChanged,
  onBudgetsChanged,
  onGoalsChanged,
  onTransactionsChanged,
  onUsersChanged,
} from "@/src/lib/dbSync";

type ProfileStats = {
  currentStreak: number;
  longestStreak: number;
  transactionCount: number;
  activeGoalsCount: number;
  healthScore: number;
  budgetHealthScore: number;
};

const EMPTY_STATS: ProfileStats = {
  currentStreak: 0,
  longestStreak: 0,
  transactionCount: 0,
  activeGoalsCount: 0,
  healthScore: 0,
  budgetHealthScore: 0,
};

export function useProfileStats() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    setStats(EMPTY_STATS);
    setHasResolved(false);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      setHasResolved(false);
      return;
    }

    setIsLoading((current) => current || !hasResolved);
    try {
      const next = await getProfileStatsSnapshot(userId);
      setStats(next);
      setHasResolved(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasResolved, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offUsers = onUsersChanged(() => {
      void refresh();
    });
    const offTransactions = onTransactionsChanged(() => {
      void refresh();
    });
    const offGoals = onGoalsChanged(() => {
      void refresh();
    });
    const offAccounts = onAccountsChanged(() => {
      void refresh();
    });
    const offBudgets = onBudgetsChanged(() => {
      void refresh();
    });

    return () => {
      offUsers();
      offTransactions();
      offGoals();
      offAccounts();
      offBudgets();
    };
  }, [refresh]);

  return {
    ...stats,
    isLoading,
    refresh,
  } as const;
}
