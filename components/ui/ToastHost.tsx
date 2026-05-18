import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { useEffect } from "react";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  dismissToast,
  useToastStore,
  type ToastRecord,
  type ToastVariant,
} from "@/store/useToastStore";

function getVariantStyles(
  colorScheme: "light" | "dark",
  variant: ToastVariant,
) {
  if (variant === "success") {
    return {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(12, 30, 24, 0.96)"
          : "rgba(248, 255, 251, 0.96)",
      borderColor:
        colorScheme === "dark"
          ? "rgba(41, 181, 118, 0.34)"
          : "rgba(33, 182, 115, 0.18)",
      accentColor: "#18B46A",
      icon: "check-circle" as const,
    };
  }

  if (variant === "error") {
    return {
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(39, 20, 24, 0.96)"
          : "rgba(255, 248, 249, 0.96)",
      borderColor:
        colorScheme === "dark"
          ? "rgba(255, 99, 132, 0.34)"
          : "rgba(255, 99, 132, 0.18)",
      accentColor: "#FF5C73",
      icon: "alert-circle" as const,
    };
  }

  return {
    backgroundColor:
      colorScheme === "dark"
        ? "rgba(13, 25, 39, 0.96)"
        : "rgba(248, 252, 255, 0.96)",
    borderColor:
      colorScheme === "dark"
        ? "rgba(96, 165, 250, 0.28)"
        : "rgba(96, 165, 250, 0.16)",
    accentColor: "#1495FF",
    icon: "info" as const,
  };
}

function ToastCard({ toast, index }: { toast: ToastRecord; index: number }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const stylesByVariant = getVariantStyles(colorScheme, toast.variant);

  useEffect(() => {
    const timeout = setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs ?? 2600);

    return () => clearTimeout(timeout);
  }, [toast.durationMs, toast.id]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition.springify().damping(17).stiffness(180)}
      style={[
        styles.cardWrap,
        index > 0 && styles.cardWrapStacked,
        {
          opacity: index === 0 ? 1 : 0.96 - index * 0.08,
          transform: [{ scale: index === 0 ? 1 : 1 - index * 0.02 }],
        },
      ]}
    >
      <Pressable
        onPress={() => dismissToast(toast.id)}
        style={[
          styles.card,
          shadows.floating,
          {
            backgroundColor: stylesByVariant.backgroundColor,
            borderColor: stylesByVariant.borderColor,
          },
        ]}
      >
        <View style={styles.contentRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: stylesByVariant.accentColor },
            ]}
          >
            <Feather name={stylesByVariant.icon} size={16} color="#FFFFFF" />
          </View>

          <View style={styles.copyBlock}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.foreground }]}
            >
              {toast.title}
            </Text>
            {toast.message ? (
              <Text
                numberOfLines={2}
                style={[styles.message, { color: colors.mutedForeground }]}
              >
                {toast.message}
              </Text>
            ) : null}
          </View>

          <View style={styles.dismissWrap}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost({ disabled = false }: { disabled?: boolean }) {
  const toasts = useToastStore((state) => state.toasts);
  const visibleToasts = toasts.slice(-3).reverse();

  if (disabled || !visibleToasts.length) {
    return null;
  }

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
      <View pointerEvents="box-none" style={styles.stack}>
        {visibleToasts.map((toast, index) => (
          <ToastCard key={toast.id} toast={toast} index={index} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 6,
    paddingHorizontal: 14,
  },
  stack: {
    gap: 10,
  },
  cardWrap: {
    alignSelf: "stretch",
  },
  cardWrapStacked: {
    marginTop: -2,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  copyBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  message: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  dismissWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
