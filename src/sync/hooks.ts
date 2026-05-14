import { useCallback } from "react";

import { useAuthStore } from "@/store/useAuthStore";
import { runSync } from "./engine";
import { useSyncStore } from "./store";

export function useSyncStatus() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const uiState = useSyncStore((state) => state.uiState);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const failedCount = useSyncStore((state) => state.failedCount);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const lastError = useSyncStore((state) => state.lastError);
  const lastErrorKind = useSyncStore((state) => state.lastErrorKind);
  const isRestoring = useSyncStore((state) => state.isRestoring);

  return {
    isOnline,
    isSyncing,
    uiState,
    pendingCount,
    failedCount,
    lastSyncedAt,
    lastError,
    lastErrorKind,
    isRestoring,
  } as const;
}

export function usePendingSyncCount() {
  return useSyncStore((state) => state.pendingCount);
}

export function useOfflineState() {
  const isOnline = useSyncStore((state) => state.isOnline);

  return {
    isOnline,
    isOffline: !isOnline,
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
