import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel';
import { themeColors } from '@/constants/colors';
import { useAnalytics } from '@/hooks/useAnalytics';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatCurrency,
  type AnalyticsDonutSlice,
  type AnalyticsFilterKey,
  type AnalyticsPoint,
  type IncomeExpensePoint,
} from '@/src/lib/analytics';

type InsightTab = 'analytics' | 'assistant';
const analyticsFilters: readonly {
  key: AnalyticsFilterKey;
  label: string;
}[] = [
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'thisYear', label: 'This Year' },
] as const;

const quickPrompts = [
  { icon: 'trending-up', text: 'Review my spend' },
  { icon: 'shield', text: 'Help me save more' },
  { icon: 'target', text: 'Plan my week' },
] as const;

function categoryCountLabel(count: number) {
  return `${count} categor${count === 1 ? 'y' : 'ies'}`;
}

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function buildLinePath(points: number[], width: number, height: number) {
  const safePoints = points.length ? points : [0];
  const maxValue = Math.max(...safePoints, 1);
  const stepX = safePoints.length > 1 ? (width - 12) / (safePoints.length - 1) : 0;
  const coords = safePoints.map((value, index) => {
    const x = 6 + index * stepX;
    const y = 8 + (1 - value / maxValue) * (height - 31);
    return { x, y };
  });

  const line = coords.reduce((path, point, index, arr) => {
    if (index === 0) {
      return `M${point.x} ${point.y}`;
    }

    const previous = arr[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C${controlX} ${previous.y} ${controlX} ${point.y} ${point.x} ${point.y}`;
  }, '');

  const area = `${line} L${coords[coords.length - 1]?.x ?? 6} ${height} L${coords[0]?.x ?? 6} ${height} Z`;

  return { line, area };
}

function AnalyticsChart({
  points,
  strokeColor,
  fillColor,
}: {
  points: AnalyticsPoint[];
  strokeColor: string;
  fillColor: string;
}) {
  const path = buildLinePath(
    points.map((point) => point.amount),
    320,
    126,
  );

  return (
    <Svg width="100%" height={126} viewBox="0 0 320 126">
      <Path d={path.area} fill={fillColor} />
      <Path d={path.line} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function IncomeExpenseChart({ points }: { points: IncomeExpensePoint[] }) {
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.income, point.expenses]),
  );
  const chartWidth = 320;
  const pairWidth = chartWidth / Math.max(points.length, 1);
  const barWidth = Math.min(24, Math.max(12, pairWidth * 0.3));
  const groupOffset = Math.max(8, (pairWidth - barWidth * 2 - 3) / 2);

  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150">
      {points.map((point, index) => {
        const incomeHeight = Math.max(4, (point.income / maxValue) * 108);
        const x = index * pairWidth + groupOffset;
        return (
          <Rect
            key={`income-${x}`}
            x={x}
            y={132 - incomeHeight}
            width={barWidth}
            height={incomeHeight}
            rx="4"
            fill="#43D39E"
          />
        );
      })}
      {points.map((point, index) => {
        const expenseHeight = Math.max(4, (point.expenses / maxValue) * 108);
        const x = index * pairWidth + groupOffset + barWidth + 3;
        return (
          <Rect
            key={`expense-${x}`}
            x={x}
            y={132 - expenseHeight}
            width={barWidth}
            height={expenseHeight}
            rx="4"
            fill="#FF9844"
          />
        );
      })}
    </Svg>
  );
}

function BreakdownChart({
  trackColor,
  innerColor,
  slices,
}: {
  trackColor: string;
  innerColor: string;
  slices: AnalyticsDonutSlice[];
}) {
  const circumference = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <Svg width={112} height={112} viewBox="0 0 112 112">
      <Circle cx="56" cy="56" r="40" stroke={trackColor} strokeWidth="20" fill="none" />
      {slices.map((slice) => {
        const length = Math.max((slice.percentage / 100) * circumference, 0);
        const dashOffset = -offset;
        offset += length;

        return (
          <Circle
            key={slice.label}
            cx="56"
            cy="56"
            r="40"
            stroke={slice.color}
            strokeWidth="20"
            fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            rotation="-90"
            origin="56,56"
          />
        );
      })}
      <Circle cx="56" cy="56" r="27" fill={innerColor} />
    </Svg>
  );
}

function BudgetHealthRing({
  trackColor,
  score,
  progressColor,
}: {
  trackColor: string;
  score: number;
  progressColor: string;
}) {
  const circumference = 2 * Math.PI * 30;
  const progress = circumference * (score / 100);

  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle cx="44" cy="44" r="30" stroke={trackColor} strokeWidth="10" fill="none" />
      <Circle
        cx="44"
        cy="44"
        r="30"
        stroke={progressColor}
        strokeWidth="10"
        fill="none"
        strokeDasharray={`${progress} ${circumference - progress}`}
        strokeLinecap="round"
        rotation="-140"
        origin="44,44"
      />
    </Svg>
  );
}

export default function AssistantScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const [activeTab, setActiveTab] = useState<InsightTab>('analytics');
  const [selectedFilter, setSelectedFilter] = useState<AnalyticsFilterKey>('thisMonth');
  const { analytics } = useAnalytics(selectedFilter);

  const isDark = colorScheme === 'dark';
  const budgetRingColor =
    analytics.budgetHealth.tone === 'Excellent'
      ? '#0DBB59'
      : analytics.budgetHealth.tone === 'Good'
        ? '#17C964'
        : analytics.budgetHealth.tone === 'Warning'
          ? '#FF9F2F'
          : '#FF314A';
  const weeklyDeltaColor =
    analytics.weeklySpending.changePercentage > 0
      ? '#FF314A'
      : analytics.weeklySpending.changePercentage < 0
        ? '#17C964'
        : isDark
          ? '#A2ABBA'
          : '#6A7384';
  const breakdownItems = analytics.spendingBreakdown.slices.length
    ? analytics.spendingBreakdown.slices
    : [{ label: 'No spending yet', percentage: 0, color: '#4F8CFF', amount: 0 }];
  const weeklyDeltaLabel =
    analytics.weeklySpending.changePercentage === 0
      ? '0%'
      : `${analytics.weeklySpending.changePercentage > 0 ? '↗ +' : '↘ '}${Math.abs(
          analytics.weeklySpending.changePercentage,
        )}%`;

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? '#060B15' : colors.background },
      title: { color: isDark ? '#FFFFFF' : colors.foreground },
      subtitle: { color: isDark ? '#9EA6B5' : '#6A7384' },
      divider: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withOpacity(colors.border, 0.86) },
      segmentedWrap: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.72),
        borderColor: isDark ? 'rgba(255,255,255,0.02)' : withOpacity(colors.border, 0.7),
      },
      segmentActive: {
        backgroundColor: isDark ? '#101722' : colors.card,
      },
      segmentInactiveText: { color: isDark ? '#9199A7' : colors.mutedForeground },
      card: {
        backgroundColor: isDark ? '#101722' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.92),
      },
      coachCard: {
        backgroundColor: isDark ? '#071B35' : '#EAF5FF',
        borderColor: isDark ? 'rgba(20,149,255,0.14)' : 'rgba(20,149,255,0.16)',
      },
      chip: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.92),
        borderColor: isDark ? 'rgba(255,255,255,0.03)' : withOpacity(colors.border, 0.6),
      },
      input: {
        backgroundColor: isDark ? '#161D29' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : withOpacity(colors.border, 0.9),
      },
      sendButton: {
        backgroundColor: isDark ? '#1E2634' : withOpacity(colors.secondary, 0.92),
      },
      progressTrack: { backgroundColor: isDark ? '#1B2433' : '#E9EDF4' },
      graphFill: withOpacity('#1C65FF', isDark ? 0.12 : 0.08),
      donutInner: isDark ? '#111722' : colors.card,
      promptText: { color: isDark ? '#FFFFFF' : colors.foreground },
      promptSubtle: { color: isDark ? '#9EA6B5' : '#6B7485' },
      barMonth: { color: isDark ? '#A2ABBA' : '#6A7384' },
      askLink: { color: isDark ? '#1495FF' : '#0E67F7' },
      lineLabel: { color: isDark ? '#97A4B5' : '#6E7787' },
      statusGreen: { color: '#17C964' },
      statusOrange: { color: '#FF9F2F' },
      statusRed: { color: '#FF314A' },
    }),
    [colors, isDark]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.headerIdentity}>
            <View style={styles.avatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_3.png')}
                style={styles.avatar}
              />
            </View>
            <View>
              <Text style={[styles.headerTitle, pageStyles.title]}>Eyrie Insights</Text>
              <View style={styles.subtitleRow}>
                <View style={styles.onlineDot} />
                <Text style={[styles.headerSubtitle, pageStyles.subtitle]}>✣ Analytics & AI Assistant</Text>
              </View>
            </View>
          </View>

          <View style={[styles.segmentedWrap, pageStyles.segmentedWrap]}>
            <Pressable
              style={[styles.segmentButton, activeTab === 'analytics' && pageStyles.segmentActive]}
              onPress={() => setActiveTab('analytics')}>
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={activeTab === 'analytics' ? (isDark ? '#FFFFFF' : colors.foreground) : pageStyles.segmentInactiveText.color}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'analytics' ? (isDark ? '#FFFFFF' : colors.foreground) : pageStyles.segmentInactiveText.color },
                ]}>
                Analytics
              </Text>
            </Pressable>

            <Pressable
              style={[styles.segmentButton, activeTab === 'assistant' && pageStyles.segmentActive]}
              onPress={() => setActiveTab('assistant')}>
              <Feather
                name="message-circle"
                size={18}
                color={activeTab === 'assistant' ? (isDark ? '#FFFFFF' : colors.foreground) : pageStyles.segmentInactiveText.color}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'assistant' ? (isDark ? '#FFFFFF' : colors.foreground) : pageStyles.segmentInactiveText.color },
                ]}>
                Assistant
              </Text>
            </Pressable>
          </View>

          <View style={[styles.headerDivider, pageStyles.divider]} />
        </View>

        {activeTab === 'analytics' ? (
          <ScrollView
            contentContainerStyle={styles.analyticsContent}
            showsVerticalScrollIndicator={false}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {analyticsFilters.map((filter) => {
                const isActive = filter.key === selectedFilter;

                return (
                  <Pressable
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      pageStyles.chip,
                      isActive && pageStyles.segmentActive,
                    ]}
                    onPress={() => setSelectedFilter(filter.key)}>
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive ? pageStyles.title : pageStyles.segmentInactiveText,
                      ]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <View style={styles.cardHeadRow}>
                <Text style={[styles.cardTitle, pageStyles.title]}>Budget Health</Text>
                <View
                  style={[
                    styles.excellentPill,
                    { backgroundColor: withOpacity(budgetRingColor, 0.14) },
                  ]}>
                  <Text style={[styles.excellentText, { color: budgetRingColor }]}>
                    {analytics.budgetHealth.tone}
                  </Text>
                </View>
              </View>

              <View style={styles.healthRow}>
                <View style={styles.healthMeterWrap}>
                  <BudgetHealthRing
                    trackColor={pageStyles.progressTrack.backgroundColor as string}
                    score={analytics.budgetHealth.score}
                    progressColor={budgetRingColor}
                  />
                  <Text style={[styles.healthScore, pageStyles.title]}>
                    {analytics.budgetHealth.score}
                  </Text>
                </View>

                <View style={styles.healthLabels}>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>On Track</Text>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>Warning</Text>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>Over Budget</Text>
                </View>

                <View style={styles.healthStats}>
                  <Text style={[styles.healthStat, pageStyles.statusGreen]}>
                    {categoryCountLabel(analytics.budgetHealth.onTrackCount)}
                  </Text>
                  <Text style={[styles.healthStat, pageStyles.statusOrange]}>
                    {categoryCountLabel(analytics.budgetHealth.warningCount)}
                  </Text>
                  <Text style={[styles.healthStat, pageStyles.statusRed]}>
                    {categoryCountLabel(analytics.budgetHealth.overBudgetCount)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <Text style={[styles.cardTitle, pageStyles.title]}>Spending Breakdown</Text>

              <View style={styles.breakdownRow}>
                <BreakdownChart
                  trackColor={pageStyles.progressTrack.backgroundColor as string}
                  innerColor={pageStyles.donutInner}
                  slices={analytics.spendingBreakdown.slices}
                />
                <View style={styles.breakdownLegend}>
                  {breakdownItems.map((item) => (
                    <View key={item.label} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.legendLabel, pageStyles.subtitle]}>{item.label}</Text>
                      </View>
                      <Text style={[styles.legendValue, pageStyles.title]}>
                        {item.percentage}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.breakdownDivider, pageStyles.divider]} />

              <View style={styles.totalSpentRow}>
                <Text style={[styles.totalSpentLabel, pageStyles.subtitle]}>Total Spent</Text>
                <Text style={[styles.totalSpentValue, pageStyles.title]}>
                  {formatCurrency(analytics.spendingBreakdown.totalSpent, analytics.currencyCode)}
                </Text>
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <View style={styles.cardHeadRow}>
                <Text style={[styles.cardTitle, pageStyles.title]}>Weekly Spending</Text>
                <Text style={[styles.positiveDelta, { color: weeklyDeltaColor }]}>
                  {weeklyDeltaLabel}
                </Text>
              </View>

              <AnalyticsChart
                points={analytics.weeklySpending.points}
                strokeColor="#4C87FF"
                fillColor={pageStyles.graphFill}
              />

              <View style={styles.weekLabels}>
                {analytics.weeklySpending.points.map((point) => (
                  <Text key={point.label} style={[styles.weekLabel, pageStyles.lineLabel]}>
                    {point.shortLabel}
                  </Text>
                ))}
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <Text style={[styles.cardTitle, pageStyles.title]}>Income vs Expenses</Text>

              <IncomeExpenseChart points={analytics.incomeVsExpenses.points} />

              <View style={styles.monthLabels}>
                {analytics.incomeVsExpenses.points.map((point) => (
                  <Text key={point.label} style={[styles.monthLabel, pageStyles.barMonth]}>
                    {point.label}
                  </Text>
                ))}
              </View>

              <View style={styles.chartLegendRow}>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#17C964' }]} />
                  <Text style={[styles.chartLegendText, pageStyles.subtitle]}>Income</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF1B34' }]} />
                  <Text style={[styles.chartLegendText, pageStyles.subtitle]}>Expenses</Text>
                </View>
              </View>
            </View>

            <View style={[styles.coachCard, pageStyles.coachCard]}>
              <View style={styles.coachHeaderRow}>
                <View style={styles.coachAvatarFrame}>
                  <Image
                    contentFit="cover"
                    source={require('@/assets/images/Eyrie_Mascot_3.png')}
                    style={styles.coachAvatar}
                  />
                </View>
              <Text style={styles.coachHeaderTitle}>Financial Insight</Text>
              </View>
              <Text style={[styles.coachBody, pageStyles.subtitle]}>
                {analytics.insights[0]?.message ??
                  'Add more activity to generate personalized financial insights.'}
              </Text>
              <Pressable
                style={styles.askRow}
                onPress={() => setActiveTab('assistant')}>
                <Text style={[styles.askText, pageStyles.askLink]}>Ask Eyrie for advice</Text>
                <Feather name="message-circle" size={16} color={pageStyles.askLink.color} />
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <AssistantChatPanel quickPrompts={quickPrompts} />
        )}

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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarFrame: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: '#08C55C',
  },
  headerSubtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  segmentedWrap: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  headerDivider: {
    marginTop: 16,
    height: 1,
  },
  analyticsContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 144,
    gap: 18,
  },
  filterRow: {
    gap: 10,
    paddingRight: 14,
  },
  filterChip: {
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  cardHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  excellentPill: {
    minWidth: 74,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: 'rgba(11, 185, 91, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  excellentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    color: '#08C55C',
  },
  healthRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthMeterWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScore: {
    position: 'absolute',
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  healthLabels: {
    flex: 1,
    gap: 8,
  },
  healthLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  healthStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  healthStat: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  breakdownRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  breakdownLegend: {
    flex: 1,
    gap: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  legendLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  legendValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  breakdownDivider: {
    marginTop: 18,
    height: 1,
  },
  totalSpentRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSpentLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  totalSpentValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  positiveDelta: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FF314A',
  },
  weekLabels: {
    marginTop: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLabel: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  monthLabels: {
    marginTop: -2,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  chartLegendRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLegendText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  coachCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachAvatarFrame: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
  },
  coachHeaderTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  coachBody: {
    marginTop: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 28,
  },
  askRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  askText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
});
