import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

const goals = [
  {
    title: 'Emergency Fund',
    target: 'Target: Aug 2026',
    saved: '₱112,500',
    goal: '₱150,000',
    achieved: '75% achieved',
    remaining: '₱37,500 to go',
    progress: 0.75,
    accent: '#17C964',
    iconBackground: '#0FBD59',
    icon: <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />,
    contributions: ['+₱10,000', '+₱15,000', '+₱10,000'],
  },
  {
    title: 'New MacBook',
    target: 'Target: Dec 2026',
    saved: '₱45,000',
    goal: '₱85,000',
    achieved: '53% achieved',
    remaining: '₱40,000 to go',
    progress: 0.53,
    accent: '#1495FF',
    iconBackground: '#1495FF',
    icon: <Feather name="monitor" size={22} color="#FFFFFF" />,
    contributions: ['+₱5,000', '+₱8,000'],
  },
  {
    title: 'Japan Trip',
    target: 'Target: Mar 2027',
    saved: '₱35,000',
    goal: '₱120,000',
    achieved: '29% achieved',
    remaining: '₱85,000 to go',
    progress: 0.29,
    accent: '#7E7CFF',
    iconBackground: '#7E7CFF',
    icon: <Ionicons name="airplane-outline" size={22} color="#FFFFFF" />,
    contributions: ['+₱5,000', '+₱10,000'],
  },
  {
    title: 'Car Down Payment',
    target: 'Target: Jun 2027',
    saved: '₱28,000',
    goal: '₱200,000',
    achieved: '14% achieved',
    remaining: '₱172,000 to go',
    progress: 0.14,
    accent: '#F09A2A',
    iconBackground: '#F09A2A',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#FFFFFF" />,
    contributions: ['+₱8,000'],
  },
] as const;

