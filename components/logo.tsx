import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

type Props = {
  id?: string;
  name?: string;
  shortName?: string;
  size?: number;
  style?: any;
  backgroundColor?: string;
  uri?: string; // optional remote URI if available
  logo?: any; // optional local require(...) asset or remote URI string
};

export default function Logo({
  id,
  name,
  shortName,
  size = 44,
  style,
  backgroundColor,
  uri,
  logo,
}: Props) {
  // Prefer explicit local `logo` asset (require(...))
  if (logo) {
    // logo can be a number (require) or a string URI
    const source = typeof logo === "string" ? { uri: logo } : logo;
    return (
      <Image
        source={source}
        style={[{ width: size, height: size, borderRadius: size / 8 }, style]}
        resizeMode="contain"
      />
    );
  }

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
