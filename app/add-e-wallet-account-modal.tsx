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

import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";
import { accountsService } from "@/src/db/services";
import { WALLETS } from "@/constants/wallets";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { emitAccountsChanged } from "@/src/lib/dbSync";
import Logo from "@/components/logo";
import { getBrandTheme } from "@/constants/brand-themes";

type WalletDetails = {
  code: string;
  name: string;
  label: string;
  color: string;
  buttonLabel: string;
};

const walletMap: Record<string, WalletDetails> = {
  gcash: {
    code: "G",
    name: "GCash",
    label: "E-Wallet",
    color: getBrandTheme({ id: "gcash" }).primary,
    buttonLabel: "Connect GCash",
  },
  maya: {
    code: "M",
    name: "Maya",
    label: "E-Wallet",
    color: getBrandTheme({ id: "maya" }).primary,
    buttonLabel: "Connect Maya",
  },
  grabpay: {
    code: "G",
    name: "GrabPay",
    label: "E-Wallet",
    color: getBrandTheme({ id: "gotyme" }).primary,
    buttonLabel: "Connect GrabPay",
  },
  shopeepay: {
    code: "S",
    name: "ShopeePay",
    label: "E-Wallet",
    color: getBrandTheme({ id: "shopeepay" }).primary,
    buttonLabel: "Connect ShopeePay",
  },
  coinsph: {
    code: "C",
    name: "Coins.ph",
    label: "E-Wallet",
    color: getBrandTheme({ id: "coinsph" }).primary,
    buttonLabel: "Connect Coins.ph",
  },
};

function formatBalance(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);

  if (!digits.length) {
    return "";
  }

  if (digits.startsWith("63")) {
    const local = digits.slice(2);
    const parts = [
      local.slice(0, 3),
      local.slice(3, 6),
      local.slice(6, 10),
    ].filter(Boolean);
    return `+63 ${parts.join(" ")}`.trim();
  }

  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 10),
  ].filter(Boolean);
  return `+${parts.join(" ")}`.trim();
}

export default function AddEWalletAccountModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    parentTo?: string | string[];
    selectedWallet?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo || "/add-e-wallet-method-modal";
  const parentTo = Array.isArray(params.parentTo)
    ? params.parentTo[0]
    : params.parentTo || "/payment-methods-modal";
  const selectedWalletId = Array.isArray(params.selectedWallet)
    ? params.selectedWallet[0]
    : params.selectedWallet || "gcash";

  const walletFromConstants = WALLETS.find((w) => w.id === selectedWalletId);
  const selectedWalletTheme = getBrandTheme({
    id: selectedWalletId,
    name: walletFromConstants?.name,
    shortName: walletFromConstants?.shortName,
  });

  const selectedWallet = walletFromConstants
    ? {
        code: (walletFromConstants.shortName || walletFromConstants.name)
          .slice(0, 2)
          .toUpperCase(),
        name: walletFromConstants.name,
        label:
          walletFromConstants.type === "digital" ? "Digital Bank" : "E-Wallet",
        color: walletFromConstants.primaryColor || selectedWalletTheme.primary,
        buttonLabel: `Connect ${walletFromConstants.name}`,
      }
    : (walletMap[selectedWalletId] ?? walletMap.gcash);

  const [accountName, setAccountName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [balance, setBalance] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isConnectEnabled = accountName.trim().length > 0;
  const { user } = useCurrentUser();

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
      backText: { color: isDark ? "#A9B6C8" : "#6B7280" },
      walletCard: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#DCEEFE",
        borderColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#B7D7FB",
      },
      walletTitle: { color: isDark ? "#F8FAFC" : "#202733" },
      walletSubtitle: { color: isDark ? "#A9B6C8" : "#6B7280" },
      label: { color: isDark ? "#F8FAFC" : "#1F2937" },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#E9EEF5",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#DCE4EE",
      },
      fieldText: { color: isDark ? "#F8FAFC" : "#202733" },
      placeholder: { color: isDark ? "#8F9CAF" : "#8A94A6" },
      hint: { color: isDark ? "#A9B6C8" : "#6B7280" },
      button: { backgroundColor: "#6DB2EE" },
      buttonDisabled: { backgroundColor: isDark ? "#31577D" : "#A9CDED" },
      buttonText: { color: "#FFFFFF" },
      peso: { color: isDark ? "#A9B6C8" : "#6B7280" },
      note: { color: isDark ? "#A9B6C8" : "#6B7280" },
    }),
    [isDark],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

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
            <Text style={[styles.title, ui.title]}>Add Wallet</Text>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <Pressable
            style={styles.backRow}
            onPress={() =>
              router.replace({
                pathname: returnTo as any,
                params: {
                  returnTo: "/add-payment-method-modal",
                  parentTo,
                  selectedWallet: selectedWalletId,
                },
              })
            }
          >
            <Feather name="chevron-left" size={18} color={ui.backText.color} />
            <Text style={[styles.backText, ui.backText]}>Back</Text>
          </Pressable>

          <Text style={[styles.note, ui.note]}>
            For security purposes, phone number is optional because your
            e-wallet will not be directly connected to the app.
          </Text>

          <View style={[styles.walletCard, ui.walletCard]}>
            <Logo
              id={selectedWalletId}
              name={selectedWallet.name}
              shortName={(selectedWallet.name || "").slice(0, 2)}
              size={48}
              logo={walletFromConstants?.logo}
              backgroundColor={selectedWallet.color}
              style={{ marginRight: 12 }}
            />
            <View>
              <Text style={[styles.walletName, ui.walletTitle]}>
                {selectedWallet.name}
              </Text>
              <Text style={[styles.walletLabel, ui.walletSubtitle]}>
                {selectedWallet.label}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Account Name</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Juan Dela Cruz"
                placeholderTextColor={ui.placeholder.color}
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>
              Phone Number (Optional)
            </Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={phoneNumber}
                onChangeText={(value) =>
                  setPhoneNumber(formatPhoneNumber(value))
                }
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="phone-pad"
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.section}>
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
                placeholder="0"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
            <Text style={[styles.hint, ui.hint]}>
              Enter your current balance to track spending
            </Text>
          </View>

          <Pressable
            style={[
              styles.connectButton,
              isConnectEnabled ? ui.button : ui.buttonDisabled,
            ]}
            onPress={async () => {
              if (!isConnectEnabled) {
                showIncompleteFormAlert();
                return;
              }

              try {
                await accountsService.create({
                  userId: user?.id ?? "",
                  name: accountName.trim()
                    ? `${selectedWallet.name} - ${accountName.trim()}`
                    : selectedWallet.name,
                  type: "ewallet",
                  balance: Number(balance) || 0,
                  currencyCode: undefined as any,
                  color: selectedWallet.color,
                  icon: null,
                });

                emitAccountsChanged();
              } catch (e) {
                // ignore
              }

              router.back();
            }}
          >
            <Text style={[styles.connectButtonText, ui.buttonText]}>
              {selectedWallet.buttonLabel}
            </Text>
          </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 26,
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
    marginTop: 16,
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
  walletCard: {
    marginTop: 18,
    minHeight: 66,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  note: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  logoBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  walletName: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  walletLabel: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  section: {
    marginTop: 18,
  },
  label: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 48,
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
  hint: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  connectButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  connectButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
