import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BudgetCategory = {
  id: string;
  title: string;
  transactions: string;
  spentAmount: number;
  budgetAmount: number;
  iconBackground: string;
  accent: string;
  icon: React.ReactNode;
};

const initialCategories: BudgetCategory[] = [
  {
    id: 'food',
    title: 'Food & Dining',
    transactions: '24 transactions',
    spentAmount: 8500,
    budgetAmount: 12000,
    iconBackground: '#FFEEBC',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#D97706" />,
  },
  {
    id: 'transport',
    title: 'Transportation',
    transactions: '15 transactions',
    spentAmount: 3200,
    budgetAmount: 5000,
    iconBackground: '#DDEAFF',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#2563EB" />,
  },
  {
    id: 'shopping',
    title: 'Shopping',
    transactions: '8 transactions',
    spentAmount: 6800,
    budgetAmount: 8000,
    iconBackground: '#FCE2F4',
    accent: '#1495FF',
    icon: <Feather name="shopping-bag" size={20} color="#DB2777" />,
  },
  {
    id: 'bills',
    title: 'Bills & Utilities',
    transactions: '5 transactions',
    spentAmount: 4500,
    budgetAmount: 5000,
    iconBackground: '#FFF4B8',
    accent: '#FF9F0A',
    icon: <Feather name="zap" size={20} color="#F59E0B" />,
  },
  {
    id: 'entertainment',
    title: 'Entertainment',
    transactions: '12 transactions',
    spentAmount: 2100,
    budgetAmount: 3000,
    iconBackground: '#EFE9FF',
    accent: '#1495FF',
    icon: <MaterialCommunityIcons name="filmstrip-box-multiple" size={22} color="#7C3AED" />,
  },
  {
    id: 'housing',
    title: 'Housing',
    transactions: '1 transactions',
    spentAmount: 15000,
    budgetAmount: 15000,
    iconBackground: '#D8F6E7',
    accent: '#FF9F0A',
    icon: <Feather name="home" size={20} color="#059669" />,
  },
  {
    id: 'health',
    title: 'Health',
    transactions: '3 transactions',
    spentAmount: 1200,
    budgetAmount: 3000,
    iconBackground: '#FFE2E2',
    accent: '#1495FF',
    icon: <Feather name="heart" size={20} color="#EF4444" />,
  },
  {
    id: 'education',
    title: 'Education',
    transactions: '6 transactions',
    spentAmount: 2400,
    budgetAmount: 4000,
    iconBackground: '#E6E9FF',
    accent: '#1495FF',
    icon: <Ionicons name="school-outline" size={22} color="#4F46E5" />,
  },
] as const;

function formatCurrency(value: number) {
  return `₱${value.toLocaleString('en-PH')}`;
}

