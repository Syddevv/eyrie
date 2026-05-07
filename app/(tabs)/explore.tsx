import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';

const categories = [
  {
    title: 'Food & Dining',
    transactions: '24 transactions',
    spent: '₱8,500 / ₱12,000',
    remaining: '₱3,500',
    progress: 0.7,
    iconBackground: '#FFEEBC',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#D97706" />,
  },
  {
    title: 'Transportation',
    transactions: '15 transactions',
    spent: '₱3,200 / ₱5,000',
    remaining: '₱1,800',
    progress: 0.64,
    iconBackground: '#DDEAFF',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#2563EB" />,
  },
  {
    title: 'Shopping',
    transactions: '8 transactions',
    spent: '₱6,800 / ₱8,000',
    remaining: '₱1,200',
    progress: 0.85,
    iconBackground: '#FCE2F4',
    accent: '#1495FF',
    icon: <Feather name="shopping-bag" size={20} color="#DB2777" />,
  },
  {
    title: 'Bills & Utilities',
    transactions: '5 transactions',
    spent: '₱4,500 / ₱5,000',
    remaining: '₱500',
    progress: 0.9,
    iconBackground: '#FFF4B8',
    accent: '#FF9F0A',
    icon: <Feather name="zap" size={20} color="#F59E0B" />,
  },
  {
    title: 'Entertainment',
    transactions: '12 transactions',
    spent: '₱2,100 / ₱3,000',
    remaining: '₱900',
    progress: 0.7,
    iconBackground: '#EFE9FF',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="filmstrip-box-multiple" size={22} color="#7C3AED" />,
  },
  {
    title: 'Housing',
    transactions: '1 transactions',
    spent: '₱15,000 / ₱15,000',
    remaining: '₱0',
    progress: 1,
    iconBackground: '#D8F6E7',
    accent: '#FF9F0A',
    icon: <Feather name="home" size={20} color="#059669" />,
  },
  {
    title: 'Health',
    transactions: '3 transactions',
    spent: '₱1,200 / ₱3,000',
    remaining: '₱1,800',
    progress: 0.4,
    iconBackground: '#FFE2E2',
    accent: '#1495FF',
    icon: <Feather name="heart" size={20} color="#EF4444" />,
  },
  {
    title: 'Education',
    transactions: '6 transactions',
    spent: '₱2,400 / ₱4,000',
    remaining: '₱1,600',
    progress: 0.6,
    iconBackground: '#E6E9FF',
    accent: '#1495FF',
    icon: <Ionicons name="school-outline" size={22} color="#4F46E5" />,
  },
] as const;

