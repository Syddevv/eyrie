import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";

type PolicySection = {
  id: number;
  title: string;
  body: string;
};

const policySections: readonly PolicySection[] = [
  {
    id: 1,
    title: "What Eyrie stores",
    body: "Eyrie stores the information you add in the app, including your profile details, sign-in session, transactions, budgets, savings goals, categories, payment methods, notification preferences, and app settings.",
  },
  {
    id: 2,
    title: "How we use it",
    body: "We use this data to sign you in, show your balances and summaries, keep your budgets and goals up to date, manage your payment methods, and display your notifications and settings correctly.",
  },
  {
    id: 3,
    title: "Where data lives",
    body: "Eyrie keeps a local SQLite database on your device for app data. When you sign in, the app can also use its backend sync layer to keep supported account data available for your account.",
  },
  {
    id: 4,
    title: "Sharing",
    body: "We do not sell your data. We only use the services needed to run sign-in, local storage, and sync for the features you choose to use.",
  },
  {
    id: 5,
    title: "Your choices",
    body: "You can update your profile, change your password, turn notifications on or off, and edit or delete your transactions, budgets, goals, categories, and payment methods inside the app.",
  },
  {
    id: 6,
    title: "Contact and updates",
    body: "If this policy changes, we will update it in the app. For questions about how Eyrie handles your data, contact support@eyrie.ph.",
  },
] as const;

export default function PrivacyPolicyModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.56)"
          : "rgba(15, 23, 42, 0.32)",
      },
      sheet: {
        backgroundColor: isDark ? "#111A27" : "#F4F8FC",
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.05)",
      },
      handle: {
        backgroundColor: isDark ? "#526173" : "#C9D3DF",
      },
      title: { color: isDark ? "#F8FAFC" : "#1A202C" },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0.72)",
      },
      closeIcon: { color: isDark ? "#D4DCE6" : "#202733" },
      infoCard: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#DCEEFE",
        borderColor: isDark ? "rgba(96, 165, 250, 0.22)" : "#B7D7FB",
      },
      infoText: { color: isDark ? "#D6E8FF" : "#607185" },
      updateText: { color: isDark ? "#D6E8FF" : "#465569" },
      sectionNumber: {
        backgroundColor: isDark ? "rgba(20, 149, 255, 0.18)" : "#D9ECFF",
      },
      sectionNumberText: { color: colors.primary },
      sectionTitle: { color: isDark ? "#F8FAFC" : "#111827" },
      sectionBody: { color: isDark ? "#B7C4D5" : "#5A687B" },
      footerBorder: {
        borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#D8E0EA",
      },
      footerText: { color: isDark ? "#D6E8FF" : "#5E6C80" },
      footerLink: { color: colors.primary },
    }),
    [colors.primary, isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Privacy Policy</Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={[styles.infoCard, ui.infoCard]}>
            <View style={styles.infoAvatarFrame}>
              <Image
                contentFit="cover"
                source={require("@/assets/images/Eyrie_Mascot_3.png")}
                style={styles.infoAvatar}
              />
            </View>
            <Text style={[styles.infoText, ui.infoText]}>
              This policy only covers the features and data handling that Eyrie
              actually uses today.
            </Text>
          </View>

          <Text style={[styles.updatedText, ui.updateText]}>
            Last updated: May 17, 2026
          </Text>

          {policySections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionNumber, ui.sectionNumber]}>
                  <Text
                    style={[styles.sectionNumberText, ui.sectionNumberText]}
                  >
                    {section.id}
                  </Text>
                </View>
                <Text style={[styles.sectionTitle, ui.sectionTitle]}>
                  {section.title}
                </Text>
              </View>
              <Text style={[styles.sectionBody, ui.sectionBody]}>
                {section.body}
              </Text>
            </View>
          ))}

          <View style={[styles.footer, ui.footerBorder]}>
            <Text style={[styles.footerText, ui.footerText]}>
              Questions? Email us at{" "}
              <Text style={[styles.footerLink, ui.footerLink]}>
                support@eyrie.ph
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
    maxHeight: "86%",
  },
  handle: {
    alignSelf: "center",
    width: 58,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: 18,
    paddingBottom: 8,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoAvatarFrame: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  infoAvatar: {
    width: 31,
    height: 31,
    borderRadius: radius.full,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  updatedText: {
    marginTop: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  sectionBody: {
    marginTop: 8,
    marginLeft: 32,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: fontWeights.regular,
  },
  footer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: fontWeights.medium,
  },
});
