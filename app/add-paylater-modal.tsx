import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { themeColors } from "@/constants/colors";
import { PAYLATER_OPTIONS } from "@/constants/paylaters";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function AddPaylaterModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.56)"
          : "rgba(15, 23, 42, 0.26)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.06)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      subtitle: {
        color: isDark ? "#9AA4B2" : colors.mutedForeground,
      },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(241, 245, 249, 0.98)",
      },
      closeIcon: {
        color: isDark ? "#D4DCE6" : "#202733",
      },
      optionCard: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(226, 232, 240, 0.96)",
      },
      optionTitle: {
        color: colors.foreground,
      },
      optionDescription: {
        color: isDark ? "#98A2B3" : "#667085",
      },
      genericIcon: {
        color: "#FFFFFF",
      },
      emptyText: {
        color: isDark ? "#98A2B3" : "#667085",
      },
    }),
    [colors, isDark],
  );

  const filteredOptions = PAYLATER_OPTIONS;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View style={[styles.sheet, ui.sheet, shadows.floating]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.title, ui.title]}>Add Paylater</Text>
              <Text style={[styles.subtitle, ui.subtitle]}>
                Track your Shopee, TikTok, Lazada, and other PayLater purchases
                in one place.
              </Text>
            </View>

            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsWrap}
          >
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.optionCard, ui.optionCard, shadows.soft]}
                  onPress={() =>
                    router.replace({
                      pathname: "/paylater-details-modal",
                      params: {
                        returnTo: "/add-paylater-modal",
                        selectedPaylater: option.id,
                      },
                    })
                  }
                >
                  <View
                    style={[
                      styles.optionLogoWrap,
                      { backgroundColor: option.accent },
                    ]}
                  >
                    {option.logo ? (
                      <Image
                        source={option.logo}
                        contentFit="cover"
                        style={styles.optionLogo}
                      />
                    ) : (
                      <Feather
                        name="shopping-bag"
                        size={18}
                        color={ui.genericIcon.color}
                      />
                    )}
                  </View>

                  <View style={styles.optionTextBlock}>
                    <Text style={[styles.optionTitle, ui.optionTitle]}>
                      {option.name}
                    </Text>
                    <Text
                      style={[styles.optionDescription, ui.optionDescription]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, ui.emptyText]}>
                  No paylater platforms found.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "72%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsWrap: {
    paddingTop: 18,
    paddingBottom: 8,
    gap: 10,
  },
  optionCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  optionLogo: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  optionDescription: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
});
