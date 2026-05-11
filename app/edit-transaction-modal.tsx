import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
  View,
} from "react-native";

import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
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

  const [merchantQuery, setMerchantQuery] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null,
  );
  const [showMerchantOptions, setShowMerchantOptions] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const isIncomeTransaction = transaction?.typeValue === "income";
  const { merchants: expenseMerchantOptions } = useExpenseMerchants();

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setMerchantQuery(transaction.merchant || transaction.title);
    setSelectedMerchantId(transaction.merchantId ?? null);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId);
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

    setIsSaving(true);

    try {
      await transactionsService.update(transaction.id, {
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
                {transaction?.title ?? "Transaction"}
              </Text>
              <Text style={[styles.subtitle, ui.subtitle]}>
                {transaction?.dateLabel ??
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
          >
            <View style={styles.formSection}>
              <Text style={[styles.label, ui.label]}>Category</Text>
              <Pressable
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.dropdownField,
                ]}
                onPress={() => setShowCategoryOptions((current) => !current)}
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
                          setCategoryId(option.id);
                          setShowCategoryOptions(false);
                        }}
                      >
                        <View
                          style={[
                            styles.iconSmallWrap,
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
                        <Text style={[styles.categoryLabel, ui.fieldText]}>
                          {option.label}
                        </Text>
                        {isSelected ? (
                          <Feather name="check" size={16} color="#1681DD" />
                        ) : null}
                      </Pressable>
                    );
                  })}
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
                  onPress={() => setShowMerchantOptions((s) => !s)}
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
                      <Text style={[styles.categoryLabel, ui.placeholder]}>
                        Pick a category first to see related merchants.
                      </Text>
                    ) : (
                      merchantOptions.map((option) => {
                        const isSelected = option.id === selectedMerchantId;

                        return (
                          <Pressable
                            key={option.id}
                            style={[
                              styles.categoryOption,
                              isSelected && styles.categoryOptionSelected,
                            ]}
                            onPress={() => {
                              setMerchantQuery(option.label);
                              setSelectedMerchantId(option.id);
                              setShowMerchantOptions(false);
                            }}
                          >
                            {option.icon ? (
                              <MaterialCommunityIcons
                                name={option.icon as any}
                                size={18}
                                color={option.color}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.iconSmallWrap,
                                  { backgroundColor: option.color },
                                ]}
                              >
                                <Text
                                  style={[styles.badgeText, { color: "#fff" }]}
                                >
                                  {option.initials}
                                </Text>
                              </View>
                            )}
                            <Text style={[styles.categoryLabel, ui.fieldText]}>
                              {option.label}
                            </Text>
                            {isSelected ? (
                              <Feather name="check" size={16} color="#1681DD" />
                            ) : null}
                          </Pressable>
                        );
                      })
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
              disabled={!transaction || isSaving}
              style={[
                styles.primaryButton,
                ui.primaryButton,
                (!transaction || isSaving) && styles.disabledButton,
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
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: "92%",
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
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  formSection: {
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
  dropdownField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryList: {
    marginTop: 10,
    paddingVertical: 8,
  },
  categoryOption: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  categoryOptionSelected: {
    opacity: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  categoryLabel: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  iconSmallWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  badgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
  },
  actionsRow: {
    marginTop: 24,
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
    fontSize: 16,
    lineHeight: 20,
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
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
