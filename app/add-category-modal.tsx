import { Feather } from "@expo/vector-icons";
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
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";

import { CategoryAvatar } from "@/components/category-avatar";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useAccounts } from "@/hooks/useAccounts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatCurrency } from "@/hooks/use-dashboard";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import {
  calculateBudgetPlanningSnapshot,
  useAvailableBudgetCategories,
  type BudgetCycle,
} from "@/hooks/useBudgets";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";
import { budgetsService } from "@/src/db/services";
import { showSuccessToast } from "@/store/useToastStore";

function sanitizeBudgetAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function normalizeCategoryLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export default function AddCategoryModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cycle?: string }>();
  const { user } = useCurrentUser();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const selectedCycle = (
    Array.isArray(params.cycle) ? params.cycle[0] : (params.cycle ?? "monthly")
  ) as BudgetCycle;
  const { accounts } = useAccounts();
  const { categories: expenseCategories } = useExpenseCategories();
  const { categoryIdsWithActiveBudget, cycleRange, currentTotalBudgeted } =
    useAvailableBudgetCategories(selectedCycle);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const proposedBudgetAmount = Number(budgetAmount) || 0;
  const hasBudgetAmount = budgetAmount.trim().length > 0;
  const availableFunds = useMemo(
    () =>
      accounts.reduce(
        (sum, account) => sum + (Number(account.balance) || 0),
        0,
      ),
    [accounts],
  );
  const planningOverview = useMemo(
    () =>
      calculateBudgetPlanningSnapshot({
        availableFunds,
        currentTotalBudgeted,
        proposedBudgetAmount,
      }),
    [availableFunds, currentTotalBudgeted, proposedBudgetAmount],
  );

  const activeBudgetCategoryKeys = useMemo(() => {
    const keys = new Set<string>();

    for (const category of expenseCategories) {
      if (categoryIdsWithActiveBudget.has(category.id)) {
        keys.add(normalizeCategoryLabel(category.label));
      }
    }

    return keys;
  }, [categoryIdsWithActiveBudget, expenseCategories]);

  const availableCategories = useMemo(
    () =>
      expenseCategories.filter(
        (category) =>
          !categoryIdsWithActiveBudget.has(category.id) &&
          !activeBudgetCategoryKeys.has(
            normalizeCategoryLabel(category.label),
          ),
      ),
    [activeBudgetCategoryKeys, categoryIdsWithActiveBudget, expenseCategories],
  );
  const selectedCategory =
    availableCategories.find(
      (category) => category.id === selectedCategoryId,
    ) ?? null;
  const isAddEnabled = Boolean(selectedCategoryId) && Number(budgetAmount) > 0;

  useEffect(() => {
    if (!availableCategories.length) {
      setSelectedCategoryId(null);
      return;
    }

    setSelectedCategoryId((current) =>
      current && availableCategories.some((category) => category.id === current)
        ? current
        : null,
    );
  }, [availableCategories]);

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
          ? "rgba(2, 6, 23, 0.52)"
          : "rgba(15, 23, 42, 0.22)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.06)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      label: { color: colors.foreground },
      fieldSurface: {
        backgroundColor: isDark
          ? "rgba(15, 23, 42, 0.26)"
          : "rgba(241, 245, 249, 0.8)",
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(226, 232, 240, 0.92)",
      },
      placeholder: { color: colors.mutedForeground },
      value: { color: colors.foreground },
      closeButton: {
        backgroundColor: colors.secondary,
      },
      closeIcon: { color: colors.mutedForeground },
      addButton: {
        backgroundColor: colors.primary,
      },
      addButtonDisabled: {
        backgroundColor: isDark ? "#31577D" : "#A9CDED",
      },
      addButtonText: { color: "#FFFFFF" },
      dropdownSurface: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(226, 232, 240, 0.92)",
      },
      dropdownItemBorder: {
        borderBottomColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(226, 232, 240, 0.72)",
      },
      helperText: {
        color: isDark ? "#94A3B8" : "#64748B",
      },
      overviewCard: {
        backgroundColor: isDark
          ? "rgba(15, 23, 42, 0.4)"
          : "rgba(248, 250, 252, 0.92)",
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(226, 232, 240, 0.92)",
      },
      overviewHealthyAccent: { color: isDark ? "#6EE7B7" : "#109669" },
      overviewHealthySurface: {
        backgroundColor: isDark
          ? "rgba(16, 185, 129, 0.14)"
          : "rgba(220, 252, 231, 0.9)",
        borderColor: isDark
          ? "rgba(52, 211, 153, 0.22)"
          : "rgba(52, 211, 153, 0.22)",
      },
      overviewWarningAccent: { color: isDark ? "#FDBA74" : "#EA7A15" },
      overviewWarningSurface: {
        backgroundColor: isDark
          ? "rgba(249, 115, 22, 0.14)"
          : "rgba(255, 237, 213, 0.94)",
        borderColor: isDark
          ? "rgba(251, 146, 60, 0.24)"
          : "rgba(251, 146, 60, 0.24)",
      },
      overviewMutedLabel: { color: isDark ? "#9FB0C4" : "#64748B" },
      overviewValue: { color: colors.foreground },
      insightCard: {
        backgroundColor: isDark
          ? "rgba(26, 34, 48, 0.88)"
          : "rgba(255,255,255,0.94)",
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(251, 146, 60, 0.18)",
      },
    }),
    [colors, isDark],
  );

  const handleSave = async () => {
    if (!isAddEnabled) {
      showIncompleteFormAlert();
      return;
    }

    if (!user?.id || !selectedCategoryId) {
      Alert.alert(
        "Missing category",
        "Choose an expense category to create a budget.",
      );
      return;
    }

    if (
      selectedCategory &&
      activeBudgetCategoryKeys.has(
        normalizeCategoryLabel(selectedCategory.label),
      )
    ) {
      Alert.alert(
        "Budget already exists",
        "A similar budget category already exists for this cycle.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await budgetsService.create(
        {
          userId: user.id,
          categoryId: selectedCategoryId,
          amount: Number(budgetAmount),
          period: selectedCycle,
          startDate: cycleRange.startDate,
          endDate: cycleRange.endDate,
        },
        { notifySuccess: false },
      );

      router.back();
      setTimeout(() => {
        showSuccessToast({
          title: "Budget Added",
          message: "Your budget has been created.",
          dedupeKey: "budget:create:ui",
          source: "add-category-modal",
        });
      }, 240);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Unable to create budget.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
            <Text style={[styles.title, ui.title]}>Create Budget</Text>
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
            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>
                Choose expense category
              </Text>
              <Pressable
                style={[styles.selectField, ui.fieldSurface]}
                onPress={() => setShowCategoryList((current) => !current)}
              >
                <Text style={[styles.selectText, ui.value]}>
                  {selectedCategory
                    ? selectedCategory.label
                    : "Choose expense category"}
                </Text>
                <Feather
                  name={showCategoryList ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {showCategoryList ? (
                <View
                  style={[
                    styles.dropdownCard,
                    ui.dropdownSurface,
                    shadows.card,
                  ]}
                >
                  {availableCategories.length ? (
                    availableCategories.map((option, index) => {
                      const isSelected = option.id === selectedCategory?.id;
                      const isLast = index === availableCategories.length - 1;

                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.dropdownItem,
                            !isLast && styles.dropdownItemBorder,
                            !isLast && ui.dropdownItemBorder,
                          ]}
                          onPress={() => {
                            setSelectedCategoryId(option.id);
                            setShowCategoryList(false);
                          }}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <View
                              style={[
                                styles.categoryIconWrap,
                                { backgroundColor: `${option.color}22` },
                              ]}
                            >
                              <CategoryAvatar category={option} size={18} />
                            </View>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isSelected
                                  ? { color: colors.primary }
                                  : ui.value,
                              ]}
                            >
                              {option.label}
                            </Text>
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
                    })
                  ) : (
                    <View style={styles.emptyDropdownState}>
                      <Text style={[styles.emptyDropdownText, ui.helperText]}>
                        Budget already exists for every expense category in this
                        cycle.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Budget limit</Text>
              <View style={[styles.amountField, ui.fieldSurface]}>
                <Text style={[styles.currencyMark, ui.placeholder]}>₱</Text>
                <TextInput
                  value={budgetAmount}
                  onChangeText={(value) =>
                    setBudgetAmount(sanitizeBudgetAmount(value))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor={colors.primary}
                  style={[styles.amountInput, ui.value]}
                />
              </View>
              <Text style={[styles.helperText, ui.helperText]}>
                This budget will track spending for the selected expense
                category automatically.
              </Text>
            </View>

            {hasBudgetAmount ? (
              <Animated.View
                entering={FadeInDown.duration(220)}
                layout={LinearTransition.springify().damping(18).stiffness(180)}
                style={styles.section}
              >
                <View
                  style={[
                    styles.overviewCard,
                    ui.overviewCard,
                    isDark ? shadows.card : styles.overviewCardLight,
                  ]}
                >
                  <View style={styles.overviewHeader}>
                    <View
                      style={[
                        styles.overviewIconWrap,
                        planningOverview.status === "warning"
                          ? ui.overviewWarningSurface
                          : ui.overviewHealthySurface,
                      ]}
                    >
                      <Feather
                        name={
                          planningOverview.status === "warning"
                            ? "alert-triangle"
                            : "check-circle"
                        }
                        size={16}
                        color={
                          planningOverview.status === "warning"
                            ? ui.overviewWarningAccent.color
                            : ui.overviewHealthyAccent.color
                        }
                      />
                    </View>
                    <View style={styles.overviewHeaderText}>
                      <Text style={[styles.overviewTitle, ui.title]}>
                        Budget Overview
                      </Text>
                      <Text style={[styles.overviewSubtitle, ui.helperText]}>
                        Compare available money with planned budgets before
                        saving.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.overviewRows}>
                    <View style={styles.overviewRow}>
                      <Text
                        style={[styles.overviewLabel, ui.overviewMutedLabel]}
                      >
                        Available Funds
                      </Text>
                      <Text style={[styles.overviewValue, ui.overviewValue]}>
                        {formatCurrency(planningOverview.availableFunds)}
                      </Text>
                    </View>
                    <View style={styles.overviewRow}>
                      <Text
                        style={[styles.overviewLabel, ui.overviewMutedLabel]}
                      >
                        Currently Budgeted
                      </Text>
                      <Text style={[styles.overviewValue, ui.overviewValue]}>
                        {formatCurrency(currentTotalBudgeted)}
                      </Text>
                    </View>
                    <View style={styles.overviewRow}>
                      <Text
                        style={[styles.overviewLabel, ui.overviewMutedLabel]}
                      >
                        Budgeted After Save
                      </Text>
                      <Text style={[styles.overviewValue, ui.overviewValue]}>
                        {formatCurrency(
                          planningOverview.newTotalBudgetedAfterSave,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.overviewStatus,
                      planningOverview.status === "warning"
                        ? ui.overviewWarningSurface
                        : ui.overviewHealthySurface,
                    ]}
                  >
                    <Feather
                      name={
                        planningOverview.status === "warning" ? "info" : "check"
                      }
                      size={14}
                      color={
                        planningOverview.status === "warning"
                          ? ui.overviewWarningAccent.color
                          : ui.overviewHealthyAccent.color
                      }
                    />
                    <Text
                      style={[
                        styles.overviewStatusText,
                        planningOverview.status === "warning"
                          ? ui.overviewWarningAccent
                          : ui.overviewHealthyAccent,
                      ]}
                    >
                      {planningOverview.status === "warning"
                        ? `Budgets will exceed available funds by ${formatCurrency(
                            Math.abs(planningOverview.difference),
                          )}.`
                        : "Your budgets are within available funds."}
                    </Text>
                  </View>
                </View>

                {planningOverview.status === "warning" ? (
                  <Animated.View
                    entering={FadeInDown.duration(240)}
                    layout={LinearTransition.springify()
                      .damping(18)
                      .stiffness(180)}
                    style={[styles.insightCard, ui.insightCard]}
                  >
                    <View style={styles.insightHeader}>
                      <Feather
                        name="info"
                        size={15}
                        color={ui.overviewWarningAccent.color}
                      />
                      <Text style={[styles.insightTitle, ui.title]}>
                        Planning Insight
                      </Text>
                    </View>
                    <Text style={[styles.insightText, ui.helperText]}>
                      Budgets are planned spending limits and may include future
                      income.
                    </Text>
                    <Text style={[styles.insightText, ui.helperText]}>
                      Budgets are planning tools, not wallet restrictions.
                    </Text>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}
          </ScrollView>

          <Pressable
            style={[
              styles.addButton,
              isAddEnabled && !isSaving ? ui.addButton : ui.addButtonDisabled,
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.addButtonText, ui.addButtonText]}>
              {isSaving ? "Creating Budget..." : "Create Budget"}
            </Text>
          </Pressable>
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
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "82%",
  },
  handle: {
    alignSelf: "center",
    width: 50,
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
    fontSize: 21,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 22,
  },
  label: {
    marginBottom: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectField: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  dropdownCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownItem: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropdownItemText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDropdownState: {
    minHeight: 72,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDropdownText: {
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  amountField: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    paddingVertical: 0,
  },
  helperText: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  overviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  overviewCardLight: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  overviewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewHeaderText: {
    flex: 1,
  },
  overviewTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  overviewSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  overviewRows: {
    marginTop: 16,
    gap: 10,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  overviewLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  overviewValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "right",
  },
  overviewStatus: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  overviewStatusText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  insightCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  insightText: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  addButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 20,
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
