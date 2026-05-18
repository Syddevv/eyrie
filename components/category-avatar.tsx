import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import type { CategoryOption } from "@/hooks/useCategories";

const FEATHER_CATEGORY_ICONS = new Set([
  "coffee",
  "bookmark",
  "gift",
  "home",
  "heart",
  "zap",
]);

const LEGACY_CATEGORY_ICON_ALIASES: Record<string, string> = {
  bag: "shopping-bag",
  "shopping-cart": "cart-outline",
  "laptop-outline": "laptop",
};

function resolveCategoryIconName(iconName: string) {
  return LEGACY_CATEGORY_ICON_ALIASES[iconName] ?? iconName;
}

type CategoryAvatarProps = {
  category: Pick<
    CategoryOption,
    "iconType" | "iconName" | "iconImageUri" | "emoji" | "color"
  >;
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
        ]}
      >
        <Text
          style={[
            {
              fontSize: size * 0.8,
              lineHeight: size,
            },
            emojiStyle,
          ]}
        >
          {category.emoji}
        </Text>
      </View>
    );
  }

  const iconName = resolveCategoryIconName(
    category.iconName ?? "shape-outline",
  );
  const isFeatherIcon = FEATHER_CATEGORY_ICONS.has(iconName);

  return isFeatherIcon ? (
    <Feather
      name={iconName as React.ComponentProps<typeof Feather>["name"]}
      size={size}
      color={category.color}
      style={containerStyle}
    />
  ) : (
    <MaterialCommunityIcons
      name={
        iconName as React.ComponentProps<typeof MaterialCommunityIcons>["name"]
      }
      size={size}
      color={category.color}
      style={containerStyle}
    />
  );
}
