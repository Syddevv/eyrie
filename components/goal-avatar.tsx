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
};

const legacyIconMap: Record<string, ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
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

  return (legacyIconMap[iconName] ?? iconName) as ComponentProps<typeof MaterialCommunityIcons>["name"];
}

export function GoalAvatar({ goal, size = 22 }: GoalAvatarProps) {
  if (goal.iconType === "uploaded_image" && goal.iconImageUri) {
    return <Image source={{ uri: goal.iconImageUri }} style={{ width: size, height: size, borderRadius: size / 2.8 }} />;
  }

  if (goal.iconType === "emoji" && goal.emoji) {
    return <Text style={[styles.emoji, { fontSize: size * 0.9, lineHeight: size }]}>{goal.emoji}</Text>;
  }

  return (
    <View>
      <MaterialCommunityIcons
        name={resolveVectorName(goal.iconName)}
        size={size}
        color={goal.color ?? "#1495FF"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: "center",
  },
});
