import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useMerchantsByCategory } from "@/hooks/useMerchantsByCategory";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreateExpense } from "@/hooks/useCreateExpense";
import { useCreateIncome } from "@/hooks/useCreateIncome";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";

type EntryType = "expense" | "income";

type CategoryOption = {
  id: string;
  label: string;
  icon: string;
};

const PRIMARY_EXPENSE_CATEGORY_LIMIT = 9;
const OTHER_CATEGORY_LABEL = "Other";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date) {
  const now = new Date();

  if (isSameDay(date, now)) {
    return "Today";
  }

  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  );
  const leadingDays = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    const date = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      index - leadingDays + 1,
    );
    cells.push({ key: `prev-${index}`, date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    cells.push({ key: `current-${day}`, date, inMonth: true });
  }

  const remainder = cells.length % 7;

  if (remainder !== 0) {
    const trailing = 7 - remainder;

    for (let index = 1; index <= trailing; index += 1) {
      const date = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        index,
      );
      cells.push({ key: `next-${index}`, date, inMonth: false });
    }
  }

  return cells;
}

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function CategoryIcon({
  option,
  color,
}: {
  option: CategoryOption;
  color: string;
}) {
  return (
    <MaterialCommunityIcons name={option.icon as any} size={14} color={color} />
  );
}