export default function BudgetScreen() {
  const styles = useMemo(() => createStyles(), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Budget</Text>
            <Text style={styles.subtitle}>Track your spending limits</Text>
          </View>

          <View style={styles.monthRow}>
            <Pressable style={styles.monthButton}>
              <Feather name="chevron-left" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.monthLabel}>May 2026</Text>
            <Pressable style={styles.monthButton}>
              <Feather name="chevron-right" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <LinearGradient
            colors={['#1F9BFF', '#178BFF', '#117FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}>
            <View style={styles.totalBubble} />
            <View style={styles.totalTopRow}>
              <Text style={styles.totalLabel}>Total Budget</Text>
              <View style={styles.totalPill}>
                <Feather name="trending-down" size={14} color="#FFFFFF" />
                <Text style={styles.totalPillText}>79% used</Text>
              </View>
            </View>

            <Text style={styles.totalAmount}>₱53,000</Text>

            <View style={styles.totalProgressTrack}>
              <View style={styles.totalProgressFill} />
            </View>

            <View style={styles.totalStatsRow}>
              <View>
                <Text style={styles.totalStatLabel}>Spent</Text>
                <Text style={styles.totalSpent}>₱41,800</Text>
              </View>
              <View style={styles.totalStatRight}>
                <Text style={styles.totalStatLabel}>Remaining</Text>
                <Text style={styles.totalRemaining}>₱11,200</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.cycleCard, shadows.card]}>
            <Text style={styles.cardTitle}>Budget Cycle</Text>
            <View style={styles.segmentedRow}>
              <View style={styles.segmentInactive}>
                <Text style={styles.segmentInactiveText}>Weekly</Text>
              </View>
              <View style={styles.segmentInactive}>
                <Text style={styles.segmentInactiveText}>Bi-Weekly</Text>
              </View>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>Monthly</Text>
              </View>
            </View>
            <Text style={styles.cycleHint}>Your budgets will reset every month.</Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipAvatarWrap}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_1.png')}
                style={styles.tipAvatar}
              />
            </View>
            <View style={styles.tipTextBlock}>
              <Text style={styles.tipTitle}>Budget Tip</Text>
              <Text style={styles.tipText}>
                Tap any category to edit its budget. Use the + button to add new categories!
              </Text>
            </View>
          </View>

          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Categories</Text>
            <Pressable style={styles.addButton}>
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.categoryList}>
            {categories.map((item) => (
              <View key={item.title} style={[styles.categoryCard, shadows.soft]}>
                <View style={styles.categoryTopRow}>
                  <View style={styles.categoryIdentity}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: item.iconBackground }]}>
                      {item.icon}
                    </View>
                    <View>
                      <Text style={styles.categoryTitle}>{item.title}</Text>
                      <Text style={styles.categoryTransactions}>{item.transactions}</Text>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <Pressable style={styles.actionButton}>
                      <Feather name="edit-3" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Pressable style={styles.actionButton}>
                      <Feather name="trash-2" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.categoryAmountsRow}>
                  <Text style={styles.categorySpent}>{item.spent}</Text>
                  <Text style={[styles.categoryRemaining, { color: item.accent }]}>
                    {item.remaining} <Text style={styles.categoryLeftLabel}>left</Text>
                  </Text>
                </View>

                <View style={styles.categoryProgressTrack}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      { width: `${item.progress * 100}%`, backgroundColor: item.accent },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <AppBottomNav activeTab="budget" variant="dark" />
      </View>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#060B16',
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 150,
    },
    headerBlock: {
      marginTop: 4,
    },
    title: {
      fontFamily: fontFamilies.sans,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    subtitle: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 22,
      color: '#8C93A3',
    },
    monthRow: {
      marginTop: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 42,
    },
    monthButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: '#171E2B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthLabel: {
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    totalCard: {
      marginTop: 18,
      borderRadius: 30,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 18,
      overflow: 'hidden',
    },
    totalBubble: {
      position: 'absolute',
      width: 132,
      height: 132,
      borderRadius: radius.full,
      top: -28,
      right: -36,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    totalTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
      color: '#D7EEFF',
    },
    totalPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    totalPillText: {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    totalAmount: {
      marginTop: 6,
      fontFamily: fontFamilies.sans,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    totalProgressTrack: {
      marginTop: 18,
      height: 14,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.18)',
      overflow: 'hidden',
    },
    totalProgressFill: {
      width: '79%',
      height: '100%',
      borderRadius: radius.full,
      backgroundColor: '#FFC21A',
    },
    totalStatsRow: {
      marginTop: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    totalStatLabel: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      color: '#D7EEFF',
    },
    totalSpent: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    totalStatRight: {
      alignItems: 'flex-end',
    },
    totalRemaining: {
      marginTop: 4,
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
      color: '#71F28E',
    },
    cycleCard: {
      marginTop: 20,
      borderRadius: 26,
      backgroundColor: '#101722',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    cardTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    segmentedRow: {
      marginTop: 16,
      flexDirection: 'row',
      gap: 10,
    },
    segmentInactive: {
      flex: 1,
      minHeight: 38,
      borderRadius: radius.full,
      backgroundColor: '#1A2230',
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentInactiveText: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    segmentActive: {
      flex: 1,
      minHeight: 38,
      borderRadius: radius.full,
      backgroundColor: '#1697FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActiveText: {
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    cycleHint: {
      marginTop: 14,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 20,
      color: '#8C93A3',
    },
    tipCard: {
      marginTop: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(53, 211, 165, 0.24)',
      backgroundColor: 'rgba(2, 61, 48, 0.48)',
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    tipAvatarWrap: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: '#CFEFE8',
      backgroundColor: '#CFEFE8',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
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
      color: '#70F4B4',
    },
    tipText: {
      marginTop: 2,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 22,
      color: '#69EEA9',
    },
    categoriesHeader: {
      marginTop: 22,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categoriesTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#1697FF',
      paddingHorizontal: 12,
      height: 34,
      borderRadius: radius.full,
    },
    addButtonText: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: '#FFFFFF',
    },
    categoryList: {
      marginTop: 14,
      gap: 14,
    },
    categoryCard: {
      borderRadius: 26,
      backgroundColor: '#101722',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.04)',
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    categoryTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryIconWrap: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
    },
    categoryTransactions: {
      marginTop: 2,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
      color: '#8C93A3',
    },
    categoryActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    actionButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: '#1A2230',
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryAmountsRow: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categorySpent: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
      color: '#9EA6B5',
    },
    categoryRemaining: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
    },
    categoryLeftLabel: {
      color: '#8C93A3',
      fontWeight: fontWeights.regular,
    },
    categoryProgressTrack: {
      marginTop: 10,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: '#1B2433',
      overflow: 'hidden',
    },
    categoryProgressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
  });
}
