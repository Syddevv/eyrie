import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/colors';
import { transactionSections, type TransactionRecord } from '@/constants/transactions';
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

function renderTransactionIcon(transaction: TransactionRecord) {
  if (transaction.iconLibrary === 'material') {
    return (
      <MaterialCommunityIcons
        name={transaction.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={22}
        color={transaction.iconColor}
      />
    );
  }

  return (
    <Feather
      name={transaction.iconName as React.ComponentProps<typeof Feather>['name']}
      size={20}
      color={transaction.iconColor}
    />
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? '#060B15' : colors.background },
      title: { color: isDark ? '#FFFFFF' : colors.foreground },
      subtitle: { color: isDark ? '#9EA6B5' : '#6B7485' },
      iconButton: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.9),
      },
      searchBar: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.9),
      },
      searchText: { color: isDark ? '#8D97A7' : '#758094' },
      incomeCard: {
        backgroundColor: isDark ? '#07261D' : '#DDF8E8',
      },
      expenseCard: {
        backgroundColor: isDark ? '#2A0913' : '#FFE0E6',
      },
      sectionLabel: { color: isDark ? '#A1ABBA' : '#6B7485' },
      groupCard: {
        backgroundColor: isDark ? '#101722' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.92),
      },
      divider: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.84),
      },
      incomeAmount: { color: '#00C665' },
      defaultAmount: { color: isDark ? '#FFFFFF' : colors.foreground },
      chevron: { color: isDark ? '#7F8897' : '#8C94A3' },
    }),
    [colors, isDark]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <Pressable style={[styles.backButton, pageStyles.iconButton]} onPress={() => router.back()}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, pageStyles.title]}>All Transactions</Text>
              <Text style={[styles.countText, pageStyles.subtitle]}>14 transactions</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={[styles.searchBar, pageStyles.searchBar]}>
              <Feather name="search" size={18} color={pageStyles.searchText.color} />
              <Text style={[styles.searchPlaceholder, pageStyles.searchText]}>Search transactions...</Text>
            </View>

            <Pressable style={[styles.smallIconButton, pageStyles.iconButton]}>
              <Feather name="filter" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={[styles.smallIconButton, pageStyles.iconButton]}>
              <Feather name="calendar" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, pageStyles.incomeCard]}>
              <Text style={styles.summaryLabelIncome}>Total Income</Text>
              <Text style={styles.summaryAmountIncome}>₱65,000</Text>
            </View>
            <View style={[styles.summaryCard, pageStyles.expenseCard]}>
              <Text style={styles.summaryLabelExpense}>Total Expenses</Text>
              <Text style={styles.summaryAmountExpense}>₱10,887</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.recordsScroll} contentContainerStyle={styles.recordsContent} showsVerticalScrollIndicator={false}>
          {transactionSections.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, pageStyles.sectionLabel]}>{section.title}</Text>

              <View style={[styles.groupCard, pageStyles.groupCard, shadows.soft]}>
                {section.items.map((item, index) => (
                  <View key={item.id}>
                    <Pressable
                      style={styles.recordRow}
                      onPress={() =>
                        router.push({
                          pathname: '/transaction-details-modal',
                          params: { transactionId: item.id },
                        })
                      }>
                      <View style={styles.recordLeft}>
                        <View
                          style={[
                            styles.recordIconWrap,
                            {
                              backgroundColor: isDark ? item.iconBackgroundDark : item.iconBackgroundLight,
                            },
                          ]}>
                          {renderTransactionIcon(item)}
                        </View>

                        <View>
                          <Text style={[styles.recordTitle, pageStyles.title]}>{item.title}</Text>
                          <Text style={[styles.recordCategory, pageStyles.subtitle]}>{item.category}</Text>
                        </View>
                      </View>

                      <View style={styles.recordRight}>
                        <Text
                          style={[
                            styles.recordAmount,
                            item.amountColor === 'income' ? pageStyles.incomeAmount : pageStyles.defaultAmount,
                          ]}>
                          {item.amount}
                        </Text>
                        <Feather name="chevron-right" size={18} color={pageStyles.chevron.color} />
                      </View>
                    </Pressable>

                    {index < section.items.length - 1 ? <View style={[styles.rowDivider, pageStyles.divider]} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  countText: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  searchRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchPlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  smallIconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 24,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  summaryLabelIncome: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    color: '#00C665',
  },
  summaryAmountIncome: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: '#00C665',
  },
  summaryLabelExpense: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    color: '#FF1843',
  },
  summaryAmountExpense: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: '#FF1843',
  },
  recordsScroll: {
    flex: 1,
    marginTop: 2,
  },
  recordsContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recordRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  recordIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  recordCategory: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  rowDivider: {
    marginLeft: 76,
    height: 1,
  },
});
