import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomNav } from "@/components/app-bottom-nav";
import { themeColors } from "@/constants/colors";
import { homeCards, homeWallets } from "@/constants/payment-methods";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  formatCurrency,
  useBudgetProgress,
  useDashboardBootstrap,
  useDashboardError,
  useDashboardLoading,
  useDashboardSummary,
  useGoalsProgress,
  useRecentTransactions,
  useSpendingBreakdown,
} from "@/hooks/use-dashboard";

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

function renderDashboardIcon(
  item: {
    iconLibrary: "feather" | "material";
    iconName: string;
    iconColor: string;
  },
  size: number,
) {
  if (item.iconLibrary === "material") {
    return (
      <MaterialCommunityIcons
        name={
          item.iconName as ComponentProps<typeof MaterialCommunityIcons>["name"]
        }
        size={size}
        color={item.iconColor}
      />
    );
  }

  return (
    <Feather
      name={item.iconName as ComponentProps<typeof Feather>["name"]}
      size={size}
      color={item.iconColor}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const summary = useDashboardSummary();
  const recentTransactions = useRecentTransactions();
  const activeBudgets = useBudgetProgress();
  const spendingBreakdown = useSpendingBreakdown();
  const goalsProgress = useGoalsProgress();
  const isLoading = useDashboardLoading();
  const error = useDashboardError();

  useDashboardBootstrap(user?.id);

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      mutedText: {
        color: colorScheme === "light" ? "#5B6980" : colors.mutedForeground,
      },
      linkText: { color: colorScheme === "light" ? "#0E67F7" : colors.primary },
      whiteCard: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.94),
      },
      balanceStatCard: {
        backgroundColor:
          colorScheme === "light"
            ? "#F7F9FC"
            : withOpacity(colors.secondary, 0.44),
        borderColor: withOpacity(colors.border, 0.78),
      },
      topButton: {
        backgroundColor: withOpacity(colors.secondary, 0.72),
        borderColor: withOpacity(colors.border, 0.84),
      },
      insightGradient: ["#37D3C2", "#2DBBBA"] as const,
      insightBubble: withOpacity("#FFFFFF", 0.1),
      navBar: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.86),
      },
    }),
    [colorScheme, colors],
  );

  const insightContent = useMemo(() => {
    const topCategory = spendingBreakdown[0];
    const topGoal = goalsProgress[0];

    if (isLoading && !summary) {
      return {
        headline: "Loading your dashboard",
        body: "Fetching your latest balance, budgets, and transactions from SQLite.",
        pill: "Live sync",
      };
    }

    if (error && !summary) {
      return {
        headline: "Dashboard unavailable",
        body: "Your data will appear as soon as the local finance database is ready again.",
        pill: "Retrying",
      };
    }

    const spendingLabel = topCategory?.categoryName ?? "No spending yet";
    const goalLabel = topGoal
      ? `${Math.round(topGoal.progress)}% to ${topGoal.name}`
      : "No goals yet";

    return {
      headline: topCategory
        ? `${spendingLabel} is your top spend`
        : "Your dashboard is ready",
      body: `${goalLabel}. ${topCategory ? formatCurrency(topCategory.total) + " spent there so far." : "Start adding transactions to fill this view."}`,
      pill: topCategory ? "Spending pulse" : "Ready",
    };
  }, [error, goalsProgress, isLoading, spendingBreakdown, summary]);

  const summaryValues = summary ?? {
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
  };

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarFrame}>
                <Image
                  contentFit="cover"
                  source={require("@/assets/images/Eyrie_Mascot_1.png")}
                  style={styles.avatar}
                />
              </View>
              <View>
                <Text style={[styles.greeting, pageStyles.mutedText]}>
                  Good evening
                </Text>
                <Text style={[styles.userName, { color: colors.foreground }]}>
                  {useCurrentUser().user?.first_name ?? "You"}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.headerButton, pageStyles.topButton]}
                onPress={() => router.push("/notifications")}
              >
                <Feather name="bell" size={18} color={colors.mutedForeground} />
                <View style={styles.notificationDot} />
              </Pressable>
              <Pressable
                style={[
                  styles.settingsButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/settings")}
              >
                <Feather
                  name="settings"
                  size={18}
                  color={colors.primaryForeground}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={pageStyles.insightGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightCard}
          >
            <View style={styles.insightContent}>
              <View style={styles.insightTextBlock}>
                <View style={styles.insightTitleRow}>
                  <View style={styles.insightIconWrap}>
                    <Ionicons
                      name="sparkles-outline"
                      size={13}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.insightTitle}>Eyrie Insight</Text>
                </View>
                <Text style={styles.insightHeadline}>
                  {insightContent.headline}
                </Text>
                <Text style={styles.insightBody}>{insightContent.body}</Text>
                <View style={styles.insightFooterRow}>
                  <View style={styles.insightPill}>
                    <Feather name="trending-down" size={12} color="#0E7C74" />
                    <Text style={styles.insightPillText}>
                      {insightContent.pill}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.insightMascotWrap,
                  { backgroundColor: pageStyles.insightBubble },
                ]}
              >
                <Image
                  contentFit="cover"
                  source={require("@/assets/images/Eyrie_Mascot_2.png")}
                  style={styles.insightMascot}
                />
              </View>
            </View>
          </LinearGradient>

          <View
            style={[styles.balanceCard, pageStyles.whiteCard, shadows.card]}
          >
            <View style={styles.balanceTopRow}>
              <View style={styles.balanceLabelRow}>
                <Text style={[styles.balanceLabel, pageStyles.mutedText]}>
                  Total Balance
                </Text>
                <Feather name="eye" size={16} color={colors.mutedForeground} />
              </View>
              <View
                style={[
                  styles.growthPill,
                  colorScheme === "light"
                    ? styles.growthPillLight
                    : styles.growthPillDark,
                ]}
              >
                <Text style={styles.growthText}>+12.5%</Text>
                <Text style={styles.growthSubtext}>vs last month</Text>
              </View>
            </View>

            <View style={styles.balanceAmountBlock}>
              <Text style={styles.balanceCurrency}>₱</Text>
              <Text
                style={[styles.balanceAmount, { color: colors.foreground }]}
              >
                {isLoading && !summary
                  ? "---"
                  : formatCurrency(summaryValues.totalBalance).replace("₱", "")}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricBlock, pageStyles.balanceStatCard]}>
                <View style={styles.metricLabelRow}>
                  <View
                    style={[styles.metricDot, { backgroundColor: "#14B86A" }]}
                  />
                  <Text style={[styles.metricLabel, pageStyles.mutedText]}>
                    Income
                  </Text>
                </View>
                <Text style={styles.incomeAmount}>
                  {isLoading && !summary
                    ? "---"
                    : formatCurrency(summaryValues.totalIncome)}
                </Text>
              </View>

              <View style={[styles.metricBlock, pageStyles.balanceStatCard]}>
                <View style={styles.metricLabelRow}>
                  <View
                    style={[styles.metricDot, { backgroundColor: "#F05454" }]}
                  />
                  <Text style={[styles.metricLabel, pageStyles.mutedText]}>
                    Expenses
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {isLoading && !summary
                    ? "---"
                    : formatCurrency(summaryValues.totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              My Cards
            </Text>
            <View style={styles.hideRow}>
              <Feather name="eye" size={16} color={colors.mutedForeground} />
              <Text style={[styles.hideText, pageStyles.mutedText]}>Hide</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {homeCards.map((card) => (
              <Pressable
                key={card.id}
                style={styles.cardPressable}
                onPress={() =>
                  router.push({
                    pathname: "/payment-method-details-modal",
                    params: { methodId: card.id },
                  })
                }
              >
                <LinearGradient
                  colors={card.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accountCard}
                >
                  <View
                    style={[
                      styles.cardBubbleLarge,
                      { backgroundColor: withOpacity("#FFFFFF", 0.08) },
                    ]}
                  />
                  <View
                    style={[
                      styles.cardBubbleSmall,
                      { backgroundColor: withOpacity("#FFFFFF", 0.05) },
                    ]}
                  />
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.cardLabel}>{card.label}</Text>
                      <Text style={styles.cardName}>{card.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.cardBadge,
                        { backgroundColor: card.badgeColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.cardAmount}>{card.amount}</Text>
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardDigits}>•••• {card.digits}</Text>
                    <Text style={styles.cardType}>{card.cardTypeLabel}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, styles.walletsHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              My Wallets
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {homeWallets.map((wallet) => (
              <Pressable
                key={wallet.id}
                style={styles.cardPressable}
                onPress={() =>
                  router.push({
                    pathname: "/payment-method-details-modal",
                    params: { methodId: wallet.id },
                  })
                }
              >
                <LinearGradient
                  colors={wallet.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accountCard}
                >
                  <View
                    style={[
                      styles.cardBubbleLarge,
                      { backgroundColor: withOpacity("#FFFFFF", 0.08) },
                    ]}
                  />
                  <View
                    style={[
                      styles.cardBubbleSmall,
                      { backgroundColor: withOpacity("#FFFFFF", 0.05) },
                    ]}
                  />
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.cardLabel}>{wallet.label}</Text>
                      <Text style={styles.cardName}>{wallet.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.walletBadge,
                        { backgroundColor: wallet.badgeColor },
                      ]}
                    >
                      <Text style={styles.walletBadgeText}>
                        {wallet.name.charAt(0)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.walletAmount}>{wallet.amount}</Text>
                  <Text style={styles.walletType}>{wallet.cardTypeLabel}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Budget Progress
            </Text>
            <Pressable
              style={styles.linkRow}
              onPress={() => router.push("/explore")}
            >
              <Text style={[styles.sectionLink, pageStyles.linkText]}>
                See all
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colorScheme === "light" ? "#0E67F7" : colors.primary}
              />
            </Pressable>
          </View>

          <View style={styles.budgetList}>
            {activeBudgets.length ? (
              activeBudgets.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.budgetCard,
                    pageStyles.whiteCard,
                    shadows.soft,
                  ]}
                >
                  <View
                    style={[
                      styles.budgetIconWrap,
                      { backgroundColor: item.iconBackground },
                    ]}
                  >
                    {renderDashboardIcon(item, 22)}
                  </View>
                  <View style={styles.budgetBody}>
                    <View style={styles.budgetRow}>
                      <View style={styles.budgetTextBlock}>
                        <Text
                          style={[
                            styles.budgetTitle,
                            { color: colors.foreground },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.budgetSpent, pageStyles.mutedText]}
                        >
                          {item.spentLabel}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.budgetRemaining}>
                          {item.remainingLabel}
                        </Text>
                        <Text
                          style={[
                            styles.budgetRemainingLabel,
                            pageStyles.mutedText,
                          ]}
                        >
                          remaining
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${item.progress * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))
            ) : isLoading ? (
              <View
                style={[
                  styles.emptyStateCard,
                  pageStyles.whiteCard,
                  shadows.soft,
                ]}
              >
                <ActivityIndicator color={colors.primary} />
                <Text
                  style={[styles.emptyStateTitle, { color: colors.foreground }]}
                >
                  Loading budgets
                </Text>
                <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                  Pulling your active budget progress from the local database.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  pageStyles.whiteCard,
                  shadows.soft,
                ]}
              >
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={24}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyStateTitle, { color: colors.foreground }]}
                >
                  No active budgets yet
                </Text>
                <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                  Create a budget and it will appear here with live progress.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.sectionHeader, styles.recentHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Transactions
            </Text>
            <Pressable
              style={styles.linkRow}
              onPress={() => router.push("/transactions")}
            >
              <Text style={[styles.sectionLink, pageStyles.linkText]}>
                See all
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colorScheme === "light" ? "#0E67F7" : colors.primary}
              />
            </Pressable>
          </View>

          <View style={styles.transactionList}>
            {recentTransactions.length ? (
              recentTransactions.map((item) => (
                <View key={item.id} style={styles.transactionRow}>
                  <View
                    style={[
                      styles.transactionIconWrap,
                      { backgroundColor: item.iconBackground },
                    ]}
                  >
                    {renderDashboardIcon(
                      item,
                      item.iconLibrary === "material" ? 22 : 20,
                    )}
                  </View>
                  <View style={styles.transactionContent}>
                    <View>
                      <Text
                        style={[
                          styles.transactionTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.merchant}
                      </Text>
                      <Text
                        style={[
                          styles.transactionCategory,
                          pageStyles.mutedText,
                        ]}
                      >
                        {item.category} · {item.typeLabel}
                      </Text>
                    </View>
                    <View style={styles.transactionAmountBlock}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          {
                            color: item.isIncome
                              ? "#00A76F"
                              : colors.foreground,
                          },
                        ]}
                      >
                        {item.amountLabel}
                      </Text>
                      <Text
                        style={[styles.transactionDate, pageStyles.mutedText]}
                      >
                        {item.dateLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : isLoading ? (
              <View
                style={[
                  styles.emptyStateCard,
                  pageStyles.whiteCard,
                  shadows.soft,
                ]}
              >
                <ActivityIndicator color={colors.primary} />
                <Text
                  style={[styles.emptyStateTitle, { color: colors.foreground }]}
                >
                  Loading transactions
                </Text>
                <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                  Fetching your latest movement from SQLite.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  pageStyles.whiteCard,
                  shadows.soft,
                ]}
              >
                <Feather
                  name="clock"
                  size={24}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.emptyStateTitle, { color: colors.foreground }]}
                >
                  No recent transactions
                </Text>
                <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                  New expenses and income will show up here automatically.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <AppBottomNav
          activeTab="home"
          variant={colorScheme === "dark" ? "dark" : "light"}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "#BEEFF0",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
  },
  greeting: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  userName: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "#F05454",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  insightCard: {
    marginTop: 4,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  insightContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  insightTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  insightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: withOpacity("#FFFFFF", 0.18),
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  insightHeadline: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
    color: "#FFFFFF",
  },
  insightBody: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    color: "#EDFEFF",
  },
  insightFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "#D8FFF4",
  },
  insightPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: "#0E7C74",
  },
  insightMascotWrap: {
    width: 82,
    height: 82,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  insightMascot: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
  },
  balanceCard: {
    marginTop: 22,
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  growthPill: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  growthPillLight: {
    backgroundColor: "#E6F8ED",
  },
  growthPillDark: {
    backgroundColor: withOpacity("#0AA55E", 0.18),
  },
  growthText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
    color: "#12A25D",
  },
  growthSubtext: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    color: "#4D8D6A",
  },
  balanceAmountBlock: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  balanceCurrency: {
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: fontWeights.bold,
    color: "#0E67F7",
    paddingBottom: 2,
  },
  balanceAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -1,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 6,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  metricLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  incomeAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeights.bold,
    color: "#0AA55E",
  },
  expenseAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeights.bold,
    color: "#FF4D4F",
  },
  sectionHeader: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletsHeader: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  hideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hideText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  cardsRow: {
    marginTop: 14,
    flexGrow: 1,
    justifyContent: "center",
    gap: 12,
  },
  cardPressable: {
    width: 164,
  },
  accountCard: {
    minHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 12,
    overflow: "hidden",
  },
  cardBubbleLarge: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: radius.full,
    top: -6,
    right: -24,
  },
  cardBubbleSmall: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: radius.full,
    bottom: -14,
    right: -10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.72),
  },
  cardName: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  cardBadge: {
    width: 32,
    height: 26,
    borderRadius: 6,
  },
  walletBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  cardAmount: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDigits: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeights.medium,
    letterSpacing: 1,
    color: withOpacity("#FFFFFF", 0.8),
  },
  cardType: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.68),
  },
  walletAmount: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  walletType: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.74),
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  budgetList: {
    marginTop: 14,
    gap: 14,
  },
  budgetCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 14,
  },
  budgetIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetBody: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  budgetTextBlock: {
    flex: 1,
  },
  budgetTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  budgetSpent: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  budgetRemaining: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#0E67F7",
    textAlign: "right",
  },
  budgetRemainingLabel: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "right",
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "#E8EDF4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "#0E7CEB",
  },
  recentHeader: {
    marginTop: 16,
  },
  transactionList: {
    marginTop: 8,
    gap: 14,
  },
  emptyStateCard: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  emptyStateBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 6,
  },
  transactionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  transactionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  transactionCategory: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  transactionAmountBlock: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  transactionDate: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "right",
  },
});
