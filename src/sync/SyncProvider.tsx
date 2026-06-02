import { AppState, NativeModules, Platform, type AppStateStatus } from "react-native";
import { type PropsWithChildren, useEffect, useRef } from "react";
import { ENV } from "@/lib/env";
import { showSuccessToast } from "@/store/useToastStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useDatabaseBootstrap } from "@/src/db/DatabaseProvider";
import { emitAllChanges } from "@/src/lib/dbSync";
import { needsInitialHydration, refreshSyncCounts, runSync } from "./engine";
import { useSyncStore } from "./store";
import { accountsService } from "@/src/db/services";

type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModule = {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
};

const CONNECTIVITY_POLL_MS = 15000;
const CONNECTIVITY_TIMEOUT_MS = 5000;
const ONLINE_STABILITY_MS = 1500;
const OFFLINE_STABILITY_MS = 600;
const FALLBACK_CONNECTIVITY_URLS = [
  ENV.SUPABASE_URL,
  "https://clients3.google.com/generate_204",
].filter((value): value is string => Boolean(value));

async function getNetInfoModule(): Promise<NetInfoModule | null> {
  const nativeModules = NativeModules as {
    RNCNetInfo?: unknown;
    NetInfo?: unknown;
  };
  const hasNativeNetInfo =
    nativeModules.RNCNetInfo != null || nativeModules.NetInfo != null;

  if (!hasNativeNetInfo) {
    console.warn(
      `[sync] NetInfo native module is unavailable on ${Platform.OS}; falling back to always-online mode.`,
    );
    return null;
  }

  try {
    const module = await import("@react-native-community/netinfo");
    return module.default as NetInfoModule;
  } catch {
    return null;
  }
}

async function probeInternetConnection() {
  for (const url of FALLBACK_CONNECTIVITY_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, CONNECTIVITY_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return true;
      }
    } catch {
      clearTimeout(timeout);
    }
  }

  return false;
}

