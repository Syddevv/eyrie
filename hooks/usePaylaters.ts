import { useCallback, useEffect, useState } from "react";

import { paylatersService } from "@/src/db/services";
import { onPaylatersChanged } from "@/src/lib/dbSync";
import { useAuthStore } from "@/store/useAuthStore";

import type { PaylaterListItem } from "@/src/db/services/paylatersService";

type PaylaterSummary = Awaited<
  ReturnType<typeof paylatersService.getPaylaterSummary>
>;

type NextPaylaterDue = Awaited<
  ReturnType<typeof paylatersService.getNextPaymentDue>
> | null;

type PaylatersSnapshot = {
  userId: string | null;
  paylaters: PaylaterListItem[];
  summary: PaylaterSummary | null;
  nextPaymentDue: NextPaylaterDue;
  hasResolved: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  fromLocalRead: boolean;
};

const EMPTY_SNAPSHOT: PaylatersSnapshot = {
  userId: null,
  paylaters: [],
  summary: null,
  nextPaymentDue: null,
  hasResolved: false,
  isInitialLoading: false,
  isRefreshing: false,
  fromLocalRead: false,
};

const listeners = new Set<(snapshot: PaylatersSnapshot) => void>();
let currentSnapshot: PaylatersSnapshot = EMPTY_SNAPSHOT;
let inFlightRequest: Promise<PaylatersSnapshot | null> | null = null;

function publishSnapshot(
  input:
    | PaylatersSnapshot
    | ((previous: PaylatersSnapshot) => PaylatersSnapshot),
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
    paylaters: [],
    summary: null,
    nextPaymentDue: null,
    hasResolved: userId === null,
    isInitialLoading: false,
    isRefreshing: false,
    fromLocalRead: false,
  });
}

async function loadPaylaters(userId: string, force = false) {
  if (!force && inFlightRequest) {
    return inFlightRequest;
  }

  const hasCachedRows =
    currentSnapshot.userId === userId && currentSnapshot.hasResolved;

  publishSnapshot((previous) => ({
    ...previous,
    userId,
    isInitialLoading: !hasCachedRows,
    isRefreshing: hasCachedRows,
  }));

  const request = Promise.all([
    paylatersService.fetch(userId),
    paylatersService.getPaylaterSummary(userId),
    paylatersService.getNextPaymentDue(userId),
  ])
    .then(([paylaters, summary, nextPaymentDue]) => {
      const nextSnapshot: PaylatersSnapshot = {
        userId,
        paylaters: paylaters ?? [],
        summary,
        nextPaymentDue,
        hasResolved: true,
        isInitialLoading: false,
        isRefreshing: false,
        fromLocalRead: true,
      };

      publishSnapshot(nextSnapshot);
      return nextSnapshot;
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

export function usePaylaters() {
  const isAuthReady = useAuthStore((state) => state.isReady);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [snapshot, setSnapshot] = useState<PaylatersSnapshot>(currentSnapshot);

  const refresh = useCallback(async () => {
    if (!userId) {
      if (isAuthReady) {
        resetSnapshot(null);
      }
      return null;
    }

    if (!isAuthReady) {
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

    return loadPaylaters(userId);
  }, [isAuthReady, userId]);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(currentSnapshot);

    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!userId) {
      resetSnapshot(null);
      return;
    }

    if (currentSnapshot.userId !== userId) {
      publishSnapshot({
        userId,
        paylaters: [],
        summary: null,
        nextPaymentDue: null,
        hasResolved: false,
        isInitialLoading: true,
        isRefreshing: false,
        fromLocalRead: false,
      });
    }

    if (currentSnapshot.userId === userId && currentSnapshot.hasResolved) {
      return;
    }

    void loadPaylaters(userId, currentSnapshot.userId !== userId);
  }, [isAuthReady, userId]);

  useEffect(() => {
    const off = onPaylatersChanged(() => {
      if (!userId || !isAuthReady) {
        return;
      }

      void loadPaylaters(userId, true).catch(() => undefined);
    });

    return () => off();
  }, [isAuthReady, userId]);

  return {
    paylaters: snapshot.paylaters,
    summary: snapshot.summary,
    nextPaymentDue: snapshot.nextPaymentDue,
    isLoading: snapshot.isInitialLoading,
    isInitialLoading: snapshot.isInitialLoading,
    isRefreshing: snapshot.isRefreshing,
    hasResolved: snapshot.hasResolved,
    fromLocalRead: snapshot.fromLocalRead,
    refresh,
  } as const;
}
