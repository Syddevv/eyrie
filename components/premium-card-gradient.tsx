import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, Pattern, Rect, Circle } from "react-native-svg";

import { defaultBrandTheme, type BrandTheme } from "@/constants/brand-themes";

type PremiumCardGradientProps = {
  theme?: BrandTheme | null;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  isDark?: boolean;
  variant?: "card" | "wallet";
};

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
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

export function CardGlowOverlay({
  theme,
  isDark,
  variant = "card",
}: {
  theme: BrandTheme;
  isDark?: boolean;
  variant?: "card" | "wallet";
}) {
  const topGlowSize = variant === "wallet" ? 132 : 124;
  const bottomGlowSize = variant === "wallet" ? 90 : 82;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === "android" ? 18 : 28}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.glow,
          styles.glowTopRight,
          {
            width: topGlowSize,
            height: topGlowSize,
            borderRadius: topGlowSize / 2,
            backgroundColor: withOpacity(theme.glow, isDark ? 0.36 : 0.48),
          },
        ]}
      />
      <BlurView
        intensity={Platform.OS === "android" ? 14 : 22}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.glow,
          styles.glowBottomLeft,
          {
            width: bottomGlowSize,
            height: bottomGlowSize,
            borderRadius: bottomGlowSize / 2,
            backgroundColor: withOpacity(theme.secondary, isDark ? 0.14 : 0.22),
          },
        ]}
      />
    </View>
  );
}

export function GlassReflection({ isDark }: { isDark?: boolean }) {
  return (
    <LinearGradient
      colors={
        isDark
          ? [
              "rgba(255,255,255,0.18)",
              "rgba(255,255,255,0.06)",
              "rgba(255,255,255,0)",
            ]
          : [
              "rgba(255,255,255,0.28)",
              "rgba(255,255,255,0.1)",
              "rgba(255,255,255,0)",
            ]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.reflection, { opacity: isDark ? 0.26 : 0.4 }]}
    />
  );
}

export function AmbientGradientLayer({
  theme,
  isDark,
}: {
  theme: BrandTheme;
  isDark?: boolean;
}) {
  return (
    <>
      <LinearGradient
        colors={
          isDark
            ? [
                withOpacity(
                  theme.text === "#FFFFFF" ? "#FFFFFF" : theme.primary,
                  0.12,
                ),
                "rgba(255,255,255,0)",
              ]
            : [withOpacity("#FFFFFF", 0.24), "rgba(255,255,255,0)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ambientTopLeft}
      />
      <LinearGradient
        colors={
          isDark
            ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.28)"]
            : ["rgba(0,0,0,0)", "rgba(0,0,0,0.18)"]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomVignette}
      />
      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]
            : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.edgeHighlight}
      />
    </>
  );
}

function CardNoiseTexture({ isDark }: { isDark?: boolean }) {
  const opacity = isDark ? 0.045 : 0.065;

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} opacity={opacity}>
      <Defs>
        <Pattern
          id="grain"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <Rect width="16" height="16" fill="transparent" />
          <Circle cx="3" cy="4" r="0.5" fill="#FFFFFF" opacity="0.36" />
          <Circle cx="12" cy="7" r="0.35" fill="#FFFFFF" opacity="0.28" />
          <Circle cx="8" cy="13" r="0.4" fill="#FFFFFF" opacity="0.24" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grain)" />
    </Svg>
  );
}

export function PremiumCardGradient({
  theme,
  children,
  style,
  contentStyle,
  isDark,
  variant = "card",
}: PremiumCardGradientProps) {
  const resolvedTheme = theme ?? defaultBrandTheme;
  const surfaceBorder =
    resolvedTheme.border ??
    (isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)");

  return (
    <View
      style={[
        styles.surface,
        { borderColor: surfaceBorder, shadowColor: resolvedTheme.glow },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          resolvedTheme.gradient[0],
          resolvedTheme.gradient[1],
          resolvedTheme.gradient[1],
        ]}
        start={{ x: 0.04, y: 0.04 }}
        end={{ x: 0.96, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <CardGlowOverlay
        theme={resolvedTheme}
        isDark={isDark}
        variant={variant}
      />
      <GlassReflection isDark={isDark} />
      <AmbientGradientLayer theme={resolvedTheme} isDark={isDark} />
      <CardNoiseTexture isDark={isDark} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: 1,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  content: {
    flex: 1,
    position: "relative",
  },
  glow: {
    position: "absolute",
    opacity: 0.9,
  },
  glowTopRight: {
    top: -14,
    right: -16,
  },
  glowBottomLeft: {
    left: -18,
    bottom: -18,
  },
  reflection: {
    position: "absolute",
    top: -18,
    left: -24,
    width: "140%",
    height: 84,
    transform: [{ rotate: "-18deg" }],
  },
  ambientTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "48%",
  },
  bottomVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
  },
  edgeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 22,
  },
});
