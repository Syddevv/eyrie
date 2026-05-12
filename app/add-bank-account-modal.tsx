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
import { BANKS } from "@/constants/banks";
import { CARD_NETWORKS } from "@/constants/cardNetworks";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";
import { accountsService } from "@/src/db/services";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { emitAccountsChanged } from "@/src/lib/dbSync";

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiryDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatBalance(value: string) {
  return value.replace(/[^\d]/g, "");
}

export default function AddBankAccountModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    parentTo?: string | string[];
    selectedBank?: string | string[];
    selectedCardType?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo || "/add-bank-card-method-modal";
  const parentTo = Array.isArray(params.parentTo)
    ? params.parentTo[0]
    : params.parentTo || "/payment-methods-modal";
  const selectedBankId = Array.isArray(params.selectedBank)
    ? params.selectedBank[0]
    : params.selectedBank;
  const selectedCardTypeId = Array.isArray(params.selectedCardType)
    ? params.selectedCardType[0]
    : params.selectedCardType;

  const selectedBank = BANKS.find((bank) => bank.id === selectedBankId);
  const selectedCardType = CARD_NETWORKS.find(
    (cardType) => cardType.id === selectedCardTypeId,
  );

  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [balance, setBalance] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAddEnabled = cardholderName.trim().length > 0;
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
      label: { color: isDark ? "#F8FAFC" : "#1F2937" },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#E9EEF5",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#DCE4EE",
      },
      fieldText: { color: isDark ? "#F8FAFC" : "#202733" },
      placeholder: { color: isDark ? "#8F9CAF" : "#8A94A6" },
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
            <Text style={[styles.title, ui.title]}>Add Card</Text>
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
                pathname: returnTo,
                params: { returnTo: "/add-payment-method-modal", parentTo },
              })
            }
          >
            <Feather name="chevron-left" size={18} color={ui.backText.color} />
            <Text style={[styles.backText, ui.backText]}>Back</Text>
          </Pressable>

          <Text style={[styles.note, ui.note]}>
            For security purposes, card details are optional because your bank
            account will not be directly connected to the app.
          </Text>

          <View style={styles.selectionSummary}>
            <View style={[styles.summaryPill, ui.fieldSurface]}>
              <Text style={[styles.summaryLabel, ui.label]}>Bank</Text>
              <Text
                style={[styles.summaryValue, ui.fieldText]}
                numberOfLines={1}
              >
                {selectedBank?.name || "Not selected"}
              </Text>
            </View>

            <View style={[styles.summaryPill, ui.fieldSurface]}>
              <Text style={[styles.summaryLabel, ui.label]}>Card Type</Text>
              <Text
                style={[styles.summaryValue, ui.fieldText]}
                numberOfLines={1}
              >
                {selectedCardType?.name || "Not selected"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Card Number (Optional)</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={cardNumber}
                onChangeText={(value) => setCardNumber(formatCardNumber(value))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, ui.label]}>
                Expiry Date (Optional)
              </Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={expiryDate}
                  onChangeText={(value) =>
                    setExpiryDate(formatExpiryDate(value))
                  }
                  placeholder="MM/YY"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="number-pad"
                  selectionColor="#6DB2EE"
                  style={[styles.fieldInput, ui.fieldText]}
                />
              </View>
            </View>

            <View style={styles.halfField}>
              <Text style={[styles.label, ui.label]}>Balance</Text>
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
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Cardholder Name</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={cardholderName}
                onChangeText={(value) => setCardholderName(value.toUpperCase())}
                placeholder="JUAN DELA CRUZ"
                placeholderTextColor={ui.placeholder.color}
                autoCapitalize="characters"
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.addButton,
              isAddEnabled ? ui.button : ui.buttonDisabled,
            ]}
            onPress={async () => {
              if (!isAddEnabled) {
                showIncompleteFormAlert();
                return;
              }

              try {
                await accountsService.create({
                  userId: user?.id ?? "",
                  name: selectedBank
                    ? `${selectedBank.name} - ${cardholderName.trim()}`
                    : cardholderName.trim(),
                  type: "bank",
                  balance: Number(balance) || 0,
                  currencyCode: undefined as any,
                  color: selectedBank?.primaryColor || "#6DB2EE",
                  // store selected card network id so we can show Visa/Mastercard later
                  icon: selectedCardType?.id ?? null,
                });

                emitAccountsChanged();
              } catch (e) {
                // ignore - global feedback handled elsewhere
              }

              router.back();
            }}
          >
            <Text style={[styles.addButtonText, ui.buttonText]}>Add Card</Text>
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
    paddingBottom: 30,
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
  section: {
    marginTop: 20,
  },
  note: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  selectionSummary: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  label: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 46,
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
  row: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  balanceField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  peso: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  addButton: {
    marginTop: 24,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
