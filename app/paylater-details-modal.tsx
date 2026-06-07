import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { themeColors } from "@/constants/colors";
import { PAYLATER_OPTIONS } from "@/constants/paylaters";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/useAuthStore";
import { paylatersService } from "@/src/db/services";

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

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

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateLabel(date: Date) {
  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  );
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
    const date = new Date(lastDay);
    date.setDate(lastDay.getDate() + (cells.length % 7) + 1);
    cells.push({
      key: `next-${date.toISOString()}`,
      date,
      inCurrentMonth: false,
    });
  }

  return cells;
}

export default function PaylaterDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    selectedPaylater?: string | string[];
  }>();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo || "/add-paylater-modal";
  const selectedPaylaterId = Array.isArray(params.selectedPaylater)
    ? params.selectedPaylater[0]
    : params.selectedPaylater;
  const selectedPaylater = useMemo(
    () =>
      PAYLATER_OPTIONS.find((item) => item.id === selectedPaylaterId) ??
      PAYLATER_OPTIONS[0],
    [selectedPaylaterId],
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [itemName, setItemName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date | null>(
    null,
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    return next;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        backgroundColor: isDark ? "#050B16" : colors.card,
        borderColor: isDark
          ? "rgba(59, 130, 246, 0.22)"
          : "rgba(15, 23, 42, 0.06)",
      },
      handle: {
        backgroundColor: isDark ? "#526173" : "#CBD5E1",
      },
      title: {
        color: isDark ? "#FFFFFF" : colors.foreground,
      },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(241, 245, 249, 0.98)",
      },
      closeIcon: {
        color: isDark ? "#D4DCE6" : "#202733",
      },
      backText: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      providerCard: {
        backgroundColor: isDark ? "rgba(12, 31, 58, 0.88)" : "#F3F8FF",
        borderColor: isDark ? "rgba(22, 140, 243, 0.44)" : "#168CF3",
      },
      providerTitle: {
        color: isDark ? "#F8FAFC" : "#111827",
      },
      providerSubtitle: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      label: {
        color: isDark ? "#FFFFFF" : "#1F2937",
      },
      fieldSurface: {
        backgroundColor: isDark ? "#171F2A" : "#E9EEF5",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#DCE4EE",
      },
      fieldText: {
        color: isDark ? "#F8FAFC" : "#202733",
      },
      placeholder: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      hint: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      peso: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      iconTint: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      pillSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EEF3F8",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#DCE4EE",
      },
      calendarCard: {
        backgroundColor: isDark ? "#0F1722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.08)",
      },
      mutedCalendarText: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      dayOutsideText: {
        color: isDark ? "#475569" : "#B2BCCB",
      },
      todayRing: {
        borderColor: colors.primary,
      },
      button: {
        backgroundColor: "#1565A7",
        opacity: isSubmitting ? 0.7 : 1,
      },
      buttonText: {
        color: "#FFFFFF",
      },
    }),
    [colors, isDark, isSubmitting],
  );

  const handleCreate = async () => {
    if (!userId) {
      Alert.alert("Unable to save", "Missing signed-in user.");
      return;
    }

    try {
      setIsSubmitting(true);
      await paylatersService.create({
        userId,
        platform: selectedPaylater.platform,
        itemName: itemName.trim(),
        totalAmount: Number(totalAmount || 0),
        installmentAmount: Number(installmentAmount || 0),
        dueDay: dueDay.trim(),
        dueDate: targetCompletionDate?.toISOString() ?? null,
        installmentCount: Number(installmentCount || 0),
        notes: notes.trim() ? notes.trim() : null,
      });
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to add paylater",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Text style={[styles.title, ui.title]}>Paylater Details</Text>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <Pressable
            style={styles.backRow}
            onPress={() =>
              router.replace({
                pathname: returnTo as any,
                params: {
                  selectedPaylater: selectedPaylater.id,
                },
              })
            }
          >
            <Feather name="chevron-left" size={18} color={ui.backText.color} />
            <Text style={[styles.backText, ui.backText]}>Back</Text>
          </Pressable>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.providerCard, ui.providerCard]}>
              <View
                style={[
                  styles.logoBubble,
                  { backgroundColor: selectedPaylater.accent },
                ]}
              >
                {selectedPaylater.logo ? (
                  <Image
                    source={selectedPaylater.logo}
                    contentFit="cover"
                    style={styles.logoImage}
                  />
                ) : (
                  <Feather name="shopping-bag" size={18} color="#FFFFFF" />
                )}
              </View>

              <View style={styles.providerTextBlock}>
                <Text style={[styles.providerName, ui.providerTitle]}>
                  {selectedPaylater.name}
                </Text>
                <Text style={[styles.providerLabel, ui.providerSubtitle]}>
                  {selectedPaylater.subtitle}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Item/Purchase Name</Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="e.g., Wireless Earbuds"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor="#6DB2EE"
                  style={[styles.fieldInput, ui.fieldText]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Total Amount</Text>
              <View
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.currencyField,
                ]}
              >
                <Text style={[styles.peso, ui.peso]}>PHP</Text>
                <TextInput
                  value={totalAmount}
                  onChangeText={(value) => setTotalAmount(digitsOnly(value))}
                  placeholder="0"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="number-pad"
                  selectionColor="#6DB2EE"
                  style={[
                    styles.fieldInput,
                    styles.flexFieldInput,
                    ui.fieldText,
                  ]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Installment Amount</Text>
              <View
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.currencyField,
                ]}
              >
                <Text style={[styles.peso, ui.peso]}>PHP</Text>
                <TextInput
                  value={installmentAmount}
                  onChangeText={(value) =>
                    setInstallmentAmount(digitsOnly(value))
                  }
                  placeholder="0"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="number-pad"
                  selectionColor="#6DB2EE"
                  style={[
                    styles.fieldInput,
                    styles.flexFieldInput,
                    ui.fieldText,
                  ]}
                />
              </View>
              <Text style={[styles.hint, ui.hint]}>
                Monthly installment amount
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>
                Number of Installments
              </Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={installmentCount}
                  onChangeText={(value) =>
                    setInstallmentCount(digitsOnly(value))
                  }
                  placeholder="e.g., 3"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="number-pad"
                  selectionColor="#6DB2EE"
                  style={[styles.fieldInput, ui.fieldText]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>
                Due Date (Day of Month)
              </Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={dueDay}
                  onChangeText={(value) => setDueDay(digitsOnly(value))}
                  placeholder="1"
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="number-pad"
                  selectionColor="#6DB2EE"
                  style={[styles.fieldInput, ui.fieldText]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>
                Target Completion Date
              </Text>
              <Pressable
                style={[styles.fieldSurface, ui.fieldSurface, styles.dateField]}
                onPress={() => setShowCalendar(true)}
              >
                <Text
                  style={[
                    styles.fieldInput,
                    styles.flexFieldInput,
                    targetCompletionDate ? ui.fieldText : ui.placeholder,
                  ]}
                >
                  {targetCompletionDate
                    ? formatDateLabel(targetCompletionDate)
                    : "mm/dd/yyyy"}
                </Text>
                <Feather name="calendar" size={16} color={ui.iconTint.color} />
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Notes (Optional)</Text>
              <View
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.notesField,
                ]}
              >
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes..."
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor="#6DB2EE"
                  multiline
                  textAlignVertical="top"
                  style={[styles.fieldInput, styles.notesInput, ui.fieldText]}
                />
              </View>
            </View>

            <Pressable
              style={[styles.addButton, ui.button]}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              <Text style={[styles.addButtonText, ui.buttonText]}>
                Add Paylater
              </Text>
            </Pressable>
          </ScrollView>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable
                style={styles.calendarBackdrop}
                onPress={() => setShowCalendar(false)}
              />
              <View
                style={[styles.calendarCard, ui.calendarCard, shadows.card]}
              >
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
                    const isSelected =
                      targetCompletionDate &&
                      isSameDay(day.date, targetCompletionDate);
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
                          setTargetCompletionDate(day.date);
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
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
  },
  backRow: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  providerCard: {
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBubble: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  providerTextBlock: {
    flex: 1,
  },
  providerName: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  providerLabel: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  section: {
    marginTop: 18,
  },
  label: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 48,
    borderRadius: 19,
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
  hint: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-start",
  },
  notesField: {
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
  },
  notesInput: {
    minHeight: 64,
  },
  addButton: {
    marginTop: 22,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
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
