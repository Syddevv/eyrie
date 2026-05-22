import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CategoryAvatar } from "@/components/category-avatar";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/hooks/use-dashboard";
import { useBudgets, type BudgetCycle } from "@/hooks/useBudgets";
import { budgetsService } from "@/src/db/services";
import {
  formatNextResetDate,
  formatResetDateLabel,
  formatResetDateLabelFromNextResetDate,
} from "@/src/db/utils/time";
import {
  formatBudgetBalanceLabel,
  getBudgetProgressRatio,
  getBudgetStatusCopy,
  getBudgetUsagePercent,
  getBudgetVisualState,
} from "@/src/lib/budget-presentation";
import { showSuccessToast } from "@/store/useToastStore";
import { useBottomNavStore } from "@/store/useBottomNavStore";

type BudgetCard = ReturnType<typeof useBudgets>["budgets"][number];

function sanitizeBudgetInput(value: string) {
  return value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d{0,2}).*$/, "$1");
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

function renderBudgetIcon(item: BudgetCard) {
  return (
    <CategoryAvatar
      category={{
        iconType: item.categoryIconType,
        iconName: item.categoryIcon,
        iconImageUri: item.categoryIconImageUri,
        emoji: item.categoryEmoji,
        color: item.categoryColor,
      }}
      size={22}
    />
  );
}

function cycleLabel(value: BudgetCycle) {
  if (value === "weekly") {
    return "Weekly";
  }

  if (value === "biweekly") {
    return "Bi-Weekly";
  }

  return "Monthly";
}

const FLOATING_TAB_BAR_CLEARANCE = 104;
const BUDGET_CYCLE_STORAGE_KEY = "eyrie:budget-cycle-selection";

