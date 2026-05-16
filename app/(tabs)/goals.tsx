import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalAvatar } from "@/components/goal-avatar";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
} from "@/src/lib/goals";

const suggestedGoals = [
  { title: "House Fund", iconName: "home", color: "#1495FF" },
  { title: "Christmas", iconName: "gift-outline", color: "#E11D48" },
  { title: "Travel", iconName: "airplane", color: "#7E7CFF" },
] as const;

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export default function GoalsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const { goals, overview, isLoading, refresh } = useSavingsGoals();

  const activeGoals = useMemo(
    () => goals.filter((goal) => !goal.isArchived),
    [goals],
  );
  const archivedGoals = useMemo(
    () => goals.filter((goal) => goal.isArchived),
    [goals],
  );
  const highlightedGoal =
    activeGoals.find((goal) => !goal.isCompleted) ?? activeGoals[0] ?? null;

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      title: { color: colors.foreground },
      mutedText: {
        color: colorScheme === "light" ? "#5B6980" : colors.mutedForeground,
      },
      headerAction: {
        backgroundColor: colorScheme === "light" ? colors.primary : "#1495FF",
      },
      summaryGradient:
        colorScheme === "light"
          ? (["#31DC95", "#1CCB7F", "#14915E"] as const)
          : (["#1AB877", "#119B63", "#096A44"] as const),
      summaryCard: {
        borderColor:
          colorScheme === "light"
            ? "rgba(255, 255, 255, 0.12)"
            : "rgba(255, 255, 255, 0.06)",
        shadowOpacity: colorScheme === "light" ? 0.12 : 0.14,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 4,
      },
      summaryLabelText: { color: "rgba(244,255,249,0.76)" },
      summaryTitleText: { color: "#FFFFFF" },
      summaryMiniDivider: {
        backgroundColor: "rgba(255,255,255,0.12)",
      },
      summaryBottomBorder: {
        borderTopColor: "rgba(255,255,255,0.14)",
      },
      summaryTrack: {
        backgroundColor: "rgba(255,255,255,0.20)",
      },
      goalCard: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.96)
            : "rgba(255,255,255,0.05)",
      },
      track: {
        backgroundColor: colorScheme === "light" ? "#E8EDF4" : "#1B2433",
      },
      divider: {
        backgroundColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.88)
            : "rgba(255,255,255,0.05)",
      },
      chip: {
        backgroundColor:
          colorScheme === "light"
            ? withOpacity(colors.secondary, 0.9)
            : "#1A2230",
      },
      coachCard: {
        backgroundColor: colorScheme === "light" ? "#EAF5FF" : "#061A31",
        borderColor:
          colorScheme === "light"
            ? "rgba(20,149,255,0.18)"
            : "rgba(20,149,255,0.16)",
      },
      coachTitle: { color: colorScheme === "light" ? "#0D1B2A" : "#FFFFFF" },
      coachGoalName: { color: colorScheme === "light" ? "#0E67F7" : "#5B9CF7" },
      coachText: { color: colorScheme === "light" ? "#58718E" : "#99A8BB" },
      coachButton: {
        backgroundColor: colorScheme === "light" ? "#1495FF" : "#1697FF",
      },
      chipCard: {
        backgroundColor: colorScheme === "light" ? colors.card : "#101722",
        borderColor:
          colorScheme === "light"
            ? withOpacity(colors.border, 0.96)
            : "rgba(255,255,255,0.05)",
      },
      progressText: { color: "#FFFFFF" },
    }),
    [colorScheme, colors],
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, pageStyles.title]}>
                Savings Goals
              </Text>
              <Text style={[styles.subtitle, pageStyles.mutedText]}>
                Make saving feel visible and deliberate
              </Text>
            </View>

            <Pressable
              style={[styles.headerAction, pageStyles.headerAction]}
              onPress={() => router.push("/new-savings-goal-modal")}
            >
              <Feather name="plus" size={24} color="#000000" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void refresh()}
            />
          }
        >
          <LinearGradient
            colors={pageStyles.summaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, pageStyles.summaryCard]}
          >
            <View style={styles.summaryTopRow}>
              <Text style={[styles.summaryLabel, pageStyles.summaryLabelText]}>
                Total Saved
              </Text>
              <View style={styles.summaryRight}>
                <View style={styles.summaryMiniStat}>
                  <Text
                    style={[
                      styles.summaryMiniValue,
                      pageStyles.summaryTitleText,
                    ]}
                  >
                    {overview.activeGoalsCount}
                  </Text>
                  <Text
                    style={[
                      styles.summaryMiniLabel,
                      pageStyles.summaryLabelText,
                    ]}
                  >
                    Active
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryMiniDivider,
                    pageStyles.summaryMiniDivider,
                  ]}
                />
                <View style={styles.summaryMiniStat}>
                  <Text
                    style={[
                      styles.summaryMiniValue,
                      pageStyles.summaryTitleText,
                    ]}
                  >
                    {overview.completedGoalsCount}
                  </Text>
                  <Text
                    style={[
                      styles.summaryMiniLabel,
                      pageStyles.summaryLabelText,
                    ]}
                  >
                    Done
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.summaryAmount, pageStyles.summaryTitleText]}>
              {formatCurrency(overview.totalSaved)}
            </Text>

            <View
              style={[styles.summaryBottom, pageStyles.summaryBottomBorder]}
            >
              <View style={styles.summaryProgressRow}>
                <Text
                  style={[
                    styles.summaryProgressLabel,
                    pageStyles.summaryLabelText,
                  ]}
                >
                  Progress
                </Text>
                <Text
                  style={[
                    styles.summaryProgressValue,
                    pageStyles.summaryTitleText,
                  ]}
                >
                  {`${formatCurrency(overview.totalSaved)} / ${formatCurrency(overview.totalTarget)}`}
                </Text>
              </View>

              <View style={[styles.summaryTrack, pageStyles.summaryTrack]}>
                <View
                  style={[
                    styles.summaryFillWrap,
                    { width: `${overview.overallProgress}%` },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255,255,255,0.98)",
                      "rgba(223,255,241,0.92)",
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.summaryFill}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>

          {!activeGoals.length ? (
            <View style={[styles.emptyCard, pageStyles.chipCard, shadows.soft]}>
              <Image
                contentFit="contain"
                source={require("@/assets/images/Eyrie_Mascot_1.png")}
                style={styles.emptyMascot}
              />
              <Text style={[styles.emptyTitle, pageStyles.title]}>
                Start your first savings goal and turn dreams into plans.
              </Text>
              <Text style={[styles.emptyText, pageStyles.mutedText]}>
                Goals track progress separately from budgets and expenses, so
                every contribution feels intentional.
              </Text>
              <Pressable
                style={[styles.emptyButton, pageStyles.coachButton]}
                onPress={() => router.push("/new-savings-goal-modal")}
              >
                <Text style={styles.emptyButtonText}>Create Goal</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.goalsList}>
              {activeGoals.map((goal) => (
                <Pressable
                  key={goal.id}
                  style={[styles.goalCard, pageStyles.goalCard, shadows.soft]}
                  onPress={() =>
                    router.push({
                      pathname: "/goal-details-modal",
                      params: { goalId: goal.id },
                    })
                  }
                >
                  <View style={styles.goalTopRow}>
                    <View style={styles.goalIdentity}>
                      <View
                        style={[
                          styles.goalIconWrap,
                          { backgroundColor: `${goal.color ?? "#1495FF"}22` },
                        ]}
                      >
                        <GoalAvatar goal={goal} size={22} />
                      </View>
                      <View style={styles.goalTextBlock}>
                        <Text style={[styles.goalTitle, pageStyles.title]}>
                          {goal.title}
                        </Text>
                        <Text style={[styles.goalTarget, pageStyles.mutedText]}>
                          {`Target ${formatMonthYear(goal.targetDate)}`}
                        </Text>
                      </View>
                    </View>

                    <Feather
                      name="chevron-right"
                      size={22}
                      color={colors.mutedForeground}
                    />
                  </View>

                  <View style={styles.goalAmountsRow}>
                    <Text style={[styles.goalSaved, pageStyles.title]}>
                      {formatCurrency(goal.currentAmount)}
                    </Text>
                    <Text
                      style={[styles.goalAmountTarget, pageStyles.mutedText]}
                    >
                      {formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>

                  <View style={[styles.goalTrack, pageStyles.track]}>
                    <View
                      style={[
                        styles.goalFill,
                        {
                          width: `${goal.metrics.progressPercentage}%`,
                          backgroundColor: goal.metrics.isCompleted
                            ? "#10B981"
                            : (goal.color ?? "#1495FF"),
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.goalStatusRow}>
                    <Text style={[styles.goalAchieved, pageStyles.mutedText]}>
                      {goal.metrics.isCompleted
                        ? "Completed"
                        : `${Math.round(goal.metrics.progressPercentage)}% funded`}
                    </Text>
                    <Text style={[styles.goalRemaining, pageStyles.mutedText]}>
                      {goal.metrics.isCompleted
                        ? "Ready for your next goal"
                        : `${formatCurrency(goal.metrics.remainingAmount)} left`}
                    </Text>
                  </View>

                  <View style={[styles.goalDivider, pageStyles.divider]} />

                  <Text style={[styles.recentLabel, pageStyles.mutedText]}>
                    Recent contributions
                  </Text>
                  <View style={styles.contributionsRow}>
                    {goal.contributions.slice(0, 3).map((entry) => (
                      <View
                        key={entry.id}
                        style={[styles.contributionChip, pageStyles.chip]}
                      >
                        <Text
                          style={[styles.contributionText, pageStyles.title]}
                        >
                          {`+${formatCurrency(entry.amount)}`}
                        </Text>
                        <Text
                          style={[
                            styles.contributionMeta,
                            pageStyles.mutedText,
                          ]}
                        >
                          {formatShortDate(entry.createdAt)}
                        </Text>
                      </View>
                    ))}
                    {!goal.contributions.length ? (
                      <View style={[styles.contributionChip, pageStyles.chip]}>
                        <Text
                          style={[styles.contributionText, pageStyles.title]}
                        >
                          No contributions yet
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {archivedGoals.length ? (
            <View style={styles.archiveSection}>
              <View style={styles.archiveHeader}>
                <Text style={[styles.archiveTitle, pageStyles.title]}>
                  Archived Goals
                </Text>
                <Text style={[styles.archiveCount, pageStyles.mutedText]}>
                  {`${archivedGoals.length} archived`}
                </Text>
              </View>

              <View style={styles.archiveList}>
                {archivedGoals.map((goal) => (
                  <Pressable
                    key={goal.id}
                    style={[
                      styles.archiveCard,
                      pageStyles.goalCard,
                      shadows.soft,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/goal-details-modal",
                        params: { goalId: goal.id },
                      })
                    }
                  >
                    <View style={styles.archiveIdentity}>
                      <View
                        style={[
                          styles.archiveIconWrap,
                          { backgroundColor: `${goal.color ?? "#1495FF"}22` },
                        ]}
                      >
                        <GoalAvatar goal={goal} size={18} />
                      </View>
                      <View style={styles.archiveTextBlock}>
                        <Text
                          style={[styles.archiveGoalTitle, pageStyles.title]}
                        >
                          {goal.title}
                        </Text>
                        <Text
                          style={[styles.archiveGoalMeta, pageStyles.mutedText]}
                        >
                          {`${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.archiveRight}>
                      <Text style={[styles.archiveBadge, pageStyles.mutedText]}>
                        Archived
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {highlightedGoal ? (
            <View style={[styles.coachCard, pageStyles.coachCard]}>
              <View style={styles.coachTopRow}>
                <View style={styles.coachAvatarFrame}>
                  <Image
                    contentFit="cover"
                    source={require("@/assets/images/Eyrie_Mascot_1.png")}
                    style={styles.coachAvatar}
                  />
                </View>
                <View style={styles.coachTextBlock}>
                  <Text style={[styles.coachTitle, pageStyles.coachTitle]}>
                    Savings Insight
                  </Text>
                  <Text
                    style={[styles.coachGoalName, pageStyles.coachGoalName]}
                  >
                    {highlightedGoal.title}
                  </Text>
                  <Text style={[styles.coachText, pageStyles.coachText]}>
                    {highlightedGoal.insights[0]?.message ??
                      `You need about ${formatCurrency(highlightedGoal.metrics.monthlyTarget)} each month to stay on track.`}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.coachButton, pageStyles.coachButton]}
                onPress={() => {
                  if (highlightedGoal.isCompleted) {
                    router.push("/new-savings-goal-modal");
                  } else {
                    router.push({
                      pathname: "/add-contribution-modal",
                      params: { goalId: highlightedGoal.id },
                    });
                  }
                }}
              >
                <Text style={styles.coachButtonText}>
                  {highlightedGoal.isCompleted
                    ? "Create New Goal"
                    : "Add Contribution"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.suggestedSection}>
            <Text style={[styles.suggestedTitle, pageStyles.title]}>
              Suggested Goals
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedRow}
            >
              {suggestedGoals.map((item) => (
                <Pressable
                  key={item.title}
                  style={[styles.suggestedChip, pageStyles.chipCard]}
                  onPress={() =>
                    router.push({
                      pathname: "/new-savings-goal-modal",
                      params: {
                        suggestedName: item.title,
                        suggestedIconName: item.iconName,
                        suggestedColor: item.color,
                      },
                    })
                  }
                >
                  <View
                    style={[
                      styles.suggestedIconWrap,
                      { backgroundColor: item.color },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={[styles.suggestedChipText, pageStyles.title]}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  headerBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 150 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginTop: 18,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: "hidden",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.2,
  },
  summaryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryMiniStat: { alignItems: "flex-end" },
  summaryMiniDivider: {
    width: 1,
    height: 22,
  },
  summaryMiniValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
    fontVariant: ["tabular-nums"],
  },
  summaryMiniLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeights.regular,
  },
  summaryAmount: {
    marginTop: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  summaryBottom: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summaryProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryProgressLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
  },
  summaryProgressValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
    fontVariant: ["tabular-nums"],
  },
  summaryTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  summaryFillWrap: {
    height: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  summaryFill: { width: "100%", height: "100%", borderRadius: radius.full },
  goalsList: { gap: 16, marginTop: 18 },
  goalCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  goalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTextBlock: { flex: 1 },
  goalTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  goalTarget: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  goalAmountsRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalSaved: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  goalAmountTarget: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  goalTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: radius.full },
  goalStatusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  goalAchieved: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17 },
  goalRemaining: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  goalDivider: { marginTop: 16, height: 1 },
  recentLabel: {
    marginTop: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  contributionsRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contributionChip: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contributionText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
  },
  contributionMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  coachCard: { marginTop: 24, borderRadius: 28, borderWidth: 1, padding: 16 },
  coachTopRow: { flexDirection: "row", gap: 12 },
  coachAvatarFrame: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  coachAvatar: { width: "100%", height: "100%" },
  coachTextBlock: { flex: 1 },
  coachTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  coachGoalName: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  coachText: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  coachButton: {
    marginTop: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  coachButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  archiveSection: { marginTop: 24 },
  archiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  archiveTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  archiveCount: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  archiveList: { marginTop: 14, gap: 12 },
  archiveCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  archiveIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  archiveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveTextBlock: { flex: 1 },
  archiveGoalTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  archiveGoalMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  archiveRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  archiveBadge: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  suggestedSection: { marginTop: 24 },
  suggestedTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  suggestedRow: { gap: 12, paddingTop: 14, paddingRight: 14 },
  suggestedChip: {
    minWidth: 138,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  suggestedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestedChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  emptyCard: {
    marginTop: 24,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  emptyMascot: { width: 120, height: 120 },
  emptyTitle: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 18,
    minHeight: 46,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
