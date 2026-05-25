import { useCallback } from "react";

import { useAuthStore } from "@/store/useAuthStore";
import { runSync } from "./engine";
import { useSyncStore } from "./store";

export function useSyncStatus() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const networkReady = useSyncStore((state) => state.networkReady);
  const connectivityChangeId = useSyncStore((state) => state.connectivityChangeId);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const uiState = useSyncStore((state) => state.uiState);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const failedCount = useSyncStore((state) => state.failedCount);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const lastError = useSyncStore((state) => state.lastError);
  const lastErrorKind = useSyncStore((state) => state.lastErrorKind);
  const isRestoring = useSyncStore((state) => state.isRestoring);
  const lastRunReason = useSyncStore((state) => state.lastRunReason);
  const hasStartedSync = useSyncStore((state) => state.hasStartedSync);
  const hasCompletedSync = useSyncStore((state) => state.hasCompletedSync);

  return {
    isOnline,
    networkReady,
    connectivityChangeId,
    isSyncing,
    uiState,
    pendingCount,
    failedCount,
    lastSyncedAt,
    lastError,
    lastErrorKind,
    isRestoring,
    lastRunReason,
    hasStartedSync,
    hasCompletedSync,
  } as const;
}

export function usePendingSyncCount() {
  return useSyncStore((state) => state.pendingCount);
}

export function useOfflineState() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const networkReady = useSyncStore((state) => state.networkReady);

  return {
    isOnline: isOnline && networkReady,
    isOffline: !networkReady || !isOnline,
  } as const;
}

export function useManualSync() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isSyncing = useSyncStore((state) => state.isSyncing);

  const syncNow = useCallback(async () => {
    if (!userId) {
      return;
    }

    await runSync({
      userId,
      reason: "manual",
      force: true,
    });
  }, [userId]);

  return { syncNow, isSyncing } as const;
}
