import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type InsightTab = 'analytics' | 'assistant';

const breakdown = [
  { label: 'Food & Dining', value: '34%', color: '#4F8CFF' },
  { label: 'Transportation', value: '13%', color: '#3AD0A0' },
  { label: 'Shopping', value: '27%', color: '#FF9640' },
  { label: 'Bills', value: '18%', color: '#9B63F8' },
  { label: 'Entertainment', value: '8%', color: '#D9D233' },
] as const;

const quickPrompts = [
  { icon: 'trending-up', text: 'Spending summary' },
  { icon: 'shield', text: 'Savings tips' },
  { icon: 'dollar-sign', text: 'Recent expenses' },
] as const;

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function AnalyticsChart({ strokeColor, fillColor }: { strokeColor: string; fillColor: string }) {
  return (
    <Svg width="100%" height={126} viewBox="0 0 320 126">
      <Path
        d="M6 84C26 88 46 92 64 92C82 92 92 54 111 54C130 54 139 103 159 103C180 103 200 73 217 54C240 30 262 7 281 7C297 7 309 26 320 41V126H6Z"
        fill={fillColor}
      />
      <Path
        d="M6 84C26 88 46 92 64 92C82 92 92 54 111 54C130 54 139 103 159 103C180 103 200 73 217 54C240 30 262 7 281 7C297 7 309 26 320 41"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function IncomeExpenseChart() {
  const income = ['#43D39E', '#43D39E', '#43D39E', '#43D39E', '#43D39E'] as const;
  const expense = ['#FF9844', '#FF9844', '#FF9844', '#FF9844', '#FF9844'] as const;
  const incomeHeights = [102, 98, 108, 103, 103];
  const expenseHeights = [53, 47, 57, 44, 40];

  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150">
      {incomeHeights.map((height, index) => {
        const x = 12 + index * 63;
        return (
          <Rect
            key={`income-${x}`}
            x={x}
            y={132 - height}
            width="24"
            height={height}
            rx="4"
            fill={income[index]}
          />
        );
      })}
      {expenseHeights.map((height, index) => {
        const x = 39 + index * 63;
        return (
          <Rect
            key={`expense-${x}`}
            x={x}
            y={132 - height}
            width="24"
            height={height}
            rx="4"
            fill={expense[index]}
          />
        );
      })}
    </Svg>
  );
}

function BreakdownChart({ trackColor }: { trackColor: string }) {
  return (
    <Svg width={112} height={112} viewBox="0 0 112 112">
      <Circle cx="56" cy="56" r="40" stroke={trackColor} strokeWidth="20" fill="none" />
      <Circle
        cx="56"
        cy="56"
        r="40"
        stroke="#4F8CFF"
        strokeWidth="20"
        fill="none"
        strokeDasharray="85 251"
        strokeDashoffset="0"
        strokeLinecap="butt"
        rotation="-90"
        origin="56,56"
      />
      <Circle
        cx="56"
        cy="56"
        r="40"
        stroke="#3AD0A0"
        strokeWidth="20"
        fill="none"
        strokeDasharray="33 303"
        strokeDashoffset="-87"
        rotation="-90"
        origin="56,56"
      />
      <Circle
        cx="56"
        cy="56"
        r="40"
        stroke="#FF9640"
        strokeWidth="20"
        fill="none"
        strokeDasharray="68 268"
        strokeDashoffset="-122"
        rotation="-90"
        origin="56,56"
      />
      <Circle
        cx="56"
        cy="56"
        r="40"
        stroke="#9B63F8"
        strokeWidth="20"
        fill="none"
        strokeDasharray="45 291"
        strokeDashoffset="-192"
        rotation="-90"
        origin="56,56"
      />
      <Circle
        cx="56"
        cy="56"
        r="40"
        stroke="#D9D233"
        strokeWidth="20"
        fill="none"
        strokeDasharray="20 316"
        strokeDashoffset="-239"
        rotation="-90"
        origin="56,56"
      />
      <Circle cx="56" cy="56" r="27" fill="#111722" />
    </Svg>
  );
}

function BudgetHealthRing({ trackColor }: { trackColor: string }) {
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle cx="44" cy="44" r="30" stroke={trackColor} strokeWidth="10" fill="none" />
      <Circle
        cx="44"
        cy="44"
        r="30"
        stroke="#0DBB59"
        strokeWidth="10"
        fill="none"
        strokeDasharray="142 188"
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

  const isDark = colorScheme === 'dark';

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
            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <View style={styles.cardHeadRow}>
                <Text style={[styles.cardTitle, pageStyles.title]}>Budget Health</Text>
                <View style={styles.excellentPill}>
                  <Text style={styles.excellentText}>Excellent</Text>
                </View>
              </View>

              <View style={styles.healthRow}>
                <View style={styles.healthMeterWrap}>
                  <BudgetHealthRing trackColor={pageStyles.progressTrack.backgroundColor} />
                  <Text style={[styles.healthScore, pageStyles.title]}>85</Text>
                </View>

                <View style={styles.healthLabels}>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>On Track</Text>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>Warning</Text>
                  <Text style={[styles.healthLabel, pageStyles.subtitle]}>Over Budget</Text>
                </View>

                <View style={styles.healthStats}>
                  <Text style={[styles.healthStat, pageStyles.statusGreen]}>4 categories</Text>
                  <Text style={[styles.healthStat, pageStyles.statusOrange]}>1 category</Text>
                  <Text style={[styles.healthStat, pageStyles.statusRed]}>0 categories</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <Text style={[styles.cardTitle, pageStyles.title]}>Spending Breakdown</Text>

              <View style={styles.breakdownRow}>
                <BreakdownChart trackColor={pageStyles.progressTrack.backgroundColor} />
                <View style={styles.breakdownLegend}>
                  {breakdown.map((item) => (
                    <View key={item.label} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.legendLabel, pageStyles.subtitle]}>{item.label}</Text>
                      </View>
                      <Text style={[styles.legendValue, pageStyles.title]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.breakdownDivider, pageStyles.divider]} />

              <View style={styles.totalSpentRow}>
                <Text style={[styles.totalSpentLabel, pageStyles.subtitle]}>Total Spent</Text>
                <Text style={[styles.totalSpentValue, pageStyles.title]}>₱25,100</Text>
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <View style={styles.cardHeadRow}>
                <Text style={[styles.cardTitle, pageStyles.title]}>Weekly Spending</Text>
                <Text style={styles.positiveDelta}>↗ +12%</Text>
              </View>

              <AnalyticsChart strokeColor="#4C87FF" fillColor={pageStyles.graphFill} />

              <View style={styles.weekLabels}>
                {['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <Text key={day} style={[styles.weekLabel, pageStyles.lineLabel]}>
                    {day}
                  </Text>
                ))}
              </View>
            </View>

            <View style={[styles.card, pageStyles.card, shadows.soft]}>
              <Text style={[styles.cardTitle, pageStyles.title]}>Income vs Expenses</Text>

              <IncomeExpenseChart />

              <View style={styles.monthLabels}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month) => (
                  <Text key={month} style={[styles.monthLabel, pageStyles.barMonth]}>
                    {month}
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
                Your savings rate this month is 62% - that&apos;s 8% higher than last month! You&apos;re on track to reach your emergency fund goal by August.
              </Text>
              <Pressable style={styles.askRow}>
                <Text style={[styles.askText, pageStyles.askLink]}>Ask Eyrie for advice</Text>
                <Feather name="message-circle" size={16} color={pageStyles.askLink.color} />
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.assistantWrap}>
            <ScrollView
              contentContainerStyle={styles.assistantContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <View style={styles.messageRow}>
                <View style={styles.messageAvatarFrame}>
                  <Image
                    contentFit="cover"
                    source={require('@/assets/images/Eyrie_Mascot_3.png')}
                    style={styles.messageAvatar}
                  />
                </View>

                <View style={[styles.messageBubble, pageStyles.card]}>
                  <Text style={[styles.messageText, pageStyles.title]}>
                    Hello! I&apos;m your Eyrie financial assistant. I can help you track expenses, analyze spending patterns, and reach your savings goals. What would you like to know?
                  </Text>
                  <Text style={[styles.messageTime, pageStyles.subtitle]}>07:28 PM</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.assistantFooter}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPromptRow}>
                {quickPrompts.map((item) => (
                  <Pressable key={item.text} style={[styles.quickPrompt, pageStyles.chip]}>
                    <Feather name={item.icon as 'trending-up' | 'shield' | 'dollar-sign'} size={14} color="#1495FF" />
                    <Text style={[styles.quickPromptText, pageStyles.promptText]}>{item.text}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.inputRow}>
                <View style={[styles.inputWrap, pageStyles.input]}>
                  <Text style={[styles.inputPlaceholder, pageStyles.promptSubtle]}>Ask about your finances...</Text>
                  <Pressable style={styles.inputIconWrap}>
                    <Feather name="mic" size={18} color={pageStyles.promptSubtle.color} />
                  </Pressable>
                </View>
                <Pressable style={[styles.sendButton, pageStyles.sendButton]}>
                  <Ionicons name="paper-plane-outline" size={22} color={pageStyles.promptSubtle.color} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <AppBottomNav activeTab="assistant" variant={isDark ? 'dark' : 'light'} />
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
    paddingHorizontal: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
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
  assistantWrap: {
    flex: 1,
    paddingBottom: 118,
  },
  assistantContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  messageAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  messageBubble: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  messageText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 36,
    fontWeight: fontWeights.medium,
  },
  messageTime: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  assistantFooter: {
    paddingHorizontal: 12,
    gap: 16,
  },
  quickPromptRow: {
    gap: 10,
    paddingRight: 18,
  },
  quickPrompt: {
    height: 34,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickPromptText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputPlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  inputIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