export default function AddTransactionModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";

  // Transaction creation hooks
  const { create: createExpense, isLoading: isCreatingExpense } =
    useCreateExpense();
  const { create: createIncome, isLoading: isCreatingIncome } =
    useCreateIncome();

  const { categories: expenseCategories } = useExpenseCategories();
  const { categories: incomeCategories } = useIncomeCategories();
  const { methods: paymentMethods } = usePaymentMethods();

  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<
    string | null
  >(null);
  const [selectedExpenseCategoryLabel, setSelectedExpenseCategoryLabel] =
    useState<string | null>(null);
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<
    string | null
  >(null);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [showAllExpenseCategories, setShowAllExpenseCategories] =
    useState(false);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const merchantFade = useRef(new Animated.Value(0)).current;

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

  // Validate selected category is still valid when categories load
  useEffect(() => {
    if (entryType !== "expense") {
      return;
    }

    if (
      selectedExpenseCategoryId &&
      !expenseCategories.some(
        (category) => category.id === selectedExpenseCategoryId,
      )
    ) {
      setSelectedExpenseCategoryId(null);
      setSelectedExpenseCategoryLabel(null);
    }
  }, [entryType, expenseCategories, selectedExpenseCategoryId]);

  useEffect(() => {
    setSelectedIncomeCategory((current) => {
      if (
        current &&
        incomeCategories.some((category) => category.id === current)
      ) {
        return current;
      }

      return incomeCategories[0]?.id ?? null;
    });
  }, [incomeCategories]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const selectedAmount = Number(amount) || 0;
  const expensePrimaryCategories = useMemo(
    () => expenseCategories.slice(0, PRIMARY_EXPENSE_CATEGORY_LIMIT),
    [expenseCategories],
  );
  const expenseOtherCategories = useMemo(
    () => expenseCategories.slice(PRIMARY_EXPENSE_CATEGORY_LIMIT),
    [expenseCategories],
  );
  const selectedExpenseCategory =
    expenseCategories.find(
      (category) => category.id === selectedExpenseCategoryId,
    ) ?? null;
  const incomeCategoryOptions = useMemo<CategoryOption[]>(
    () =>
      incomeCategories.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
      })),
    [incomeCategories],
  );
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0] ??
    null;
  const showMerchantSection =
    entryType === "expense" && Boolean(selectedExpenseCategoryLabel);
  const selectedExpensePaymentMethodIsInsufficient =
    entryType === "expense" &&
    Boolean(selectedPaymentMethod) &&
    !selectedPaymentMethod?.isFallback &&
    selectedPaymentMethod?.kind !== "credit" &&
    selectedAmount > (selectedPaymentMethod?.balance ?? 0);
  const isExpenseFormValid =
    entryType !== "expense" ||
    (Boolean(selectedExpenseCategoryId) && Boolean(selectedPaymentMethodId));
  const isIncomeFormValid =
    entryType !== "income" ||
    (Boolean(selectedIncomeCategory) && Boolean(selectedPaymentMethodId));
  const activeCategories =
    entryType === "expense" ? expensePrimaryCategories : incomeCategoryOptions;
  const activeExpenseCategory =
    entryType === "expense" ? selectedExpenseCategory : null;
  const activePaymentMethod = selectedPaymentMethod;
  const merchantOptions = useMerchantsByCategory(
    selectedExpenseCategoryLabel ?? activeExpenseCategory?.label,
  );
  const selectedMerchantOption =
    merchantOptions.find((merchant) => merchant.id === selectedMerchant) ?? null;
  const isExpenseSaveBlockedByInsufficientBalance = Boolean(
    selectedExpensePaymentMethodIsInsufficient,
  );
  const insufficientBalanceMessage =
    selectedExpensePaymentMethodIsInsufficient
      ? "Selected account does not have enough balance for this expense."
      : null;
  const isSaveEnabled =
    selectedAmount > 0 &&
    (entryType === "income"
      ? isIncomeFormValid
      : isExpenseFormValid && !isExpenseSaveBlockedByInsufficientBalance);

  useEffect(() => {
    if (!showMerchantSection || !merchantOptions.length) {
      setSelectedMerchant(null);
      return;
    }

    setSelectedMerchant((current) => {
      if (
        current &&
        merchantOptions.some((merchant) => merchant.id === current)
      ) {
        return current;
      }

      return null;
    });
  }, [merchantOptions, showMerchantSection]);

  useEffect(() => {
    if (!paymentMethods.length) {
      setSelectedPaymentMethodId(null);
      return;
    }

    setSelectedPaymentMethodId((current) => {
      if (current && paymentMethods.some((method) => method.id === current)) {
        return current;
      }

      return paymentMethods[0]?.id ?? null;
    });
  }, [paymentMethods]);

  useEffect(() => {
    if (showMerchantSection) {
      merchantFade.setValue(0);
      Animated.timing(merchantFade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    merchantFade.setValue(0);
  }, [merchantFade, showMerchantSection]);

  // Debug logging
  useEffect(() => {
    console.log("[Modal Debug]", {
      entryType,
      selectedExpenseCategoryId,
      selectedExpenseCategoryLabel,
      showMerchantSection,
      merchantOptionsCount: merchantOptions.length,
    });
  }, [
    entryType,
    selectedExpenseCategoryId,
    selectedExpenseCategoryLabel,
    showMerchantSection,
    merchantOptions.length,
  ]);

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.72)"
          : "rgba(15, 23, 42, 0.32)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15, 23, 42, 0.04)",
      },
      handle: { backgroundColor: isDark ? "#475569" : "#CBD5E1" },
      title: { color: colors.foreground },
      closeButton: {
        backgroundColor: colors.secondary,
      },
      closeIcon: { color: colors.mutedForeground },
      segmentWrap: {
        backgroundColor: colors.secondary,
      },
      segmentText: { color: colors.mutedForeground },
      segmentActive: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.08)",
      },
      amountLabel: { color: colors.mutedForeground },
      amountText: { color: colors.foreground },
      amountPlaceholder: { color: isDark ? "#64748B" : "#A3ACBA" },
      fieldLabel: { color: colors.mutedForeground },
      chip: {
        backgroundColor: colors.secondary,
        borderColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(148, 163, 184, 0.18)",
      },
      chipText: { color: colors.foreground },
      chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      chipActiveText: { color: "#FFFFFF" },
      pillSurface: {
        backgroundColor: colors.secondary,
        borderColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(148, 163, 184, 0.14)",
      },
      textInput: {
        backgroundColor: colors.secondary,
        color: colors.foreground,
        borderColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(148, 163, 184, 0.14)",
      },
      valueText: { color: colors.foreground },
      placeholderText: { color: colors.mutedForeground },
      iconTint: colors.mutedForeground,
      mutedValue: { color: colors.mutedForeground },
      saveButton: {
        backgroundColor: colors.primary,
      },
      saveButtonDisabled: {
        backgroundColor: isDark ? "#31577D" : "#A9CDED",
      },
      divider: {
        borderTopColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(148, 163, 184, 0.16)",
      },
      dropdownItemBorder: {
        borderBottomColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(148, 163, 184, 0.16)",
      },
      calendarCard: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.08)",
      },
      mutedCalendarText: { color: colors.mutedForeground },
      todayRing: { borderColor: colors.primary },
      dayOutsideText: { color: isDark ? "#475569" : "#B2BCCB" },
      dropdownItemMuted: { color: colors.mutedForeground },
    }),
    [colors, isDark],
  );

  const saveLabel = entryType === "expense" ? "Save Expense" : "Save Income";
  const title = entryType === "expense" ? "Add Expense" : "Add Income";
  const accountFieldLabel =
    entryType === "expense" ? "Payment Method" : "Receiving Account";
  const accountRequiredMessage =
    entryType === "expense"
      ? "Please select a payment method"
      : "Please select a receiving account";

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
            <Text style={[styles.title, ui.title]}>{title}</Text>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={[styles.segmentWrap, ui.segmentWrap]}>
            <Pressable
              style={[
                styles.segmentButton,
                entryType === "expense" && styles.segmentButtonActive,
                entryType === "expense" && ui.segmentActive,
              ]}
              onPress={() => setEntryType("expense")}
            >
              <Text
                style={[
                  styles.segmentText,
                  ui.segmentText,
                  entryType === "expense" && styles.segmentTextActive,
                  entryType === "expense" && ui.valueText,
                ]}
              >
                Expense
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentButton,
                entryType === "income" && styles.segmentButtonActive,
                entryType === "income" && ui.segmentActive,
              ]}
              onPress={() => setEntryType("income")}
            >
              <Text
                style={[
                  styles.segmentText,
                  ui.segmentText,
                  entryType === "income" && styles.segmentTextActive,
                  entryType === "income" && ui.valueText,
                ]}
              >
                Income
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, ui.amountLabel]}>Amount</Text>
              <View style={styles.amountField}>
                <Text style={[styles.currencyMark, ui.amountText]}>₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={(value) =>
                    setAmount(sanitizeAmountInput(value))
                  }
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, ui.amountText]}
                  placeholder="0.00"
                  placeholderTextColor={ui.amountPlaceholder.color}
                  selectionColor={colors.primary}
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {activeCategories.map((option) => {
                  const isActive =
                    entryType === "expense"
                      ? selectedExpenseCategoryId === option.id
                      : selectedIncomeCategory === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.categoryChip,
                        ui.chip,
                        isActive && ui.chipActive,
                      ]}
                      onPress={() => {
                        if (entryType === "expense") {
                          setSelectedExpenseCategoryId(option.id);
                          setSelectedExpenseCategoryLabel(option.label);
                          setShowAllExpenseCategories(false);
                        } else {
                          setSelectedIncomeCategory(option.id);
                        }
                      }}
                    >
                      <CategoryIcon
                        option={option}
                        color={isActive ? "#FFFFFF" : ui.iconTint}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          ui.chipText,
                          isActive && ui.chipActiveText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}

                {entryType === "expense" && expenseOtherCategories.length ? (
                  <Pressable
                    style={[
                      styles.categoryChip,
                      ui.chip,
                      showAllExpenseCategories && ui.chipActive,
                    ]}
                    onPress={() =>
                      setShowAllExpenseCategories((current) => !current)
                    }
                  >
                    <Feather
                      name="more-horizontal"
                      size={14}
                      color={showAllExpenseCategories ? "#FFFFFF" : ui.iconTint}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        ui.chipText,
                        showAllExpenseCategories && ui.chipActiveText,
                      ]}
                    >
                      {OTHER_CATEGORY_LABEL}
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>

              {entryType === "expense" &&
              showAllExpenseCategories &&
              expenseOtherCategories.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.categoryRow,
                    styles.categoryRowSecondary,
                  ]}
                >
                  {expenseOtherCategories.map((option) => {
                    const isActive = selectedExpenseCategoryId === option.id;

                    return (
                      <Pressable
                        key={option.id}
                        style={[
                          styles.categoryChip,
                          ui.chip,
                          isActive && ui.chipActive,
                        ]}
                        onPress={() => {
                          setSelectedExpenseCategoryId(option.id);
                          setSelectedExpenseCategoryLabel(option.label);
                          setShowAllExpenseCategories(true);
                        }}
                      >
                        <CategoryIcon
                          option={option}
                          color={isActive ? "#FFFFFF" : ui.iconTint}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            ui.chipText,
                            isActive && ui.chipActiveText,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>

            {entryType === "expense" && showMerchantSection ? (
              <Animated.View
                style={[
                  styles.section,
                  {
                    opacity: merchantFade,
                    transform: [
                      {
                        translateY: merchantFade.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>
                  Merchant (optional)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.merchantRow}
                >
                  {merchantOptions.map((merchant) => {
                    const isActive = selectedMerchant === merchant.id;

                    return (
                      <Pressable
                        key={merchant.id}
                        style={[
                          styles.merchantChip,
                          ui.pillSurface,
                          isActive && styles.merchantChipActive,
                          isActive && { borderColor: colors.primary },
                        ]}
                        onPress={() =>
                          setSelectedMerchant((current) =>
                            current === merchant.id ? null : merchant.id,
                          )
                        }
                      >
                        <View
                          style={[
                            styles.merchantBadge,
                            { backgroundColor: merchant.color },
                          ]}
                        >
                          {merchant.icon ? (
                            <MaterialCommunityIcons
                              name={merchant.icon as any}
                              size={14}
                              color={merchant.textColor ?? "#FFFFFF"}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.merchantBadgeText,
                                { color: merchant.textColor ?? "#FFFFFF" },
                              ]}
                            >
                              {merchant.initials}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.merchantText, ui.chipText]}>
                          {merchant.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            ) : entryType === "income" ? (
              <View style={styles.section}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>
                  Source (optional)
                </Text>
                <TextInput
                  value={source}
                  onChangeText={setSource}
                  placeholder="Enter salary source"
                  placeholderTextColor={ui.placeholderText.color}
                  style={[
                    styles.textInput,
                    styles.singleLineInput,
                    ui.textInput,
                  ]}
                  selectionColor={colors.primary}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>
                {accountFieldLabel}
              </Text>
              <Pressable
                style={[styles.selectField, ui.pillSurface]}
                onPress={() => {
                  if (paymentMethods.length > 1) {
                    setIsPaymentMethodsOpen((current) => !current);
                  }
                }}
              >
                <Text style={[styles.selectValue, ui.valueText]}>
                  {activePaymentMethod?.label ?? "Cash"}
                </Text>
                <Feather name="chevron-down" size={18} color={ui.iconTint} />
              </Pressable>

              {isPaymentMethodsOpen && paymentMethods.length > 1 ? (
                <View
                  style={[styles.methodDropdown, ui.pillSurface, shadows.card]}
                >
                  {paymentMethods.map((method, index) => {
                    const isSelected = method.id === activePaymentMethod?.id;
                    const isInsufficient =
                      entryType === "expense" &&
                      !method.isFallback &&
                      method.kind !== "credit" &&
                      selectedAmount > method.balance;
                    const isLast = index === paymentMethods.length - 1;

                    return (
                      <Pressable
                        key={method.id}
                        style={[
                          styles.methodItem,
                          !isLast && styles.methodItemBorder,
                          !isLast && ui.dropdownItemBorder,
                          isInsufficient && styles.methodItemDisabled,
                        ]}
                        disabled={isInsufficient}
                        onPress={() => {
                          setSelectedPaymentMethodId(method.id);
                          setIsPaymentMethodsOpen(false);
                        }}
                      >
                        <View style={styles.methodItemLeft}>
                          <View
                            style={[
                              styles.methodBadge,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary
                                  : colors.secondary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.methodBadgeText,
                                {
                                  color: isSelected
                                    ? "#FFFFFF"
                                    : colors.foreground,
                                },
                              ]}
                            >
                              {method.kind === "virtual-cash"
                                ? "C"
                                : method.label.charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.methodTextBlock}>
                            <Text style={[styles.methodTitle, ui.valueText]}>
                              {method.label}
                            </Text>
                            <Text
                              style={[
                                styles.methodSubtitle,
                                ui.placeholderText,
                              ]}
                            >
                              {method.sublabel ??
                                (method.isFallback ? "Cash" : "Active account")}
                            </Text>
                            <Text
                              style={[
                                styles.methodBalanceText,
                                ui.valueText,
                                isInsufficient &&
                                  styles.methodBalanceTextDanger,
                              ]}
                            >
                              {method.balanceLabel}
                            </Text>
                            {isInsufficient ? (
                              <Text
                                style={[
                                  styles.methodAvailabilityText,
                                  styles.methodBalanceTextDanger,
                                ]}
                              >
                                Insufficient balance
                              </Text>
                            ) : method.isFallback ? (
                              <Text
                                style={[
                                  styles.methodAvailabilityText,
                                  ui.dropdownItemMuted,
                                ]}
                              >
                                Cash will be created automatically
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {isSelected ? (
                          <Feather
                            name="check"
                            size={16}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {insufficientBalanceMessage ? (
                <Text
                  style={[
                    styles.inlineWarningMessage,
                    { color: colors.destructive ?? "#EF4444" },
                  ]}
                >
                  {insufficientBalanceMessage}
                </Text>
              ) : null}
            </View>

            <View style={styles.inlineFieldsRow}>
              <Pressable
                style={[styles.dateField, ui.pillSurface]}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={[styles.selectPlaceholder, ui.placeholderText]}>
                  Date
                </Text>
                <View style={styles.dateValueRow}>
                  <Text style={[styles.selectValue, ui.valueText]}>
                    {formatDateLabel(selectedDate)}
                  </Text>
                  <Feather name="calendar" size={16} color={ui.iconTint} />
                </View>
              </Pressable>
            </View>

            <View style={styles.notesSection}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes (optional)"
                placeholderTextColor={ui.placeholderText.color}
                multiline
                textAlignVertical="top"
                style={[styles.textInput, styles.notesInput, ui.textInput]}
                selectionColor={colors.primary}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, ui.divider]}>
            <Pressable
              style={[
                styles.saveButton,
                !isSaveEnabled || isCreatingExpense || isCreatingIncome
                  ? ui.saveButtonDisabled
                  : ui.saveButton,
              ]}
              disabled={
                !isSaveEnabled ||
                isCreatingExpense ||
                isCreatingIncome ||
                isExpenseSaveBlockedByInsufficientBalance
              }
              onPress={async () => {
                if (!isSaveEnabled) {
                  showIncompleteFormAlert();
                  return;
                }

                setErrorMessage(null);

                try {
                  if (entryType === "expense") {
                    // Validate expense fields
                    if (!selectedExpenseCategoryId) {
                      setErrorMessage("Please select a category");
                      return;
                    }

                    if (!selectedPaymentMethodId) {
                      setErrorMessage(accountRequiredMessage);
                      return;
                    }

                    if (selectedExpensePaymentMethodIsInsufficient) {
                      setErrorMessage(
                        "Selected account does not have enough balance.",
                      );
                      return;
                    }

                    const result = await createExpense({
                      amount: Number(amount),
                      categoryId: selectedExpenseCategoryId,
                      accountId: selectedPaymentMethodId,
                      merchantName: selectedMerchantOption?.label ?? undefined,
                      notes: notes || undefined,
                      transactionDate: selectedDate,
                    });

                    if (!result.success) {
                      setErrorMessage(
                        result.error || "Failed to create expense",
                      );
                      return;
                    }
                  } else {
                    // Income transaction
                    if (!selectedIncomeCategory) {
                      setErrorMessage("Please select a category");
                      return;
                    }

                    if (!selectedPaymentMethodId) {
                      setErrorMessage(accountRequiredMessage);
                      return;
                    }

                    const result = await createIncome({
                      amount: Number(amount),
                      categoryId: selectedIncomeCategory,
                      accountId: selectedPaymentMethodId,
                      source: source || undefined,
                      notes: notes || undefined,
                      transactionDate: selectedDate,
                    });

                    if (!result.success) {
                      setErrorMessage(
                        result.error || "Failed to create income",
                      );
                      return;
                    }
                  }

                  // Success - close modal
                  router.back();
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "An error occurred";
                  setErrorMessage(message);
                }
              }}
            >
              {isCreatingExpense || isCreatingIncome ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={styles.buttonSpinner}
                />
              ) : (
                <Text style={styles.saveButtonText}>{saveLabel}</Text>
              )}
            </Pressable>

            {errorMessage ? (
              <Text
                style={[
                  styles.errorMessage,
                  { color: colors.destructive ?? "#EF4444" },
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}
          </View>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable
                style={styles.calendarBackdrop}
                onPress={() => setShowCalendar(false)}
              />
              <View
                style={[styles.calendarCard, ui.calendarCard, shadows.card]}
              >
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() - 1,
                            1,
                          ),
                      )
                    }
                  >
                    <Feather
                      name="chevron-left"
                      size={16}
                      color={ui.iconTint}
                    />
                  </Pressable>

                  <Text style={[styles.calendarTitle, ui.valueText]}>
                    {monthNames[calendarMonth.getMonth()]}{" "}
                    {calendarMonth.getFullYear()}
                  </Text>

                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() + 1,
                            1,
                          ),
                      )
                    }
                  >
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={ui.iconTint}
                    />
                  </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => (
                    <Text
                      key={label}
                      style={[styles.weekdayLabel, ui.mutedCalendarText]}
                    >
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day) => {
                    const isSelected = isSameDay(day.date, selectedDate);
                    const isToday = isSameDay(day.date, new Date());

                    return (
                      <Pressable
                        key={day.key}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.primary },
                          !isSelected && isToday && styles.todayCell,
                          !isSelected && isToday && ui.todayRing,
                        ]}
                        onPress={() => {
                          setSelectedDate(day.date);
                          setCalendarMonth(
                            new Date(
                              day.date.getFullYear(),
                              day.date.getMonth(),
                              1,
                            ),
                          );
                          setShowCalendar(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            ui.valueText,
                            !day.inMonth && ui.dayOutsideText,
                            isSelected && styles.selectedDayText,
                          ]}
                        >
                          {day.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
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
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderWidth: 1,
  },
  handle: {
    alignSelf: "center",
    width: 52,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentWrap: {
    marginTop: 14,
    height: 42,
    borderRadius: 18,
    flexDirection: "row",
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    ...shadows.soft,
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  segmentTextActive: {
    fontWeight: fontWeights.semibold,
  },
  body: {
    paddingTop: 10,
  },
  bodyScroll: {
    marginTop: 10,
    maxHeight: "68%",
  },
  bodyContent: {
    paddingBottom: 4,
  },
  amountBlock: {
    alignItems: "center",
  },
  amountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  amountField: {
    marginTop: 6,
    minHeight: 56,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: fontWeights.semibold,
    textAlignVertical: "center",
  },
  amountInput: {
    height: 56,
    width: 150,
    fontFamily: fontFamilies.sans,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: fontWeights.semibold,
    letterSpacing: -1,
    textAlign: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
  },
  section: {
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 12,
  },
  categoryRowSecondary: {
    marginTop: 8,
  },
  categoryChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  merchantRow: {
    gap: 10,
    paddingRight: 12,
  },
  merchantChip: {
    minHeight: 42,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  merchantChipActive: {
    borderWidth: 1,
  },
  merchantBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  merchantBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: fontWeights.bold,
  },
  merchantText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  textInput: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  singleLineInput: {
    minHeight: 42,
  },
  selectField: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodDropdown: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  methodItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodItemBorder: {
    borderBottomWidth: 1,
  },
  methodItemDisabled: {
    opacity: 0.45,
  },
  methodItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  methodTextBlock: {
    flex: 1,
    gap: 1,
  },
  methodBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: fontWeights.bold,
  },
  methodTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  methodSubtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  methodBalanceText: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
  },
  methodAvailabilityText: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
  },
  methodBalanceTextDanger: {
    color: "#DC2626",
  },
  inlineFieldsRow: {
    marginTop: 12,
  },
  dateField: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  selectPlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  dateValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notesSection: {
    marginTop: 12,
  },
  notesInput: {
    minHeight: 64,
    maxHeight: 64,
    paddingTop: 12,
    paddingBottom: 10,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  weekdayRow: {
    marginTop: 14,
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  dayCell: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  todayCell: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  buttonSpinner: {
    marginRight: 8,
  },
  errorMessage: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    textAlign: "center",
  },
  inlineWarningMessage: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
});
