import { memo, useMemo } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";

export type AccentAnchor =
  | "topLeft"
  | "midLeft"
  | "lowLeft"
  | "topRight"
  | "midRight"
  | "lowRight";

type FloatingAccent = {
  icon: LucideIcon;
  title?: string;
  value?: string;
  caption?: string;
  tone: "blue" | "green" | "violet" | "gold";
  size: "sm" | "md" | "card";
  variant?: "stat" | "progress" | "bubble";
  anchor: AccentAnchor;
  offsetX?: number;
  offsetY?: number;
};

export type OnboardingSlideData = {
  id: number;
  title: string;
  description: string;
  mascot: any;
  cta: string;
  stepColor: string;
  gradient: readonly [string, string];
  mascotShiftX?: number;
  accents: readonly FloatingAccent[];
};

const toneMeta = {
  blue: {
    borderColor: "rgba(189, 220, 255, 0.95)",
    iconBackground: ["#F2F8FF", "#E7F1FF"] as const,
    iconColor: "#1A7BFF",
    cardGlow: "rgba(38, 120, 255, 0.14)",
  },
  green: {
    borderColor: "rgba(198, 242, 217, 0.98)",
    iconBackground: ["#F1FCF6", "#E6F8EE"] as const,
    iconColor: "#1EA966",
    cardGlow: "rgba(33, 163, 101, 0.12)",
  },
  violet: {
    borderColor: "rgba(231, 223, 255, 0.98)",
    iconBackground: ["#F8F4FF", "#F0E9FF"] as const,
    iconColor: "#7A67F8",
    cardGlow: "rgba(122, 103, 248, 0.14)",
  },
  gold: {
    borderColor: "rgba(249, 229, 182, 0.98)",
    iconBackground: ["#FFF9EA", "#FFF2D2"] as const,
    iconColor: "#D79210",
    cardGlow: "rgba(215, 146, 16, 0.14)",
  },
} as const;

const sparkles = [
  { key: "sparkle-1", x: 0.1, y: 0.15, size: 10, duration: 3600, shift: -7 },
  { key: "sparkle-2", x: 0.85, y: 0.2, size: 12, duration: 4100, shift: 7 },
  { key: "sparkle-3", x: 0.2, y: 0.78, size: 8, duration: 3900, shift: -6 },
  { key: "sparkle-4", x: 0.76, y: 0.72, size: 7, duration: 4300, shift: 6 },
] as const;

function createAccentAnchorStyle(
  anchor: AccentAnchor,
  frameWidth: number,
  frameHeight: number,
  accentSize: number,
  offsetX = 0,
  offsetY = 0,
): ViewStyle {
  const positions: Record<AccentAnchor, ViewStyle> = {
    topLeft: {
      left: frameWidth * 0.045,
      top: frameHeight * 0.13,
    },
    midLeft: {
      left: frameWidth * 0.015,
      top: frameHeight * 0.39,
    },
    lowLeft: {
      left: frameWidth * 0.12,
      top: frameHeight * 0.66,
    },
    topRight: {
      left: frameWidth - accentSize - frameWidth * 0.045,
      top: frameHeight * 0.13,
    },
    midRight: {
      left: frameWidth - accentSize - frameWidth * 0.025,
      top: frameHeight * 0.39,
    },
    lowRight: {
      left: frameWidth - accentSize - frameWidth * 0.14,
      top: frameHeight * 0.66,
    },
  };

  return {
    ...positions[anchor],
    transform: [{ translateX: offsetX }, { translateY: offsetY }],
  };
}