function sanitizeBudgetInput(value: string) {
  return value.replace(/[^0-9]/g, '');
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

export default function BudgetScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const [categories, setCategories] = useState(initialCategories);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftBudgetValue, setDraftBudgetValue] = useState('');

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      title: { color: colors.foreground },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      monthButton: {
        backgroundColor:
          colorScheme === 'light' ? withOpacity(colors.secondary, 0.78) : withOpacity(colors.secondary, 0.42),
        borderColor: colorScheme === 'light' ? withOpacity(colors.border, 0.9) : withOpacity(colors.border, 0.42),
      },
      monthIcon: { color: colors.foreground },
      totalGradient:
        colorScheme === 'light'
          ? (['#1F9BFF', '#178BFF', '#117FFF'] as const)
          : (['#127FF0', '#0E71E2', '#0D5CCA'] as const),
      cycleCard: {
        backgroundColor: colorScheme === 'light' ? colors.card : '#101722',
        borderColor: colorScheme === 'light' ? withOpacity(colors.border, 0.96) : 'rgba(255,255,255,0.05)',
      },
      segmentInactive: {
        backgroundColor: colorScheme === 'light' ? withOpacity(colors.secondary, 0.92) : '#1A2230',
      },
      tipCard: {
        backgroundColor:
          colorScheme === 'light' ? 'rgba(226, 251, 240, 0.95)' : 'rgba(2, 61, 48, 0.48)',
        borderColor:
          colorScheme === 'light' ? 'rgba(83, 214, 156, 0.28)' : 'rgba(53, 211, 165, 0.24)',
      },
      tipAvatarWrap: {
        borderColor: colorScheme === 'light' ? '#BCEEDD' : '#CFEFE8',
        backgroundColor: colorScheme === 'light' ? '#BCEEDD' : '#CFEFE8',
      },
      tipTitle: { color: colorScheme === 'light' ? '#13A76B' : '#70F4B4' },
      tipText: { color: colorScheme === 'light' ? '#188A61' : '#69EEA9' },
      addButton: { backgroundColor: colorScheme === 'light' ? colors.primary : '#1697FF' },
      categoryCard: {
        backgroundColor: colorScheme === 'light' ? colors.card : '#101722',
        borderColor: colorScheme === 'light' ? withOpacity(colors.border, 0.96) : 'rgba(255,255,255,0.04)',
      },
      actionButton: {
        backgroundColor:
          colorScheme === 'light' ? withOpacity(colors.secondary, 0.92) : '#1A2230',
      },
      actionButtonActive: {
        backgroundColor: colors.primary,
      },
      categorySpent: { color: colorScheme === 'light' ? '#6E7787' : '#9EA6B5' },
      categoryLeftLabel: { color: colorScheme === 'light' ? '#7E8796' : '#8C93A3' },
      progressTrack: { backgroundColor: colorScheme === 'light' ? '#E8EDF4' : '#1B2433' },
      budgetInput: {
        backgroundColor: colorScheme === 'light' ? colors.card : '#172132',
        borderColor: colorScheme === 'light' ? '#9FD0FF' : '#2E8FFF',
      },
      budgetInputText: { color: colors.foreground },
    }),
    [colorScheme, colors]
  );

  const styles = useMemo(() => createStyles(), []);

  const startEditingCategory = (category: BudgetCategory) => {
    setEditingCategoryId(category.id);
    setDraftBudgetValue(String(category.budgetAmount));
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setDraftBudgetValue('');
  };

  const saveEditingCategory = (categoryId: string) => {
    const nextBudgetAmount = Number(draftBudgetValue);

    if (!nextBudgetAmount) {
      cancelEditingCategory();
      return;
    }

    setCategories((current) =>
      current.map((item) =>
        item.id === categoryId ? { ...item, budgetAmount: nextBudgetAmount } : item
      )
    );
    cancelEditingCategory();
  };

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, pageStyles.title]}>Budget</Text>
          <Text style={[styles.subtitle, pageStyles.mutedText]}>Track your spending limits</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.monthRow}>
            <Pressable style={[styles.monthButton, pageStyles.monthButton]}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.monthLabel, pageStyles.title]}>May 2026</Text>
            <Pressable style={[styles.monthButton, pageStyles.monthButton]}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <LinearGradient
            colors={pageStyles.totalGradient}
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

          <View style={[styles.cycleCard, pageStyles.cycleCard, shadows.card]}>
            <Text style={[styles.cardTitle, pageStyles.title]}>Budget Cycle</Text>
            <View style={styles.segmentedRow}>
              <View style={[styles.segmentInactive, pageStyles.segmentInactive]}>
                <Text style={[styles.segmentInactiveText, pageStyles.title]}>Weekly</Text>
              </View>
              <View style={[styles.segmentInactive, pageStyles.segmentInactive]}>
                <Text style={[styles.segmentInactiveText, pageStyles.title]}>Bi-Weekly</Text>
              </View>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>Monthly</Text>
              </View>
            </View>
            <Text style={[styles.cycleHint, pageStyles.mutedText]}>Your budgets will reset every month.</Text>
          </View>

          <View style={[styles.tipCard, pageStyles.tipCard]}>
            <View style={[styles.tipAvatarWrap, pageStyles.tipAvatarWrap]}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_1.png')}
                style={styles.tipAvatar}
              />
            </View>
            <View style={styles.tipTextBlock}>
              <Text style={[styles.tipTitle, pageStyles.tipTitle]}>Budget Tip</Text>
              <Text style={[styles.tipText, pageStyles.tipText]}>
                Tap any category to edit its budget. Use the + button to add new categories!
              </Text>
            </View>
          </View>

          <View style={styles.categoriesHeader}>
            <Text style={[styles.categoriesTitle, pageStyles.title]}>Categories</Text>
            <Pressable
              style={[styles.addButton, pageStyles.addButton]}
              onPress={() => router.push('/add-category-modal')}>
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.categoryList}>
            {categories.map((item) => {
              const isEditing = editingCategoryId === item.id;
              const remainingAmount = Math.max(item.budgetAmount - item.spentAmount, 0);
              const progress = Math.min(item.spentAmount / item.budgetAmount, 1);

              return (
              <View key={item.id} style={[styles.categoryCard, pageStyles.categoryCard, shadows.soft]}>
                <View style={styles.categoryTopRow}>
                  <View style={styles.categoryIdentity}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: item.iconBackground }]}>
                      {item.icon}
                    </View>
                    <View>
                      <Text style={[styles.categoryTitle, pageStyles.title]}>{item.title}</Text>
                      <Text style={[styles.categoryTransactions, pageStyles.mutedText]}>{item.transactions}</Text>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <Pressable
                      style={[
                        styles.actionButton,
                        isEditing ? pageStyles.actionButtonActive : pageStyles.actionButton,
                      ]}
                      onPress={() => (isEditing ? cancelEditingCategory() : startEditingCategory(item))}>
                      <Feather name="edit-3" size={16} color={isEditing ? '#FFFFFF' : colors.foreground} />
                    </Pressable>
                    <Pressable style={[styles.actionButton, pageStyles.actionButton]}>
                      <Feather name="trash-2" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.categoryEditRow}>
                    <View style={styles.categoryEditAmountRow}>
                      <Text style={[styles.categorySpent, pageStyles.categorySpent]}>
                        {formatCurrency(item.spentAmount)} / ₱
                      </Text>
                      <View style={[styles.budgetInputWrap, pageStyles.budgetInput]}>
                        <TextInput
                          value={draftBudgetValue}
                          onChangeText={(value) => setDraftBudgetValue(sanitizeBudgetInput(value))}
                          keyboardType="number-pad"
                          selectionColor={colors.primary}
                          style={[styles.budgetInput, pageStyles.budgetInputText]}
                        />
                      </View>
                    </View>

                    <View style={styles.categoryEditActions}>
                      <Pressable
                        style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                        onPress={() => saveEditingCategory(item.id)}>
                        <Feather name="check" size={18} color="#FFFFFF" />
                      </Pressable>
                      <Pressable
                        style={[styles.cancelButton, pageStyles.actionButton]}
                        onPress={cancelEditingCategory}>
                        <Feather name="x" size={18} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.categoryAmountsRow}>
                    <Text style={[styles.categorySpent, pageStyles.categorySpent]}>
                      {formatCurrency(item.spentAmount)} / {formatCurrency(item.budgetAmount)}
                    </Text>
                    <Text style={[styles.categoryRemaining, { color: item.accent }]}>
                      {formatCurrency(remainingAmount)}{' '}
                      <Text style={[styles.categoryLeftLabel, pageStyles.categoryLeftLabel]}>left</Text>
                    </Text>
                  </View>
                )}

                <View style={[styles.categoryProgressTrack, pageStyles.progressTrack]}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      { width: `${progress * 100}%`, backgroundColor: item.accent },
                    ]}
                  />
                </View>
              </View>
            )})}
          </View>
        </ScrollView>

        <AppBottomNav activeTab="budget" variant={colorScheme === 'dark' ? 'dark' : 'light'} />
      </View>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    headerBlock: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 16,
      marginTop: 4,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 150,
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
    },
    monthRow: {
      marginTop: 0,
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
    },
    categoryTransactions: {
      marginTop: 2,
      fontFamily: fontFamilies.sans,
      fontSize: 14,
      lineHeight: 18,
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
    categoryEditRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    categoryEditAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 6,
    },
    categorySpent: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
    },
    categoryRemaining: {
      fontFamily: fontFamilies.sans,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: fontWeights.bold,
    },
    categoryLeftLabel: {
      fontWeight: fontWeights.regular,
    },
    budgetInputWrap: {
      minWidth: 98,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    budgetInput: {
      fontFamily: fontFamilies.sans,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      paddingVertical: 0,
    },
    categoryEditActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    confirmButton: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
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
