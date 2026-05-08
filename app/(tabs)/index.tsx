import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

const cards = [
  {
    label: 'MAIN ACCOUNT',
    name: 'BPI',
    amount: '₱45,250.75',
    digits: '4521',
    badgeColor: '#F7B400',
    colors: ['#3553D8', '#2A49CF', '#2445C9'],
  },
  {
    label: 'E-WALLET',
    name: 'GCash',
    amount: '₱5,234.00',
    digits: '8832',
    badgeColor: 'rgba(255,255,255,0.18)',
    colors: ['#16B76D', '#0FA785', '#119E8D'],
  },
] as const;

const budgets = [
  {
    title: 'Food & Dining',
    spent: '₱8,500 of ₱12,000',
    remaining: '₱3,500',
    progress: 0.71,
    iconBackground: '#FFEEBC',
    iconColor: '#D97706',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#D97706" />,
  },
  {
    title: 'Transportation',
    spent: '₱3,200 of ₱5,000',
    remaining: '₱1,800',
    progress: 0.64,
    iconBackground: '#DDEAFF',
    iconColor: '#2563EB',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#2563EB" />,
  },
  {
    title: 'Shopping',
    spent: '₱6,800 of ₱8,000',
    remaining: '₱1,200',
    progress: 0.85,
    iconBackground: '#FCE2F4',
    iconColor: '#DB2777',
    icon: <Feather name="shopping-bag" size={20} color="#DB2777" />,
  },
] as const;

