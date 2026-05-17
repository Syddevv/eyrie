import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LoadingActionButton } from "@/components/loading-action-button";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAccounts } from "@/hooks/useAccounts";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { showSuccessToast } from "@/store/useToastStore";
import { accountsService } from "@/src/db/services";
import { formatCurrency } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/store/useAuthStore";
import { WALLETS } from "@/constants/wallets";
import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import Logo from "@/components/logo";
import { defaultBrandTheme, getBrandTheme } from "@/constants/brand-themes";
import { CARD_NETWORKS } from "@/constants/cardNetworks";
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

function formatDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatBalance(value: string) {
  return formatDigits(value, 10);
}

function resolveBrandName(account: any) {
  const nameLower = (account?.name || "").toLowerCase();

  const matchWallet = WALLETS.find(
    (w) =>
      (w.name && nameLower.includes(w.name.toLowerCase())) ||
      (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
      nameLower.includes(w.id),
  );

  if (matchWallet) return matchWallet.name;

  const matchBank = BANKS.find(
    (b) =>
      (b.name && nameLower.includes(b.name.toLowerCase())) ||
      (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
      nameLower.includes(b.id),
  );

  if (matchBank) return matchBank.name;

  const key = nameLower.replace(/[^a-z0-9]/g, "");
  if (LOGO_MAP[key]) return key.toUpperCase();

  if (account?.type === "ewallet") return "E-WALLET";
  if (account?.type === "cash") return "CASH";
  if (account?.type === "credit") return "Credit";

  return "Bank";
}

function resolveLogo(account: any) {
  const nameLower = (account?.name || "").toLowerCase();

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
}

function resolveCardNetworkLabel(account: any) {
  const id = account?.icon;
  if (!id) return account?.type === "credit" ? "Credit" : "Debit";
  const match = CARD_NETWORKS.find((card) => card.id === id);
  return match ? match.name : account?.type === "credit" ? "Credit" : "Debit";
}

export default function EditPaymentCardModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const { accounts, refresh } = useAccounts();
  const { showSnackbar } = useAuthStore();
  const accountId = Array.isArray(params.accountId)
    ? params.accountId[0]
    : params.accountId;
  const account = accounts.find((a) => a.id === accountId);
  const brandTheme = account ? getBrandTheme(account) : defaultBrandTheme;

  const [accountName, setAccountName] = useState(
    account?.accountHolderName ?? "",
  );
  const [accountNumber, setAccountNumber] = useState(
    account?.accountNumberLast4 ?? "",
  );
  const [balance, setBalance] = useState((account?.balance ?? 0).toString());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { isRunning: isSaving, run } = useAsyncAction();

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (account) {
      setAccountName(account.accountHolderName ?? "");
      setAccountNumber(account.accountNumberLast4 ?? "");
      setBalance((account.balance ?? 0).toString());
    }
  }, [account]);

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
      label: { color: isDark ? "#F8FAFC" : "#1F2937" },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#E2E8F0",
      },
      fieldText: { color: isDark ? "#F8FAFC" : "#202733" },
      placeholder: { color: isDark ? "#8F9CAF" : "#8A94A6" },
      peso: { color: isDark ? "#A9B6C8" : "#6B7280" },
      secondaryButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
      secondaryButtonText: { color: isDark ? "#F8FAFC" : "#111827" },
      primaryButton: { backgroundColor: "#1681DD" },
      primaryButtonText: { color: "#FFFFFF" },
    }),
    [isDark],
  );

  const returnToDetails = async () => {
    if (!account) return;

    await run(async () => {
      const brandName = resolveBrandName(account);

      await accountsService.update(
        account.id,
        {
          name: brandName,
          accountHolderName: accountName.trim() || null,
          accountNumberLast4: formatDigits(accountNumber, 16).slice(-4) || null,
          balance: parseFloat(balance) || 0,
        },
        { notifySuccess: false },
      );

      refresh();
      router.dismissTo("/payment-methods-modal");
      setTimeout(() => {
        showSuccessToast({
          title: "Card Updated",
          message: "Your card changes were saved successfully.",
          dedupeKey: `settings:card:update:${account.id}`,
          source: "settings-edit-card",
        });
      }, 240);
    }).catch(() => {
      showSnackbar("Failed to update card");
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable
          disabled={isSaving}
          style={styles.backdrop}
          onPress={() => router.back()}
        />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>
              {account ? resolveBrandName(account) : "Edit Card"}
            </Text>
            <Pressable
              disabled={isSaving}
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <Pressable
            disabled={isSaving}
            style={styles.backRow}
            onPress={() =>
              router.replace({ pathname: "/payment-methods-modal" })
            }
          >
            <Feather name="chevron-left" size={18} color={ui.backText.color} />
            <Text style={[styles.backText, ui.backText]}>Back</Text>
          </Pressable>

          <PremiumCardGradient
            theme={brandTheme}
            isDark={isDark}
            variant="card"
            style={styles.cardHero}
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
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.heroBrand}>
                  {resolveBrandName(account)}
                </Text>
              </View>

              <Text
                style={[
                  styles.heroLabel,
                  { color: withOpacity("#FFFFFF", 0.68) },
                ]}
              >
                {resolveCardNetworkLabel(account)}
              </Text>
            </View>

            <Text style={styles.heroNumber}>
              {formatDigits(accountNumber, 16).slice(-4)
                ? "* * * * * * * * * * * * " +
                  formatDigits(accountNumber, 16).slice(-4)
                : "N/A"}
            </Text>

            <View style={styles.heroBottomRow}>
              <View>
                <Text style={styles.heroMetaLabel}>BALANCE</Text>
                <Text style={styles.heroBalance}>
                  {formatCurrency(
                    parseFloat(balance) || 0,
                    account?.currencyCode,
                  )}
                </Text>
              </View>
              <View style={styles.heroExpiryBlock}>
                <Text style={styles.heroMetaLabel}>TYPE</Text>
                <Text style={styles.heroExpiry}>
                  {resolveCardNetworkLabel(account)}
                </Text>
              </View>
            </View>
          </PremiumCardGradient>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Name</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={accountName}
                onChangeText={setAccountName}
                placeholder="JUAN DELA CRUZ"
                placeholderTextColor={ui.placeholder.color}
                selectionColor="#1681DD"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Account Number</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={accountNumber}
                onChangeText={(value) =>
                  setAccountNumber(formatCardNumber(value))
                }
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#1681DD"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Current Balance</Text>
            <View
              style={[
                styles.fieldSurface,
                ui.fieldSurface,
                styles.balanceField,
              ]}
            >
              <Text style={[styles.peso, ui.peso]}>₱</Text>
              <TextInput
                value={balance}
                onChangeText={(value) => setBalance(formatBalance(value))}
                placeholder={(account?.balance ?? 0).toString()}
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#1681DD"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              disabled={isSaving}
              style={[styles.secondaryButton, ui.secondaryButton]}
              onPress={() => router.back()}
            >
              <Text
                style={[styles.secondaryButtonText, ui.secondaryButtonText]}
              >
                Cancel
              </Text>
            </Pressable>
            <LoadingActionButton
              label="Save Changes"
              loadingLabel="Saving..."
              loading={isSaving}
              haptic="default"
              style={[
                styles.primaryButton,
                ui.primaryButton,
                isSaving && { opacity: 0.5 },
              ]}
              onPress={() => void returnToDetails()}
              textStyle={[styles.primaryButtonText, ui.primaryButtonText]}
              spinnerColor={ui.primaryButtonText.color}
              leftAdornment={
                <Feather
                name="check"
                size={16}
                color={ui.primaryButtonText.color}
                />
              }
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
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
  cardHero: {
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  heroBubbleLarge: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: radius.full,
    right: -18,
    top: -10,
  },
  heroBubbleSmall: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: radius.full,
    left: -18,
    bottom: -20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.8),
  },
  heroBrand: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  heroNumber: {
    marginTop: 20,
    fontFamily: fontFamilies.mono,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    color: "#FFFFFF",
    letterSpacing: 1.8,
  },
  heroBottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroMetaLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 14,
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
  heroExpiryBlock: {
    alignItems: "flex-start",
  },
  heroExpiry: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  formSection: {
    marginTop: 14,
  },
  label: {
    marginBottom: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 44,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  balanceField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  peso: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
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
  primaryButton: {
    flex: 1,
    height: 42,
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
});
