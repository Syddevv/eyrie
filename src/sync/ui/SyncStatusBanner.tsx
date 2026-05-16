import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themeColors } from "@/constants/colors";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useManualSync, useSyncStatus } from "../hooks";

type BannerKind = "offline" | "error";

export function SyncStatusBanner() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const {
    isOnline,
    lastError,
    uiState,
    isRestoring,
  } = useSyncStatus();
  const { syncNow } = useManualSync();

  const [banner, setBanner] = useState<{
    kind: BannerKind;
    title: string;
    subtitle: string;
  } | null>(null);
  const [renderedBanner, setRenderedBanner] = useState<typeof banner>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previous = useRef({
    isOnline,
    uiState,
    lastError,
  });

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
    if (isRestoring) {
      setBanner(null);
      previous.current = {
        isOnline,
        uiState,
        lastError,
      };
      return;
    }

    const wentOffline =
      previous.current.isOnline && !isOnline && uiState === "offline";

    if (uiState === "schema_error" || uiState === "failed") {
      setBanner({
        kind: "error",
        title:
          uiState === "schema_error"
            ? "Database needs attention"
            : "Sync needs attention",
        subtitle:
          lastError ?? "A local sync issue needs manual review.",
      });
    } else if (!isOnline || uiState === "offline" || wentOffline) {
      setBanner({
        kind: "offline",
        title: "Offline mode",
        subtitle:
          "Changes will sync automatically when your connection returns.",
      });
    } else if (uiState === "retrying" && lastError) {
      setBanner({
        kind: "error",
        title: "Sync will retry",
        subtitle: lastError,
      });
    } else {
      setBanner(null);
    }

    previous.current = {
      isOnline,
      uiState,
      lastError,
    };
  }, [
    isOnline,
    isRestoring,
    lastError,
    opacity,
    translateY,
    uiState,
  ]);

  useEffect(() => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }

    if (banner) {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }

      setRenderedBanner(banner);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    Animated.timing(translateY, {
      toValue: -10,
      duration: 180,
      useNativeDriver: true,
    }).start();

    exitTimer.current = setTimeout(() => {
      setRenderedBanner(null);
    }, 180);

    return () => {
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
              background: colorScheme === "dark" ? "#082131" : "#E7F4FF",
              border: "#60A5FA",
              accent: colors.primary,
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

        {renderedBanner.kind === "error" ? (
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={() => void syncNow()}
          >
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
          </Pressable>
        ) : null}
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
    zIndex: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
