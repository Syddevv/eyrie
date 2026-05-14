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
import { emitAllChanges, emitAccountsChanged } from "@/src/lib/dbSync";
import { needsInitialHydration, refreshSyncCounts, runSync } from "./engine";
import { useSyncStore } from "./store";

function useSyncTriggers() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const setOnline = useSyncStore((state) => state.setOnline);
  const reset = useSyncStore((state) => state.reset);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      previousUserId.current = null;
      reset();
      return;
    }

    void (async () => {
      const shouldRestore = await needsInitialHydration(userId);
      useSyncStore.getState().setRestoring(shouldRestore);
      await refreshSyncCounts(userId);
      await runSync({
        userId,
        reason: previousUserId.current ? "launch" : "login",
      });
      useSyncStore.getState().setRestoring(false);

      // Refresh all UI after restore/sync completes
      // This ensures all screens display the latest data without manual navigation
      if (shouldRestore) {
        setTimeout(() => {
          emitAllChanges();
        }, 100);
      }
    })();

    previousUserId.current = userId;
  }, [reset, userId]);

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
