import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themeColors } from "@/constants/colors";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/useAuthStore";
import { useManualSync, useSyncStatus } from "../hooks";

type BannerKind = "offline" | "online" | "error";

const AUTO_DISMISS_MS = 3000;
const ANIMATION_MS = 220;
const BANNER_COOLDOWN_MS = 1500;

export function SyncStatusBanner() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const {
    isOnline,
    networkReady,
    connectivityChangeId,
    lastError,
    uiState,
    isRestoring,
    hasStartedSync,
    hasCompletedSync,
  } = useSyncStatus();
  const isAuthReady = useAuthStore((state) => state.isReady);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { syncNow } = useManualSync();

  const [banner, setBanner] = useState<{
    kind: BannerKind;
    title: string;
    subtitle: string;
  } | null>(null);
  const [renderedBanner, setRenderedBanner] = useState<typeof banner>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBannerKey = useRef<string | null>(null);
  const lastHandledConnectivityChange = useRef(0);
  const hasConfirmedOffline = useRef(false);
  const lastConnectivityBanner = useRef<{
    kind: Extract<BannerKind, "offline" | "online">;
    shownAt: number;
  } | null>(null);

  const errorTone = useMemo(
    () =>
      uiState === "schema_error" || uiState === "failed"
        ? "warning"
        : uiState === "retrying"
          ? "retrying"
          : "default",
    [uiState],
  );

  useEffect(() => {
    if (!networkReady) {
      setBanner(null);
      lastBannerKey.current = null;
      lastHandledConnectivityChange.current = connectivityChangeId;
      hasConfirmedOffline.current = false;
      return;
    }

    let nextBanner: {
      kind: BannerKind;
      title: string;
      subtitle: string;
    } | null = null;
    const now = Date.now();
    const hasNewConnectivityEvent =
      connectivityChangeId > lastHandledConnectivityChange.current;

    if (hasNewConnectivityEvent) {
      lastHandledConnectivityChange.current = connectivityChangeId;

      const kind: Extract<BannerKind, "offline" | "online"> = isOnline
        ? "online"
        : "offline";
      const canShowConnectivityBanner =
        kind === "offline" || hasConfirmedOffline.current;

      if (kind === "offline") {
        hasConfirmedOffline.current = true;
      }

      if (canShowConnectivityBanner) {
        const lastConnectivityEvent = lastConnectivityBanner.current;
        const shouldSuppress =
          lastConnectivityEvent?.kind === kind &&
          now - lastConnectivityEvent.shownAt < BANNER_COOLDOWN_MS;

        if (!shouldSuppress) {
          lastConnectivityBanner.current = {
            kind,
            shownAt: now,
          };
          nextBanner =
            kind === "online"
              ? {
                  kind: "online",
                  title: "Back online",
                  subtitle: "Your connection has been restored.",
                }
              : {
                  kind: "offline",
                  title: "Offline mode",
                  subtitle:
                    "Changes will sync automatically when your connection returns.",
                };

          if (kind === "online") {
            hasConfirmedOffline.current = false;
          }
        }
      }
    }

    // Error banners are still allowed when there was no connection transition.
    if (
      !nextBanner &&
      isAuthReady &&
      userId &&
      !isRestoring &&
      hasStartedSync &&
      hasCompletedSync &&
      (uiState === "schema_error" || uiState === "failed")
    ) {
      nextBanner = {
        kind: "error",
        title:
          uiState === "schema_error"
            ? "Database needs attention"
            : "Sync needs attention",
        subtitle:
          lastError ?? "A local sync issue needs manual review.",
      };
    }

    const nextKey = nextBanner
      ? `${nextBanner.kind}:${nextBanner.title}:${nextBanner.subtitle}`
      : null;

    if (nextKey && nextKey !== lastBannerKey.current) {
      lastBannerKey.current = nextKey;
      setBanner(nextBanner);
    } else if (!nextKey) {
      lastBannerKey.current = null;
    }
  }, [
    isOnline,
    connectivityChangeId,
    isAuthReady,
    isRestoring,
    lastError,
    networkReady,
    hasCompletedSync,
    hasStartedSync,
    uiState,
    userId,
  ]);

  useEffect(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }

    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }

    if (banner) {
      setRenderedBanner(banner);
      opacity.setValue(0);
      translateY.setValue(-18);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      autoDismissTimer.current = setTimeout(() => {
        lastBannerKey.current = null;
        setBanner(null);
      }, AUTO_DISMISS_MS);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -18,
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    exitTimer.current = setTimeout(() => {
      setRenderedBanner(null);
    }, ANIMATION_MS);

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [banner, opacity, translateY]);

  const palette =
    renderedBanner?.kind === "offline"
      ? {
          background: colorScheme === "dark" ? "#102131" : "#EAF5FF",
          border: colorScheme === "dark" ? "#5B8FD6" : "#8AC0F7",
          accent: "#60A5FA",
          icon: "wifi-off" as const,
        }
      : renderedBanner?.kind === "online"
        ? {
            background: colorScheme === "dark" ? "#0C2619" : "#ECFDF3",
            border: colorScheme === "dark" ? "#34D399" : "#86EFAC",
            accent: "#22C55E",
            icon: "check-circle" as const,
          }
        : renderedBanner?.kind === "error"
          ? {
              background:
                errorTone === "warning"
                  ? colorScheme === "dark"
                    ? "#2A1C0B"
                    : "#FFF7E6"
                  : colorScheme === "dark"
                    ? "#2A1518"
                    : "#FFF0F2",
              border: errorTone === "warning" ? "#F59E0B" : "#F97388",
              accent: errorTone === "warning" ? "#F59E0B" : "#FF5C73",
              icon: "alert-circle" as const,
            }
          : {
              background: colorScheme === "dark" ? "#102131" : "#EAF5FF",
              border: colorScheme === "dark" ? "#5B8FD6" : "#8AC0F7",
              accent: "#60A5FA",
              icon: "wifi-off" as const,
            };

  if (!renderedBanner) {
    return null;
  }

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: palette.accent }]}>
          <MaterialCommunityIcons name={palette.icon} size={16} color="#fff" />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {renderedBanner.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {renderedBanner.subtitle}
          </Text>
        </View>

        <View style={styles.actions}>
          {renderedBanner.kind === "error" ? (
            <Pressable
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={() => void syncNow()}
            >
              <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Dismiss connectivity banner"
            hitSlop={8}
            style={styles.closeButton}
            onPress={() => {
              lastBannerKey.current = null;
              setBanner(null);
            }}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 4,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
