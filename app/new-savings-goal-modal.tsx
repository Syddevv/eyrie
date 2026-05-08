import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
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
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type FeatherName = ComponentProps<typeof Feather>['name'];
type IoniconName = ComponentProps<typeof Ionicons>['name'];
type MaterialName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type GoalIconOption = {
  id: string;
  family: 'feather' | 'ionicons' | 'material';
  name: FeatherName | IoniconName | MaterialName;
  activeColor: string;
};

const goalIcons: readonly GoalIconOption[] = [
  { id: 'shield', family: 'ionicons', name: 'shield-checkmark-outline', activeColor: '#10B981' },
  { id: 'monitor', family: 'feather', name: 'monitor', activeColor: '#3B82F6' },
  { id: 'travel', family: 'ionicons', name: 'airplane-outline', activeColor: '#8B5CF6' },
  { id: 'car', family: 'material', name: 'car-outline', activeColor: '#F97316' },
  { id: 'home', family: 'feather', name: 'home', activeColor: '#0EA5E9' },
  { id: 'gift', family: 'feather', name: 'gift', activeColor: '#EF4444' },
  { id: 'education', family: 'ionicons', name: 'school-outline', activeColor: '#6366F1' },
  { id: 'heart', family: 'feather', name: 'heart', activeColor: '#EC4899' },
  { id: 'briefcase', family: 'feather', name: 'briefcase', activeColor: '#14B8A6' },
  { id: 'camera', family: 'feather', name: 'camera', activeColor: '#F59E0B' },
  { id: 'phone', family: 'feather', name: 'smartphone', activeColor: '#64748B' },
  { id: 'target', family: 'feather', name: 'target', activeColor: '#A855F7' },
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

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
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

function GoalIcon({ option, color }: { option: GoalIconOption; color: string }) {
  if (option.family === 'feather') {
    return <Feather name={option.name as FeatherName} size={22} color={color} />;
  }

  if (option.family === 'material') {
    return <MaterialCommunityIcons name={option.name as MaterialName} size={22} color={color} />;
  }

  return <Ionicons name={option.name as IoniconName} size={22} color={color} />;
}

export default function NewSavingsGoalModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 8));
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 4, 1));
  const [selectedIconId, setSelectedIconId] = useState(goalIcons[0].id);
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isCreateEnabled = goalName.trim().length > 0 && Number(targetAmount) > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.64)' : 'rgba(15, 23, 42, 0.34)' },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.04)',
      },
      handle: { backgroundColor: isDark ? '#64748B' : '#CBD5E1' },
      title: { color: colors.foreground },
      closeButton: { backgroundColor: colors.secondary },
      closeIcon: { color: colors.mutedForeground },
      coachCard: {
        backgroundColor: isDark ? 'rgba(31, 113, 255, 0.12)' : 'rgba(74, 168, 255, 0.12)',
        borderColor: isDark ? 'rgba(96,165,250,0.18)' : 'rgba(137, 191, 255, 0.34)',
      },
      coachText: { color: isDark ? '#B8D6FF' : '#56708E' },
      fieldLabel: { color: colors.foreground },
      fieldSurface: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(226,232,240,0.92)',
      },
      placeholder: { color: colors.mutedForeground },
      value: { color: colors.foreground },
      iconSurface: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(226,232,240,0.92)',
      },
      cta: {
        backgroundColor: colors.secondary,
      },
      ctaText: { color: colors.mutedForeground },
      ctaActive: {
        backgroundColor: colors.primary,
      },
      ctaActiveText: { color: '#FFFFFF' },
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>New Savings Goal</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={[styles.coachCard, ui.coachCard]}>
            <View style={styles.coachAvatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_1.png')}
                style={styles.coachAvatar}
              />
            </View>
            <Text style={[styles.coachText, ui.coachText]}>
              Setting goals is the first step to achieving them! What would you like to save for?
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.fieldLabel]}>Goal Name</Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g., Dream Vacation"
              placeholderTextColor={ui.placeholder.color}
              selectionColor={colors.primary}
              style={[styles.textField, ui.fieldSurface, ui.value]}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.fieldLabel]}>Target Amount</Text>
            <View style={[styles.amountField, ui.fieldSurface]}>
              <Text style={[styles.currencyMark, ui.placeholder]}>₱</Text>
              <TextInput
                value={targetAmount}
                onChangeText={(value) => setTargetAmount(sanitizeAmountInput(value))}
                placeholder="0"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="decimal-pad"
                selectionColor={colors.primary}
                style={[styles.amountInput, ui.value]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.fieldLabel]}>Target Date</Text>
            <Pressable style={[styles.dateField, ui.fieldSurface]} onPress={() => setShowCalendar(true)}>
              <View style={styles.dateFieldLeft}>
                <Feather name="calendar" size={16} color={colors.mutedForeground} />
                <Text style={[styles.dateValue, ui.value]}>{formatDateLabel(selectedDate)}</Text>
              </View>
              <Ionicons name="calendar-clear-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.fieldLabel]}>Choose an Icon</Text>
            <View style={styles.iconGrid}>
              {goalIcons.map((iconOption) => {
                const isActive = iconOption.id === selectedIconId;

                return (
                  <Pressable
                    key={iconOption.id}
                    style={[
                      styles.iconButton,
                      ui.iconSurface,
                      isActive && {
                        backgroundColor: iconOption.activeColor,
                        borderColor: iconOption.activeColor,
                      },
                    ]}
                    onPress={() => setSelectedIconId(iconOption.id)}>
                    <GoalIcon option={iconOption} color={isActive ? '#FFFFFF' : colors.foreground} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={[styles.createButton, ui.cta, isCreateEnabled && ui.ctaActive]}
            disabled={!isCreateEnabled}
            onPress={() => router.back()}>
            <Text
              style={[
                styles.createButtonText,
                ui.ctaText,
                isCreateEnabled && ui.ctaActiveText,
              ]}>
              Create Goal
            </Text>
          </Pressable>

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

                  <Text style={[styles.calendarTitle, ui.value]}>
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
                            ui.value,
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
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderWidth: 1,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  coachAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachAvatar: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
  },
  coachText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 22,
  },
  section: {
    marginTop: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  textField: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  amountField: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    paddingVertical: 0,
  },
  dateField: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
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
