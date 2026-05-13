import { memo, useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Easing } from "react-native-reanimated";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  PieChart,
  PiggyBank,
  Target,
  TrendingUp,
  Trophy,
  WalletCards,
} from "lucide-react-native";

import Pagination from "./Pagination";
import Slide, { type OnboardingSlideData } from "./Slide";

import Mascot1 from "@/assets/images/Eyrie_Mascot_1.png";
import Mascot2 from "@/assets/images/Eyrie_Mascot_2.png";
import Mascot3 from "@/assets/images/Eyrie_Mascot_3.png";

const ONBOARDING_STORAGE_KEY = "onboardingCompleted";

const slides: readonly OnboardingSlideData[] = [
  {
    id: 0,
    title: "Understand where your money goes",
    description:
      "Track every expense and income with ease. Get a clear picture of your financial habits.",
    mascot: Mascot3,
    cta: "Continue",
    stepColor: "#1677FF",
    gradient: ["rgba(194,221,255,0.62)", "rgba(242,248,255,0.10)"] as const,
    mascotShiftX: 0,
    accents: [
      {
        icon: WalletCards,
        title: "Expenses",
        value: "-$128",
        tone: "blue",
        size: "card",
        variant: "stat",
        anchor: "topLeft",
        offsetX: 12,
        offsetY: -6,
      },
      {
        icon: TrendingUp,
        title: "Income",
        value: "+$850",
        tone: "green",
        size: "card",
        variant: "stat",
        anchor: "midLeft",
        offsetX: 18,
        offsetY: -10,
      },
      {
        icon: PieChart,
        tone: "violet",
        size: "md",
        variant: "bubble",
        anchor: "topRight",
        offsetX: -18,
        offsetY: 2,
      },
      {
        icon: BarChart3,
        tone: "blue",
        size: "sm",
        variant: "bubble",
        anchor: "midRight",
        offsetX: -10,
        offsetY: -2,
      },
    ],
  },
  {
    id: 1,
    title: "Build better spending habits",
    description:
      "Set budgets, monitor categories, and receive smart insights to improve your financial health.",
    mascot: Mascot2,
    cta: "Continue",
    stepColor: "#21A365",
    gradient: ["rgba(198,226,255,0.62)", "rgba(242,248,255,0.10)"] as const,
    mascotShiftX: 4,
    accents: [
      {
        icon: ClipboardList,
        title: "Budget Plan",
        value: "3 goals",
        caption: "Balanced",
        tone: "green",
        size: "card",
        variant: "progress",
        anchor: "midLeft",
        offsetX: 6,
        offsetY: -24,
      },
      {
        icon: TrendingUp,
        tone: "green",
        size: "md",
        variant: "bubble",
        anchor: "topRight",
        offsetX: -8,
        offsetY: 20,
      },
      {
        icon: PiggyBank,
        tone: "blue",
        size: "sm",
        variant: "bubble",
        anchor: "midRight",
        offsetX: -16,
        offsetY: 12,
      },
    ],
  },
  {
    id: 2,
    title: "Reach your savings goals faster",
    description:
      "Create goals, track progress, and celebrate achievements with your financial companion.",
    mascot: Mascot1,
    cta: "Get Started",
    stepColor: "#7A67F8",
    gradient: ["rgba(202,224,255,0.62)", "rgba(242,248,255,0.10)"] as const,
    mascotShiftX: 4,
    accents: [
      {
        icon: Target,
        tone: "green",
        size: "md",
        variant: "bubble",
        anchor: "topLeft",
        offsetX: 24,
        offsetY: 10,
      },
      {
        icon: Trophy,
        tone: "gold",
        size: "md",
        variant: "bubble",
        anchor: "topRight",
        offsetX: -18,
        offsetY: 18,
      },
      {
        icon: ClipboardList,
        title: "Progress",
        value: "92%",
        caption: "Goal funded",
        tone: "blue",
        size: "card",
        variant: "progress",
        anchor: "midLeft",
        offsetX: 14,
        offsetY: 18,
      },
    ],
  },
] as const;

const particles = [
  { id: 0, size: 12, left: "6%", top: "7%", duration: 4200, shift: -9 },
  { id: 1, size: 5, left: "18%", top: "20%", duration: 4520, shift: 8 },
  { id: 2, size: 7, left: "30%", top: "33%", duration: 4840, shift: -9 },
  { id: 3, size: 12, left: "42%", top: "46%", duration: 5160, shift: 8 },
  { id: 4, size: 7, left: "54%", top: "59%", duration: 5480, shift: -9 },
  { id: 5, size: 5, left: "66%", top: "72%", duration: 5800, shift: 8 },
  { id: 6, size: 12, left: "78%", top: "13%", duration: 6120, shift: -9 },
  { id: 7, size: 5, left: "90%", top: "26%", duration: 6440, shift: 8 },
] as const;

const pageTransition = {
  type: "timing" as const,
  duration: 380,
  easing: Easing.out(Easing.cubic),
};

async function setCompletedOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    return;
  }

  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

