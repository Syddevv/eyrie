import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import Logo from "@/components/logo";
import { WALLETS } from "@/constants/wallets";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useAccounts } from "@/hooks/useAccounts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useExpenseMerchants } from "@/hooks/useExpenseMerchants";
import { useMerchantsByCategory } from "@/hooks/useMerchantsByCategory";
import { CategoryAvatar } from "@/components/category-avatar";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import {
  getBackdropButtonColor,
  getFieldBorder,
  getFieldSurface,
  getHandleColor,
  getPlaceholderColor,
  getSheetSurface,
  getSubtitleColor,
  getSurfaceOverlay,
  getTitleColor,
  resolveTransactionVisual,
  useTransaction,
} from "@/hooks/useTransactions";
import { transactionsService } from "@/src/db/services";

function formatAmount(value: string) {
  return value
    .replace(/[^\d.]/g, "")
    .replace(/^(\d*\.?\d{0,2}).*$/, "$1")
    .slice(0, 12);
}

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function resolveAccountLogo(accountName: string) {
  const normalizedName = accountName.toLowerCase();

  const matchWallet = WALLETS.find(
    (wallet) =>
      (wallet.name && normalizedName.includes(wallet.name.toLowerCase())) ||
      (wallet.shortName &&
        normalizedName.includes(wallet.shortName.toLowerCase())) ||
      normalizedName.includes(wallet.id),
  );

  if (matchWallet) {
    return matchWallet.logo;
  }

  const matchBank = BANKS.find(
    (bank) =>
      (bank.name && normalizedName.includes(bank.name.toLowerCase())) ||
      (bank.shortName &&
        normalizedName.includes(bank.shortName.toLowerCase())) ||
      normalizedName.includes(bank.id),
  );

  if (matchBank) {
    return matchBank.logo;
  }

  const key = normalizedName.replace(/[^a-z0-9]/g, "");
  return LOGO_MAP[key] ?? null;
}

