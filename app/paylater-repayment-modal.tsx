import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateInput(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: {
    key: string;
    date: Date;
    inCurrentMonth: boolean;
  }[] = [];

  for (let index = 0; index < startOffset; index += 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() - (startOffset - index));
    cells.push({
      key: `prev-${date.toISOString()}`,
      date,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      key: `current-${monthDate.getFullYear()}-${monthDate.getMonth()}-${day}`,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
      inCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const offset = cells.length % 7;
    const date = new Date(lastDay);
    date.setDate(lastDay.getDate() + offset + 1);
    cells.push({
      key: `next-${date.toISOString()}`,
      date,
      inCurrentMonth: false,
    });
  }

  return cells;
}

export default function PaylaterRepaymentModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paylaterName?: string | string[];
    currentBalance?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const paylaterName = Array.isArray(params.paylaterName)
    ? params.paylaterName[0]
    : params.paylaterName || "Wireless Earbuds";
  const currentBalance = Array.isArray(params.currentBalance)
    ? params.currentBalance[0]
    : params.currentBalance || "₱2,250";
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1),
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [notes, setNotes] = useState("");
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.56)"
          : "rgba(15, 23, 42, 0.26)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.06)",
      },
      handle: {
        backgroundColor: isDark ? "#64748B" : "#CBD5E1",
      },
      title: { color: colors.foreground },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(241, 245, 249, 0.98)",
      },
      closeIcon: {
        color: isDark ? "#D4DCE6" : "#202733",
      },
      summaryCard: {
        backgroundColor: isDark ? "rgba(19, 74, 137, 0.22)" : "#DDEEFF",
        borderColor: isDark ? "rgba(96, 165, 250, 0.26)" : "#9CCFFF",
      },
      summaryLabel: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      summaryTitle: {
        color: colors.foreground,
      },
      summaryBalance: {
        color: isDark ? "#A9B6C8" : "#5B6980",
      },
      label: {
        color: colors.foreground,
      },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#E6EBF2",
      },
      fieldText: {
        color: colors.foreground,
      },
      placeholder: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      peso: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      countText: {
        color: isDark ? "#8F9CAF" : "#7D8898",
      },
      cancelButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
      cancelText: {
        color: colors.foreground,
      },
      saveButton: {
        backgroundColor: "#70B6F2",
      },
      saveButtonText: {
        color: "#FFFFFF",
      },
      iconTint: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      pillSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EEF3F8",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#DCE4EE",
      },
      calendarCard: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.08)",
      },
      mutedCalendarText: {
        color: colors.mutedForeground,
      },
      dayOutsideText: {
        color: isDark ? "#475569" : "#B2BCCB",
      },
      todayRing: {
        borderColor: colors.primary,
      },
    }),
    [colors, isDark],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>Record Payment</Text>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={[styles.summaryCard, ui.summaryCard]}>
            <Text style={[styles.summaryLabel, ui.summaryLabel]}>Payment for</Text>
            <Text style={[styles.summaryTitle, ui.summaryTitle]}>
              {paylaterName}
            </Text>
            <Text style={[styles.summaryBalance, ui.summaryBalance]}>
              Current Balance: {currentBalance}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Payment Amount</Text>
            <View
              style={[
                styles.fieldSurface,
                ui.fieldSurface,
                styles.currencyField,
              ]}
            >
              <Text style={[styles.peso, ui.peso]}>₱</Text>
              <TextInput
                value={paymentAmount}
                onChangeText={(value) => setPaymentAmount(digitsOnly(value))}
                placeholder="0"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#6DB2EE"
                style={[styles.fieldInput, styles.flexFieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Payment Date</Text>
            <Pressable
              style={[styles.fieldSurface, ui.fieldSurface, styles.dateField]}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={[styles.fieldInput, styles.flexFieldInput, ui.fieldText]}>
                {formatDateInput(paymentDate)}
              </Text>
              <Feather
                name="calendar"
                size={16}
                color={ui.iconTint.color}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Notes (Optional)</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface, styles.notesField]}>
              <TextInput
                value={notes}
                onChangeText={(value) => setNotes(value.slice(0, 100))}
                placeholder="e.g., Payment via bank transfer"
                placeholderTextColor={ui.placeholder.color}
                selectionColor="#6DB2EE"
                multiline
                textAlignVertical="top"
                style={[styles.fieldInput, styles.notesInput, ui.fieldText]}
              />
            </View>
            <Text style={[styles.countText, ui.countText]}>{`${notes.length}/100`}</Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.cancelButton, ui.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, ui.cancelText]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.saveButton, ui.saveButton]}
              onPress={() => router.back()}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={[styles.saveButtonText, ui.saveButtonText]}>
                Save Payment
              </Text>
            </Pressable>
          </View>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable
                style={styles.calendarBackdrop}
                onPress={() => setShowCalendar(false)}
              />
              <View style={[styles.calendarCard, ui.calendarCard, shadows.card]}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() - 1,
                            1,
                          ),
                      )
                    }
                  >
                    <Feather
                      name="chevron-left"
                      size={16}
                      color={ui.iconTint.color}
                    />
                  </Pressable>

                  <Text style={[styles.calendarTitle, ui.fieldText]}>
                    {monthNames[calendarMonth.getMonth()]}{" "}
                    {calendarMonth.getFullYear()}
                  </Text>

                  <Pressable
                    style={[styles.calendarArrow, ui.pillSurface]}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() + 1,
                            1,
                          ),
                      )
                    }
                  >
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={ui.iconTint.color}
                    />
                  </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => (
                    <Text
                      key={label}
                      style={[styles.weekdayLabel, ui.mutedCalendarText]}
                    >
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day) => {
                    const isSelected = isSameDay(day.date, paymentDate);
                    const isToday = isSameDay(day.date, new Date());

                    return (
                      <Pressable
                        key={day.key}
                        style={[
                          styles.dayCell,
                          isSelected
                            ? { backgroundColor: colors.primary }
                            : isToday
                              ? [styles.todayCell, ui.todayRing]
                              : null,
                        ]}
                        onPress={() => {
                          setPaymentDate(day.date);
                          setCalendarMonth(
                            new Date(
                              day.date.getFullYear(),
                              day.date.getMonth(),
                              1,
                            ),
                          );
                          setShowCalendar(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            isSelected
                              ? styles.dayLabelSelected
                              : day.inCurrentMonth
                                ? ui.fieldText
                                : ui.dayOutsideText,
                          ]}
                        >
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
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: "84%",
  },
  handle: {
    alignSelf: "center",
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryTitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  summaryBalance: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginTop: 20,
  },
  label: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 42,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  flexFieldInput: {
    flex: 1,
  },
  currencyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-start",
  },
  peso: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-start",
  },
  notesField: {
    minHeight: 72,
    paddingTop: 12,
    paddingBottom: 12,
  },
  notesInput: {
    minHeight: 48,
  },
  countText: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  actionsRow: {
    marginTop: 22,
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  saveButton: {
    flex: 1.36,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  weekdayRow: {
    marginTop: 14,
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  dayCell: {
    width: "14.2857%",
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
  dayLabelSelected: {
    color: "#FFFFFF",
  },
});