const PersistentBackground = memo(function PersistentBackground() {
  return (
    <View style={styles.backgroundLayer} pointerEvents="none">
      <LinearGradient
        colors={["#ECF4FF", "#F8FBFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <LinearGradient
          colors={["rgba(214,232,255,0.75)", "rgba(214,232,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.depthOrbLeft}
        />
        <LinearGradient
          colors={["rgba(232,240,255,0.64)", "rgba(232,240,255,0)"]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={styles.depthOrbRight}
        />
        {particles.map((particle) => (
          <MotiView
            key={particle.id}
            animate={{ translateY: [0, particle.shift, 0] }}
            transition={{
              type: "timing",
              duration: particle.duration,
              loop: true,
            }}
            style={[
              styles.particle,
              {
                width: particle.size,
                height: particle.size,
                left: particle.left,
                top: particle.top,
              },
            ]}
          />
        ))}
      </LinearGradient>
    </View>
  );
});

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [introSeed, setIntroSeed] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeSlide = slides[index];
  const isCompact = height < 760;

  useEffect(() => {
    void Promise.all(
      slides.map((slide) => Asset.fromModule(slide.mascot).downloadAsync()),
    );
  }, []);

  const complete = useCallback(async () => {
    await setCompletedOnboarding();
    router.replace("/sign-in");
  }, [router]);

  const skip = useCallback(() => {
    void complete();
  }, [complete]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex === index) {
        return;
      }

      setIndex(nextIndex);
      setIntroSeed((current) => current + 1);
    },
    [index],
  );

  const next = useCallback(() => {
    if (index < slides.length - 1) {
      goToIndex(index + 1);
      return;
    }

    void complete();
  }, [complete, goToIndex, index]);

  const goTo = useCallback(
    (nextIndex: number) => {
      goToIndex(nextIndex);
    },
    [goToIndex],
  );

  const handleSwipeRelease = useCallback(
    (endX: number) => {
      const startX = touchStartX.current ?? endX;
      const delta = endX - startX;

      if (delta < -46 && index < slides.length - 1) {
        goToIndex(index + 1);
      } else if (delta > 46 && index > 0) {
        goToIndex(index - 1);
      }

      touchStartX.current = null;
    },
    [goToIndex, index],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundShell}>
        <PersistentBackground />

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 145 }}
          style={styles.screen}
        >
          <View
            style={[
              styles.topBar,
              { paddingTop: Math.max(6, insets.top * 0.28) },
            ]}
          >
            <Pressable onPress={skip} hitSlop={8} style={styles.skipButton}>
              {({ pressed }) => (
                <MotiView
                  animate={{ scale: pressed ? 0.97 : 1 }}
                  transition={{ type: "spring", damping: 18, stiffness: 240 }}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </MotiView>
              )}
            </Pressable>
          </View>

          <View
            style={styles.slideViewport}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(event: any) => {
              touchStartX.current = event.nativeEvent.pageX;
            }}
            onResponderRelease={(event: any) => {
              handleSwipeRelease(event.nativeEvent.pageX);
            }}
          >
            <View style={styles.slideStack}>
              {slides.map((slide, slideIndex) => {
                const isActive = slideIndex === index;

                return (
                  <MotiView
                    key={slide.id}
                    pointerEvents={isActive ? "auto" : "none"}
                    animate={{
                      translateX: (slideIndex - index) * width,
                      opacity: 1,
                      scale: isActive ? 1 : 0.992,
                    }}
                    transition={pageTransition}
                    style={[
                      styles.slideFill,
                      {
                        zIndex: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <Slide
                      slide={slide}
                      introSeed={isActive ? introSeed : slideIndex}
                    />
                  </MotiView>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.bottomArea,
              {
                paddingHorizontal: 22,
                paddingBottom: Math.max(18, insets.bottom + 8),
                paddingTop: isCompact ? 8 : 14,
              },
            ]}
          >
            <MotiView
              key={`pagination-${activeSlide.id}-${introSeed}`}
              from={{ opacity: 0, translateY: 8, scale: 0.99 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 180,
                easing: Easing.out(Easing.cubic),
              }}
            >
              <Pagination
                count={slides.length}
                active={index}
                onDotClick={goTo}
              />
            </MotiView>

            <MotiView
              key={`cta-${activeSlide.id}-${introSeed}`}
              from={{ opacity: 0, translateY: 12, scale: 0.985 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{
                type: "timing",
                duration: 200,
                easing: Easing.out(Easing.cubic),
              }}
            >
              <Pressable
                onPress={next}
                style={({ pressed }) => [
                  styles.ctaPressable,
                  { transform: [{ scale: pressed ? 0.988 : 1 }] },
                ]}
              >
                <LinearGradient
                  colors={["#1A7CFF", "#145FE8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.ctaButton, { height: isCompact ? 52 : 56 }]}
                >
                  <Text style={styles.ctaText}>{activeSlide.cta}</Text>
                  <ArrowRight color="#FFFFFF" size={22} strokeWidth={2.4} />
                </LinearGradient>
              </Pressable>
            </MotiView>
          </View>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ECF4FF",
  },
  backgroundShell: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  depthOrbLeft: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    left: -80,
    top: 90,
  },
  depthOrbRight: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 999,
    right: -110,
    bottom: 160,
  },
  particle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(206, 223, 248, 0.82)",
  },
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 2,
  },
  skipButton: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#1767F3",
  },
  slideViewport: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  slideStack: {
    flex: 1,
    minHeight: 0,
  },
  slideFill: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  bottomArea: {
    justifyContent: "flex-end",
  },
  ctaPressable: {
    marginTop: 16,
    borderRadius: 999,
    shadowColor: "#1566EE",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.26,
    shadowRadius: 22,
    elevation: 10,
  },
  ctaButton: {
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
  },
  ctaText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
