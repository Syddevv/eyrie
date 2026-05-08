import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type EntryType = 'expense' | 'income';
type FeatherIconName = ComponentProps<typeof Feather>['name'];
type IoniconsIconName = ComponentProps<typeof Ionicons>['name'];
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type CategoryOption = {
  id: string;
  label: string;
  icon: FeatherIconName | IoniconsIconName | MaterialIconName;
  iconSet: 'feather' | 'ionicons' | 'material';
};

type MerchantOption = {
  id: string;
  label: string;
  initials: string;
  color: string;
  textColor?: string;
};

const expenseCategories: readonly CategoryOption[] = [
  { id: 'food', label: 'Food', icon: 'coffee', iconSet: 'feather' },
  { id: 'transport', label: 'Transport', icon: 'car-outline', iconSet: 'ionicons' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-bag', iconSet: 'feather' },
  { id: 'bills', label: 'Bills', icon: 'zap', iconSet: 'feather' },
  { id: 'more', label: 'More', icon: 'apps-outline', iconSet: 'ionicons' },
] as const;

const incomeCategories: readonly CategoryOption[] = [
  { id: 'salary', label: 'Salary', icon: 'flash-outline', iconSet: 'ionicons' },
  { id: 'freelance', label: 'Freelance', icon: 'briefcase-outline', iconSet: 'ionicons' },
  { id: 'business', label: 'Business', icon: 'home-outline', iconSet: 'ionicons' },
  { id: 'investment', label: 'Investment', icon: 'trending-up-outline', iconSet: 'ionicons' },
] as const;

const merchants: readonly MerchantOption[] = [
  { id: 'jollibee', label: 'Jollibee', initials: 'JB', color: '#FF3B30' },
  { id: 'mcdonalds', label: "McDonald's", initials: 'M', color: '#FFC700', textColor: '#1E2433' },
  { id: 'kfc', label: 'KFC', initials: 'KFC', color: '#F50914' },
] as const;

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date) {
  const now = new Date();

  if (isSameDay(date, now)) {
    return 'Today';
  }

  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const leadingDays = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index - leadingDays + 1);
    cells.push({ key: `prev-${index}`, date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    cells.push({ key: `current-${day}`, date, inMonth: true });
  }

  const remainder = cells.length % 7;

  if (remainder !== 0) {
    const trailing = 7 - remainder;

    for (let index = 1; index <= trailing; index += 1) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, index);
      cells.push({ key: `next-${index}`, date, inMonth: false });
    }
  }

  return cells;
}

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

function CategoryIcon({
  option,
  color,
}: {
  option: CategoryOption;
  color: string;
}) {
  if (option.iconSet === 'feather') {
    return <Feather name={option.icon as FeatherIconName} size={14} color={color} />;
  }

  if (option.iconSet === 'material') {
    return <MaterialCommunityIcons name={option.icon as MaterialIconName} size={14} color={color} />;
  }

  return <Ionicons name={option.icon as IoniconsIconName} size={14} color={color} />;
}

