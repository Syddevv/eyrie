import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
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

import { CategoryAvatar } from "@/components/category-avatar";
import {
  CategoryEditorSheet,
  type CategoryDraft,
} from "@/components/category-editor-sheet";
import MerchantLogo from "@/components/merchant-logo";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import type { CategoryOption as ManagedCategoryOption } from "@/hooks/useCategories";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useMerchantsByCategory } from "@/hooks/useMerchantsByCategory";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useAccounts } from "@/hooks/useAccounts";
import Logo from "@/components/logo";
import { LoadingActionButton } from "@/components/loading-action-button";
import { WALLETS } from "@/constants/wallets";
import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreateExpense } from "@/hooks/useCreateExpense";
import { useCreateIncome } from "@/hooks/useCreateIncome";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";
import { categoriesService } from "@/src/db/services";
import { getBudgetProgress } from "@/src/db/queries/dashboard";

type EntryType = "expense" | "income";

type CategoryOption = {
  id: string;
  label: string;
  icon: string;
  iconType: ManagedCategoryOption["iconType"];
  iconName: string | null;
  iconImageUri: string | null;
  emoji: string | null;
  color: string;
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
    <CategoryAvatar
      category={{
        iconType: option.iconType,
        iconName: option.iconName,
        iconImageUri: option.iconImageUri,
        emoji: option.emoji,
        color,
      }}
      size={14}
    />
  );
}

