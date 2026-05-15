import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from "react-native";
import { type PropsWithChildren, useEffect, useRef } from "react";

import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/useAuthStore";
import { emitAllChanges } from "@/src/lib/dbSync";
import { needsInitialHydration, refreshSyncCounts, runSync } from "./engine";
import { useSyncStore } from "./store";
import { accountsService } from "@/src/db/services";

function useSyncTriggers() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const setOnline = useSyncStore((state) => state.setOnline);
  const reset = useSyncStore((state) => state.reset);
  const setHydrationReady = useSyncStore((state) => state.setHydrationReady);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      previousUserId.current = null;
      reset();
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
  }, [reset, setHydrationReady, userId]);

  useEffect(() => {
    // Do not touch the native NetInfo module in runtimes where it may be missing.
    // Sync still works on launch/login/foreground/manual triggers.
    setOnline(true);
    return () => undefined;
  }, [setOnline, userId]);

  useEffect(() => {
    function onAppStateChange(state: AppStateStatus) {
      if (state === "active" && userId) {
        void runSync({ userId, reason: "foreground" });
      }
    }

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [userId]);
}

export function SyncProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isRestoring = useSyncStore((state) => state.isRestoring);
  const isOnline = useSyncStore((state) => state.isOnline);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useSyncTriggers();

  useEffect(() => {
    if (!userId || isOnline) {
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
  }, [isOnline, userId]);

  return (
    <>
      {children}
      {isRestoring ? (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Restoring your finance data...
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your local database is hydrating from the latest synced records.
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
    zIndex: 40,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
