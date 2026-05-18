import { create } from "zustand";

import type { SyncRunReason, SyncUiState } from "./types";
import type { SyncErrorKind } from "./errors";

type SyncStoreState = {
  isOnline: boolean;
  networkReady: boolean;
  isSyncing: boolean;
  uiState: SyncUiState;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastErrorKind: SyncErrorKind | null;
  lastRunReason: SyncRunReason | null;
  pendingCount: number;
  failedCount: number;
  isRestoring: boolean;
  hydrationReady: boolean;
  hasStartedSync: boolean;
  hasCompletedSync: boolean;
  setOnline: (isOnline: boolean) => void;
  setNetworkReady: (networkReady: boolean) => void;
  setSyncing: (input: {
    isSyncing: boolean;
    reason?: SyncRunReason | null;
    uiState?: SyncUiState;
  }) => void;
  markSyncStarted: () => void;
  markSyncCompleted: () => void;
  setUiState: (input: {
    uiState: SyncUiState;
    lastError?: string | null;
    lastErrorKind?: SyncErrorKind | null;
    isOnline?: boolean;
  }) => void;
  setRestoring: (isRestoring: boolean) => void;
  setHydrationReady: (hydrationReady: boolean) => void;
  setSummary: (input: {
    lastSyncedAt?: string | null;
    lastError?: string | null;
    lastErrorKind?: SyncErrorKind | null;
    pendingCount?: number;
    failedCount?: number;
  }) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  isOnline: true,
  networkReady: false,
  isSyncing: false,
  uiState: "idle" as SyncUiState,
  lastSyncedAt: null,
  lastError: null,
  lastErrorKind: null as SyncErrorKind | null,
  lastRunReason: null,
  pendingCount: 0,
  failedCount: 0,
  isRestoring: false,
  hydrationReady: false,
  hasStartedSync: false,
  hasCompletedSync: false,
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...INITIAL_STATE,
  setOnline: (isOnline) => set({ isOnline }),
  setNetworkReady: (networkReady) => set({ networkReady }),
  setSyncing: ({ isSyncing, reason, uiState }) =>
    set((state) => ({
      isSyncing,
      uiState:
        uiState ??
        (isSyncing
          ? state.isRestoring
            ? "restoring"
            : "syncing"
          : state.uiState),
      lastRunReason: reason ?? state.lastRunReason,
      lastError: isSyncing ? null : state.lastError,
      lastErrorKind: isSyncing ? null : state.lastErrorKind,
    })),
  markSyncStarted: () =>
    set({
      hasStartedSync: true,
    }),
  markSyncCompleted: () =>
    set({
      hasCompletedSync: true,
    }),
  setUiState: ({ uiState, lastError, lastErrorKind, isOnline }) =>
    set((state) => ({
      uiState,
      lastError: lastError ?? state.lastError,
      lastErrorKind: lastErrorKind ?? state.lastErrorKind,
      isOnline: isOnline ?? state.isOnline,
      isSyncing: uiState === "syncing" || uiState === "restoring",
    })),
  setRestoring: (isRestoring) =>
    set((state) => ({
      isRestoring,
      uiState: isRestoring
        ? "restoring"
        : state.uiState === "restoring"
          ? "idle"
          : state.uiState,
    })),
  setHydrationReady: (hydrationReady) => set({ hydrationReady }),
  setSummary: (input) => set(input),
  reset: () => set(INITIAL_STATE),
}));

export function waitForHydrationReady() {
  if (useSyncStore.getState().hydrationReady) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const unsubscribe = useSyncStore.subscribe((state) => {
      if (!state.hydrationReady) {
        return;
      }

      unsubscribe();
      resolve();
    });
  });
}
