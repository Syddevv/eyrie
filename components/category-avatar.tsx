import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import type { CategoryOption } from "@/hooks/useCategories";

type CategoryAvatarProps = {
  category: Pick<CategoryOption, "iconType" | "iconName" | "iconImageUri" | "emoji" | "color">;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  emojiStyle?: StyleProp<TextStyle>;
};

export function CategoryAvatar({
  category,
  size = 20,
  containerStyle,
  emojiStyle,
}: CategoryAvatarProps) {
  if (category.iconType === "uploaded_image" && category.iconImageUri) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: category.iconImageUri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          containerStyle,
        ]}
      />
    );
  }

  if (category.iconType === "emoji" && category.emoji) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          },
          containerStyle,
        ]}>
        <Text
          style={[
            {
              fontSize: size * 0.8,
              lineHeight: size,
            },
            emojiStyle,
          ]}>
          {category.emoji}
        </Text>
      </View>
    );
  }

  const iconName = category.iconName ?? "shape-outline";
  const isFeatherIcon = [
    "coffee",
    "bookmark",
    "gift",
    "home",
    "heart",
    "laptop",
    "shopping-bag",
    "zap",
  ].includes(iconName);

  return isFeatherIcon ? (
    <Feather
      name={iconName as React.ComponentProps<typeof Feather>["name"]}
      size={size}
      color={category.color}
      style={containerStyle}
    />
  ) : (
    <MaterialCommunityIcons
      name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
      size={size}
      color={category.color}
      style={containerStyle}
    />
  );
}
