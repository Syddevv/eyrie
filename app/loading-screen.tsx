import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";
import {
  fontFamilies,
  fontWeights,
  letterSpacings,
} from "@/constants/typography";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MASCOT_SIZE = Math.min(Math.max(SCREEN_WIDTH * 0.46, 168), 232);
const SPINNER_SIZE = 54;
const SPINNER_STROKE = 6;
const STARTUP_COPY = "Loading your experience...";
const BACKGROUND_COLORS = ["#F7F7FF", "#F3F3FF", "#ECECFF"] as const;
export const STARTUP_BACKGROUND_COLOR = "#F7F7FF";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

type LoadingScreenProps = {
  onReady?: () => void;
};

export function LoadingScreen({ onReady }: LoadingScreenProps) {
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const mascotScale = useSharedValue(0.94);
  const spinnerRotation = useSharedValue(0);
  const hasReportedReady = useRef(false);

  useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: MOTION_DURATION.INTRO,
      easing: MOTION_EASING.OUT_CUBIC,
    });
    contentTranslateY.value = withTiming(0, {
      duration: MOTION_DURATION.INTRO,
      easing: MOTION_EASING.OUT_CUBIC,
    });
    mascotScale.value = withDelay(
      120,
      withSequence(
        withTiming(1.02, {
          duration: 1100,
          easing: MOTION_EASING.IN_OUT_QUAD,
        }),
        withRepeat(
          withSequence(
            withTiming(0.985, {
              duration: 1700,
              easing: MOTION_EASING.IN_OUT_QUAD,
            }),
            withTiming(1.02, {
              duration: 1700,
              easing: MOTION_EASING.IN_OUT_QUAD,
            }),
          ),
          -1,
          false,
        ),
      ),
    );
    spinnerRotation.value = withRepeat(
      withTiming(360, {
        duration: 1150,
        easing: MOTION_EASING.LINEAR,
      }),
      -1,
      false,
    );
  }, [contentOpacity, contentTranslateY, mascotScale, spinnerRotation]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const spinnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotation.value}deg` }],
  }));

  const handleLayout = useCallback(() => {
    if (hasReportedReady.current) {
      return;
    }

    hasReportedReady.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <LinearGradient
      colors={BACKGROUND_COLORS}
      style={styles.background}
      onLayout={handleLayout}
    >
      <View pointerEvents="none" style={styles.backgroundGlowTop} />
      <View pointerEvents="none" style={styles.backgroundGlowBottom} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <AnimatedLinearGradient
            colors={[
              "rgba(255,255,255,0.88)",
              "rgba(231,236,255,0.62)",
              "rgba(255,255,255,0.18)",
            ]}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.85, y: 0.95 }}
            style={[styles.mascotHalo, mascotAnimatedStyle]}
          />

          <Animated.View style={[styles.mascotWrap, mascotAnimatedStyle]}>
            <Image
              source={require("@/assets/images/Eyrie_Mascot_2.png")}
              contentFit="contain"
              style={styles.mascot}
            />
          </Animated.View>

          <View style={styles.textBlock}>
            <Text style={styles.logo}>Eyrie</Text>
            <Text style={styles.tagline}>Track. Plan. Achieve.</Text>
          </View>

          <View style={styles.loaderBlock}>
            <Animated.View style={[styles.spinnerWrap, spinnerAnimatedStyle]}>
              <Svg
                width={SPINNER_SIZE}
                height={SPINNER_SIZE}
                viewBox={`0 0 ${SPINNER_SIZE} ${SPINNER_SIZE}`}
              >
                <Defs>
                  <SvgLinearGradient
                    id="spinnerGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#CEC6FF" />
                    <Stop offset="55%" stopColor="#8B78FF" />
                    <Stop offset="100%" stopColor="#6B5BFF" />
                  </SvgLinearGradient>
                </Defs>
                <Circle
                  cx={SPINNER_SIZE / 2}
                  cy={SPINNER_SIZE / 2}
                  r={(SPINNER_SIZE - SPINNER_STROKE) / 2}
                  stroke="rgba(139, 120, 255, 0.18)"
                  strokeWidth={SPINNER_STROKE}
                  fill="none"
                />
                <Circle
                  cx={SPINNER_SIZE / 2}
                  cy={SPINNER_SIZE / 2}
                  r={(SPINNER_SIZE - SPINNER_STROKE) / 2}
                  stroke="url(#spinnerGradient)"
                  strokeWidth={SPINNER_STROKE}
                  strokeLinecap="round"
                  strokeDasharray="88 148"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            <Text style={styles.loadingText}>{STARTUP_COPY}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default memo(LoadingScreen);

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -SCREEN_WIDTH * 0.2,
    left: -SCREEN_WIDTH * 0.18,
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 999,
    backgroundColor: "rgba(210, 215, 255, 0.26)",
  },
  backgroundGlowBottom: {
    position: "absolute",
    right: -SCREEN_WIDTH * 0.15,
    bottom: -SCREEN_WIDTH * 0.32,
    width: SCREEN_WIDTH * 0.74,
    height: SCREEN_WIDTH * 0.74,
    borderRadius: 999,
    backgroundColor: "rgba(200, 207, 255, 0.22)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: Platform.select({ ios: 16, default: 0 }),
  },
  mascotHalo: {
    position: "absolute",
    top: "21%",
    width: MASCOT_SIZE * 1.58,
    height: MASCOT_SIZE * 1.58,
    borderRadius: 999,
    opacity: 0.94,
  },
  mascotWrap: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  mascot: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    alignItems: "center",
    marginBottom: 44,
  },
  logo: {
    fontFamily: fontFamilies.sans,
    fontSize: 66,
    lineHeight: 72,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tighter,
    color: "#101A78",
  },
  tagline: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeights.medium,
    letterSpacing: -0.2,
    color: "#7979D8",
  },
  loaderBlock: {
    alignItems: "center",
    gap: 22,
  },
  spinnerWrap: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    color: "#8684DD",
    textAlign: "center",
  },
});
