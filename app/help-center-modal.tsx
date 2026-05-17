import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type HelpOption = {
  id: string;
  title: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

const faqItems: readonly FaqItem[] = [
  {
    id: "add-transaction",
    question: "How do I add a transaction?",
    answer:
      "Tap the '+' button at the bottom of the app, choose Expense or Income, enter the amount, pick a category and payment method, then save. You can also add notes, choose a source or merchant, and change the date.",
  },
  {
    id: "manage-budgets",
    question: "How do budgets work?",
    answer:
      "Open the Budget tab to review your budget progress. Budgets update automatically when you save income or expense transactions, so the totals stay current as you use the app.",
  },
  {
    id: "create-goal",
    question: "How do I create or update a savings goal?",
    answer:
      "Open the Goals tab, create a new savings goal, then add contributions from the goal details screen. From there you can also edit, archive, restore, or remove contributions.",
  },
  {
    id: "payment-methods",
    question: "How do I manage my payment methods?",
    answer:
      "Open Settings, then tap Cards & Wallets. From there you can open a bank or wallet to edit it, update a cash balance, set a default account, or delete supported payment methods.",
  },
  {
    id: "notifications",
    question: "How do notifications work?",
    answer:
      "Turn Notifications on or off in Settings. The Notifications screen shows app alerts, and you can swipe each item to mark it read or delete it.",
  },
  {
    id: "profile-security",
    question: "How do I change my profile or password?",
    answer:
      "Open Settings to edit Personal Details or Security & Password. Those are the places where the app lets you update your profile or sign-in password.",
  },
] as const;

const helpOptions: readonly HelpOption[] = [
  {
    id: "email",
    title: "Email Support",
    value: "support@eyrie.ph",
    icon: "help-circle-outline",
  },
] as const;

export default function HelpCenterModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";

  const [openFaqId, setOpenFaqId] = useState<string>("add-expense");

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
      sectionTitle: { color: isDark ? "#F8FAFC" : "#111827" },
      faqCard: {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "#E1E7EF",
      },
      faqQuestion: { color: isDark ? "#F8FAFC" : "#111827" },
      faqAnswer: { color: isDark ? "#AEBACC" : "#677385" },
      chevron: { color: isDark ? "#AEBACC" : "#677385" },
      helpCard: {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "#E1E7EF",
      },
      helpTitle: { color: isDark ? "#F8FAFC" : "#111827" },
      helpValue: { color: isDark ? "#AEBACC" : "#677385" },
      helpIconWrap: {
        backgroundColor: isDark ? "rgba(20,149,255,0.18)" : "#D9ECFF",
      },
      helpIcon: { color: colors.primary },
      footerBorder: {
        borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#D8E0EA",
      },
      footerText: { color: isDark ? "#AEBACC" : "#677385" },
    }),
    [colors.primary, isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Help Center</Text>
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
              Quick answers for the features that exist in Eyrie today.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, ui.sectionTitle]}>
            Frequently Asked Questions
          </Text>

          {faqItems.map((item) => {
            const isOpen = item.id === openFaqId;

            return (
              <Pressable
                key={item.id}
                style={[styles.faqCard, ui.faqCard]}
                onPress={() =>
                  setOpenFaqId((current) =>
                    current === item.id ? "" : item.id,
                  )
                }
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, ui.faqQuestion]}>
                    {item.question}
                  </Text>
                  <Feather
                    name={isOpen ? "chevron-down" : "chevron-right"}
                    size={18}
                    color={ui.chevron.color}
                  />
                </View>
                {isOpen ? (
                  <Text style={[styles.faqAnswer, ui.faqAnswer]}>
                    {item.answer}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}

          <Text
            style={[
              styles.sectionTitle,
              styles.helpSectionTitle,
              ui.sectionTitle,
            ]}
          >
            Need more help?
          </Text>

          {helpOptions.map((item) => (
            <View key={item.id} style={[styles.helpCard, ui.helpCard]}>
              <View style={[styles.helpIconWrap, ui.helpIconWrap]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={ui.helpIcon.color}
                />
              </View>
              <View style={styles.helpContent}>
                <Text style={[styles.helpTitle, ui.helpTitle]}>
                  {item.title}
                </Text>
                <Text style={[styles.helpValue, ui.helpValue]}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}

          <View style={[styles.footer, ui.footerBorder]}>
            <Text style={[styles.footerText, ui.footerText]}>
              App Version 2.1.0
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
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
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
  content: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    marginBottom: 12,
  },
  faqCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  faqAnswer: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
  },
  helpSectionTitle: {
    marginTop: 8,
  },
  helpCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  helpIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  helpValue: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  footer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
});