const transactions = [
  {
    title: 'Jollibee',
    category: 'Food & Dining',
    amount: '-₱450',
    date: 'Today, 12:30 PM',
    positive: false,
    tint: '#E9EDF3',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#5B6475" />,
  },
  {
    title: 'Salary Deposit',
    category: 'Income',
    amount: '+₱45,000',
    date: 'Today, 9:00 AM',
    positive: true,
    tint: '#CDEFE4',
    icon: <Feather name="arrow-down-left" size={20} color="#00A76F" />,
  },
  {
    title: 'Grab Ride',
    category: 'Transportation',
    amount: '-₱285',
    date: 'Yesterday, 6:45 PM',
    positive: false,
    tint: '#E9EDF3',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#5B6475" />,
  },
  {
    title: 'Netflix',
    category: 'Entertainment',
    amount: '-₱549',
    date: 'Yesterday, 12:00 AM',
    positive: false,
    tint: '#E9EDF3',
    icon: <MaterialCommunityIcons name="filmstrip-box-multiple" size={22} color="#5B6475" />,
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      linkText: { color: colorScheme === 'light' ? '#0E67F7' : colors.primary },
      whiteCard: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.94),
      },
      topButton: {
        backgroundColor: withOpacity(colors.secondary, 0.72),
        borderColor: withOpacity(colors.border, 0.84),
      },
      insightGradient: ['#37D3C2', '#2DBBBA'] as const,
      insightBubble: withOpacity('#FFFFFF', 0.1),
      navBar: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.86),
      },
    }),
    [colorScheme, colors]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarFrame}>
                <Image
                  contentFit="cover"
                  source={require('@/assets/images/Eyrie_Mascot_1.png')}
                  style={styles.avatar}
                />
              </View>
              <View>
                <Text style={[styles.greeting, pageStyles.mutedText]}>Good evening</Text>
                <Text style={[styles.userName, { color: colors.foreground }]}>Juan</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={[styles.headerButton, pageStyles.topButton]} onPress={() => router.push('/notifications')}>
                <Feather name="bell" size={18} color={colors.mutedForeground} />
                <View style={styles.notificationDot} />
              </Pressable>
              <Pressable
                style={[styles.settingsButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/settings')}>
                <Feather name="settings" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={pageStyles.insightGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightCard}>
            <View style={styles.insightContent}>
              <View style={styles.insightTextBlock}>
                <View style={styles.insightTitleRow}>
                  <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.insightTitle}>Eyrie Insight</Text>
                </View>
                <Text style={styles.insightBody}>
                  You&apos;ve spent 18% less on dining this week compared to last week. Great progress! Keep it up to reach your savings goal faster.
                </Text>
              </View>
              <View style={[styles.insightMascotWrap, { backgroundColor: pageStyles.insightBubble }]}>
                <Image
                  contentFit="cover"
                  source={require('@/assets/images/Eyrie_Mascot_2.png')}
                  style={styles.insightMascot}
                />
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.balanceCard, pageStyles.whiteCard, shadows.card]}>
            <View style={styles.balanceTopRow}>
              <View style={styles.balanceLabelRow}>
                <Text style={[styles.balanceLabel, pageStyles.mutedText]}>Total Balance</Text>
                <Feather name="eye" size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.growthPill}>
                <Text style={styles.growthText}>+12.5%</Text>
              </View>
            </View>

            <Text style={[styles.balanceAmount, { color: colors.foreground }]}>₱54,771.25</Text>
            <Text style={[styles.balanceSubtext, pageStyles.mutedText]}>vs last month</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <View style={[styles.metricDot, { backgroundColor: '#14B86A' }]} />
                  <Text style={[styles.metricLabel, pageStyles.mutedText]}>Income</Text>
                </View>
                <Text style={styles.incomeAmount}>₱85,000.00</Text>
              </View>

              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <View style={[styles.metricDot, { backgroundColor: '#F05454' }]} />
                  <Text style={[styles.metricLabel, pageStyles.mutedText]}>Expenses</Text>
                </View>
                <Text style={styles.expenseAmount}>₱32,450.00</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Cards</Text>
            <View style={styles.hideRow}>
              <Feather name="eye" size={16} color={colors.mutedForeground} />
              <Text style={[styles.hideText, pageStyles.mutedText]}>Hide</Text>
            </View>
          </View>

          <View style={styles.cardsRow}>
            {cards.map((card) => (
              <LinearGradient
                key={card.name}
                colors={card.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.accountCard}>
                <View style={[styles.cardBubbleLarge, { backgroundColor: withOpacity('#FFFFFF', 0.08) }]} />
                <View style={[styles.cardBubbleSmall, { backgroundColor: withOpacity('#FFFFFF', 0.05) }]} />
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.cardLabel}>{card.label}</Text>
                    <Text style={styles.cardName}>{card.name}</Text>
                  </View>
                  <View style={[styles.cardBadge, { backgroundColor: card.badgeColor }]} />
                </View>
                <Text style={styles.cardAmount}>{card.amount}</Text>
                <View style={styles.cardBottomRow}>
                  <Text style={styles.cardDigits}>•••• {card.digits}</Text>
                  <Text style={styles.cardType}>DEBIT</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Budget Progress</Text>
            <Pressable style={styles.linkRow}>
              <Text style={[styles.sectionLink, pageStyles.linkText]}>See all</Text>
              <Feather name="chevron-right" size={16} color={colorScheme === 'light' ? '#0E67F7' : colors.primary} />
            </Pressable>
          </View>

          <View style={styles.budgetList}>
            {budgets.map((item) => (
              <View key={item.title} style={[styles.budgetCard, pageStyles.whiteCard, shadows.soft]}>
                <View style={[styles.budgetIconWrap, { backgroundColor: item.iconBackground }]}>{item.icon}</View>
                <View style={styles.budgetBody}>
                  <View style={styles.budgetRow}>
                    <View style={styles.budgetTextBlock}>
                      <Text style={[styles.budgetTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <Text style={[styles.budgetSpent, pageStyles.mutedText]}>{item.spent}</Text>
                    </View>
                    <View>
                      <Text style={styles.budgetRemaining}>{item.remaining}</Text>
                      <Text style={[styles.budgetRemainingLabel, pageStyles.mutedText]}>remaining</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.sectionHeader, styles.recentHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>
            <Pressable style={styles.linkRow} onPress={() => router.push('/transactions')}>
              <Text style={[styles.sectionLink, pageStyles.linkText]}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.transactionList}>
            {transactions.map((item) => (
              <View key={item.title} style={styles.transactionRow}>
                <View style={[styles.transactionIconWrap, { backgroundColor: item.tint }]}>{item.icon}</View>
                <View style={styles.transactionContent}>
                  <View>
                    <Text style={[styles.transactionTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.transactionCategory, pageStyles.mutedText]}>{item.category}</Text>
                  </View>
                  <View style={styles.transactionAmountBlock}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: item.positive ? '#00A76F' : colors.foreground },
                      ]}>
                      {item.amount}
                    </Text>
                    <Text style={[styles.transactionDate, pageStyles.mutedText]}>{item.date}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <AppBottomNav activeTab="home" variant={colorScheme === 'dark' ? 'dark' : 'light'} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#BEEFF0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#F05454',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    marginTop: 18,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  insightBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 28,
    color: '#EDFEFF',
  },
  insightMascotWrap: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightMascot: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
  },
  balanceCard: {
    marginTop: 22,
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  growthPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#D6F5E7',
  },
  growthText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    color: '#12A25D',
  },
  balanceAmount: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
  },
  balanceSubtext: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 16,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  metricLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
  },
  incomeAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#0AA55E',
  },
  expenseAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FF4D4F',
  },
  sectionHeader: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  hideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hideText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  cardsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  accountCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  cardBubbleLarge: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: radius.full,
    top: -6,
    right: -24,
  },
  cardBubbleSmall: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: radius.full,
    bottom: -14,
    right: -10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity('#FFFFFF', 0.72),
  },
  cardName: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  cardBadge: {
    width: 32,
    height: 26,
    borderRadius: 6,
  },
  cardAmount: {
    marginTop: 24,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  cardBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDigits: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 1.2,
    color: withOpacity('#FFFFFF', 0.8),
  },
  cardType: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: withOpacity('#FFFFFF', 0.68),
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 14,
  },
  budgetIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetBody: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: '#0E67F7',
    textAlign: 'right',
  },
  budgetRemainingLabel: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#E8EDF4',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#0E7CEB',
  },
  recentHeader: {
    marginTop: 16,
  },
  transactionList: {
    marginTop: 8,
    gap: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  transactionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'flex-end',
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
    textAlign: 'right',
  },
});