function FloatingAccentCard({
  accent,
  index,
  frameWidth,
  frameHeight,
}: {
  accent: FloatingAccent;
  index: number;
  frameWidth: number;
  frameHeight: number;
}) {
  const tone = toneMeta[accent.tone];
  const isCard = accent.size === "card";
  const isProgress = accent.variant === "progress";
  const cardWidth =
    accent.size === "card"
      ? Math.min(144, Math.max(114, frameWidth * 0.29))
      : accent.size === "md"
        ? 60
        : 52;
  const cardHeight =
    accent.size === "card"
      ? isProgress
        ? 82
        : 72
      : accent.size === "md"
        ? 60
        : 52;
  const Icon = accent.icon;
  const anchorStyle = createAccentAnchorStyle(
    accent.anchor,
    frameWidth,
    frameHeight,
    cardWidth,
    accent.offsetX,
    accent.offsetY,
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10, scale: 0.985 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "timing",
        duration: 360,
        delay: 40 + index * 25,
        easing: Easing.out(Easing.cubic),
      }}
      style={[styles.accentBase, anchorStyle]}
    >
      <MotiView
        animate={{
          translateY: [0, -5, 0],
          rotate: ["0deg", `${index % 2 === 0 ? 1 : -1}deg`, "0deg"],
        }}
        transition={{
          type: "timing",
          duration: 4600 + index * 260,
          loop: true,
        }}
      >
        <View
          style={[
            styles.accentCard,
            {
              width: cardWidth,
              minHeight: cardHeight,
              borderColor: tone.borderColor,
              shadowColor: tone.cardGlow,
              paddingHorizontal: isCard ? 11 : 0,
              paddingVertical: isCard ? 10 : 0,
              alignItems: isCard ? "stretch" : "center",
              justifyContent: "center",
            },
          ]}
        >
          {isCard ? (
            <>
              <View style={styles.accentCardRow}>
                <LinearGradient
                  colors={tone.iconBackground as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accentIconWrap}
                >
                  <Icon color={tone.iconColor} size={18} strokeWidth={2.35} />
                </LinearGradient>
                <View style={styles.accentTextWrap}>
                  {accent.title ? (
                    <Text style={styles.accentTitle} numberOfLines={1}>
                      {accent.title}
                    </Text>
                  ) : null}
                  {accent.value ? (
                    <Text style={styles.accentValue} numberOfLines={1}>
                      {accent.value}
                    </Text>
                  ) : null}
                </View>
              </View>

              {isProgress ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={["#56A3FF", "#1A7BFF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressFill}
                    />
                  </View>
                  <Text style={styles.progressCaption}>
                    {accent.caption ?? "On track"}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <LinearGradient
              colors={tone.iconBackground as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accentIconBubble}
            >
              <Icon
                color={tone.iconColor}
                size={accent.size === "md" ? 24 : 20}
                strokeWidth={2.45}
              />
            </LinearGradient>
          )}
        </View>
      </MotiView>
    </MotiView>
  );
}

function Slide({ slide }: { slide: OnboardingSlideData }) {
  const { height, width } = useWindowDimensions();

  const frameHeight = useMemo(
    () => Math.min(Math.max(height * 0.43, 330), 455),
    [height],
  );
  const frameWidth = useMemo(() => Math.min(width - 36, 390), [width]);
  const mascotSize = useMemo(
    () => Math.min(Math.max(height * 0.36, 246), 336),
    [height],
  );

  return (
    <View style={styles.slide}>
      <View style={[styles.illustrationSection, { height: frameHeight + 28 }]}>
        <View
          style={[
            styles.illustrationFrame,
            { width: frameWidth, height: frameHeight },
          ]}
        >
          {sparkles.map((sparkle) => (
            <MotiView
              key={`${slide.id}-${sparkle.key}`}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 220,
                delay: 10 + sparkle.size,
                easing: Easing.out(Easing.cubic),
              }}
              style={[
                {
                  position: "absolute",
                  left: frameWidth * sparkle.x,
                  top: frameHeight * sparkle.y,
                  width: sparkle.size,
                  height: sparkle.size,
                },
              ]}
            >
              <MotiView
                animate={{
                  translateY: [0, sparkle.shift, 0],
                }}
                transition={{
                  type: "timing",
                  duration: sparkle.duration,
                  loop: true,
                }}
                style={[
                  styles.sparkle,
                  { width: sparkle.size, height: sparkle.size },
                ]}
              />
            </MotiView>
          ))}

          <LinearGradient
            colors={["rgba(213,231,255,0.62)", "rgba(239,247,255,0.12)"]}
            start={{ x: 0.1, y: 0.05 }}
            end={{ x: 0.88, y: 0.95 }}
            style={[
              styles.depthHaloLarge,
              {
                width: frameWidth * 0.84,
                height: frameHeight * 0.82,
                borderRadius: frameWidth,
                top: frameHeight * 0.08,
              },
            ]}
          />
          <LinearGradient
            colors={slide.gradient as unknown as string[]}
            start={{ x: 0.2, y: 0.08 }}
            end={{ x: 0.82, y: 0.92 }}
            style={[
              styles.gradientHalo,
              {
                width: frameWidth * 0.72,
                height: frameHeight * 0.72,
                borderRadius: frameWidth,
                top: frameHeight * 0.16,
              },
            ]}
          />
          <View
            style={[
              styles.softGlow,
              {
                width: frameWidth * 0.52,
                height: frameHeight * 0.22,
                bottom: frameHeight * 0.16,
              },
            ]}
          />

          {slide.accents.map((accent, index) => (
            <FloatingAccentCard
              key={`${slide.id}-${index}`}
              accent={accent}
              index={index}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
            />
          ))}

          <MotiView
            from={{ opacity: 0, scale: 0.975, translateY: 14 }}
            animate={{
              opacity: 1,
              translateY: 0,
              rotate: "0deg",
            }}
            transition={{
              type: "timing",
              duration: 380,
              delay: 70,
              easing: Easing.out(Easing.cubic),
            }}
            style={[
              styles.mascotWrap,
              {
                width: mascotSize,
                height: mascotSize,
                transform: [{ translateX: slide.mascotShiftX ?? 0 }],
              },
            ]}
          >
            <MotiView
              animate={{
                translateY: [0, -5, 0],
              }}
              transition={{
                type: "timing",
                duration: 4800,
                loop: true,
              }}
            >
              <Image
                contentFit="contain"
                cachePolicy="memory-disk"
                source={slide.mascot}
                style={{ width: mascotSize, height: mascotSize }}
              />
            </MotiView>
          </MotiView>
        </View>
      </View>

      <View style={styles.contentSection}>
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "timing",
            duration: 260,
            delay: 80,
            easing: Easing.out(Easing.cubic),
          }}
        >
          <View style={[styles.stepChip, { backgroundColor: slide.stepColor }]}>
            <Text style={styles.stepChipText}>{slide.id + 1}</Text>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "timing",
            duration: 300,
            delay: 115,
            easing: Easing.out(Easing.cubic),
          }}
        >
          <Text style={styles.title} numberOfLines={2}>
            {slide.title}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "timing",
            duration: 300,
            delay: 145,
            easing: Easing.out(Easing.cubic),
          }}
        >
          <Text style={styles.description}>{slide.description}</Text>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    justifyContent: "space-between",
  },
  illustrationSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationFrame: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  depthHaloLarge: {
    position: "absolute",
    alignSelf: "center",
  },
  gradientHalo: {
    position: "absolute",
    alignSelf: "center",
  },
  softGlow: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(113, 169, 255, 0.12)",
  },
  sparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(204, 224, 255, 0.9)",
  },
  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  accentBase: {
    position: "absolute",
  },
  accentCard: {
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.82)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 10,
  },
  accentCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  accentIconBubble: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  accentTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  accentTitle: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    color: "#78879D",
  },
  accentValue: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "800",
    color: "#14213D",
  },
  progressSection: {
    marginTop: 9,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E5EDF8",
    overflow: "hidden",
  },
  progressFill: {
    width: "74%",
    height: "100%",
    borderRadius: 999,
  },
  progressCaption: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
    color: "#7B89A0",
  },
  contentSection: {
    alignItems: "center",
    paddingHorizontal: 26,
    paddingBottom: 8,
  },
  stepChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  stepChipText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "800",
  },
  title: {
    maxWidth: 318,
    textAlign: "center",
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#16224B",
  },
  description: {
    maxWidth: 318,
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 27,
    color: "#6F7D95",
  },
});

export default memo(Slide);
