import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { accountsService } from "@/src/db/services";
import { onAccountsChanged } from "@/src/lib/dbSync";
import { useAuthStore } from "@/store/useAuthStore";

import type { Account } from "@/src/db/types";

type AccountsSnapshot = {
  userId: string | null;
  accounts: Account[];
  hasResolved: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  fromLocalRead: boolean;
};

const EMPTY_SNAPSHOT: AccountsSnapshot = {
  userId: null,
  accounts: [],
  hasResolved: false,
  isInitialLoading: false,
  isRefreshing: false,
  fromLocalRead: false,
};

const listeners = new Set<(snapshot: AccountsSnapshot) => void>();
let currentSnapshot: AccountsSnapshot = EMPTY_SNAPSHOT;
let inFlightRequest: Promise<Account[] | null> | null = null;

function publishSnapshot(
  input:
    | AccountsSnapshot
    | ((previous: AccountsSnapshot) => AccountsSnapshot),
) {
  currentSnapshot =
    typeof input === "function" ? input(currentSnapshot) : input;

  for (const listener of Array.from(listeners)) {
    listener(currentSnapshot);
  }
}

function resetSnapshot(userId: string | null = null) {
  inFlightRequest = null;
  publishSnapshot({
    userId,
    accounts: [],
    hasResolved: userId === null,
    isInitialLoading: false,
    isRefreshing: false,
    fromLocalRead: false,
  });
}

async function loadAccounts(userId: string, force = false) {
  if (!force && inFlightRequest) {
    return inFlightRequest;
  }

  const hasCachedAccounts =
    currentSnapshot.userId === userId && currentSnapshot.hasResolved;

  publishSnapshot((previous) => ({
    ...previous,
    userId,
    isInitialLoading: !hasCachedAccounts,
    isRefreshing: hasCachedAccounts,
  }));

  const request = accountsService
    .fetch(userId)
    .then((rows) => {
      const nextAccounts = rows ?? [];

      publishSnapshot({
        userId,
        accounts: nextAccounts,
        hasResolved: true,
        isInitialLoading: false,
        isRefreshing: false,
        fromLocalRead: true,
      });

      return nextAccounts;
    })
    .catch((error) => {
      publishSnapshot((previous) => ({
        ...previous,
        userId,
        hasResolved:
          previous.userId === userId ? previous.hasResolved : false,
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

export function useAccounts() {
  const { user, isLoading: isCurrentUserLoading } = useCurrentUser();
  const isAuthReady = useAuthStore((state) => state.isReady);
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<AccountsSnapshot>(currentSnapshot);

  const refresh = useCallback(async () => {
    if (!userId) {
      if (isAuthReady && !isCurrentUserLoading) {
        resetSnapshot(null);
      }
      return null;
    }

    if (!isAuthReady || isCurrentUserLoading) {
      publishSnapshot((previous) => ({
        ...previous,
        userId,
        isInitialLoading:
          previous.userId !== userId || !previous.hasResolved,
        isRefreshing:
          previous.userId === userId && previous.hasResolved,
      }));
      return null;
    }

    return loadAccounts(userId);
  }, [isAuthReady, isCurrentUserLoading, userId]);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(currentSnapshot);

    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady || isCurrentUserLoading) {
      return;
    }

    if (!userId) {
      resetSnapshot(null);
      return;
    }

    if (currentSnapshot.userId !== userId) {
      publishSnapshot({
        userId,
        accounts: [],
        hasResolved: false,
        isInitialLoading: true,
        isRefreshing: false,
        fromLocalRead: false,
      });
    }

    void loadAccounts(userId, currentSnapshot.userId !== userId);
  }, [isAuthReady, isCurrentUserLoading, userId]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      if (!userId || !isAuthReady || isCurrentUserLoading) {
        return;
      }

      void loadAccounts(userId, true).catch(() => undefined);
    });

    return () => off();
  }, [isAuthReady, isCurrentUserLoading, userId]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.log("[accounts:ui] snapshot", {
      userId: snapshot.userId,
      hasResolved: snapshot.hasResolved,
      isInitialLoading: snapshot.isInitialLoading,
      isRefreshing: snapshot.isRefreshing,
      fromLocalRead: snapshot.fromLocalRead,
      count: snapshot.accounts.length,
    });
  }, [snapshot]);

  return {
    accounts: snapshot.accounts,
    isLoading: snapshot.isInitialLoading,
    isInitialLoading: snapshot.isInitialLoading,
    isRefreshing: snapshot.isRefreshing,
    hasResolved: snapshot.hasResolved,
    fromLocalRead: snapshot.fromLocalRead,
    refresh,
  } as const;
}