const suggestedGoals = [
  {
    title: 'House Fund',
    iconBackground: '#1495FF',
    icon: <Feather name="home" size={18} color="#FFFFFF" />,
  },
  {
    title: 'Christmas',
    iconBackground: '#E11D48',
    icon: <Feather name="gift" size={18} color="#FFFFFF" />,
  },
  {
    title: 'Travel',
    iconBackground: '#7E7CFF',
    icon: <Ionicons name="airplane-outline" size={18} color="#FFFFFF" />,
  },
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

export default function GoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      title: { color: colors.foreground },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      headerAction: {
        backgroundColor: colorScheme === 'light' ? colors.primary : '#1495FF',
      },
      summaryCard: {
        backgroundColor: '#10B47A',
        borderColor: '#10B47A',
      },
      summaryLabelText: { color: '#D6FFF0' },
      summaryTitleText: { color: '#FFFFFF' },
      summaryTargetText: { color: '#FFE26F' },
      summaryBadgeBackground: { backgroundColor: 'rgba(255,255,255,0.18)' },
      summaryTrack: {
        backgroundColor: 'rgba(255,255,255,0.25)',
      },
      goalCard: {
        backgroundColor: colorScheme === 'light' ? colors.card : '#101722',
        borderColor: colorScheme === 'light' ? withOpacity(colors.border, 0.96) : 'rgba(255,255,255,0.05)',
      },
      track: {
        backgroundColor: colorScheme === 'light' ? '#E8EDF4' : '#1B2433',
      },
      divider: {
        backgroundColor: colorScheme === 'light' ? withOpacity(colors.border, 0.88) : 'rgba(255,255,255,0.05)',
      },
      chip: {
        backgroundColor: colorScheme === 'light' ? withOpacity(colors.secondary, 0.9) : '#1A2230',
      },
      coachCard: {
        backgroundColor: colorScheme === 'light' ? '#EAF5FF' : '#061A31',
        borderColor: colorScheme === 'light' ? 'rgba(20,149,255,0.18)' : 'rgba(20,149,255,0.16)',
      },
      coachTitle: { color: colorScheme === 'light' ? '#0D1B2A' : '#FFFFFF' },
      coachText: { color: colorScheme === 'light' ? '#58718E' : '#99A8BB' },
      coachButton: {
        backgroundColor: colorScheme === 'light' ? '#1495FF' : '#1697FF',
      },
      chipCard: {
        backgroundColor: colorScheme === 'light' ? colors.card : '#101722',
        borderColor: colorScheme === 'light' ? withOpacity(colors.border, 0.96) : 'rgba(255,255,255,0.05)',
      },
      progressText: { color: '#FFFFFF' },
    }),
    [colorScheme, colors]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, pageStyles.title]}>Savings Goals</Text>
              <Text style={[styles.subtitle, pageStyles.mutedText]}>Keep reaching for the sky</Text>
            </View>

            <Pressable style={[styles.headerAction, pageStyles.headerAction]}>
              <Feather name="plus" size={24} color="#000000" />
            </Pressable>
          </View>

          <View style={[styles.summaryCard, pageStyles.summaryCard, shadows.card]}>
            <View style={styles.summaryTopRow}>
              <Text style={[styles.summaryLabel, pageStyles.summaryLabelText]}>Total Saved</Text>
              <View style={[styles.summaryBadge, pageStyles.summaryBadgeBackground]}>
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={[styles.summaryBadgeText, pageStyles.progressText]}>40% of goals</Text>
              </View>
            </View>

            <Text style={[styles.summaryAmount, pageStyles.summaryTitleText]}>₱220,500</Text>

            <View style={styles.summaryProgressRow}>
              <Text style={[styles.summaryProgressLabel, pageStyles.summaryLabelText]}>Progress</Text>
              <Text style={[styles.summaryProgressValue, pageStyles.summaryTitleText]}>₱220,500 / ₱555,000</Text>
            </View>

            <View style={[styles.summaryTrack, pageStyles.summaryTrack]}>
              <View style={styles.summaryFillWrap}>
                <LinearGradient
                  colors={['#FFFFFF', '#F5FFF8']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.summaryFill}
                />
              </View>
            </View>
          </View>

          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <View key={goal.title} style={[styles.goalCard, pageStyles.goalCard, shadows.soft]}>
                <View style={styles.goalTopRow}>
                  <View style={styles.goalIdentity}>
                    <View style={[styles.goalIconWrap, { backgroundColor: goal.iconBackground }]}>{goal.icon}</View>
                    <View style={styles.goalTextBlock}>
                      <Text style={[styles.goalTitle, pageStyles.title]}>{goal.title}</Text>
                      <Text style={[styles.goalTarget, pageStyles.mutedText]}>{goal.target}</Text>
                    </View>
                  </View>

                  <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
                </View>

                <View style={styles.goalAmountsRow}>
                  <Text style={[styles.goalSaved, pageStyles.title]}>{goal.saved}</Text>
                  <Text style={[styles.goalAmountTarget, pageStyles.mutedText]}>{goal.goal}</Text>
                </View>

                <View style={[styles.goalTrack, pageStyles.track]}>
                  <View style={[styles.goalFill, { width: `${goal.progress * 100}%`, backgroundColor: goal.accent }]} />
                </View>

                <View style={styles.goalStatusRow}>
                  <Text style={[styles.goalAchieved, pageStyles.mutedText]}>{goal.achieved}</Text>
                  <Text style={[styles.goalRemaining, pageStyles.mutedText]}>{goal.remaining}</Text>
                </View>

                <View style={[styles.goalDivider, pageStyles.divider]} />

                <Text style={[styles.recentLabel, pageStyles.mutedText]}>Recent contributions</Text>
                <View style={styles.contributionsRow}>
                  {goal.contributions.map((amount) => (
                    <View key={amount} style={[styles.contributionChip, pageStyles.chip]}>
                      <Text style={[styles.contributionText, pageStyles.title]}>{amount}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.coachCard, pageStyles.coachCard]}>
            <View style={styles.coachTopRow}>
              <View style={styles.coachAvatarFrame}>
                <Image
                  contentFit="cover"
                  source={require('@/assets/images/Eyrie_Mascot_1.png')}
                  style={styles.coachAvatar}
                />
              </View>
              <View style={styles.coachTextBlock}>
                <Text style={[styles.coachTitle, pageStyles.coachTitle]}>Great Progress!</Text>
                <Text style={[styles.coachText, pageStyles.coachText]}>
                  You&apos;re flying high! Your emergency fund is 75% complete. Keep adding ₱12,500/month to reach your goal by August.
                </Text>
              </View>
            </View>

            <Pressable style={[styles.coachButton, pageStyles.coachButton]}>
              <Text style={styles.coachButtonText}>Add Contribution</Text>
            </Pressable>
          </View>

          <View style={styles.suggestedSection}>
            <Text style={[styles.suggestedTitle, pageStyles.title]}>Suggested Goals</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedRow}>
              {suggestedGoals.map((item) => (
                <View key={item.title} style={[styles.suggestedChip, pageStyles.chipCard]}>
                  <View style={[styles.suggestedIconWrap, { backgroundColor: item.iconBackground }]}>{item.icon}</View>
                  <Text style={[styles.suggestedChipText, pageStyles.title]}>{item.title}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <AppBottomNav activeTab="goals" variant={colorScheme === 'dark' ? 'dark' : 'light'} />
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
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 150,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginTop: 22,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  summaryBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  summaryAmount: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
  },
  summaryProgressRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryProgressLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  summaryProgressValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  summaryTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  summaryFillWrap: {
    width: '40%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: radius.full,
  },
  summaryFill: {
    width: '100%',
    height: '100%',
  },
  goalsList: {
    marginTop: 18,
    gap: 18,
  },
  goalCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  goalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextBlock: {
    flex: 1,
  },
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
    lineHeight: 20,
  },
  goalAmountsRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  goalSaved: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  goalAmountTarget: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  goalTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  goalStatusRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  goalAchieved: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  goalRemaining: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  goalDivider: {
    marginTop: 16,
    height: 1,
  },
  recentLabel: {
    marginTop: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  contributionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  contributionChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributionText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  coachCard: {
    marginTop: 24,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  coachTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  coachAvatarFrame: {
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
  coachAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
  },
  coachTextBlock: {
    flex: 1,
  },
  coachTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  coachText: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 28,
  },
  coachButton: {
    marginTop: 14,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    color: '#000000',
  },
  suggestedSection: {
    marginTop: 22,
  },
  suggestedTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  suggestedRow: {
    gap: 12,
    paddingTop: 14,
    paddingRight: 14,
  },
  suggestedChip: {
    minWidth: 146,
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