export default function AddTransactionModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { user } = useCurrentUser();

  // Transaction creation hooks
  const { create: createExpense, isLoading: isCreatingExpense } =
    useCreateExpense();
  const { create: createIncome, isLoading: isCreatingIncome } =
    useCreateIncome();
  const { isRunning: isSubmittingTransaction, run: runSubmitTransaction } =
    useAsyncAction();

  const { categories: expenseCategories, refresh: refreshExpenseCategories } =
    useExpenseCategories();
  const { categories: incomeCategories, refresh: refreshIncomeCategories } =
    useIncomeCategories();
  const { methods: paymentMethods } = usePaymentMethods();
  const { accounts } = useAccounts();

  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<
    string | null
  >(null);
  const [selectedExpenseCategoryLabel, setSelectedExpenseCategoryLabel] =
    useState<string | null>(null);
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<
    string | null
  >(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null,
  );
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
  const [isCategoryEditorVisible, setIsCategoryEditorVisible] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const expenseCategoryCarouselRef = useRef<ScrollView>(null);
  const incomeCategoryCarouselRef = useRef<ScrollView>(null);
  const merchantCarouselRef = useRef<ScrollView>(null);
  const [budgetExceededWarning, setBudgetExceededWarning] = useState<{
    categoryName: string;
    spent: number;
    limit: number;
    status: "alreadyOver" | "willExceed";
  } | null>(null);
  const merchantOptions = useMerchantsByCategory(selectedExpenseCategoryLabel);
  const merchantCarouselSignature = useMemo(
    () => merchantOptions.map((merchant) => merchant.id).join("|"),
    [merchantOptions],
  );

  useLayoutEffect(() => {
    if (entryType !== "expense") {
      return;
    }

    merchantCarouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [entryType, selectedExpenseCategoryId, merchantCarouselSignature]);

  useEffect(() => {
    const activeCategoryRef =
      entryType === "expense"
        ? expenseCategoryCarouselRef
        : incomeCategoryCarouselRef;

    requestAnimationFrame(() => {
      activeCategoryRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, [entryType]);
  const categoryEditorInitialValue = useMemo(
    () => ({
      type: entryType,
      color: entryType === "expense" ? "#F97316" : "#10B981",
      iconName: entryType === "expense" ? "shopping-outline" : "wallet-outline",
    }),
    [entryType],
  );

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
  const incomeCategoryOptions = useMemo<CategoryOption[]>(
    () =>
      incomeCategories.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
        iconType: category.iconType,
        iconName: category.iconName,
        iconImageUri: category.iconImageUri,
        emoji: category.emoji,
        color: category.color,
      })),
    [incomeCategories],
  );
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0] ??
    null;
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
  const activePaymentMethod = selectedPaymentMethod;
  const selectedMerchantOption =
    merchantOptions.find((merchant) => merchant.id === selectedMerchantId) ??
    null;
  const isExpenseSaveBlockedByInsufficientBalance = Boolean(
    selectedExpensePaymentMethodIsInsufficient,
  );
  const insufficientBalanceMessage = selectedExpensePaymentMethodIsInsufficient
    ? "Selected account does not have enough balance for this expense."
    : null;
  const isSaveEnabled =
    selectedAmount > 0 &&
    (entryType === "income"
      ? isIncomeFormValid
      : isExpenseFormValid && !isExpenseSaveBlockedByInsufficientBalance);

  useEffect(() => {
    setSelectedMerchantId((current) => {
      if (
        current &&
        merchantOptions.some((merchant) => merchant.id === current)
      ) {
        return current;
      }

      return null;
    });
  }, [merchantOptions]);

  // Check budget when category or amount changes
  useEffect(() => {
    const checkBudgetStatus = async () => {
      if (entryType !== "expense" || !selectedExpenseCategoryId || !user?.id) {
        setBudgetExceededWarning(null);
        return;
      }

      try {
        const budgets = await getBudgetProgress(user.id);
        const categoryBudget = budgets.find(
          (b) => b.categoryId === selectedExpenseCategoryId,
        );

        if (categoryBudget) {
          const isAlreadyOver = categoryBudget.spent >= categoryBudget.amount;
          const newTotal = categoryBudget.spent + selectedAmount;
          const willExceed = newTotal > categoryBudget.amount;

          if (isAlreadyOver || willExceed) {
            setBudgetExceededWarning({
              categoryName: categoryBudget.categoryName,
              spent: categoryBudget.spent,
              limit: categoryBudget.amount,
              status: isAlreadyOver ? "alreadyOver" : "willExceed",
            });
          } else {
            setBudgetExceededWarning(null);
          }
        } else {
          setBudgetExceededWarning(null);
        }
      } catch (error) {
        console.error("Error checking budget:", error);
        setBudgetExceededWarning(null);
      }
    };

    void checkBudgetStatus();
  }, [entryType, selectedExpenseCategoryId, selectedAmount, user?.id]);

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
    if (entryType !== "expense") {
      return;
    }

    setSelectedMerchantId(null);
  }, [entryType, selectedExpenseCategoryId, selectedExpenseCategoryLabel]);

  const handleCreateCategory = async (draft: CategoryDraft) => {
    setIsSavingCategory(true);

    try {
      const created = await categoriesService.create({
        userId: user?.id ?? null,
        name: draft.name,
        type: draft.type,
        iconType: draft.iconType,
        iconName: draft.iconName,
        iconImageUri: draft.iconImageUri,
        emoji: draft.emoji,
        color: draft.color,
        icon: draft.iconType === "vector" ? draft.iconName : null,
        isDefault: false,
        isSystem: false,
        isArchived: false,
      });

      if (draft.type === "expense") {
        await refreshExpenseCategories();
        setSelectedExpenseCategoryId(created?.id ?? null);
        setSelectedExpenseCategoryLabel(created?.name ?? draft.name);
      } else {
        await refreshIncomeCategories();
        setSelectedIncomeCategory(created?.id ?? null);
      }

      setIsCategoryEditorVisible(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create category.",
      );
    } finally {
      setIsSavingCategory(false);
    }
  };

  const openQuickCreateCategory = () => {
    setErrorMessage(null);
    setIsCategoryEditorVisible(true);
  };

  const handleSaveTransaction = async () => {
    if (isSubmittingTransaction || isCreatingExpense || isCreatingIncome) {
      return;
    }

    if (!isSaveEnabled) {
      showIncompleteFormAlert();
      return;
    }

    setErrorMessage(null);

    await runSubmitTransaction(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

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
          setErrorMessage("Selected account does not have enough balance.");
          return;
        }

        const result = await createExpense({
          amount: Number(amount),
          categoryId: selectedExpenseCategoryId,
          accountId: selectedPaymentMethodId,
          merchantName: selectedMerchantOption?.label || undefined,
          merchantDefaultCategoryId: selectedExpenseCategoryId,
          notes: notes || undefined,
          transactionDate: selectedDate,
        });

        if (!result.success) {
          setErrorMessage(result.error || "Failed to create expense");
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
          setErrorMessage(result.error || "Failed to create income");
          return;
        }
      }

      // Success - close modal
      router.back();
    }).catch((error) => {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      setErrorMessage(message);
    });
  };

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
      defaultPill: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.18)" : "#D9ECFF",
      },
      defaultPillText: { color: "#1495FF" },
    }),
    [colors, isDark],
  );

  const saveLabel = entryType === "expense" ? "Save Expense" : "Save Income";
  const isSavingTransaction =
    isSubmittingTransaction || isCreatingExpense || isCreatingIncome;
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
              <Text style={[styles.fieldHelper, ui.mutedValue]}>
                Need another one? Tap Create New to add a category.
              </Text>
              {entryType === "expense" ? (
                <ScrollView
                  key="expense-category-row"
                  ref={expenseCategoryCarouselRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                >
                  <Pressable
                    style={[styles.categoryChip, ui.chip]}
                    onPress={openQuickCreateCategory}
                  >
                    <Feather name="plus" size={14} color={ui.iconTint} />
                    <Text style={[styles.categoryChipText, ui.chipText]}>
                      Create New
                    </Text>
                  </Pressable>

                  {expensePrimaryCategories.map((option) => {
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
                          setShowAllExpenseCategories(false);
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

                  {expenseOtherCategories.length ? (
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
              ) : (
                <ScrollView
                  key="income-category-row"
                  ref={incomeCategoryCarouselRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                >
                  <Pressable
                    style={[styles.categoryChip, ui.chip]}
                    onPress={openQuickCreateCategory}
                  >
                    <Feather name="plus" size={14} color={ui.iconTint} />
                    <Text style={[styles.categoryChipText, ui.chipText]}>
                      Create New
                    </Text>
                  </Pressable>

                  {incomeCategoryOptions.map((option) => {
                    const isActive = selectedIncomeCategory === option.id;

                    return (
                      <Pressable
                        key={option.id}
                        style={[
                          styles.categoryChip,
                          ui.chip,
                          isActive && ui.chipActive,
                        ]}
                        onPress={() => {
                          setSelectedIncomeCategory(option.id);
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
              )}

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

            {budgetExceededWarning ? (
              <View
                style={{
                  backgroundColor: isDark
                    ? budgetExceededWarning.status === "alreadyOver"
                      ? "rgba(127, 29, 29, 0.5)"
                      : "rgba(127, 29, 29, 0.4)"
                    : budgetExceededWarning.status === "alreadyOver"
                      ? "rgba(127, 29, 29, 0.2)"
                      : "rgba(127, 29, 29, 0.15)",
                  borderColor: isDark
                    ? budgetExceededWarning.status === "alreadyOver"
                      ? "rgba(239, 68, 68, 0.7)"
                      : "rgba(239, 68, 68, 0.5)"
                    : budgetExceededWarning.status === "alreadyOver"
                      ? "rgba(239, 68, 68, 0.5)"
                      : "rgba(239, 68, 68, 0.3)",
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  marginVertical: 8,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <Feather
                  name="alert-triangle"
                  size={18}
                  color={colors.destructive ?? "#EF4444"}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.destructive ?? "#EF4444",
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 4,
                      fontFamily: fontFamilies.medium,
                    }}
                  >
                    {budgetExceededWarning.status === "alreadyOver"
                      ? "Budget Already Exceeded"
                      : "Budget Will Exceed"}
                  </Text>
                  <Text
                    style={{
                      color: isDark ? "#CBD5E1" : "#64748B",
                      fontSize: 13,
                      lineHeight: 18,
                      fontFamily: fontFamilies.regular,
                    }}
                  >
                    {budgetExceededWarning.status === "alreadyOver"
                      ? `Budget already exceeded! You've spent ₱${budgetExceededWarning.spent.toFixed(2)} of your ₱${budgetExceededWarning.limit.toFixed(2)} limit for this category.`
                      : `Budget limit will exceed! You've spent ₱${budgetExceededWarning.spent.toFixed(2)}, adding this expense will go over your ₱${budgetExceededWarning.limit.toFixed(2)} limit.`}
                  </Text>
                </View>
              </View>
            ) : null}

            {entryType === "expense" ? (
              <View style={styles.section}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>
                  Merchant (optional)
                </Text>
                <Text style={[styles.fieldHelper, ui.mutedValue]}>
                  Suggestions change based on the category you selected.
                </Text>
                {selectedExpenseCategoryId ? (
                  <ScrollView
                    ref={merchantCarouselRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.merchantRow}
                  >
                    {merchantOptions.map((merchant) => {
                      const isActive = selectedMerchantId === merchant.id;

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
                            setSelectedMerchantId((current) =>
                              current === merchant.id ? null : merchant.id,
                            )
                          }
                        >
                          <MerchantLogo
                            merchant={merchant.label}
                            size={24}
                            backgroundColor={merchant.color}
                            fallbackIcon={{
                              library: "material",
                              name: merchant.icon,
                              color: merchant.textColor ?? "#FFFFFF",
                            }}
                          />
                          <Text style={[styles.merchantText, ui.chipText]}>
                            {merchant.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={[styles.inlineHintText, ui.mutedValue]}>
                    Pick a category first to see suggested merchants.
                  </Text>
                )}
              </View>
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
                <View style={styles.selectFieldContent}>
                  {(() => {
                    const account = accounts.find(
                      (a) => a.id === activePaymentMethod?.accountId,
                    );

                    let logoAsset: any = null;

                    if (account) {
                      const nameLower = (account.name || "").toLowerCase();

                      const matchWallet = WALLETS.find(
                        (w) =>
                          (w.name &&
                            nameLower.includes(w.name.toLowerCase())) ||
                          (w.shortName &&
                            nameLower.includes(w.shortName.toLowerCase())) ||
                          nameLower.includes(w.id),
                      );

                      const matchBank = BANKS.find(
                        (b) =>
                          (b.name &&
                            nameLower.includes(b.name.toLowerCase())) ||
                          (b.shortName &&
                            nameLower.includes(b.shortName.toLowerCase())) ||
                          nameLower.includes(b.id),
                      );

                      if (matchWallet) {
                        logoAsset = matchWallet.logo;
                      } else if (matchBank) {
                        logoAsset = matchBank.logo;
                      } else {
                        const key = account.name
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "");
                        logoAsset = LOGO_MAP[key];
                      }
                    }

                    if (logoAsset) {
                      return (
                        <Logo
                          logo={logoAsset}
                          size={24}
                          backgroundColor={account?.color || colors.secondary}
                          style={{ marginRight: 10 }}
                        />
                      );
                    }

                    return null;
                  })()}
                  <View style={styles.selectFieldText}>
                    <View style={styles.methodTitleRow}>
                      <Text
                        style={[styles.selectValue, ui.valueText]}
                        numberOfLines={1}
                      >
                        {activePaymentMethod?.sublabel ??
                          activePaymentMethod?.label ??
                          "Cash"}
                      </Text>
                      {activePaymentMethod?.isDefault ? (
                        <View style={[styles.defaultPill, ui.defaultPill]}>
                          <Text
                            style={[styles.defaultPillText, ui.defaultPillText]}
                          >
                            Default
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
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
                          {/* render logo if available, else fallback to badge */}
                          {(() => {
                            const account = accounts.find(
                              (a) => a.id === method.accountId,
                            );

                            // try matching by known wallets/banks
                            let logoAsset: any = null;

                            if (account) {
                              const nameLower = (
                                account.name || ""
                              ).toLowerCase();

                              const matchWallet = WALLETS.find(
                                (w) =>
                                  (w.name &&
                                    nameLower.includes(w.name.toLowerCase())) ||
                                  (w.shortName &&
                                    nameLower.includes(
                                      w.shortName.toLowerCase(),
                                    )) ||
                                  nameLower.includes(w.id),
                              );

                              const matchBank = BANKS.find(
                                (b) =>
                                  (b.name &&
                                    nameLower.includes(b.name.toLowerCase())) ||
                                  (b.shortName &&
                                    nameLower.includes(
                                      b.shortName.toLowerCase(),
                                    )) ||
                                  nameLower.includes(b.id),
                              );

                              if (matchWallet) {
                                logoAsset = matchWallet.logo;
                              } else if (matchBank) {
                                logoAsset = matchBank.logo;
                              } else {
                                const key = account.name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, "");
                                logoAsset = LOGO_MAP[key];
                              }
                            }

                            if (logoAsset) {
                              return (
                                <Logo
                                  logo={logoAsset}
                                  size={36}
                                  backgroundColor={
                                    isSelected
                                      ? colors.primary
                                      : colors.secondary
                                  }
                                />
                              );
                            }

                            return (
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
                            );
                          })()}

                          <View style={styles.methodTextBlock}>
                            <View style={styles.methodTitleRow}>
                              <Text style={[styles.methodTitle, ui.valueText]}>
                                {method.sublabel ??
                                  (method.isFallback
                                    ? "Cash"
                                    : "Active account")}
                              </Text>
                              {method.isDefault ? (
                                <View
                                  style={[styles.defaultPill, ui.defaultPill]}
                                >
                                  <Text
                                    style={[
                                      styles.defaultPillText,
                                      ui.defaultPillText,
                                    ]}
                                  >
                                    Default
                                  </Text>
                                </View>
                              ) : null}
                            </View>
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
            <LoadingActionButton
              label={saveLabel}
              loadingLabel={
                entryType === "income"
                  ? "Saving income..."
                  : "Saving expense..."
              }
              loading={isSavingTransaction}
              style={[
                styles.saveButton,
                !isSaveEnabled || isSavingTransaction
                  ? ui.saveButtonDisabled
                  : ui.saveButton,
              ]}
              disabled={
                !isSaveEnabled ||
                isSubmittingTransaction ||
                isCreatingExpense ||
                isCreatingIncome ||
                isExpenseSaveBlockedByInsufficientBalance
              }
              onPress={handleSaveTransaction}
              textStyle={styles.saveButtonText}
              spinnerColor="#FFFFFF"
            />

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

        <CategoryEditorSheet
          visible={isCategoryEditorVisible}
          title={`Create ${entryType === "expense" ? "Expense" : "Income"} Category`}
          saveLabel="Save Category"
          initialValue={categoryEditorInitialValue}
          isSaving={isSavingCategory}
          onClose={() => setIsCategoryEditorVisible(false)}
          onSave={handleCreateCategory}
        />
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
  fieldHelper: {
    marginTop: -2,
    marginBottom: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
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
    gap: 8,
    paddingRight: 12,
  },
  merchantChip: {
    minHeight: 38,
    borderRadius: 16,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  merchantChipActive: {
    borderWidth: 1,
  },
  merchantText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  inlineHintText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
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
  selectFieldContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectFieldText: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
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
  defaultPill: {
    height: 20,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  defaultPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeights.semibold,
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  warningContent: {
    flex: 1,
    flexDirection: "column",
    gap: 2,
  },
  warningTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
  },
  warningMessage: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
});
