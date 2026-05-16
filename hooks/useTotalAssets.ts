import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getTotalBalance } from "@/src/db/queries/dashboard";
import { onAccountsChanged } from "@/src/lib/dbSync";

type TotalAssetsSnapshot = {
  userId: string | null;
  total: number;
  hasResolved: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
};

const EMPTY_SNAPSHOT: TotalAssetsSnapshot = {
  userId: null,
  total: 0,
  hasResolved: false,
  isInitialLoading: false,
  isRefreshing: false,
};

const listeners = new Set<(snapshot: TotalAssetsSnapshot) => void>();
let currentSnapshot: TotalAssetsSnapshot = EMPTY_SNAPSHOT;
let inFlightRequest: Promise<number | null> | null = null;

function publishSnapshot(
  input:
    | TotalAssetsSnapshot
    | ((previous: TotalAssetsSnapshot) => TotalAssetsSnapshot),
) {
  currentSnapshot =
    typeof input === "function" ? input(currentSnapshot) : input;

  for (const listener of Array.from(listeners)) {
    listener(currentSnapshot);
  }
}

function resetSnapshot() {
  inFlightRequest = null;
  publishSnapshot({
    userId: null,
    total: 0,
    hasResolved: true,
    isInitialLoading: false,
    isRefreshing: false,
  });
}

async function loadTotal(userId: string, force = false) {
  if (!force && inFlightRequest) {
    return inFlightRequest;
  }

  const hasCachedValue =
    currentSnapshot.userId === userId && currentSnapshot.hasResolved;

  publishSnapshot((previous) => ({
    ...previous,
    userId,
    isInitialLoading: !hasCachedValue,
    isRefreshing: hasCachedValue,
  }));

  const request = getTotalBalance(userId)
    .then((value) => {
      const nextTotal = value ?? 0;
      publishSnapshot({
        userId,
        total: nextTotal,
        hasResolved: true,
        isInitialLoading: false,
        isRefreshing: false,
      });
      return nextTotal;
    })
    .catch((error) => {
      publishSnapshot((previous) => ({
        ...previous,
        userId,
        isInitialLoading: false,
        isRefreshing: false,
      }));
      throw error;
    })
    .finally(() => {
      if (inFlightRequest === request) {
        inFlightRequest = null;
      }
    });

  inFlightRequest = request;
  return request;
}

export function useTotalAssets() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<TotalAssetsSnapshot>(currentSnapshot);

  const refresh = useCallback(async () => {
    if (!userId) {
      resetSnapshot();
      return null;
    }

    return loadTotal(userId);
  }, [userId]);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(currentSnapshot);

    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      resetSnapshot();
      return;
    }

    if (currentSnapshot.userId !== userId) {
      publishSnapshot({
        userId,
        total: 0,
        hasResolved: false,
        isInitialLoading: true,
        isRefreshing: false,
      });
    }

    void loadTotal(userId, currentSnapshot.userId !== userId).catch(
      () => undefined,
    );
  }, [userId]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      if (!userId) {
        return;
      }

      void loadTotal(userId, true).catch(() => undefined);
    });

    return () => off();
  }, [userId]);

  return {
    total: snapshot.total,
    isLoading: snapshot.isInitialLoading,
    isInitialLoading: snapshot.isInitialLoading,
    isRefreshing: snapshot.isRefreshing,
    hasResolved: snapshot.hasResolved,
    refresh,
  } as const;
}
