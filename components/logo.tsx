import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

type Props = {
  id?: string;
  name?: string;
  shortName?: string;
  size?: number;
  style?: any;
  backgroundColor?: string;
  uri?: string; // optional remote/local URI if available
};

export default function Logo({
  id,
  name,
  shortName,
  size = 44,
  style,
  backgroundColor,
  uri,
}: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 8 }, style]}
        resizeMode="contain"
      />
    );
  }

  const label = (shortName || name || id || "").slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || "#CBD5E1",
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: Math.max(12, Math.floor(size / 2.8)) },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#fff",
    fontWeight: "700",
  },
});
