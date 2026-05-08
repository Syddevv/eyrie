import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { themeColors } from '@/constants/colors';
import { savingsGoals } from '@/constants/goals';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const leadingDays = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({
      key: `prev-${index}`,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), index - leadingDays + 1),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `current-${day}`,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
      inMonth: true,
    });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let index = 1; index <= trailing; index += 1) {
      cells.push({
        key: `next-${index}`,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, index),
        inMonth: false,
      });
    }
  }

  return cells;
}

function parseTargetDateLabel(label: string) {
  const [month, year] = label.split(' ');
  const monthIndex = monthNames.findIndex((item) => item.startsWith(month));
  return new Date(Number(year), monthIndex >= 0 ? monthIndex : 0, 1);
}

function formatTargetDate(date: Date) {
  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function sanitizeAmountInput(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export default function EditGoalModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const goal = savingsGoals.find((item) => item.id === goalId) ?? savingsGoals[0];
  const [goalName, setGoalName] = useState(goal.title);
  const [targetAmount, setTargetAmount] = useState(String(goal.goalAmount));
  const [selectedDate, setSelectedDate] = useState(parseTargetDateLabel(goal.targetDateLabel));
  const [calendarMonth, setCalendarMonth] = useState(parseTargetDateLabel(goal.targetDateLabel));
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const isSaveEnabled = goalName.trim().length > 0 && Number(targetAmount) > 0;

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
      fieldSurface: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(226,232,240,0.92)',
      },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: { backgroundColor: colors.secondary },
      secondaryText: { color: colors.foreground },
      primaryText: { color: '#FFFFFF' },
      calendarCard: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
      },
      todayRing: { borderColor: colors.primary },
      dayOutsideText: { color: isDark ? '#475569' : '#B2BCCB' },
    }),
    [colors, isDark]
  );

  const returnToGoalDetails = () => {
    router.replace({ pathname: '/goal-details-modal', params: { goalId: goal.id } });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={returnToGoalDetails} />
        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
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
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={returnToGoalDetails}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.title]}>Goal Name</Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              selectionColor={colors.primary}
              style={[styles.textField, ui.fieldSurface, ui.title]}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.title]}>Target Amount</Text>
            <View style={[styles.amountField, ui.fieldSurface]}>
              <Text style={[styles.currencyMark, ui.muted]}>₱</Text>
              <TextInput
                value={targetAmount}
                onChangeText={(value) => setTargetAmount(sanitizeAmountInput(value))}
                keyboardType="number-pad"
                selectionColor={colors.primary}
                style={[styles.amountInput, ui.title]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.title]}>Target Date</Text>
            <Pressable style={[styles.dateField, ui.fieldSurface]} onPress={() => setShowCalendar(true)}>
              <Text style={[styles.dateValue, ui.title]}>{formatTargetDate(selectedDate)}</Text>
            </Pressable>
          </View>

          <View style={styles.footerActions}>
            <Pressable style={[styles.footerButton, ui.secondaryButton]} onPress={returnToGoalDetails}>
              <Text style={[styles.footerButtonText, ui.secondaryText]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, ui.primaryButton, !isSaveEnabled && styles.disabledButton]}
              disabled={!isSaveEnabled}
              onPress={returnToGoalDetails}>
              <Text style={[styles.footerButtonText, ui.primaryText]}>Save Changes</Text>
            </Pressable>
          </View>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)} />
              <View style={[styles.calendarCard, ui.calendarCard, shadows.card]}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={[styles.calendarArrow, ui.fieldSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }>
                    <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <Text style={[styles.calendarTitle, ui.title]}>
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </Text>
                  <Pressable
                    style={[styles.calendarArrow, ui.fieldSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => (
                    <Text key={label} style={[styles.weekdayLabel, ui.muted]}>
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
                            ui.title,
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
  keyboardWrap: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
  targetRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  targetText: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 18 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  textField: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  amountField: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    paddingVertical: 0,
  },
  dateField: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dateValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  footerActions: { marginTop: 24, flexDirection: 'row', gap: 12 },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  disabledButton: { opacity: 0.5 },
  calendarOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  calendarBackdrop: { ...StyleSheet.absoluteFillObject },
  calendarCard: {
    width: '88%',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  weekdayRow: { marginTop: 14, flexDirection: 'row' },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  todayCell: { borderWidth: 1 },
  dayLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectedDayText: { color: '#FFFFFF' },
});
