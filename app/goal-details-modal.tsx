import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { GoalAvatar } from "@/components/goal-avatar";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSavingsGoal } from "@/hooks/useSavingsGoals";
import { goalsService } from "@/src/db/services";
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  getGoalContributionPlan,
} from "@/src/lib/goals";

export default function GoalDetailsModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { goal, isLoading } = useSavingsGoal(goalId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteContributionId, setPendingDeleteContributionId] =
    useState<string | null>(null);
  const [isDeletingContribution, setIsDeletingContribution] = useState(false);
  const contributionPlan = goal ? getGoalContributionPlan(goal) : null;

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
      statCard: {
        backgroundColor: isDark ? "#243147" : "#FFFFFF",
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(226,232,240,0.88)",
      },
      progressTrack: {
        backgroundColor: isDark ? "#162131" : "#E7EDF6",
      },
      historyRow: {
        backgroundColor: isDark ? "#182230" : "#F8FAFD",
      },
      positiveAmount: { color: "#10B981" },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: {
        backgroundColor: isDark ? "#1A2331" : "#EEF3F9",
      },
      archiveButton: {
        backgroundColor: isDark ? "#18212E" : "#F1F4F8",
      },
      destructiveButton: {
        backgroundColor: isDark
          ? "rgba(239, 68, 68, 0.14)"
          : "rgba(239, 68, 68, 0.1)",
      },
      destructiveText: { color: "#EF4444" },
      infoCard: {
        borderColor: isDark ? "rgba(20,149,255,0.18)" : "rgba(20,149,255,0.16)",
      },
    }),
    [colors, isDark],
  );

  const close = () => router.back();

  if (!goal) {
    return (
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, ui.sheet, shadows.floating]}>
          <View style={[styles.handle, ui.handle]} />
          <Text style={[styles.headerTitle, ui.title]}>
            {isLoading ? "Loading goal..." : "Goal not found"}
          </Text>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await goalsService.delete(goal.id);
      setShowDeleteConfirm(false);
      router.replace("/(tabs)/goals");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveToggle = () => {
    const action = goal.isArchived
      ? goalsService.restore(goal.id)
      : goalsService.archive(goal.id);
    void action.then(async () => {
      await Haptics.selectionAsync();
      router.back();
    });
  };

  const handleDeleteContribution = async (contributionId: string) => {
    if (isDeletingContribution) {
      return;
    }

    setIsDeletingContribution(true);

    try {
      await goalsService.deleteContribution(contributionId);
      await Haptics.selectionAsync();
      setPendingDeleteContributionId(null);
    } finally {
      setIsDeletingContribution(false);
    }
  };

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
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
            <View style={styles.headerText}>
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
            onPress={close}
          >
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#227A54", "#16583A"]
                : ["#6EE7B7", "#34D399"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressTopRow}>
              <View>
                <Text style={styles.progressEyebrow}>Total Saved</Text>
                <Text style={styles.savedAmount}>
                  {formatCurrency(goal.currentAmount)}
                </Text>
              </View>
              <View style={styles.progressTopRight}>
                <View style={styles.progressPillGlass}>
                  <Text style={styles.progressPill}>
                    {goal.metrics.isCompleted
                      ? "Goal reached"
                      : `${goal.metrics.daysRemaining} days left`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBottomSectionGlass}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressSectionLabel}>Progress target</Text>
                <Text style={styles.progressSectionValue}>
                  {`${formatCurrency(goal.targetAmount)}`}
                </Text>
              </View>

              <View style={[styles.progressTrack, styles.progressTrackPremium]}>
                <View
                  style={[
                    styles.progressFillWrap,
                    {
                      width: `${goal.metrics.progressPercentage}%`,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#E2FFF4", "#FFFFFF"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.progressFill}
                  />
                  <View style={styles.progressFillGlow} />
                </View>
              </View>

              <View style={styles.progressBottomRow}>
                <Text style={styles.achievedText}>
                  {goal.metrics.isCompleted
                    ? "100% complete"
                    : `${Math.round(goal.metrics.progressPercentage)}% complete`}
                </Text>
                <Text style={styles.remainingText}>
                  {goal.metrics.isCompleted
                    ? "Completed"
                    : `${formatCurrency(goal.metrics.remainingAmount)} left to goal`}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>
                {contributionPlan?.label ?? "Target"}
              </Text>
              <Text style={[styles.summaryValue, ui.title]}>
                {contributionPlan
                  ? `${formatCurrency(contributionPlan.amount)}${contributionPlan.suffix}`
                  : "Build target"}
              </Text>
            </View>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Average add</Text>
              <Text style={[styles.summaryValue, ui.title]}>
                {formatCurrency(goal.metrics.averageContribution)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Linked wallet</Text>
              <Text style={[styles.summaryValue, ui.title]}>
                {goal.linkedWallet?.name ?? "Not linked"}
              </Text>
            </View>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>
                Projected finish
              </Text>
              <Text style={[styles.summaryValue, ui.title]}>
                {goal.metrics.estimatedCompletionLabel ?? "Build history first"}
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={
              isDark
                ? ["rgba(21,109,220,0.28)", "rgba(15,62,125,0.24)"]
                : ["rgba(54,139,255,0.18)", "rgba(27,104,214,0.12)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.infoCard, ui.infoCard]}
          >
            <Text style={[styles.infoTitle, ui.title]}>Insight</Text>
            <Text style={[styles.infoBody, ui.muted]}>
              {goal.insights[0]?.message}
            </Text>
            <Text style={[styles.infoCaption, ui.muted]}>
              Contributions transfer money into savings goals. They are not
              counted as expenses.
            </Text>
          </LinearGradient>

          <Text style={[styles.sectionTitle, ui.title]}>
            Contribution History
          </Text>

          <View style={styles.historyList}>
            {goal.contributionGroups.map((group) => (
              <View key={group.monthKey} style={styles.historyGroup}>
                <Text style={[styles.historyGroupTitle, ui.muted]}>
                  {group.monthLabel}
                </Text>
                {group.entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[styles.historyRow, ui.historyRow]}
                  >
                    <View style={styles.historyLeft}>
                      <View style={styles.historyIconWrap}>
                        <Feather
                          name="arrow-up-right"
                          size={15}
                          color="#10B981"
                        />
                      </View>
                      <View>
                        <Text style={[styles.historyDate, ui.title]}>
                          {formatShortDate(entry.createdAt)}
                        </Text>
                        <Text style={[styles.historyMeta, ui.muted]}>
                          {entry.wallet?.name ?? "Manual contribution"}
                          {entry.note ? ` • ${entry.note}` : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      <Text
                        style={[styles.historyAmount, ui.positiveAmount]}
                      >{`+${formatCurrency(entry.amount)}`}</Text>
                      <Pressable
                        style={[
                          styles.deleteContributionButton,
                          ui.secondaryButton,
                        ]}
                        onPress={() => setPendingDeleteContributionId(entry.id)}
                      >
                        <Feather
                          name="trash-2"
                          size={14}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {!goal.isCompleted && (
          <Pressable
            style={[styles.contributeButton, ui.primaryButton]}
            onPress={() =>
              router.replace({
                pathname: "/add-contribution-modal",
                params: { goalId: goal.id },
              })
            }
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.contributeButtonText}>Add Contribution</Text>
          </Pressable>
        )}

        <View style={styles.footerActions}>
          <Pressable
            style={[styles.footerButton, ui.secondaryButton]}
            onPress={() =>
              router.replace({
                pathname: "/edit-goal-modal",
                params: { goalId: goal.id },
              })
            }
          >
            <Feather name="edit-3" size={18} color={colors.foreground} />
            <Text style={[styles.footerButtonText, ui.title]}>Edit Goal</Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, ui.archiveButton]}
            onPress={handleArchiveToggle}
          >
            <Feather
              name={goal.isArchived ? "archive" : "inbox"}
              size={18}
              color={colors.foreground}
            />
            <Text style={[styles.footerButtonText, ui.title]}>
              {goal.isArchived ? "Restore" : "Archive"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, ui.destructiveButton]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Feather name="trash-2" size={18} color="#EF4444" />
            <Text style={[styles.footerButtonText, ui.destructiveText]}>
              Delete
            </Text>
          </Pressable>
        </View>

      </View>

      <DeleteConfirmationModal
        visible={showDeleteConfirm}
        title="Delete goal?"
        message="This permanently removes the goal and its contribution history."
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />

      <DeleteConfirmationModal
        visible={pendingDeleteContributionId !== null}
        title="Remove contribution?"
        message="This will remove the selected contribution from the goal."
        isDeleting={isDeletingContribution}
        onCancel={() => {
          if (!isDeletingContribution) {
            setPendingDeleteContributionId(null);
          }
        }}
        onConfirm={() => {
          if (pendingDeleteContributionId) {
            void handleDeleteContribution(pendingDeleteContributionId);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderWidth: 1,
    maxHeight: "82%",
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  targetRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: { marginTop: 14 },
  bodyContent: { paddingBottom: 4 },
  progressCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 14,
    overflow: "hidden",
    shadowColor: "transparent",
    elevation: 0,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  progressEyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
  },
  savedAmount: {
    marginTop: 2,
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  progressTopRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  progressPillGlass: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressPill: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
  },
  progressBottomSectionGlass: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressSectionLabel: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  progressSectionValue: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressTrackPremium: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  progressFillWrap: { height: "100%" },
  progressFill: { height: "100%", borderRadius: radius.full },
  progressFillGlow: {
    position: "absolute",
    top: 2,
    bottom: 2,
    right: 4,
    width: 20,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  progressBottomRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  achievedText: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  remainingText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
  },
  summaryRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 64,
    padding: 10,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
  },
  summaryValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
  },
  infoCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  infoTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  infoBody: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCaption: {
    marginTop: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  historyList: { marginTop: 10, gap: 12, paddingBottom: 6 },
  historyGroup: { gap: 8 },
  historyGroupTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  historyRow: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  historyIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyDate: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  historyMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  historyAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  historyRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteContributionButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  contributeButton: {
    marginTop: 16,
    height: 56,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "transparent",
    elevation: 0,
  },
  contributeButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  footerActions: { marginTop: 12, flexDirection: "row", gap: 10 },
  footerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
  },
});
