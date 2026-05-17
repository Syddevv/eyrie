import { type ReactNode } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";

type LoadingActionButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: PressableProps["style"];
  textStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  spinnerColor?: string;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  preserveLabelWidth?: boolean;
  indicatorSize?: "small" | "large" | number;
  haptic?: "none" | "default" | "destructive";
};

const INDICATOR_SLOT = 18;

function getSlotSize(indicatorSize: "small" | "large" | number) {
  if (typeof indicatorSize === "number") {
    return Math.max(INDICATOR_SLOT, indicatorSize);
  }

  return indicatorSize === "large" ? 24 : 20;
}

function pickMeasurementLabel(
  label: string,
  loadingLabel?: string,
  preserveLabelWidth?: boolean,
) {
  if (!preserveLabelWidth || !loadingLabel) {
    return label;
  }

  return loadingLabel.length > label.length ? loadingLabel : label;
}

export function LoadingActionButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  style,
  textStyle,
  contentStyle,
  spinnerColor = "#FFFFFF",
  leftAdornment,
  rightAdornment,
  preserveLabelWidth = true,
  indicatorSize = "small",
  haptic = "default",
  onPress,
  ...pressableProps
}: LoadingActionButtonProps) {
  const resolvedLabel = loading ? (loadingLabel ?? label) : label;
  const slotSize = getSlotSize(indicatorSize);
  const measurementLabel = pickMeasurementLabel(
    label,
    loadingLabel,
    preserveLabelWidth,
  );
  const isDisabled = disabled || loading;

  const triggerHaptic = async () => {
    if (haptic === "none") {
      return;
    }

    if (haptic === "destructive") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    await Haptics.selectionAsync();
  };

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      onPress={(event) => {
        void triggerHaptic();
        onPress?.(event);
      }}
      style={style}
    >
      <View style={[styles.content, contentStyle]}>
        <View
          pointerEvents="none"
          style={[
            styles.measurementRow,
            preserveLabelWidth ? styles.measurementVisible : styles.hidden,
          ]}
        >
          <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
            {leftAdornment ? (
              <View style={styles.slotContent}>{leftAdornment}</View>
            ) : null}
          </View>
          <Text style={[styles.label, textStyle, styles.hidden]}>
            {measurementLabel}
          </Text>
          <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
            {rightAdornment ? (
              <View style={styles.slotContent}>{rightAdornment}</View>
            ) : null}
          </View>
        </View>

        <View style={styles.overlayRow}>
          <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
            {loading ? (
              <ActivityIndicator color={spinnerColor} size={indicatorSize} />
            ) : leftAdornment ? (
              <View style={styles.slotContent}>{leftAdornment}</View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[styles.label, textStyle]}>
            {resolvedLabel}
          </Text>
          <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
            {loading ? (
              <ActivityIndicator
                color={spinnerColor}
                size={indicatorSize}
                style={styles.hidden}
              />
            ) : rightAdornment ? (
              <View style={[styles.slotContent, loading && styles.hidden]}>
                {rightAdornment}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

  const styles = StyleSheet.create({
  content: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  measurementRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  measurementVisible: {
    opacity: 0,
  },
  overlayRow: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
  slotContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: {
    opacity: 0,
  },
  label: {
    flexShrink: 1,
    textAlign: "center",
  },
});