function useSyncTriggers() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isAuthReady = useAuthStore((state) => state.isReady);
  const { isReady: isDatabaseReady } = useDatabaseBootstrap();
  const setOnline = useSyncStore((state) => state.setOnline);
  const setNetworkReady = useSyncStore((state) => state.setNetworkReady);
  const networkReady = useSyncStore((state) => state.networkReady);
  const reset = useSyncStore((state) => state.reset);
  const setHydrationReady = useSyncStore((state) => state.setHydrationReady);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!userId) {
      previousUserId.current = null;
      reset();
      return;
    }

    if (!networkReady || !isDatabaseReady) {
      return;
    }

    let cancelled = false;

    void (async () => {
      console.log(
        `[sync] Starting for user: ${userId}, reason: ${previousUserId.current ? "launch" : "login"}`,
      );
      setHydrationReady(false);
      const shouldRestore = await needsInitialHydration(userId);
      console.log(`[sync] Restore needed: ${shouldRestore}`);

      useSyncStore.getState().setRestoring(shouldRestore);
      await refreshSyncCounts(userId);

      console.log(`[sync] Running sync...`);
      await runSync({
        userId,
        reason: previousUserId.current ? "launch" : "login",
        pullFirst: shouldRestore,
      });
      console.log(`[sync] Sync complete`);

      if (cancelled) {
        return;
      }

      // Reconcile after sync restores remote data, before hydration is exposed
      // to UI subscribers.
      console.log(`[sync] Cleaning up duplicate CASH accounts...`);
      const cleanupResult = await accountsService.cleanupDuplicateCashAccounts();
      console.log(`[sync] Duplicate CASH cleanup complete`, cleanupResult);
      console.log(`[sync] Ensuring default CASH account...`);
      await accountsService.ensureDefaultCashAccount(userId, null);
      console.log(`[sync] Default CASH account ensured`);

      if (cancelled) {
        return;
      }

      console.log(`[sync] Hydration ready, exposing reconciled accounts to UI`);
      useSyncStore.getState().setRestoring(false);
      setHydrationReady(true);

      if (shouldRestore) {
        showSuccessToast({
          title: "Restore complete",
          message: "Your latest synced finance data is ready.",
          dedupeKey: `restore:${userId}`,
          source: "sync-provider",
        });
      }

      // Refresh all UI after restore/sync completes
      if (shouldRestore) {
        setTimeout(() => {
          console.log(`[sync] Emitting all changes after restore`);
          emitAllChanges();
        }, 100);
      } else {
        emitAllChanges();
      }
    })();

    previousUserId.current = userId;

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isDatabaseReady, networkReady, reset, setHydrationReady, userId]);

  useEffect(() => {
    let isMounted = true;
    let candidateConnection: boolean | null = null;
    let unsubscribe = () => {};
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let stabilityTimer: ReturnType<typeof setTimeout> | null = null;
    let validationToken = 0;
    const lastValidatedConnection = {
      current: null as boolean | null,
    };

    setNetworkReady(false);

    const clearStabilityTimer = () => {
      if (stabilityTimer) {
        clearTimeout(stabilityTimer);
        stabilityTimer = null;
      }
    };

    const commitConnectionState = async (isOnline: boolean) => {
      const wasOnline = lastValidatedConnection.current;
      lastValidatedConnection.current = isOnline;
      setOnline(isOnline);
      setNetworkReady(true);

      if (userId && isDatabaseReady && isOnline && wasOnline === false) {
        void runSync({ userId, reason: "reconnect", force: true });
      }
    };

    const scheduleValidatedState = (nextConnection: boolean) => {
      candidateConnection = nextConnection;
      clearStabilityTimer();
      validationToken += 1;
      const currentToken = validationToken;
      const delay = nextConnection ? ONLINE_STABILITY_MS : OFFLINE_STABILITY_MS;

      stabilityTimer = setTimeout(() => {
        if (!isMounted || currentToken !== validationToken) {
          return;
        }

        void (async () => {
          if (nextConnection) {
            const stillOnline = await probeInternetConnection();

            if (
              !isMounted ||
              currentToken !== validationToken ||
              candidateConnection !== true
            ) {
              return;
            }

            if (!stillOnline) {
              scheduleValidatedState(false);
              return;
            }
          }

          await commitConnectionState(nextConnection);
        })();
      }, delay);
    };

    void (async () => {
      const netInfo = await getNetInfoModule();

      if (!isMounted) {
        return;
      }

      if (!netInfo) {
        const applyFallbackState = async () => {
          if (!isMounted) {
            return;
          }

          const isOnline = await probeInternetConnection();

          if (!isMounted) {
            return;
          }

          if (candidateConnection === isOnline) {
            return;
          }

          scheduleValidatedState(isOnline);
        };

        void applyFallbackState();
        fallbackInterval = setInterval(() => {
          void applyFallbackState();
        }, CONNECTIVITY_POLL_MS);
        return;
      }

      const applyConnectionState = async (state: NetInfoState) => {
        if (!isMounted) {
          return;
        }

        const hasNetwork = Boolean(state.isConnected);
        const definitelyOffline =
          !hasNetwork || state.isInternetReachable === false;

        if (definitelyOffline) {
          if (candidateConnection !== false) {
            scheduleValidatedState(false);
          }
          return;
        }

        if (candidateConnection !== true) {
          scheduleValidatedState(true);
        }
      };

      void netInfo
        .fetch()
        .then(applyConnectionState)
        .catch(() => {
          if (!isMounted) {
            return;
          }

          void probeInternetConnection().then((isOnline) => {
            if (!isMounted) {
              return;
            }

            scheduleValidatedState(isOnline);
          });
        });

      unsubscribe = netInfo.addEventListener((state) => {
        void applyConnectionState(state);
      });
    })();

    return () => {
      isMounted = false;
      unsubscribe();
      clearStabilityTimer();

      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isDatabaseReady, setNetworkReady, setOnline, userId]);

  useEffect(() => {
    function onAppStateChange(state: AppStateStatus) {
      if (
        state === "active" &&
        userId &&
        isAuthReady &&
        isDatabaseReady &&
        networkReady
      ) {
        void runSync({ userId, reason: "foreground" });
      }
    }

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthReady, isDatabaseReady, networkReady, userId]);
}

export function SyncProvider({ children }: PropsWithChildren) {
  const isOnline = useSyncStore((state) => state.isOnline);
  const networkReady = useSyncStore((state) => state.networkReady);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { isReady: isDatabaseReady } = useDatabaseBootstrap();

  useSyncTriggers();

  useEffect(() => {
    if (!userId || !isDatabaseReady || isOnline || !networkReady) {
      return;
    }

    const interval = setInterval(() => {
      void runSync({
        userId,
        reason: "reconnect",
        force: true,
      });
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [isDatabaseReady, isOnline, networkReady, userId]);

  return <>{children}</>;
}
