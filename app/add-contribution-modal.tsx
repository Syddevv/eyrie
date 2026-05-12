import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { GoalAvatar } from "@/components/goal-avatar";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useSavingsGoal } from "@/hooks/useSavingsGoals";
import { goalsService } from "@/src/db/services";
import { formatCurrency, formatMonthYear } from "@/src/lib/goals";

const quickAmounts = [1000, 2500, 5000, 10000] as const;

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  return parts.length === 1
    ? parts[0]
    : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

export default function AddContributionModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { height: windowHeight } = useWindowDimensions();
  const { goal } = useSavingsGoal(goalId);
  const { methods } = usePaymentMethods();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [walletId, setWalletId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (goal?.linkedWalletId) {
      setWalletId(goal.linkedWalletId);
      return;
    }

    const defaultWallet = methods.find((method) => !method.isFallback);
    setWalletId(defaultWallet?.id ?? null);
  }, [goal?.linkedWalletId, methods]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.64)"
          : "rgba(15, 23, 42, 0.34)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(15, 23, 42, 0.04)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      amountField: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? "rgba(79, 163, 255, 0.6)" : "#9FD0FF",
      },
      quickChip: { backgroundColor: colors.secondary },
      card: {
        backgroundColor: colors.secondary,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(226,232,240,0.92)",
      },
      selectedCard: {
        backgroundColor: isDark
          ? "rgba(20,149,255,0.16)"
          : "rgba(20,149,255,0.1)",
        borderColor: colors.primary,
      },
      coachCard: {
        backgroundColor: isDark
          ? "rgba(16, 185, 129, 0.12)"
          : "rgba(16, 185, 129, 0.12)",
        borderColor: isDark ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.24)",
      },
      coachText: { color: "#10B981" },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: { backgroundColor: colors.secondary },
      primaryButtonDisabled: { backgroundColor: "#7CB8EE" },
      primaryText: { color: "#FFFFFF" },
      secondaryText: { color: colors.foreground },
      disabledText: { color: colors.mutedForeground, opacity: 0.5 },
    }),
    [colors, isDark],
  );

  const returnToGoalDetails = () => {
    if (!goal) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/goal-details-modal",
      params: { goalId: goal.id },
    });
  };

  const parsedAmount = Number(amount) || 0;

  useEffect(() => {
    if (walletId) {
      const wallet = methods.find((w) => w.id === walletId);
      if (
        wallet &&
        !wallet.isFallback &&
        wallet.kind !== "credit" &&
        parsedAmount > wallet.balance
      ) {
        setWalletId(null);
      }
    }
  }, [parsedAmount, walletId, methods]);

  const selectedWallet =
    methods.find((method) => method.id === walletId) ?? null;
  const isAddEnabled = parsedAmount > 0;
  const isKeyboardOpen = keyboardHeight > 0;
  const maxSheetHeight = Math.min(
    windowHeight * 0.82,
    Math.max(280, windowHeight - keyboardHeight - 18),
  );

  const closeContributionFlow = () => {
    router.back();
  };

  const submitContribution = async (allowOverdraft = false) => {
    setIsSaving(true);
    try {
      if (!goal) throw new Error("Goal not found");
      await goalsService.createContribution({
        goalId: goal.id,
        walletId,
        amount: parsedAmount,
        note: note.trim() || null,
        allowOverdraft,
      });
      await Haptics.notificationAsync(
        goal.currentAmount + parsedAmount >= goal.targetAmount
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      returnToGoalDetails();
    } catch (error) {
      Alert.alert(
        "Unable to add contribution",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    if (!isAddEnabled) {
      Alert.alert(
        "Contribution required",
        "Enter a contribution amount before continuing.",
      );
      return;
    }

    if (
      selectedWallet &&
      !selectedWallet.isFallback &&
      selectedWallet.kind !== "credit" &&
      parsedAmount > selectedWallet.balance
    ) {
      Alert.alert(
        "Contribution is larger than this wallet balance",
        `You are about to move ${formatCurrency(parsedAmount)} from ${selectedWallet.label}, but it currently has ${selectedWallet.balanceLabel}. Continue anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => void submitContribution(true) },
        ],
      );
      return;
    }

    void submitContribution(false);
  };

  if (!goal) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={closeContributionFlow} />
        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            { maxHeight: maxSheetHeight },
            isKeyboardOpen && styles.sheetCompact,
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <View style={styles.headerIdentity}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: `${goal.color ?? "#1495FF"}22` },
                ]}
              >
                <GoalAvatar goal={goal} size={24} />
              </View>
              <View>
                <Text style={[styles.headerTitle, ui.title]}>{goal.title}</Text>
                <View style={styles.targetRow}>
                  <Feather
                    name="calendar"
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[styles.targetText, ui.muted]}
                  >{`Target ${formatMonthYear(goal.targetDate)}`}</Text>
                </View>
              </View>
            </View>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={closeContributionFlow}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              isKeyboardOpen
                ? styles.scrollContentCompact
                : styles.scrollContent
            }
          >
            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>
                Contribution amount
              </Text>
              <View
                style={[
                  styles.amountField,
                  ui.amountField,
                  isKeyboardOpen && styles.amountFieldCompact,
                ]}
              >
                <Text style={[styles.currencyMark, ui.muted]}>₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={(value) =>
                    setAmount(sanitizeAmountInput(value))
                  }
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                  style={[
                    styles.amountInput,
                    ui.title,
                    isKeyboardOpen && styles.amountInputCompact,
                  ]}
                />
              </View>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.quickLabel, ui.muted]}>Quick add</Text>
              <View
                style={[
                  styles.quickRow,
                  isKeyboardOpen && styles.quickRowCompact,
                ]}
              >
                {quickAmounts.map((quickAmount) => (
                  <Pressable
                    key={quickAmount}
                    style={[
                      styles.quickChip,
                      ui.quickChip,
                      isKeyboardOpen && styles.quickChipCompact,
                    ]}
                    onPress={() => setAmount(String(quickAmount))}
                  >
                    <Text style={[styles.quickChipText, ui.title]}>
                      {formatCurrency(quickAmount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Source wallet</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.walletRow}
              >
                <Pressable
                  style={[
                    styles.walletChip,
                    styles.walletChipManual,
                    ui.card,
                    isKeyboardOpen && styles.walletChipCompact,
                    isKeyboardOpen && styles.walletChipManualCompact,
                    walletId === null && ui.selectedCard,
                  ]}
                  onPress={() => setWalletId(null)}
                >
                  <Text style={[styles.walletChipText, ui.title]}>
                    Manual only
                  </Text>
                  <Text style={[styles.walletChipSubtext, ui.muted]}>
                    Does not deduct from a wallet
                  </Text>
                </Pressable>
                {methods
                  .filter((method) => !method.isFallback)
                  .map((method) => {
                    const isInsufficient =
                      method.kind !== "credit" && parsedAmount > method.balance;

                    return (
                      <Pressable
                        key={method.id}
                        style={[
                          styles.walletChip,
                          ui.card,
                          isKeyboardOpen && styles.walletChipCompact,
                          walletId === method.id && ui.selectedCard,
                          isInsufficient && styles.walletChipDisabled,
                        ]}
                        onPress={() => {
                          if (!isInsufficient) {
                            setWalletId(method.id);
                          }
                        }}
                        disabled={isInsufficient}
                      >
                        <Text
                          style={[
                            styles.walletChipText,
                            ui.title,
                            isInsufficient && ui.disabledText,
                          ]}
                        >
                          {method.label}
                        </Text>
                        <Text
                          style={[
                            styles.walletChipSubtext,
                            ui.muted,
                            isInsufficient && styles.insufficientText,
                          ]}
                        >
                          {isInsufficient
                            ? "Insufficient funds"
                            : method.balanceLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Salary top-up, bonus, spare cash..."
                placeholderTextColor={colors.mutedForeground}
                selectionColor={colors.primary}
                style={[
                  styles.noteField,
                  ui.card,
                  ui.title,
                  isKeyboardOpen && styles.noteFieldCompact,
                ]}
              />
            </View>

            <View
              style={[
                styles.coachCard,
                ui.coachCard,
                isKeyboardOpen && styles.coachCardCompact,
              ]}
            >
              <Text style={[styles.coachText, ui.coachText]}>
                {walletId
                  ? "This moves money into your goal without affecting expense analytics."
                  : "Manual contributions update goal progress without touching any wallet balance."}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footerActions}>
            <Pressable
              style={[styles.footerButton, ui.secondaryButton]}
              onPress={closeContributionFlow}
            >
              <Text style={[styles.footerButtonText, ui.secondaryText]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.footerButton,
                ui.primaryButton,
                !isAddEnabled && ui.primaryButtonDisabled,
              ]}
              onPress={handleAdd}
              disabled={isSaving}
            >
              <Text style={[styles.footerButtonText, ui.primaryText]}>
                {isSaving
                  ? "Adding..."
                  : `Add ${formatCurrency(parsedAmount || 0)}`}
              </Text>
            </Pressable>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderWidth: 1,
  },
  sheetCompact: { paddingHorizontal: 18, paddingBottom: 16 },
  handle: {
    alignSelf: "center",
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  targetRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetText: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: 18 },
  sectionCompact: { marginTop: 12 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  amountField: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountFieldCompact: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    paddingVertical: 0,
  },
  amountInputCompact: { fontSize: 18, lineHeight: 22 },
  quickLabel: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18 },
  quickRow: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickRowCompact: { marginTop: 8, gap: 6 },
  quickChip: {
    minHeight: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  quickChipCompact: { minHeight: 30, borderRadius: 14, paddingHorizontal: 10 },
  quickChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  walletRow: { gap: 10, paddingRight: 12 },
  walletChip: {
    minWidth: 150,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  walletChipDisabled: {
    opacity: 0.5,
  },
  walletChipManual: { minWidth: 122, maxWidth: 168 },
  walletChipCompact: {
    minWidth: 130,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  walletChipManualCompact: { minWidth: 112, maxWidth: 148 },
  walletChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  walletChipSubtext: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  insufficientText: {
    color: "#EF4444",
  },
  noteField: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  noteFieldCompact: {
    minHeight: 42,
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: 14,
  },
  coachCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  coachCardCompact: { marginTop: 12, borderRadius: 18, paddingVertical: 10 },
  coachText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  footerActions: { marginTop: 16, flexDirection: "row", gap: 12 },
  footerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "transparent",
    elevation: 0,
  },
  footerButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  scrollContent: { paddingBottom: 4 },
  scrollContentCompact: { paddingBottom: 4 },
});