export default function AddTransactionModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('shopping');
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState('salary');
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const activeCategories = entryType === 'expense' ? expenseCategories : incomeCategories;
  const activeCategory = entryType === 'expense' ? selectedExpenseCategory : selectedIncomeCategory;
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.72)' : 'rgba(15, 23, 42, 0.32)' },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
      },
      handle: { backgroundColor: isDark ? '#475569' : '#CBD5E1' },
      title: { color: colors.foreground },
      closeButton: {
        backgroundColor: colors.secondary,
      },
      closeIcon: { color: colors.mutedForeground },
      segmentWrap: {
        backgroundColor: colors.secondary,
      },
      segmentText: { color: colors.mutedForeground },
      segmentActive: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
      },
      amountLabel: { color: colors.mutedForeground },
      amountText: { color: colors.foreground },
      amountPlaceholder: { color: isDark ? '#64748B' : '#A3ACBA' },
      fieldLabel: { color: colors.mutedForeground },
      chip: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148, 163, 184, 0.18)',
      },
      chipText: { color: colors.foreground },
      chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      chipActiveText: { color: '#FFFFFF' },
      pillSurface: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148, 163, 184, 0.14)',
      },
      textInput: {
        backgroundColor: colors.secondary,
        color: colors.foreground,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148, 163, 184, 0.14)',
      },
      valueText: { color: colors.foreground },
      placeholderText: { color: colors.mutedForeground },
      iconTint: colors.mutedForeground,
      saveButton: {
        backgroundColor: colors.primary,
      },
      divider: {
        borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(148, 163, 184, 0.16)',
      },
      calendarCard: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
      },
      mutedCalendarText: { color: colors.mutedForeground },
      todayRing: { borderColor: colors.primary },
      dayOutsideText: { color: isDark ? '#475569' : '#B2BCCB' },
    }),
    [colors, isDark]
  );

  const saveLabel = entryType === 'expense' ? 'Save Expense' : 'Save Income';
  const title = entryType === 'expense' ? 'Add Expense' : 'Add Income';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View style={[styles.sheet, ui.sheet, shadows.floating]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>{title}</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={[styles.segmentWrap, ui.segmentWrap]}>
            <Pressable
              style={[
                styles.segmentButton,
                entryType === 'expense' && styles.segmentButtonActive,
                entryType === 'expense' && ui.segmentActive,
              ]}
              onPress={() => setEntryType('expense')}>
              <Text
                style={[
                  styles.segmentText,
                  ui.segmentText,
                  entryType === 'expense' && styles.segmentTextActive,
                  entryType === 'expense' && ui.valueText,
                ]}>
                Expense
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentButton,
                entryType === 'income' && styles.segmentButtonActive,
                entryType === 'income' && ui.segmentActive,
              ]}
              onPress={() => setEntryType('income')}>
              <Text
                style={[
                  styles.segmentText,
                  ui.segmentText,
                  entryType === 'income' && styles.segmentTextActive,
                  entryType === 'income' && ui.valueText,
                ]}>
                Income
              </Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, ui.amountLabel]}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencyMark, ui.amountText]}>₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={(value) => setAmount(sanitizeAmountInput(value))}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, ui.amountText]}
                  placeholder="0.00"
                  placeholderTextColor={ui.amountPlaceholder.color}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}>
                {activeCategories.map((option) => {
                  const isActive = activeCategory === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.categoryChip, ui.chip, isActive && ui.chipActive]}
                      onPress={() => {
                        if (entryType === 'expense') {
                          setSelectedExpenseCategory(option.id);
                        } else {
                          setSelectedIncomeCategory(option.id);
                        }
                      }}>
                      <CategoryIcon option={option} color={isActive ? '#FFFFFF' : ui.iconTint} />
                      <Text
                        style={[
                          styles.categoryChipText,
                          ui.chipText,
                          isActive && ui.chipActiveText,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {entryType === 'expense' ? (
              <View style={styles.section}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>Merchant (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.merchantRow}>
                  {merchants.map((merchant) => {
                    const isActive = selectedMerchant === merchant.id;

                    return (
                      <Pressable
                        key={merchant.id}
                        style={[
                          styles.merchantChip,
                          ui.pillSurface,
                          isActive && styles.merchantChipActive,
                          isActive && { borderColor: colors.primary },
                        ]}
                        onPress={() =>
                          setSelectedMerchant((current) => (current === merchant.id ? null : merchant.id))
                        }>
                        <View style={[styles.merchantBadge, { backgroundColor: merchant.color }]}>
                          <Text style={[styles.merchantBadgeText, { color: merchant.textColor ?? '#FFFFFF' }]}>
                            {merchant.initials}
                          </Text>
                        </View>
                        <Text style={[styles.merchantText, ui.chipText]}>{merchant.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>Source (optional)</Text>
                <TextInput
                  value={source}
                  onChangeText={setSource}
                  placeholder="Enter salary source"
                  placeholderTextColor={ui.placeholderText.color}
                  style={[styles.textInput, styles.singleLineInput, ui.textInput]}
                  selectionColor={colors.primary}
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Payment Method</Text>
              <Pressable style={[styles.selectField, ui.pillSurface]}>
                <Text style={[styles.selectValue, ui.valueText]}>BPI •••• 4521</Text>
                <Feather name="chevron-down" size={18} color={ui.iconTint} />
              </Pressable>
            </View>

            <View style={styles.inlineFieldsRow}>
              <Pressable style={[styles.dateField, ui.pillSurface]} onPress={() => setShowCalendar(true)}>
                <Text style={[styles.selectPlaceholder, ui.placeholderText]}>Date</Text>
                <View style={styles.dateValueRow}>
                  <Text style={[styles.selectValue, ui.valueText]}>{formatDateLabel(selectedDate)}</Text>
                  <Feather name="calendar" size={16} color={ui.iconTint} />
                </View>
              </Pressable>
            </View>

            <View style={styles.notesSection}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes (optional)"
                placeholderTextColor={ui.placeholderText.color}
                multiline
                textAlignVertical="top"
                style={[styles.textInput, styles.notesInput, ui.textInput]}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          <View style={[styles.footer, ui.divider]}>
            <Pressable style={[styles.saveButton, ui.saveButton]} onPress={() => router.back()}>
              <Text style={styles.saveButtonText}>{saveLabel}</Text>
            </Pressable>
          </View>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)} />
              <View style={[styles.calendarCard, ui.calendarCard, shadows.card]}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }>
                    <Feather name="chevron-left" size={16} color={ui.iconTint} />
                  </Pressable>

                  <Text style={[styles.calendarTitle, ui.valueText]}>
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </Text>

                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }>
                    <Feather name="chevron-right" size={16} color={ui.iconTint} />
                  </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => (
                    <Text key={label} style={[styles.weekdayLabel, ui.mutedCalendarText]}>
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day) => {
                    const isSelected = isSameDay(day.date, selectedDate);
                    const isToday = isSameDay(day.date, new Date());

                    return (
                      <Pressable
                        key={day.key}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.primary },
                          !isSelected && isToday && styles.todayCell,
                          !isSelected && isToday && ui.todayRing,
                        ]}
                        onPress={() => {
                          setSelectedDate(day.date);
                          setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                          setShowCalendar(false);
                        }}>
                        <Text
                          style={[
                            styles.dayLabel,
                            ui.valueText,
                            !day.inMonth && ui.dayOutsideText,
                            isSelected && styles.selectedDayText,
                          ]}>
                          {day.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
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
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderWidth: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    marginTop: 14,
    height: 42,
    borderRadius: 18,
    flexDirection: 'row',
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    ...shadows.soft,
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  segmentTextActive: {
    fontWeight: fontWeights.semibold,
  },
  body: {
    paddingTop: 10,
  },
  amountBlock: {
    alignItems: 'center',
  },
  amountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  amountRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: fontWeights.semibold,
  },
  amountInput: {
    minWidth: 156,
    maxWidth: 220,
    fontFamily: fontFamilies.sans,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: fontWeights.semibold,
    letterSpacing: -1,
    textAlign: 'center',
    paddingVertical: 0,
  },
  section: {
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 12,
  },
  categoryChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  merchantRow: {
    gap: 10,
    paddingRight: 12,
  },
  merchantChip: {
    minHeight: 42,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  merchantChipActive: {
    borderWidth: 1,
  },
  merchantBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  merchantBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: fontWeights.bold,
  },
  merchantText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  textInput: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  singleLineInput: {
    minHeight: 42,
  },
  selectField: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineFieldsRow: {
    marginTop: 12,
  },
  dateField: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  selectPlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesSection: {
    marginTop: 12,
  },
  notesInput: {
    minHeight: 64,
    maxHeight: 64,
    paddingTop: 12,
    paddingBottom: 10,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarCard: {
    width: '88%',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  weekdayRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  todayCell: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
});
