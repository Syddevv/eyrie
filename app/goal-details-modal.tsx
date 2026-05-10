import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GoalAvatar } from "@/components/goal-avatar";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSavingsGoal } from "@/hooks/useSavingsGoals";
import { goalsService } from "@/src/db/services";
import { formatCurrency, formatMonthYear, formatShortDate } from "@/src/lib/goals";

export default function GoalDetailsModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { goal, isLoading } = useSavingsGoal(goalId);

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? "rgba(2, 6, 23, 0.64)" : "rgba(15, 23, 42, 0.34)" },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.04)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      statCard: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(226,232,240,0.92)",
      },
      progressTrack: {
        backgroundColor: isDark ? "#1B2433" : "#EEF2F7",
      },
      historyRow: {
        backgroundColor: colors.secondary,
      },
      positiveAmount: { color: "#10B981" },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: { backgroundColor: colors.secondary },
      destructiveButton: {
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
      },
      destructiveText: { color: "#EF4444" },
      infoCard: {
        backgroundColor: isDark ? "rgba(20,149,255,0.12)" : "rgba(20,149,255,0.08)",
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
          <Text style={[styles.headerTitle, ui.title]}>{isLoading ? "Loading goal..." : "Goal not found"}</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete goal?", "This permanently removes the goal and its contribution history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void goalsService.delete(goal.id).then(() => {
            router.replace("/(tabs)/goals");
          });
        },
      },
    ]);
  };

  const handleArchiveToggle = () => {
    const action = goal.isArchived ? goalsService.restore(goal.id) : goalsService.archive(goal.id);
    void action.then(async () => {
      await Haptics.selectionAsync();
      router.back();
    });
  };

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${goal.color ?? "#1495FF"}22` }]}>
              <GoalAvatar goal={goal} size={24} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, ui.title]}>{goal.title}</Text>
              <View style={styles.targetRow}>
                <Feather name="calendar" size={13} color={colors.mutedForeground} />
                <Text style={[styles.targetText, ui.muted]}>{`Target ${formatMonthYear(goal.targetDate)}`}</Text>
              </View>
            </View>
          </View>

          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={close}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.progressCard, ui.statCard]}>
            <View style={styles.progressTopRow}>
              <Text style={[styles.savedAmount, ui.title]}>{formatCurrency(goal.currentAmount)}</Text>
              <Text style={[styles.goalAmount, ui.muted]}>{`of ${formatCurrency(goal.targetAmount)}`}</Text>
            </View>

            <View style={[styles.progressTrack, ui.progressTrack]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${goal.metrics.progressPercentage}%`,
                    backgroundColor: goal.metrics.isCompleted ? "#10B981" : goal.color ?? "#1482E9",
                  },
                ]}
              />
            </View>

            <View style={styles.progressBottomRow}>
              <Text style={[styles.achievedText, ui.muted]}>{`${Math.round(goal.metrics.progressPercentage)}% complete`}</Text>
              <Text style={[styles.remainingText, ui.title]}>
                {goal.metrics.isCompleted ? "Completed" : `${formatCurrency(goal.metrics.remainingAmount)} left`}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Monthly target</Text>
              <Text style={[styles.summaryValue, ui.title]}>{formatCurrency(goal.metrics.monthlyTarget)}</Text>
            </View>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Average add</Text>
              <Text style={[styles.summaryValue, ui.title]}>{formatCurrency(goal.metrics.averageContribution)}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Linked wallet</Text>
              <Text style={[styles.summaryValue, ui.title]}>{goal.linkedWallet?.name ?? "Not linked"}</Text>
            </View>
            <View style={[styles.summaryCard, ui.statCard]}>
              <Text style={[styles.summaryLabel, ui.muted]}>Projected finish</Text>
              <Text style={[styles.summaryValue, ui.title]}>{goal.metrics.estimatedCompletionLabel ?? "Build history first"}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, ui.infoCard]}>
            <Text style={[styles.infoTitle, ui.title]}>Insight</Text>
            <Text style={[styles.infoBody, ui.muted]}>{goal.insights[0]?.message}</Text>
            <Text style={[styles.infoCaption, ui.muted]}>
              Contributions transfer money into savings goals. They are not counted as expenses.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, ui.title]}>Contribution History</Text>

          <View style={styles.historyList}>
            {goal.contributionGroups.map((group) => (
              <View key={group.monthKey} style={styles.historyGroup}>
                <Text style={[styles.historyGroupTitle, ui.muted]}>{group.monthLabel}</Text>
                {group.entries.map((entry) => (
                  <View key={entry.id} style={[styles.historyRow, ui.historyRow]}>
                    <View style={styles.historyLeft}>
                      <View style={styles.historyIconWrap}>
                        <Feather name="arrow-up-right" size={15} color="#10B981" />
                      </View>
                      <View>
                        <Text style={[styles.historyDate, ui.title]}>{formatShortDate(entry.createdAt)}</Text>
                        <Text style={[styles.historyMeta, ui.muted]}>
                          {entry.wallet?.name ?? "Manual contribution"}
                          {entry.note ? ` • ${entry.note}` : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyAmount, ui.positiveAmount]}>{`+${formatCurrency(entry.amount)}`}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.contributeButton, ui.primaryButton]}
          onPress={() => router.replace({ pathname: "/add-contribution-modal", params: { goalId: goal.id } })}>
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.contributeButtonText}>Add Contribution</Text>
        </Pressable>

        <View style={styles.footerActions}>
          <Pressable
            style={[styles.footerButton, ui.secondaryButton]}
            onPress={() => router.replace({ pathname: "/edit-goal-modal", params: { goalId: goal.id } })}>
            <Feather name="edit-3" size={18} color={colors.foreground} />
            <Text style={[styles.footerButtonText, ui.title]}>Edit Goal</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, ui.secondaryButton]} onPress={handleArchiveToggle}>
            <Feather name={goal.isArchived ? "archive" : "inbox"} size={18} color={colors.foreground} />
            <Text style={[styles.footerButtonText, ui.title]}>{goal.isArchived ? "Restore" : "Archive"}</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, ui.destructiveButton]} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color="#EF4444" />
            <Text style={[styles.footerButtonText, ui.destructiveText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
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
  handle: { alignSelf: "center", width: 46, height: 5, borderRadius: radius.full, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerIdentity: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerIconWrap: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: fontFamilies.sans, fontSize: 18, lineHeight: 24, fontWeight: fontWeights.bold },
  targetRow: { marginTop: 3, flexDirection: "row", alignItems: "center", gap: 6 },
  targetText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17 },
  closeButton: { width: 34, height: 34, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  bodyScroll: { marginTop: 14 },
  bodyContent: { paddingBottom: 4 },
  progressCard: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  progressTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  savedAmount: { fontFamily: fontFamilies.sans, fontSize: 20, lineHeight: 24, fontWeight: fontWeights.bold },
  goalAmount: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.medium },
  progressTrack: { marginTop: 12, height: 8, borderRadius: radius.full, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: radius.full },
  progressBottomRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  achievedText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17 },
  remainingText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17, fontWeight: fontWeights.bold },
  summaryRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  summaryLabel: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17 },
  summaryValue: { marginTop: 6, fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.bold },
  infoCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, padding: 14 },
  infoTitle: { fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 19, fontWeight: fontWeights.bold },
  infoBody: { marginTop: 6, fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 18 },
  infoCaption: { marginTop: 8, fontFamily: fontFamilies.sans, fontSize: 11, lineHeight: 15 },
  sectionTitle: { marginTop: 18, fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.bold },
  historyList: { marginTop: 10, gap: 12, paddingBottom: 6 },
  historyGroup: { gap: 8 },
  historyGroupTitle: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17, fontWeight: fontWeights.medium },
  historyRow: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  historyIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyDate: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.medium },
  historyMeta: { marginTop: 2, fontFamily: fontFamilies.sans, fontSize: 11, lineHeight: 14 },
  historyAmount: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.bold },
  contributeButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  contributeButtonText: { color: "#FFFFFF", fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.bold },
  footerActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  footerButton: { flex: 1, minHeight: 42, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  footerButtonText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17, fontWeight: fontWeights.bold },
});
