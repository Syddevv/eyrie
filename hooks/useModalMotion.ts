import { useEffect } from "react";
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";

type UseModalMotionOptions = {
  visible: boolean;
  enteringOffset?: number;
  scaleFrom?: number;
  keyboardVisible?: boolean;
  keyboardHeight?: number;
  keyboardLiftFactor?: number;
  keyboardMaxLift?: number;
};

export function useModalMotion({
  visible,
  enteringOffset = 22,
  scaleFrom = 0.96,
  keyboardVisible = false,
  keyboardHeight = 0,
  keyboardLiftFactor = 0.22,
  keyboardMaxLift = 72,
}: UseModalMotionOptions) {
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? MOTION_DURATION.MODAL_SHOW : MOTION_DURATION.FAST,
      easing: MOTION_EASING.OUT_CUBIC,
    });
  }, [progress, visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const animatedCardStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [
              enteringOffset,
              keyboardVisible
                ? -Math.min(
                    keyboardHeight * keyboardLiftFactor,
                    keyboardMaxLift,
                  )
                : 0,
            ],
          ),
        },
        { scale: interpolate(progress.value, [0, 1], [scaleFrom, 1]) },
      ],
    }),
    [
      enteringOffset,
      keyboardHeight,
      keyboardLiftFactor,
      keyboardMaxLift,
      keyboardVisible,
      scaleFrom,
    ],
  );

  return { progress, animatedBackdropStyle, animatedCardStyle };
}
