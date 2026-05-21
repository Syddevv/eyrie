import { useEffect, type PropsWithChildren } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";

type PageTransitionViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  offsetY?: number;
  scaleFrom?: number;
}>;

export function PageTransitionView({
  children,
  style,
  offsetY = 10,
  scaleFrom = 0.992,
}: PageTransitionViewProps) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, {
      duration: isFocused ? MOTION_DURATION.BASE : MOTION_DURATION.FAST,
      easing: MOTION_EASING.OUT_CUBIC,
    });
  }, [isFocused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [offsetY, 0]) },
      { scale: interpolate(progress.value, [0, 1], [scaleFrom, 1]) },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
