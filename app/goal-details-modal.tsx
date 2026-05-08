import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { themeColors } from '@/constants/colors';
import { savingsGoals } from '@/constants/goals';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

function renderHeaderIcon(symbol: string, color: string) {
  switch (symbol) {
    case 'shield':
      return <Ionicons name="shield-checkmark-outline" size={22} color={color} />;
    case 'monitor':
      return <Feather name="monitor" size={20} color={color} />;
    case 'travel':
      return <Ionicons name="airplane-outline" size={20} color={color} />;
    case 'car':
      return <MaterialCommunityIcons name="car-outline" size={20} color={color} />;
    default:
      return <Feather name="target" size={20} color={color} />;
  }
}

export default function GoalDetailsModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const goal = savingsGoals.find((item) => item.id === goalId) ?? savingsGoals[1];
  const contributionsCount = goal.contributionHistory.length;

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.64)' : 'rgba(15, 23, 42, 0.34)' },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.04)',
      },
      handle: { backgroundColor: isDark ? '#64748B' : '#CBD5E1' },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      statCard: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226,232,240,0.92)',
      },
      progressTrack: {
        backgroundColor: isDark ? '#1B2433' : '#EEF2F7',
      },
      historyRow: {
        backgroundColor: colors.secondary,
      },
      positiveAmount: { color: '#10B981' },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: {
        backgroundColor: colors.secondary,
      },
      destructiveButton: {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      },
      destructiveText: { color: '#EF4444' },
    }),
    [colors, isDark]
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <View style={[styles.headerIconWrap, { backgroundColor: goal.iconBackground }]}>
              {renderHeaderIcon(goal.iconSymbol, '#FFFFFF')}
            </View>
            <View>
              <Text style={[styles.headerTitle, ui.title]}>{goal.title}</Text>
              <View style={styles.targetRow}>
                <Feather name="calendar" size={13} color={colors.mutedForeground} />
                <Text style={[styles.targetText, ui.muted]}>{`Target: ${goal.targetDateLabel}`}</Text>
              </View>
            </View>
          </View>

          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.progressCard, ui.statCard]}>
          <View style={styles.progressTopRow}>
            <Text style={[styles.savedAmount, ui.title]}>{`₱${goal.savedAmount.toLocaleString('en-PH')}`}</Text>
            <Text style={[styles.goalAmount, ui.muted]}>{`of ₱${goal.goalAmount.toLocaleString('en-PH')}`}</Text>
          </View>

          <View style={[styles.progressTrack, ui.progressTrack]}>
            <View style={[styles.progressFill, { width: `${goal.progress * 100}%`, backgroundColor: '#1482E9' }]} />
          </View>

          <View style={styles.progressBottomRow}>
            <Text style={[styles.achievedText, ui.muted]}>{goal.achievedLabel}</Text>
            <Text style={[styles.remainingText, ui.title]}>{goal.remainingLabel}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, ui.statCard]}>
            <Text style={[styles.summaryLabel, ui.muted]}>Monthly Target</Text>
            <Text style={[styles.summaryValue, ui.title]}>{goal.monthlyTarget}</Text>
          </View>
          <View style={[styles.summaryCard, ui.statCard]}>
            <Text style={[styles.summaryLabel, ui.muted]}>Contributions</Text>
            <Text style={[styles.summaryValue, ui.title]}>{`${contributionsCount} total`}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, ui.title]}>Contribution History</Text>

        <ScrollView
          style={styles.historyList}
          contentContainerStyle={styles.historyContent}
          showsVerticalScrollIndicator={false}>
          {goal.contributionHistory.map((entry, index) => (
            <View key={`${goal.id}-${entry.date}-${index}`} style={[styles.historyRow, ui.historyRow]}>
              <View style={styles.historyLeft}>
                <View style={styles.historyIconWrap}>
                  <Feather name="trending-up" size={15} color="#10B981" />
                </View>
                <Text style={[styles.historyDate, ui.title]}>{entry.date}</Text>
              </View>
              <Text style={[styles.historyAmount, ui.positiveAmount]}>{entry.amount}</Text>
            </View>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.contributeButton, ui.primaryButton]}
          onPress={() =>
            router.replace({ pathname: '/add-contribution-modal', params: { goalId: goal.id } })
          }>
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.contributeButtonText}>Add Contribution</Text>
        </Pressable>

        <View style={styles.footerActions}>
          <Pressable
            style={[styles.footerButton, ui.secondaryButton]}
            onPress={() =>
              router.replace({ pathname: '/edit-goal-modal', params: { goalId: goal.id } })
            }>
            <Feather name="edit-3" size={18} color={colors.foreground} />
            <Text style={[styles.footerButtonText, ui.title]}>Edit Goal</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, ui.destructiveButton]}>
            <Feather name="trash-2" size={18} color="#EF4444" />
            <Text style={[styles.footerButtonText, ui.destructiveText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderWidth: 1,
    maxHeight: '72%',
  },
  handle: {
    alignSelf: 'center',
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  targetRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    marginTop: 22,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  goalAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievedText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  remainingText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  summaryRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  summaryValue: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  sectionTitle: {
    marginTop: 20,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  historyList: {
    marginTop: 12,
    maxHeight: 140,
  },
  historyContent: {
    gap: 12,
    paddingBottom: 4,
  },
  historyRow: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  historyAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  contributeButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  contributeButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  footerActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