export default function EditTransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const transactionId = Array.isArray(params.transactionId)
    ? params.transactionId[0]
    : params.transactionId;
  const { transaction, isLoading } = useTransaction(transactionId);
  const { categories: expenseCategories } = useExpenseCategories();
  const {
    categories: incomeCategories,
    defaultCategoryId: defaultIncomeCategoryId,
  } = useIncomeCategories();
  const { methods } = usePaymentMethods();
  const { accounts } = useAccounts();

  const [merchantQuery, setMerchantQuery] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null,
  );
  const [showMerchantOptions, setShowMerchantOptions] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);
  const [hasInsufficientReversalBalance, setHasInsufficientReversalBalance] =
    useState(false);
  const isIncomeTransaction = transaction?.typeValue === "income";
  const { merchants: expenseMerchantOptions } = useExpenseMerchants();
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateDropdownChange = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const checkAccountBalance = (
    accountId: string,
    transactionAmount: number,
  ) => {
    // Only validate for expenses (not income/transfers)
    if (isIncomeTransaction) {
      return true;
    }

    // Always allow the original account (the one the transaction is currently assigned to)
    if (accountId === transaction?.accountId) {
      return true;
    }

    // Get the account to check its balance
    const account = accountById.get(accountId);
    if (!account) {
      return false;
    }

    // Check if account has sufficient balance
    const accountBalance = Number(account.balance) || 0;
    return accountBalance >= transactionAmount;
  };

  const checkIncomeReversalBalance = (newAccountId: string): boolean => {
    // Only applicable for income transactions
    if (!isIncomeTransaction || !transaction) {
      return true;
    }

    // If account hasn't changed, no reversal validation needed
    if (newAccountId === transaction.accountId) {
      return true;
    }

    // Get the original account (where income was credited)
    const originalAccount = accountById.get(transaction.accountId);
    if (!originalAccount) {
      return false;
    }

    // Get the transaction amount to reverse
    const transactionAmount = Number(transaction.amount) || 0;
    const originalBalance = Number(originalAccount.balance) || 0;

    // Check if reversing this income would make the original account negative
    // i.e., does the original account still have the full amount that was credited?
    return originalBalance >= transactionAmount;
  };

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setMerchantQuery(transaction.merchant || transaction.title);
    setSelectedMerchantId(transaction.merchantId ?? null);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId);
    setAccountId(transaction.accountId);
  }, [transaction]);

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

  const categoryOptions = isIncomeTransaction
    ? incomeCategories
    : expenseCategories;
  const accountOptions = methods.filter((method) => !method.isFallback);
  const selectedAccount =
    accountOptions.find((option) => option.id === accountId) ?? null;
  const selectedCategory =
    categoryOptions.find((option) => option.id === categoryId) ?? null;
  const merchantOptions = useMerchantsByCategory(
    selectedCategory?.label ?? null,
  );
  const selectedMerchantOption =
    merchantOptions.find((option) => option.id === selectedMerchantId) ??
    merchantOptions.find(
      (option) =>
        option.label.toLowerCase() === merchantQuery.trim().toLowerCase(),
    ) ??
    null;

  useEffect(() => {
    if (isIncomeTransaction) {
      return;
    }

    if (!merchantOptions.length) {
      setSelectedMerchantId(null);
      setMerchantQuery("");
      return;
    }

    setSelectedMerchantId((current) =>
      current && merchantOptions.some((merchant) => merchant.id === current)
        ? current
        : null,
    );

    setMerchantQuery((current) => {
      const normalized = current.trim().toLowerCase();
      if (!normalized) {
        return current;
      }

      return merchantOptions.some(
        (merchant) => merchant.label.trim().toLowerCase() === normalized,
      )
        ? current
        : "";
    });
  }, [isIncomeTransaction, merchantOptions]);

  useEffect(() => {
    if (!transaction || !isIncomeTransaction) {
      return;
    }

    if (transaction.categoryId) {
      setCategoryId(transaction.categoryId);
      return;
    }

    if (defaultIncomeCategoryId) {
      setCategoryId(defaultIncomeCategoryId);
    }
  }, [defaultIncomeCategoryId, isIncomeTransaction, transaction]);

  // Validate balance whenever amount or accountId changes
  useEffect(() => {
    if (isIncomeTransaction || !accountId || !amount) {
      setHasInsufficientBalance(false);
      return;
    }

    const numericAmount = Number(amount);
    const isValid = checkAccountBalance(accountId, numericAmount);
    setHasInsufficientBalance(!isValid);
  }, [amount, accountId, isIncomeTransaction]);

  // Validate income reversal balance when account changes for income transactions
  useEffect(() => {
    if (!isIncomeTransaction || !accountId || !transaction) {
      setHasInsufficientReversalBalance(false);
      return;
    }

    const isValid = checkIncomeReversalBalance(accountId);
    setHasInsufficientReversalBalance(!isValid);
  }, [accountId, isIncomeTransaction, transaction]);

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: getSurfaceOverlay(isDark),
      },
      sheet: getSheetSurface(isDark),
      handle: {
        backgroundColor: getHandleColor(isDark),
      },
      title: { color: getTitleColor(isDark) },
      subtitle: { color: getSubtitleColor(isDark) },
      closeButton: {
        backgroundColor: getBackdropButtonColor(isDark),
      },
      closeIcon: { color: isDark ? "#D4DCE6" : "#202733" },
      label: { color: getTitleColor(isDark) },
      fieldSurface: {
        backgroundColor: getFieldSurface(isDark),
        borderColor: getFieldBorder(isDark),
      },
      fieldText: { color: isDark ? "#F8FAFC" : "#202733" },
      placeholder: { color: getPlaceholderColor(isDark) },
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

  const transactionIcon = (() => {
    if (!transaction) {
      return {
        iconLibrary: "feather" as const,
        iconName: "circle",
        iconColor: "#94A3B8",
        iconBackgroundLight: "#EEF2F7",
        iconBackgroundDark: "#1A2433",
      };
    }

    if (isIncomeTransaction) {
      const previewColor = selectedCategory?.color ?? transaction.iconColor;
      return {
        ...resolveTransactionVisual(
          selectedCategory?.label ?? transaction.category,
          "income",
          {
            categoryIcon: selectedCategory?.icon ?? null,
            categoryColor: selectedCategory?.color ?? null,
          },
        ),
        iconBackgroundLight: withOpacity(previewColor, 0.16),
        iconBackgroundDark: withOpacity(previewColor, 0.2),
      };
    }

    return resolveTransactionVisual(
      selectedCategory?.label ?? transaction.category,
      "expense",
      {
        merchantName: selectedMerchantOption?.label ?? merchantQuery,
      },
    );
  })();

  const transactionIconNode =
    transactionIcon.iconLibrary === "material" ? (
      <MaterialCommunityIcons
        name={
          transactionIcon.iconName as React.ComponentProps<
            typeof MaterialCommunityIcons
          >["name"]
        }
        size={22}
        color={transactionIcon.iconColor}
      />
    ) : (
      <Feather
        name={
          transactionIcon.iconName as React.ComponentProps<
            typeof Feather
          >["name"]
        }
        size={20}
        color={transactionIcon.iconColor}
      />
    );

  const previewMerchantLabel =
    selectedMerchantOption?.label ?? (merchantQuery.trim() || null);
  const previewTitle = isIncomeTransaction
    ? (selectedCategory?.label ?? transaction?.category ?? transaction?.title)
    : (previewMerchantLabel ?? transaction?.title);
  const previewSubtitle = [
    selectedCategory?.label ?? transaction?.category,
    selectedAccount?.label ?? transaction?.accountLabel,
    transaction?.dateLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const returnToDetails = () =>
    transaction
      ? router.replace({
          pathname: "/transaction-details-modal",
          params: { transactionId: transaction.id },
        })
      : router.back();

  const handleSave = async () => {
    if (!transaction) {
      return;
    }

    const numericAmount = Number(amount);
    const normalizedType = transaction.typeValue;
    const normalizedMerchant = isIncomeTransaction
      ? undefined
      : merchantQuery.trim();

    if (!isIncomeTransaction && !normalizedMerchant) {
      Alert.alert(
        "Missing merchant",
        "Select a merchant for this transaction.",
      );
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than zero.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Missing category", "Select a category before saving.");
      return;
    }

    if (!accountId) {
      Alert.alert(
        "Missing account or wallet",
        "Select the account or wallet used for this transaction.",
      );
      return;
    }

    // Validate income reversal for account changes
    if (isIncomeTransaction && accountId !== transaction.accountId) {
      const canReverse = checkIncomeReversalBalance(accountId);
      if (!canReverse) {
        Alert.alert(
          "Cannot change account",
          "This account no longer has enough balance to reverse the original transaction.",
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      await transactionsService.update(transaction.id, {
        accountId,
        merchantId: isIncomeTransaction
          ? null
          : (expenseMerchantOptions.find(
              (option) =>
                option.label.trim().toLowerCase() ===
                (selectedMerchantOption?.label ?? merchantQuery)
                  .trim()
                  .toLowerCase(),
            )?.merchantId ?? null),
        merchantName: normalizedMerchant,
        amount: numericAmount,
        type: normalizedType,
        categoryId,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error
          ? error.message
          : "Unable to update transaction.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            styles.sheetResponsive,
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: transaction
                    ? isDark
                      ? transactionIcon.iconBackgroundDark
                      : transactionIcon.iconBackgroundLight
                    : getFieldSurface(isDark),
                },
              ]}
            >
              {transactionIconNode}
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, ui.title]}>
                {previewTitle ?? "Transaction"}
              </Text>
              <Text style={[styles.subtitle, ui.subtitle]}>
                {previewSubtitle ||
                  (isLoading
                    ? "Loading transaction..."
                    : "Transaction not found")}
              </Text>
            </View>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.formSection}>
              <Text style={[styles.label, ui.label]}>Account/Wallet</Text>
              <Pressable
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.dropdownField,
                ]}
                onPress={() => {
                  animateDropdownChange();
                  setShowAccountOptions((current) => !current);
                  setShowCategoryOptions(false);
                  setShowMerchantOptions(false);
                }}
              >
                <Text style={[styles.fieldInput, ui.fieldText]}>
                  {selectedAccount?.label ?? "Select account or wallet"}
                </Text>
                <Feather
                  name={showAccountOptions ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={ui.fieldText.color}
                />
              </Pressable>

              {showAccountOptions ? (
                <View style={[styles.categoryList, ui.fieldSurface]}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.dropdownScroll}
                    contentContainerStyle={styles.dropdownScrollContent}
                  >
                    {accountOptions.map((option) => {
                      const isSelected = option.id === selectedAccount?.id;
                      const account =
                        accountById.get(option.accountId ?? option.id) ?? null;
                      const accountLogo = account
                        ? resolveAccountLogo(account.name)
                        : null;

                      // For income transactions: check if reversing the original transaction would be valid
                      // For expense transactions: check if the selected account has sufficient balance
                      let isDisabled = false;
                      let disabledReason: string | null = null;

                      if (isIncomeTransaction && !isSelected && transaction) {
                        // For income: disable if changing account and original balance is insufficient to reverse
                        if (option.id !== transaction.accountId) {
                          const canReverse = checkIncomeReversalBalance(
                            option.id,
                          );
                          if (!canReverse) {
                            isDisabled = true;
                            disabledReason = "Cannot reverse";
                          }
                        }
                      } else if (!isIncomeTransaction) {
                        // For expenses: check balance at the new account
                        const numericAmount = Number(amount) || 0;
                        const hasBalance = checkAccountBalance(
                          option.id,
                          numericAmount,
                        );
                        if (!hasBalance && !isSelected && numericAmount > 0) {
                          isDisabled = true;
                          disabledReason = "Insufficient";
                        }
                      }

                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.categoryOption,
                            isSelected && styles.categoryOptionSelected,
                            isDisabled && styles.optionDisabled,
                          ]}
                          disabled={isDisabled}
                          onPress={() => {
                            if (!isDisabled) {
                              animateDropdownChange();
                              setAccountId(option.id);
                              setShowAccountOptions(false);
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.optionLeft,
                              isDisabled && styles.optionLeftDisabled,
                            ]}
                          >
                            <Logo
                              logo={accountLogo ?? undefined}
                              name={account?.name ?? option.label}
                              size={28}
                              backgroundColor={account?.color ?? "#CBD5E1"}
                              style={[
                                styles.optionLogo,
                                isDisabled && { opacity: 0.5 },
                              ]}
                            />
                            <View style={styles.accountTextWrap}>
                              <Text
                                style={[
                                  styles.categoryLabel,
                                  ui.fieldText,
                                  isDisabled && styles.disabledText,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {option.label}
                              </Text>
                              <Text
                                style={[
                                  styles.accountSubLabel,
                                  ui.placeholder,
                                  isDisabled && styles.insufficientText,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {isDisabled
                                  ? disabledReason === "Cannot reverse"
                                    ? "Cannot reverse"
                                    : "Insufficient Funds"
                                  : option.balanceLabel}
                              </Text>
                            </View>
                          </View>
                          {isSelected ? (
                            <Feather name="check" size={16} color="#1681DD" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, ui.label]}>Category</Text>
              <Pressable
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.dropdownField,
                ]}
                onPress={() => {
                  animateDropdownChange();
                  setShowCategoryOptions((current) => !current);
                  setShowAccountOptions(false);
                  setShowMerchantOptions(false);
                }}
              >
                <Text style={[styles.fieldInput, ui.fieldText]}>
                  {selectedCategory?.label ??
                    (categoryOptions.length
                      ? "Select category"
                      : "Loading categories...")}
                </Text>
                <Feather
                  name={showCategoryOptions ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={ui.fieldText.color}
                />
              </Pressable>

              {showCategoryOptions ? (
                <View style={[styles.categoryList, ui.fieldSurface]}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.dropdownScroll}
                    contentContainerStyle={styles.dropdownScrollContent}
                  >
                    {categoryOptions.map((option) => {
                      const isSelected = option.id === selectedCategory?.id;

                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.categoryOption,
                            isSelected && styles.categoryOptionSelected,
                          ]}
                          onPress={() => {
                            animateDropdownChange();
                            setCategoryId(option.id);
                            setShowCategoryOptions(false);
                          }}
                        >
                          <View style={styles.optionLeft}>
                            <View
                              style={[
                                styles.optionIconWrap,
                                { backgroundColor: `${option.color}22` },
                              ]}
                            >
                              <CategoryAvatar
                                category={{
                                  iconType: option.iconType,
                                  iconName: option.iconName ?? option.icon,
                                  iconImageUri: option.iconImageUri ?? null,
                                  emoji: option.emoji ?? null,
                                  color: option.color ?? "#64748B",
                                }}
                                size={18}
                              />
                            </View>
                            <Text
                              style={[styles.categoryLabel, ui.fieldText]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {option.label}
                            </Text>
                          </View>
                          {isSelected ? (
                            <Feather name="check" size={16} color="#1681DD" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {!isIncomeTransaction ? (
              <View style={styles.formSection}>
                <Text style={[styles.label, ui.label]}>Merchant</Text>
                <Pressable
                  style={[
                    styles.fieldSurface,
                    ui.fieldSurface,
                    styles.dropdownField,
                  ]}
                  onPress={() => {
                    animateDropdownChange();
                    setShowMerchantOptions((s) => !s);
                    setShowAccountOptions(false);
                    setShowCategoryOptions(false);
                  }}
                >
                  <Text style={[styles.fieldInput, ui.fieldText]}>
                    {selectedMerchantOption?.label ??
                      (selectedCategory
                        ? "Select merchant"
                        : "Pick category first")}
                  </Text>
                  <Feather
                    name={showMerchantOptions ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={ui.fieldText.color}
                  />
                </Pressable>

                {showMerchantOptions ? (
                  <View style={[styles.categoryList, ui.fieldSurface]}>
                    {!selectedCategory ? (
                      <Text
                        style={[styles.categoryLabel, ui.placeholder]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        Pick a category first to see related merchants.
                      </Text>
                    ) : (
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.dropdownScroll}
                        contentContainerStyle={styles.dropdownScrollContent}
                      >
                        {merchantOptions.map((option) => {
                          const isSelected = option.id === selectedMerchantId;

                          return (
                            <Pressable
                              key={option.id}
                              style={[
                                styles.categoryOption,
                                isSelected && styles.categoryOptionSelected,
                              ]}
                              onPress={() => {
                                animateDropdownChange();
                                setMerchantQuery(option.label);
                                setSelectedMerchantId(option.id);
                                setShowMerchantOptions(false);
                              }}
                            >
                              <View style={styles.optionLeft}>
                                <View
                                  style={[
                                    styles.optionIconWrap,
                                    { backgroundColor: option.color },
                                  ]}
                                >
                                  {option.icon ? (
                                    <MaterialCommunityIcons
                                      name={option.icon as any}
                                      size={16}
                                      color={option.textColor ?? "#FFFFFF"}
                                    />
                                  ) : (
                                    <Text
                                      style={[
                                        styles.badgeText,
                                        {
                                          color: option.textColor ?? "#FFFFFF",
                                        },
                                      ]}
                                    >
                                      {option.initials}
                                    </Text>
                                  )}
                                </View>
                                <Text
                                  style={[styles.categoryLabel, ui.fieldText]}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {option.label}
                                </Text>
                              </View>
                              {isSelected ? (
                                <Feather
                                  name="check"
                                  size={16}
                                  color="#1681DD"
                                />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Text style={[styles.label, ui.label]}>Amount</Text>
              <View
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.balanceField,
                ]}
              >
                <Text style={[styles.peso, ui.peso]}>₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={(value) => setAmount(formatAmount(value))}
                  placeholder="0"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="decimal-pad"
                  selectionColor="#1681DD"
                  style={[styles.fieldInput, ui.fieldText]}
                />
              </View>
              {hasInsufficientBalance && !isIncomeTransaction && (
                <Text
                  style={[styles.errorText, { color: "#FF5C73", marginTop: 8 }]}
                >
                  This account does not have enough balance for this
                  transaction.
                </Text>
              )}
              {hasInsufficientReversalBalance && isIncomeTransaction && (
                <Text
                  style={[styles.errorText, { color: "#FF5C73", marginTop: 8 }]}
                >
                  This account no longer has enough balance to reverse the
                  original transaction.
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable
              disabled={isSaving}
              style={[styles.secondaryButton, ui.secondaryButton]}
              onPress={returnToDetails}
            >
              <Text
                style={[styles.secondaryButtonText, ui.secondaryButtonText]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              disabled={
                !transaction ||
                isSaving ||
                hasInsufficientBalance ||
                hasInsufficientReversalBalance
              }
              style={[
                styles.primaryButton,
                ui.primaryButton,
                (!transaction ||
                  isSaving ||
                  hasInsufficientBalance ||
                  hasInsufficientReversalBalance) &&
                  styles.disabledButton,
              ]}
              onPress={handleSave}
            >
              <Feather
                name="check"
                size={16}
                color={ui.primaryButtonText.color}
              />
              <Text style={[styles.primaryButtonText, ui.primaryButtonText]}>
                {isSaving ? "Saving..." : "Save Changes"}
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 0,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: "100%",
    alignSelf: "center",
    maxHeight: "92%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetResponsive: {
    maxWidth: 560,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: radius.full,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  formSection: {
    marginTop: 12,
  },
  label: {
    marginBottom: 7,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 42,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
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
    fontSize: 18,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  dropdownField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryList: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: 260,
  },
  dropdownScroll: {
    maxHeight: 260,
  },
  dropdownScrollContent: {
    paddingVertical: 2,
  },
  categoryOption: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryOptionSelected: {
    opacity: 1,
  },
  optionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  optionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryLabel: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    minWidth: 0,
  },
  accountTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  accountSubLabel: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  optionLogo: {
    marginRight: 2,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  badgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
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
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
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
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLeftDisabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  insufficientText: {
    color: "#FF5C73",
  },
  errorText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
  },
});
