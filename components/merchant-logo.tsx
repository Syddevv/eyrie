import React, { memo, useMemo } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Logo from "@/components/logo";
import {
  getMerchantLogo,
  getMerchantLogoScale,
  normalizeMerchantLogoName,
} from "@/utils/getMerchantLogo";

type FallbackIcon = {
  library?: "material" | "feather";
  name?: string;
  color?: string;
};

type Props = {
  merchant?: string | null;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  fallbackIcon?: FallbackIcon;
};

function MerchantLogo({
  merchant,
  size = 40,
  backgroundColor,
  style,
  fallbackIcon,
}: Props) {
  const normalizedMerchant = useMemo(
    () => normalizeMerchantLogoName(merchant),
    [merchant],
  );
  const asset = useMemo(() => getMerchantLogo(merchant), [merchant]);
  const assetScale = useMemo(() => getMerchantLogoScale(merchant), [merchant]);
  const borderRadius = Math.max(6, Math.round(size / 2));

  const contentStyle = {
    width: size,
    height: size,
    borderRadius,
  };

  if (asset) {
    return (
      <View style={[styles.assetContainer, contentStyle, style]}>
        <Image
          source={asset}
          style={[styles.assetImage, { transform: [{ scale: assetScale }] }]}
          contentFit="cover"
          contentPosition="center"
          transition={0}
          recyclingKey={normalizedMerchant || "merchant-logo"}
        />
      </View>
    );
  }

  if (fallbackIcon && fallbackIcon.name) {
    if (fallbackIcon.library === "material") {
      return (
        <View style={[styles.container, contentStyle, style]}>
          <MaterialCommunityIcons
            name={fallbackIcon.name as any}
            size={Math.floor(size * 0.55)}
            color={fallbackIcon.color || "#000"}
          />
        </View>
      );
    }

    return (
      <View style={[styles.container, contentStyle, style]}>
        <Feather
          name={fallbackIcon.name as any}
          size={Math.floor(size * 0.55)}
          color={fallbackIcon.color || "#000"}
        />
      </View>
    );
  }

  return (
    <Logo
      name={merchant ?? undefined}
      size={size}
      style={style}
      backgroundColor={backgroundColor}
    />
  );
}

export default memo(MerchantLogo);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  assetContainer: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  assetImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
