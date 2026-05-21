import { Easing as ReactNativeEasing } from "react-native";
import { LinearTransition } from "react-native-reanimated";
import { Easing as ReanimatedEasing } from "react-native-reanimated";

export const MOTION_DURATION = {
  TINY: 140,
  CARET: 160,
  FAST: 180,
  BASE: 220,
  MODAL_SHOW: 280,
  LIST_ENTRY: 360,
  PULSE: 350,
  PAGE: 380,
  STARTUP_FADE: 420,
  INTRO: 700,
} as const;

export const MOTION_EASING = {
  OUT_CUBIC: ReanimatedEasing.out(ReanimatedEasing.cubic),
  OUT_EASE: ReanimatedEasing.out(ReanimatedEasing.ease),
  IN_OUT_QUAD: ReanimatedEasing.inOut(ReanimatedEasing.quad),
  LINEAR: ReanimatedEasing.linear,
} as const;

export const RN_MOTION_EASING = {
  OUT_CUBIC: ReactNativeEasing.out(ReactNativeEasing.cubic),
  OUT_EASE: ReactNativeEasing.out(ReactNativeEasing.ease),
  IN_OUT_QUAD: ReactNativeEasing.inOut(ReactNativeEasing.quad),
  LINEAR: ReactNativeEasing.linear,
} as const;

export function createStaggerDelay(index: number, baseDelay = 80, step = 45) {
  return baseDelay + index * step;
}

export function createSpringLayoutTransition() {
  return LinearTransition.springify().damping(17).stiffness(180);
}
