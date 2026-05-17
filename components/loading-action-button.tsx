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

function hasReservedLeadingSlot(
  leftAdornment: ReactNode,
  loadingLabel?: string,
  loading?: boolean,
) {
  return Boolean(leftAdornment) || Boolean(loadingLabel) || loading;
}

function hasReservedTrailingSlot(rightAdornment: ReactNode) {
  return Boolean(rightAdornment);
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
  const reserveLeadingSlot = hasReservedLeadingSlot(
    leftAdornment,
    loadingLabel,
    loading,
  );
  const reserveTrailingSlot = hasReservedTrailingSlot(rightAdornment);
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
          <View
            style={[
              styles.slot,
              {
                width: reserveLeadingSlot ? slotSize : 0,
                height: reserveLeadingSlot ? slotSize : 0,
              },
            ]}
          >
            {reserveLeadingSlot && leftAdornment ? (
              <View style={styles.slotContent}>{leftAdornment}</View>
            ) : null}
          </View>
          <View style={styles.labelWrap}>
            <Text style={[styles.label, textStyle, styles.hidden]}>
              {measurementLabel}
            </Text>
          </View>
          <View
            style={[
              styles.slot,
              {
                width: reserveTrailingSlot ? slotSize : 0,
                height: reserveTrailingSlot ? slotSize : 0,
              },
            ]}
          >
            {reserveTrailingSlot && rightAdornment ? (
              <View style={styles.slotContent}>{rightAdornment}</View>
            ) : null}
          </View>
        </View>

        <View style={styles.overlayRow}>
          <View style={styles.cluster}>
            {loading ? (
              <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
                {loading ? (
                  <ActivityIndicator color={spinnerColor} size={indicatorSize} />
                ) : null}
              </View>
            ) : leftAdornment ? (
              <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
                <View style={styles.slotContent}>{leftAdornment}</View>
              </View>
            ) : null}
            <View style={styles.labelWrap}>
              <Text numberOfLines={1} style={[styles.label, textStyle]}>
                {resolvedLabel}
              </Text>
            </View>
            {!loading && rightAdornment ? (
              <View style={[styles.slot, { width: slotSize, height: slotSize }]}>
                <View style={styles.slotContent}>{rightAdornment}</View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  cluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  slotContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  hidden: {
    opacity: 0,
  },
  label: {
    flexShrink: 1,
    textAlign: "center",
  },
});
