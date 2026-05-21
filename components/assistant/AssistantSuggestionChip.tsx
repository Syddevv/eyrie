import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  fontFamilies,
  fontWeights,
  letterSpacings,
} from "@/constants/typography";
import { radius } from "@/constants/theme";

export function AssistantSuggestionChip({
  label,
  icon,
  disabled,
  onPress,
  backgroundColor,
  borderColor,
  textColor,
  iconColor,
}: {
  label: string;
  icon: "trending-up" | "shield" | "dollar-sign" | "pie-chart" | "target";
  disabled?: boolean;
  onPress: () => void;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      android_ripple={{ color: "rgba(20,149,255,0.08)", borderless: false }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
      ]}
    >
      <View style={styles.content}>
        <Feather
          name={icon}
          size={14}
          color={iconColor}
          style={styles.icon}
        />
        <Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 42,
    minWidth: 116,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  icon: {
    alignSelf: "center",
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.wide,
    includeFontPadding: false,
  },
});