export default function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const [selectedCycle, setSelectedCycle] = useState<BudgetCycle>("monthly");
  const { budgets, summary, isLoading, refresh, nextResetDate } =
    useBudgets(selectedCycle, undefined, { syncCycle: true });
  const [editingBudget, setEditingBudget] = useState<BudgetCard | null>(null);
  const [draftBudgetValue, setDraftBudgetValue] = useState("");
  const [budgetPendingDelete, setBudgetPendingDelete] =
    useState<BudgetCard | null>(null);
  const [isDeletingBudget, setIsDeletingBudget] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      title: { color: colors.foreground },
      mutedText: {
        color: colorScheme === "light" ? "#5B6980" : colors.mutedForeground,
      },
      totalGradient:
        colorScheme === "light"
          ? (["#1F9BFF", "#178BFF", "#117FFF"] as const)
          : (["#127FF0", "#0E71E2", "#0D5CCA"] as const),
      totalWarningGradient:
        colorScheme === "light"
          ? (["#F59E0B", "#F97316", "#EA580C"] as const)
          : (["#D97706", "#EA580C", "#C2410C"] as const),
      totalDangerGradient:
        colorScheme === "light"
          ? (["#F97316", "#EF4444", "#DC2626"] as const)
          : (["#EA580C", "#DC2626", "#B91C1C"] as const),
      cycleCard: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.96)
            : "rgba(255,255,255,0.05)",
      },
      segmentInactive: {
        backgroundColor:
          colorScheme === "light"
            ? withOpacity(colors.secondary, 0.92)
            : "#1A2230",
      },
      tipCard: {
        backgroundColor:
          colorScheme === "light"
            ? "rgba(226, 251, 240, 0.95)"
            : "rgba(2, 61, 48, 0.48)",
        borderColor:
          colorScheme === "light"
            ? "rgba(83, 214, 156, 0.28)"
            : "rgba(53, 211, 165, 0.24)",
      },
      tipAvatarWrap: {
        borderColor: colorScheme === "light" ? "#BCEEDD" : "#CFEFE8",
        backgroundColor: colorScheme === "light" ? "#BCEEDD" : "#CFEFE8",
      },
      tipTitle: { color: colorScheme === "light" ? "#13A76B" : "#70F4B4" },
      tipText: { color: colorScheme === "light" ? "#188A61" : "#69EEA9" },
      addButton: {
        backgroundColor: colorScheme === "light" ? colors.primary : "#1697FF",
      },
      categoryCard: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.96)
            : "rgba(255,255,255,0.04)",
      },
      categoryWarningCard: {
        backgroundColor:
          colorScheme === "light" ? "#FFF9ED" : "rgba(68, 43, 8, 0.9)",
        borderColor:
          colorScheme === "light"
            ? "rgba(245, 158, 11, 0.28)"
            : "rgba(251, 191, 36, 0.22)",
      },
      categoryDangerCard: {
        backgroundColor:
          colorScheme === "light" ? "#FFF3F2" : "rgba(68, 18, 18, 0.92)",
        borderColor:
          colorScheme === "light"
            ? "rgba(239, 68, 68, 0.24)"
            : "rgba(248, 113, 113, 0.22)",
      },
      actionButton: {
        backgroundColor:
          colorScheme === "light"
            ? withOpacity(colors.secondary, 0.92)
            : "#1A2230",
      },
      categorySpent: { color: colorScheme === "light" ? "#6E7787" : "#9EA6B5" },
      categoryLeftLabel: {
        color: colorScheme === "light" ? "#7E8796" : "#8C93A3",
      },
      progressTrack: {
        backgroundColor: colorScheme === "light" ? "#E8EDF4" : "#1B2433",
      },
      totalProgressTrack: {
        backgroundColor:
          colorScheme === "light"
            ? "rgba(255,255,255,0.22)"
            : "rgba(255,255,255,0.18)",
      },
      totalResetHelper: {
        color:
          colorScheme === "light"
            ? "rgba(255,255,255,0.82)"
            : "rgba(255,255,255,0.76)",
      },
      modalOverlay: {
        backgroundColor:
          colorScheme === "light"
            ? "rgba(15, 23, 42, 0.24)"
            : "rgba(2, 6, 23, 0.58)",
      },
      modalSheet: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.98)
            : "rgba(255,255,255,0.06)",
      },
      modalHandle: {
        backgroundColor: colorScheme === "light" ? "#CBD5E1" : "#64748B",
      },
      modalCloseButton: {
        backgroundColor:
          colorScheme === "light"
            ? withOpacity(colors.secondary, 0.96)
            : "#1A2230",
      },
      modalMutedText: {
        color: colorScheme === "light" ? "#5B6980" : "#9EA6B5",
      },
      budgetInput: {
        backgroundColor: colorScheme === "light" ? colors.card : "#172132",
        borderColor: colorScheme === "light" ? "#9FD0FF" : "#2E8FFF",
      },
      budgetInputText: { color: colors.foreground },
      emptyCard: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.96)
            : "rgba(255,255,255,0.04)",
      },
      totalOverText: { color: colorScheme === "light" ? "#FFE2E0" : "#FFE2E0" },
      totalWarningText: {
        color: colorScheme === "light" ? "#FFF2CC" : "#FFF2CC",
      },
    }),
    [colorScheme, colors],
  );

  const styles = useMemo(() => createStyles(), []);

  useEffect(() => {
    AsyncStorage.getItem(BUDGET_CYCLE_STORAGE_KEY)
      .then((storedValue) => {
        if (
          storedValue === "weekly" ||
          storedValue === "biweekly" ||
          storedValue === "monthly"
        ) {
          setSelectedCycle(storedValue);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(BUDGET_CYCLE_STORAGE_KEY, selectedCycle).catch(
      () => undefined,
    );
  }, [selectedCycle]);

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

  const startEditingBudget = (budget: BudgetCard) => {
    setEditingBudget(budget);
    setDraftBudgetValue(String(budget.budgetLimit));
  };

  const cancelEditingBudget = () => {
    setEditingBudget(null);
    setDraftBudgetValue("");
  };

  // Hide the floating bottom nav while any screen-level modal sheet is open.
  const bottomNavVisible = useBottomNavStore((s) => s.visible);
  useEffect(() => {
    if (editingBudget || budgetPendingDelete) {
      useBottomNavStore.getState().hide();
    } else {
      useBottomNavStore.getState().show();
    }

    return () => {
      useBottomNavStore.getState().show();
    };
  }, [budgetPendingDelete, editingBudget]);

  const saveEditingBudget = async () => {
    if (!editingBudget) {
      return;
    }

    const nextBudgetAmount = Number(draftBudgetValue);

    if (!nextBudgetAmount || nextBudgetAmount <= 0) {
      cancelEditingBudget();
      return;
    }

    try {
      await budgetsService.update(
        editingBudget.id,
        {
          amount: nextBudgetAmount,
        },
        { notifySuccess: false },
      );
      cancelEditingBudget();
      await refresh(true);
      showSuccessToast({
        title: "Budget Updated",
        message: "Your budget has been updated.",
        dedupeKey: "budget:update:ui",
        source: "budget-screen",
      });
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Unable to update budget.",
      );
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetPendingDelete) {
      return;
    }

    setIsDeletingBudget(true);

    try {
      await budgetsService.delete(budgetPendingDelete.id, {
        notifySuccess: false,
      });
      if (editingBudget?.id === budgetPendingDelete.id) {
        cancelEditingBudget();
      }
      setBudgetPendingDelete(null);
      await refresh(true);
      showSuccessToast({
        title: "Budget Deleted",
        message: "The budget has been removed.",
        dedupeKey: "budget:delete:ui",
        source: "budget-screen",
      });
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error instanceof Error ? error.message : "Unable to delete budget.",
      );
    } finally {
      setIsDeletingBudget(false);
    }
  };

  const totalRemainingRaw = summary.limit - summary.spent;
  const totalProgress = getBudgetProgressRatio(summary.spent, summary.limit);
  const totalUsagePercent = getBudgetUsagePercent(summary.spent, summary.limit);
  const totalVisualState = getBudgetVisualState(summary.spent, summary.limit);
  const totalStatusCopy = getBudgetStatusCopy(
    totalVisualState,
    Math.max(0, summary.spent - summary.limit),
    totalUsagePercent,
  );
  const totalBalanceLabel = formatBudgetBalanceLabel(totalRemainingRaw);
  const totalProgressWidth = `${Math.min(Math.max(totalProgress, 0), 1) * 100}%`;
  const totalProgressLabel =
    summary.limit > 0
      ? `${Math.round(totalUsagePercent)}% used`
      : "No budget set";
  const totalGradientColors =
    totalVisualState === "over"
      ? pageStyles.totalDangerGradient
      : totalVisualState === "warning"
        ? pageStyles.totalWarningGradient
        : pageStyles.totalGradient;
  const totalProgressFillColor =
    totalVisualState === "over"
      ? "#FEE2E2"
      : totalVisualState === "warning"
        ? "#FDE68A"
        : "#FFC21A";
  const totalResetLabel = budgets.length
    ? formatResetDateLabelFromNextResetDate(
        nextResetDate,
        new Date(),
        selectedCycle,
      )
    : formatResetDateLabel({
        createdAt: new Date(),
        cycle: selectedCycle,
        currentDate: new Date(),
      });

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, pageStyles.title]}>Budget</Text>
          <Text style={[styles.subtitle, pageStyles.mutedText]}>
            Track your spending limits
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={totalGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            <View style={styles.totalBubble} />
            <View style={styles.totalTopRow}>
              <Text style={styles.totalLabel}>Total Budget</Text>
              <View style={styles.totalPill}>
                <Feather
                  name={
                    totalVisualState === "over"
                      ? "alert-triangle"
                      : totalVisualState === "warning"
                        ? "alert-circle"
                        : "trending-down"
                  }
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.totalPillText}>{totalProgressLabel}</Text>
              </View>
            </View>

            <Text style={styles.totalAmount}>
              {formatCurrency(summary.limit)}
            </Text>

            <View
              style={[styles.totalProgressTrack, pageStyles.totalProgressTrack]}
            >
              <View
                style={[
                  styles.totalProgressFill,
                  {
                    width: totalProgressWidth,
                    backgroundColor: totalProgressFillColor,
                  },
                ]}
              />
            </View>

            <Text
              style={[styles.totalResetHelper, pageStyles.totalResetHelper]}
            >
              {totalResetLabel}
            </Text>

            {totalVisualState !== "safe" ? (
              <View style={styles.totalAlertRow}>
                <Feather
                  name={totalStatusCopy.icon}
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.totalAlertText}>
                  {totalStatusCopy.long}
                </Text>
              </View>
            ) : null}

            <View style={styles.totalStatsRow}>
              <View>
                <Text style={styles.totalStatLabel}>Spent</Text>
                <Text style={styles.totalSpent}>
                  {formatCurrency(summary.spent)}
                </Text>
              </View>
              <View style={styles.totalStatRight}>
                <Text style={styles.totalStatLabel}>
                  {totalVisualState === "over" ? "Exceeded" : "Remaining"}
                </Text>
                <Text
                  style={[
                    styles.totalRemaining,
                    totalVisualState === "over"
                      ? pageStyles.totalOverText
                      : totalVisualState === "warning"
                        ? pageStyles.totalWarningText
                        : null,
                  ]}
                >
                  {totalBalanceLabel.value}
                  {totalVisualState === "over" ? " over" : ""}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.cycleCard, pageStyles.cycleCard, shadows.card]}>
            <Text style={[styles.cardTitle, pageStyles.title]}>
              Budget Cycle
            </Text>
            <View style={styles.segmentedRow}>
              {(["weekly", "biweekly", "monthly"] as const).map((cycle) => {
                const isActive = selectedCycle === cycle;
                return (
                  <Pressable
                    key={cycle}
                    style={
                      isActive
                        ? styles.segmentActive
                        : [styles.segmentInactive, pageStyles.segmentInactive]
                    }
                    onPress={() => {
                      if (__DEV__) {
                        console.log("[budgets] cycle selected", {
                          from: selectedCycle,
                          to: cycle,
                        });
                      }

                      setSelectedCycle(cycle);
                    }}
                  >
                    <Text
                      style={
                        isActive
                          ? styles.segmentActiveText
                          : [styles.segmentInactiveText, pageStyles.title]
                      }
                    >
                      {cycleLabel(cycle)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.cycleHint, pageStyles.mutedText]}>
              Budgets reset every{" "}
              {selectedCycle === "biweekly"
                ? "two weeks"
                : selectedCycle.slice(0, -2)}{" "}
              while transactions stay in history.
            </Text>
            <Text style={[styles.cycleHint, pageStyles.mutedText]}>
              Next reset: {formatNextResetDate(nextResetDate)}
            </Text>
          </View>

          <View style={[styles.tipCard, pageStyles.tipCard]}>
            <View style={[styles.tipAvatarWrap, pageStyles.tipAvatarWrap]}>
              <Image
                contentFit="cover"
                source={require("@/assets/images/Eyrie_Mascot_1.png")}
                style={styles.tipAvatar}
              />
            </View>
            <View style={styles.tipTextBlock}>
              <Text style={[styles.tipTitle, pageStyles.tipTitle]}>
                Budget Tip
              </Text>
              <Text style={[styles.tipText, pageStyles.tipText]}>
                Budgets are linked directly to your expense categories, so every
                expense updates the right budget automatically.
              </Text>
            </View>
          </View>

          <View style={styles.categoriesHeader}>
            <Text style={[styles.categoriesTitle, pageStyles.title]}>
              Category Budgets
            </Text>
            <Pressable
              style={[styles.addButton, pageStyles.addButton]}
              onPress={() =>
                router.push({
                  pathname: "/add-category-modal",
                  params: { cycle: selectedCycle },
                })
              }
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Create Budget</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View
              style={[styles.emptyCard, pageStyles.emptyCard, shadows.soft]}
            >
              <Text style={[styles.emptyTitle, pageStyles.title]}>
                Loading budgets
              </Text>
              <Text style={[styles.emptyText, pageStyles.mutedText]}>
                Fetching your category spending limits.
              </Text>
            </View>
          ) : budgets.length ? (
            <View style={styles.categoryList}>
              {budgets.map((item) => {
                const visualState = getBudgetVisualState(
                  item.amountSpent,
                  item.budgetLimit,
                );
                const remainingLabel = formatBudgetBalanceLabel(
                  item.remainingAmount,
                );
                const statusCopy = getBudgetStatusCopy(
                  visualState,
                  Math.max(0, item.amountSpent - item.budgetLimit),
                  getBudgetUsagePercent(item.amountSpent, item.budgetLimit),
                );
                const progressWidth = `${
                  Math.min(
                    Math.max(
                      getBudgetProgressRatio(
                        item.amountSpent,
                        item.budgetLimit,
                      ),
                      0,
                    ),
                    1,
                  ) * 100
                }%`;
                const progressColor =
                  visualState === "over"
                    ? "#EF4444"
                    : visualState === "warning"
                      ? "#F59E0B"
                      : item.categoryColor;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.categoryCard,
                      pageStyles.categoryCard,
                      visualState === "warning"
                        ? pageStyles.categoryWarningCard
                        : null,
                      visualState === "over"
                        ? pageStyles.categoryDangerCard
                        : null,
                      shadows.soft,
                    ]}
                  >
                    <View style={styles.categoryTopRow}>
                      <View style={styles.categoryIdentity}>
                        <View
                          style={[
                            styles.categoryIconWrap,
                            {
                              backgroundColor: withOpacity(
                                item.categoryColor,
                                0.16,
                              ),
                            },
                          ]}
                        >
                          {renderBudgetIcon(item)}
                        </View>
                        <View>
                          <Text
                            style={[styles.categoryTitle, pageStyles.title]}
                          >
                            {item.categoryName}
                          </Text>
                          <Text
                            style={[
                              styles.categoryTransactions,
                              pageStyles.mutedText,
                            ]}
                          >
                            {item.transactionCount} transaction
                            {item.transactionCount === 1 ? "" : "s"}
                          </Text>
                          {visualState !== "safe" ? (
                            <View
                              style={[
                                styles.warningBadge,
                                visualState === "over"
                                  ? styles.warningBadgeDanger
                                  : styles.warningBadgeWarning,
                              ]}
                            >
                              <Feather
                                name={statusCopy.icon}
                                size={12}
                                color={
                                  visualState === "over" ? "#B91C1C" : "#B45309"
                                }
                              />
                              <Text
                                style={[
                                  styles.warningBadgeText,
                                  visualState === "over"
                                    ? styles.warningBadgeTextDanger
                                    : styles.warningBadgeTextWarning,
                                ]}
                              >
                                {statusCopy.short}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.categoryActions}>
                        <Pressable
                          style={[styles.actionButton, pageStyles.actionButton]}
                          onPress={() => startEditingBudget(item)}
                        >
                          <Feather
                            name="edit-3"
                            size={16}
                            color={colors.foreground}
                          />
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, pageStyles.actionButton]}
                          onPress={() => setBudgetPendingDelete(item)}
                        >
                          <Feather
                            name="trash-2"
                            size={16}
                            color={colors.foreground}
                          />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.categoryAmountsRow}>
                      <Text
                        style={[styles.categorySpent, pageStyles.categorySpent]}
                      >
                        {formatCurrency(item.amountSpent)} /{" "}
                        {formatCurrency(item.budgetLimit)}
                      </Text>
                      <Text
                        style={[
                          styles.categoryRemaining,
                          {
                            color:
                              visualState === "over"
                                ? "#EF4444"
                                : visualState === "warning"
                                  ? "#F59E0B"
                                  : item.categoryColor,
                          },
                        ]}
                      >
                        {remainingLabel.value}{" "}
                        <Text
                          style={[
                            styles.categoryLeftLabel,
                            pageStyles.categoryLeftLabel,
                          ]}
                        >
                          {remainingLabel.suffix === "remaining"
                            ? "left"
                            : remainingLabel.suffix}
                        </Text>
                      </Text>
                    </View>

                    {visualState !== "safe" ? (
                      <View style={styles.categoryWarningRow}>
                        <Feather
                          name={statusCopy.icon}
                          size={12}
                          color={visualState === "over" ? "#DC2626" : "#D97706"}
                        />
                        <Text
                          style={[
                            styles.categoryWarningText,
                            {
                              color:
                                visualState === "over" ? "#DC2626" : "#D97706",
                            },
                          ]}
                        >
                          {statusCopy.long}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.categoryProgressTrack,
                        pageStyles.progressTrack,
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: progressWidth,
                            backgroundColor: progressColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={[styles.emptyCard, pageStyles.emptyCard, shadows.soft]}
            >
              <Text style={[styles.emptyTitle, pageStyles.title]}>
                No budgets yet
              </Text>
              <Text style={[styles.emptyText, pageStyles.mutedText]}>
                Create your first budget to start tracking spending limits.
              </Text>
              <Pressable
                style={[styles.emptyCtaButton, pageStyles.addButton]}
                onPress={() =>
                  router.push({
                    pathname: "/add-category-modal",
                    params: { cycle: selectedCycle },
                  })
                }
              >
                <Text style={styles.emptyCtaText}>Create Budget</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>

      {editingBudget ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.modalWrap}
        >
          <View style={[styles.modalOverlay, pageStyles.modalOverlay]}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={cancelEditingBudget}
            />

            <View
              style={[
                styles.editSheet,
                pageStyles.modalSheet,
                shadows.floating,
                {
                  marginBottom:
                    keyboardHeight > 0
                      ? Math.max(12, keyboardHeight - 8)
                      : bottomNavVisible
                        ? Math.max(
                            12,
                            insets.bottom + FLOATING_TAB_BAR_CLEARANCE,
                          )
                        : 0,
                },
              ]}
            >
              <View style={[styles.editSheetHandle, pageStyles.modalHandle]} />

              <View style={styles.editSheetHeader}>
                <View style={styles.editSheetIdentity}>
                  <View
                    style={[
                      styles.editSheetIconWrap,
                      {
                        backgroundColor: withOpacity(
                          editingBudget.categoryColor,
                          0.16,
                        ),
                      },
                    ]}
                  >
                    {renderBudgetIcon(editingBudget)}
                  </View>
                  <View style={styles.editSheetTextBlock}>
                    <Text style={[styles.editSheetTitle, pageStyles.title]}>
                      {editingBudget.categoryName}
                    </Text>
                    <Text
                      style={[
                        styles.editSheetSubtitle,
                        pageStyles.modalMutedText,
                      ]}
                    >
                      {cycleLabel(selectedCycle)} budget
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.editSheetCloseButton,
                    pageStyles.modalCloseButton,
                  ]}
                  onPress={cancelEditingBudget}
                >
                  <Feather name="x" size={18} color={colors.foreground} />
                </Pressable>
              </View>

              <View style={styles.editSheetSection}>
                <Text style={[styles.editSheetLabel, pageStyles.title]}>
                  Spent so far
                </Text>
                <Text
                  style={[
                    styles.editSheetSpentValue,
                    pageStyles.modalMutedText,
                  ]}
                >
                  {formatCurrency(editingBudget.amountSpent)} across{" "}
                  {editingBudget.transactionCount} transaction
                  {editingBudget.transactionCount === 1 ? "" : "s"}
                </Text>
              </View>

              <View style={styles.editSheetSection}>
                <Text style={[styles.editSheetLabel, pageStyles.title]}>
                  Budget limit
                </Text>
                <View
                  style={[styles.editSheetAmountField, pageStyles.budgetInput]}
                >
                  <Text
                    style={[
                      styles.editSheetCurrency,
                      pageStyles.modalMutedText,
                    ]}
                  >
                    ₱
                  </Text>
                  <TextInput
                    autoFocus
                    value={draftBudgetValue}
                    onChangeText={(value) =>
                      setDraftBudgetValue(sanitizeBudgetInput(value))
                    }
                    keyboardType="decimal-pad"
                    selectionColor={colors.primary}
                    style={[
                      styles.editSheetAmountInput,
                      pageStyles.budgetInputText,
                    ]}
                  />
                </View>
              </View>

              <View style={styles.editSheetActions}>
                <Pressable
                  style={[
                    styles.editSheetSecondaryButton,
                    pageStyles.actionButton,
                  ]}
                  onPress={cancelEditingBudget}
                >
                  <Text
                    style={[styles.editSheetSecondaryText, pageStyles.title]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.editSheetPrimaryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => void saveEditingBudget()}
                >
                  <Text style={styles.editSheetPrimaryText}>Save Changes</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <DeleteConfirmationModal
        visible={Boolean(budgetPendingDelete)}
        isDeleting={isDeletingBudget}
        title="Delete this budget?"
        message={
          budgetPendingDelete
            ? `Delete the ${budgetPendingDelete.categoryName} budget for this ${cycleLabel(selectedCycle).toLowerCase()} cycle? Spending history stays, but this budget limit will be removed.`
            : ""
        }
        onCancel={() => {
          if (!isDeletingBudget) {
            setBudgetPendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteBudget()}
      />
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    headerBlock: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 16,
      marginTop: 4,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 150,
    },
    title: {
      fontFamily: fontFamilies.sans,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    subtitle: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 22,
    },
    totalCard: {
      marginTop: 8,
      borderRadius: 30,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 18,
      overflow: "hidden",
    },
    totalBubble: {
      position: "absolute",
      width: 132,
      height: 132,
      borderRadius: radius.full,
      top: -28,
      right: -36,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    totalTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
      color: "#D7EEFF",
    },
    totalPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    totalPillText: {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    totalAmount: {
      marginTop: 6,
      fontFamily: fontFamilies.sans,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    totalProgressTrack: {
      marginTop: 18,
      height: 14,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.18)",
      overflow: "hidden",
    },
    totalResetHelper: {
      marginTop: 10,
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.medium,
    },
    totalProgressFill: {
      height: "100%",
      borderRadius: radius.full,
      backgroundColor: "#FFC21A",
    },
    totalStatsRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    totalAlertRow: {
      marginTop: 10,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    totalAlertText: {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    totalStatLabel: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      color: "#D7EEFF",
    },
    totalSpent: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    totalStatRight: {
      alignItems: "flex-end",
    },
    totalRemaining: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
      color: "#71F28E",
    },
    cycleCard: {
      marginTop: 20,
      borderRadius: 26,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    cardTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: fontWeights.bold,
    },
    segmentedRow: {
      marginTop: 16,
      flexDirection: "row",
      gap: 10,
    },
    segmentInactive: {
      flex: 1,
      minHeight: 38,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentInactiveText: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: fontWeights.bold,
    },
    segmentActive: {
      flex: 1,
      minHeight: 38,
      borderRadius: radius.full,
      backgroundColor: "#1697FF",
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActiveText: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    cycleHint: {
      marginTop: 14,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 20,
    },
    tipCard: {
      marginTop: 20,
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    tipAvatarWrap: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    tipAvatar: {
      width: 42,
      height: 42,
      borderRadius: radius.full,
    },
    tipTextBlock: {
      flex: 1,
    },
    tipTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: fontWeights.bold,
    },
    tipText: {
      marginTop: 2,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 22,
    },
    categoriesHeader: {
      marginTop: 22,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    categoriesTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: fontWeights.bold,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      height: 34,
      borderRadius: radius.full,
    },
    addButtonText: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: "#FFFFFF",
    },
    categoryList: {
      marginTop: 14,
      gap: 14,
    },
    categoryCard: {
      borderRadius: 26,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    categoryTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    categoryIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    categoryIconWrap: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: fontWeights.bold,
    },
    categoryTransactions: {
      marginTop: 2,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
    },
    warningBadge: {
      marginTop: 8,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    warningBadgeWarning: {
      backgroundColor: "rgba(245, 158, 11, 0.14)",
    },
    warningBadgeDanger: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
    },
    warningBadgeText: {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: fontWeights.bold,
    },
    warningBadgeTextWarning: {
      color: "#B45309",
    },
    warningBadgeTextDanger: {
      color: "#B91C1C",
    },
    categoryActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    actionButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryAmountsRow: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    categorySpent: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
    },
    categoryRemaining: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
    },
    categoryLeftLabel: {
      fontWeight: fontWeights.regular,
    },
    categoryWarningRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryWarningText: {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.medium,
    },
    categoryProgressTrack: {
      marginTop: 10,
      height: 8,
      borderRadius: radius.full,
      overflow: "hidden",
    },
    categoryProgressFill: {
      height: "100%",
      borderRadius: radius.full,
    },
    emptyCard: {
      marginTop: 16,
      borderRadius: 26,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 24,
      alignItems: "center",
    },
    emptyTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: fontWeights.bold,
    },
    emptyText: {
      marginTop: 8,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    emptyCtaButton: {
      marginTop: 16,
      minWidth: 140,
      height: 40,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyCtaText: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: fontWeights.bold,
      color: "#FFFFFF",
    },
    modalWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    editSheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: "70%",
    },
    editSheetHandle: {
      alignSelf: "center",
      width: 50,
      height: 6,
      borderRadius: radius.full,
      marginBottom: 18,
    },
    editSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    editSheetIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    editSheetIconWrap: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    editSheetTextBlock: {
      flex: 1,
    },
    editSheetTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: fontWeights.bold,
    },
    editSheetSubtitle: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
    },
    editSheetCloseButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    editSheetSection: {
      marginTop: 22,
    },
    editSheetLabel: {
      marginBottom: 10,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
    },
    editSheetSpentValue: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
    },
    editSheetAmountField: {
      minHeight: 50,
      borderRadius: 20,
      borderWidth: 2,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    editSheetCurrency: {
      fontFamily: fontFamilies.sans,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: fontWeights.medium,
    },
    editSheetAmountInput: {
      flex: 1,
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      paddingVertical: 0,
    },
    editSheetActions: {
      marginTop: 28,
      flexDirection: "row",
      gap: 12,
    },
    editSheetSecondaryButton: {
      flex: 1,
      height: 48,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    editSheetPrimaryButton: {
      flex: 1,
      height: 48,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    editSheetSecondaryText: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
    },
    editSheetPrimaryText: {
      color: "#FFFFFF",
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
    },
  });
}
