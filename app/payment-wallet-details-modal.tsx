import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAccounts } from "@/hooks/useAccounts";
import { WALLETS } from "@/constants/wallets";
import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import Logo from "@/components/logo";
import { CARD_NETWORKS } from "@/constants/cardNetworks";
import { formatCurrency } from "@/hooks/use-dashboard";
import { defaultBrandTheme, getBrandTheme } from "@/constants/brand-themes";
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

function formatLastUpdated(dateValue?: string | null) {
  if (!dateValue) return "Recently";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function PaymentWalletDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    accountId?: string | string[];
    hideActions?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const { accounts } = useAccounts();
  const accountId = Array.isArray(params.accountId)
    ? params.accountId[0]
    : params.accountId;
  const hideActions = Array.isArray(params.hideActions)
    ? params.hideActions[0] === "1"
    : params.hideActions === "1";
  const account = accounts.find((a) => a.id === accountId);
  const brandTheme = account ? getBrandTheme(account) : defaultBrandTheme;

  const resolveBrandName = (acct: any) => {
    const nameLower = (acct?.name || "").toLowerCase();

    let matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );
    if (matchWallet) return matchWallet.name;

    let matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );
    if (matchBank) return matchBank.name;

    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return key.toUpperCase();

    if (acct?.type === "ewallet") return "E-WALLET";
    if (acct?.type === "cash") return "CASH";

    return acct?.type === "credit" ? "Credit" : "Bank";
  };

  const resolveLogo = (acct: any) => {
    const nameLower = (acct?.name || "").toLowerCase();

    const matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );
    if (matchWallet?.logo) return matchWallet.logo;

    const matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );
    if (matchBank?.logo) return matchBank.logo;

    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return LOGO_MAP[key];

    return undefined;
  };

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
      backText: { color: isDark ? "#A9B6C8" : "#6B7280" },
      detailCard: {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7",
      },
      detailLabel: { color: isDark ? "#AAB7C9" : "#6B7280" },
      detailValue: { color: isDark ? "#F8FAFC" : "#111827" },
      balanceValue: { color: "#0E7CEB" },
      statusValue: { color: isDark ? "#A9B6C8" : "#6B7280" },
      actionButton: { backgroundColor: "#1681DD" },
      actionText: { color: "#FFFFFF" },
      secondaryButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
      secondaryButtonText: { color: isDark ? "#F8FAFC" : "#111827" },
    }),
    [isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>
            {resolveBrandName(account)}
          </Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        {!hideActions ? (
          <Pressable
            style={styles.backRow}
            onPress={() => router.replace("/payment-methods-modal")}
          >
            <Feather name="chevron-left" size={18} color={ui.backText.color} />
            <Text style={[styles.backText, ui.backText]}>Back</Text>
          </Pressable>
        ) : null}

        <PremiumCardGradient
          theme={brandTheme}
          isDark={isDark}
          variant="wallet"
          style={styles.walletHero}
        >
          <View style={styles.heroTopRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Logo
                size={44}
                logo={resolveLogo(account)}
                name={resolveBrandName(account)}
                backgroundColor={brandTheme.primary}
              />
              <Text style={[styles.heroLabel, { color: brandTheme.text }]}>
                {resolveBrandName(account)}
              </Text>
            </View>
          </View>

          <View style={styles.heroBalanceBlock}>
            <Text
              style={[
                styles.heroMetaLabel,
                { color: withOpacity(brandTheme.text, 0.72) },
              ]}
            >
              BALANCE
            </Text>
            <Text style={[styles.heroBalance, { color: brandTheme.text }]}>
              {formatCurrency(account?.balance ?? 0, account?.currencyCode)}
            </Text>
          </View>
        </PremiumCardGradient>

        <View style={styles.detailList}>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Balance</Text>
            <Text style={[styles.detailValue, ui.balanceValue]}>
              {formatCurrency(account?.balance ?? 0, account?.currencyCode)}
            </Text>
          </View>
          {hideActions ? (
            <View style={[styles.detailCard, ui.detailCard]}>
              <Text style={[styles.detailLabel, ui.detailLabel]}>
                Last updated
              </Text>
              <Text style={[styles.detailValue, ui.detailValue]}>
                {formatLastUpdated(account?.updatedAt)}
              </Text>
            </View>
          ) : null}
        </View>

        {!hideActions ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.primaryButton, ui.actionButton]}
              onPress={() =>
                router.replace({
                  pathname: "/edit-payment-wallet-modal",
                  params: { accountId: account?.id },
                })
              }
            >
              <Feather name="edit-2" size={16} color={ui.actionText.color} />
              <Text style={[styles.primaryButtonText, ui.actionText]}>
                Edit Details
              </Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, ui.secondaryButton]}>
              <Text style={[styles.secondaryButtonText, ui.secondaryButtonText]}>
                Set as Default
              </Text>
            </Pressable>
          </View>
        ) : null}
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
    paddingBottom: 6,
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
  backRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
  },
  backText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  walletHero: {
    marginTop: 22,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: "hidden",
  },
  heroBubbleLarge: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: radius.full,
    top: -8,
    right: -20,
  },
  heroBubbleSmall: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: radius.full,
    left: -24,
    bottom: -20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.8),
  },
  heroBrand: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  heroBalanceBlock: {
    marginTop: 26,
  },
  heroMetaLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.72),
  },
  heroBalance: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  detailList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 44,
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
    fontWeight: fontWeights.medium,
    textAlign: "right",
  },
  actionsRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
