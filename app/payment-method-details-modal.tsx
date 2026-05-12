import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getHomePaymentMethod } from "@/constants/payment-methods";
import { defaultBrandTheme, getBrandTheme } from "@/constants/brand-themes";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PremiumCardGradient } from "@/components/premium-card-gradient";

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

const detailRows = [
  { key: "accountName", label: "Account Name" },
  { key: "balance", label: "Balance" },
  { key: "accountNumberLabel", label: "Account Number" },
  { key: "detailType", label: "Type" },
] as const;

export default function PaymentMethodDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ methodId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const methodId = Array.isArray(params.methodId)
    ? params.methodId[0]
    : params.methodId;
  const method = getHomePaymentMethod(methodId);
  const brandTheme =
    getBrandTheme({ id: method.id, name: method.name }) ?? defaultBrandTheme;

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.62)"
          : "rgba(15, 23, 42, 0.34)",
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
      detailCard: {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7",
      },
      detailLabel: { color: isDark ? "#AAB7C9" : "#6B7280" },
      detailValue: { color: isDark ? "#F8FAFC" : "#111827" },
      balanceValue: { color: "#0E7CEB" },
    }),
    [isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>{method.name}</Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <PremiumCardGradient
          theme={brandTheme}
          isDark={isDark}
          variant={method.kind === "card" ? "card" : "wallet"}
          style={styles.accountCard}
        >
          <View style={styles.cardTopRow}>
            <View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: withOpacity(brandTheme.text, 0.72) },
                ]}
              >
                {method.label}
              </Text>
              <Text style={[styles.cardName, { color: brandTheme.text }]}>
                {method.name}
              </Text>
            </View>
            <View
              style={[
                styles.cardBadge,
                {
                  backgroundColor: withOpacity(
                    brandTheme.text,
                    isDark ? 0.14 : 0.18,
                  ),
                },
              ]}
            />
          </View>

          <Text style={[styles.cardAmount, { color: brandTheme.text }]}>
            {method.amount}
          </Text>

          {method.kind === "card" ? (
            <View style={styles.cardBottomRow}>
              <Text
                style={[
                  styles.cardDigits,
                  { color: withOpacity(brandTheme.text, 0.82) },
                ]}
              >
                •••• •••• •••• {method.digits}
              </Text>
              <Text
                style={[
                  styles.cardType,
                  { color: withOpacity(brandTheme.text, 0.7) },
                ]}
              >
                {method.cardTypeLabel}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.walletType,
                { color: withOpacity(brandTheme.text, 0.74) },
              ]}
            >
              {method.cardTypeLabel}
            </Text>
          )}
        </PremiumCardGradient>

        <View style={styles.detailList}>
          {detailRows.map((row) => {
            const value = method[row.key];
            const valueStyle =
              row.key === "balance" ? ui.balanceValue : ui.detailValue;

            return (
              <View key={row.key} style={[styles.detailCard, ui.detailCard]}>
                <Text style={[styles.detailLabel, ui.detailLabel]}>
                  {row.label}
                </Text>
                <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
              </View>
            );
          })}
        </View>
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
    paddingBottom: 22,
  },
  handle: {
    alignSelf: "center",
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  accountCard: {
    minHeight: 160,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: "hidden",
  },
  cardBubbleLarge: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: radius.full,
    top: -4,
    right: -14,
  },
  cardBubbleSmall: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: radius.full,
    right: -14,
    bottom: -10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.72),
  },
  cardName: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  cardBadge: {
    width: 40,
    height: 28,
    borderRadius: 6,
  },
  cardAmount: {
    marginTop: 28,
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  cardBottomRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDigits: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    letterSpacing: 1.4,
    color: withOpacity("#FFFFFF", 0.82),
  },
  cardType: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.68),
  },
  walletType: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.74),
  },
  detailList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 46,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  detailValue: {
    flexShrink: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    textAlign: "right",
  },
});
