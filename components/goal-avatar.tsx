import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

type GoalAvatarProps = {
  goal: {
    iconType?: "vector" | "emoji" | "uploaded_image" | null;
    iconName?: string | null;
    iconImageUri?: string | null;
    emoji?: string | null;
    color?: string | null;
  };
  size?: number;
  tintColor?: string;
};

const legacyIconMap: Record<
  string,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  home: "home",
  gift: "gift-outline",
  travel: "airplane",
  shield: "shield-check",
  monitor: "laptop",
  car: "car-outline",
  target: "target",
};

function resolveVectorName(iconName?: string | null) {
  if (!iconName) {
    return "target";
  }

  return (legacyIconMap[iconName] ?? iconName) as ComponentProps<
    typeof MaterialCommunityIcons
  >["name"];
}

export function GoalAvatar({ goal, size = 22, tintColor }: GoalAvatarProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };

  if (goal.iconType === "uploaded_image" && goal.iconImageUri) {
    return (
      <View style={avatarStyle}>
        <Image
          source={{ uri: goal.iconImageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }

  if (goal.iconType === "emoji" && goal.emoji) {
    return (
      <View style={avatarStyle}>
        <Text
          style={[styles.emoji, { fontSize: size * 0.9, lineHeight: size }]}
        >
          {goal.emoji}
        </Text>
      </View>
    );
  }

  return (
    <View style={avatarStyle}>
      <MaterialCommunityIcons
        name={resolveVectorName(goal.iconName)}
        size={size}
        color={tintColor ?? goal.color ?? "#1495FF"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: "center",
  },
});
