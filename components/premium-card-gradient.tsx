import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { defaultBrandTheme, type BrandTheme } from "@/constants/brand-themes";

type SimplePremiumCardProps = {
  theme?: BrandTheme | null;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  isDark?: boolean;
  variant?: "card" | "wallet";
};

function withOpacity(color: string, opacity: number) {
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${opacity})`);
  }

  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
  }

  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function getCirclePlacement(themeId: string, variant: "card" | "wallet") {
  const size = variant === "wallet" ? 152 : 142;

  switch (themeId) {
    case "bpi":
    case "shopeepay":
    case "maribank":
      return { size, top: -34, right: -20 };
    case "landbank":
    case "maya":
    case "pdax":
      return { size, bottom: -38, right: -18 };
    case "gcash":
    case "bdo":
    case "coinsph":
      return { size, top: -22, left: 72 };
    case "gotyme":
    case "paypal":
    case "securitybank":
      return { size, bottom: -24, left: 58 };
    case "visa":
    case "mastercard":
    case "metrobank":
      return { size, top: 18, right: -28 };
    default:
      return { size, top: -28, right: -22 };
  }
}

export function CardGlowOverlay({
  theme,
  isDark,
  variant = "card",
}: {
  theme: BrandTheme;
  isDark?: boolean;
  variant?: "card" | "wallet";
}) {
  const placement = getCirclePlacement(theme.id, variant);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          withOpacity(theme.secondary, isDark ? 0.24 : 0.3),
          withOpacity(theme.primary, isDark ? 0.12 : 0.16),
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0.18, y: 0.18 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.glow,
          {
            width: placement.size,
            height: placement.size,
            borderRadius: placement.size / 2,
            top: placement.top,
            right: placement.right,
            bottom: placement.bottom,
            left: placement.left,
          },
        ]}
      />
    </View>
  );
}

export function AmbientGradientLayer({
  isDark,
}: {
  isDark?: boolean;
}) {
  return (
    <LinearGradient
      colors={
        isDark
          ? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]
          : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]
      }
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.edgeHighlight}
    />
  );
}

export function SimplePremiumCard({
  theme,
  children,
  style,
  contentStyle,
  isDark,
  variant = "card",
}: SimplePremiumCardProps) {
  const resolvedTheme = theme ?? defaultBrandTheme;
  const surfaceBorder =
    resolvedTheme.border ??
    (isDark ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.24)");

  return (
    <View
      style={[
        styles.surface,
        { borderColor: surfaceBorder, shadowColor: resolvedTheme.glow },
        style,
      ]}
    >
      <LinearGradient
        colors={[resolvedTheme.gradient[0], resolvedTheme.gradient[1]]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <CardGlowOverlay
        theme={resolvedTheme}
        isDark={isDark}
        variant={variant}
      />
      <AmbientGradientLayer isDark={isDark} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

export const PremiumCardGradient = SimplePremiumCard;

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  content: {
    position: "relative",
  },
  glow: {
    position: "absolute",
    opacity: 0.72,
  },
  edgeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1,
  },
});
