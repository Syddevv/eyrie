import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";

function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.35);

  opacity.value = withDelay(
    delay,
    withRepeat(
      withSequence(
        withTiming(1, {
          duration: MOTION_DURATION.PULSE,
          easing: MOTION_EASING.IN_OUT_QUAD,
        }),
        withTiming(0.35, {
          duration: MOTION_DURATION.PULSE,
          easing: MOTION_EASING.IN_OUT_QUAD,
        }),
      ),
      -1,
      false,
    ),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: opacity.value > 0.7 ? -2 : 0 }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(MOTION_DURATION.TINY)}
      style={[styles.dot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

export function AssistantTypingIndicator({ color }: { color: string }) {
  return (
    <View style={styles.row}>
      <Dot delay={0} color={color} />
      <Dot delay={120} color={color} />
      <Dot delay={240} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
});
