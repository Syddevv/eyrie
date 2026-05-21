import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamilies, fontWeights } from "@/constants/typography";
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
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Feather name={icon} size={14} color={iconColor} style={styles.icon} />
      <Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    borderRadius: radius.full,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: {
    alignSelf: "center",
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
    includeFontPadding: false,
  },
});
