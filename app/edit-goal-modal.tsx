import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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
  useWindowDimensions,
  View,
} from "react-native";

import { GoalAvatar } from "@/components/goal-avatar";
import { GOAL_COLOR_PRESETS, GOAL_EMOJI_PRESETS, GOAL_ICON_PRESETS } from "@/constants/goal-presets";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useSavingsGoal } from "@/hooks/useSavingsGoals";
import { goalsService } from "@/src/db/services";
import { formatCurrency } from "@/src/lib/goals";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  return parts.length === 1 ? parts[0] : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function formatDateLabel(date: Date) {
  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ key: `prev-${index}`, date: new Date(monthDate.getFullYear(), monthDate.getMonth(), index - firstDay.getDay() + 1), inMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push({ key: `current-${day}`, date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const index = cells.length;
    cells.push({ key: `next-${index}`, date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, index - cells.length + 1), inMonth: false });
  }

  return cells;
}

export default function EditGoalModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { height: windowHeight } = useWindowDimensions();
  const { goal } = useSavingsGoal(goalId);
  const { methods } = usePaymentMethods();

  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [iconType, setIconType] = useState<"vector" | "emoji" | "uploaded_image">("vector");
  const [iconName, setIconName] = useState<string | null>(GOAL_ICON_PRESETS[0]);
  const [emoji, setEmoji] = useState<string | null>(GOAL_EMOJI_PRESETS[0]);
  const [iconImageUri, setIconImageUri] = useState<string | null>(null);
  const [color, setColor] = useState<string>(GOAL_COLOR_PRESETS[0]);
  const [linkedWalletId, setLinkedWalletId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!goal) {
      return;
    }

    setGoalName(goal.title);
    setTargetAmount(String(goal.targetAmount));
    const date = new Date(goal.targetDate);
    setSelectedDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIconType((goal.iconType ?? "vector") as "vector" | "emoji" | "uploaded_image");
    setIconName(goal.iconName ?? GOAL_ICON_PRESETS[0]);
    setEmoji(goal.emoji ?? GOAL_EMOJI_PRESETS[0]);
    setIconImageUri(goal.iconImageUri ?? null);
    setColor(goal.color ?? GOAL_COLOR_PRESETS[0]);
    setLinkedWalletId(goal.linkedWalletId ?? null);
  }, [goal]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const parsedTargetAmount = Number(targetAmount) || 0;
  const dayDifference = Math.max(1, Math.ceil((selectedDate.getTime() - Date.now()) / 86400000));
  const monthlyTarget = parsedTargetAmount > 0 ? parsedTargetAmount / Math.max(1, Math.ceil(dayDifference / 30)) : 0;
  const isSaveEnabled = goalName.trim().length > 0 && parsedTargetAmount > 0;

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? "rgba(2, 6, 23, 0.64)" : "rgba(15, 23, 42, 0.34)" },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.04)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      card: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(226,232,240,0.92)",
      },
      selectedCard: {
        backgroundColor: isDark ? "rgba(20,149,255,0.16)" : "rgba(20,149,255,0.1)",
        borderColor: colors.primary,
      },
      primaryButton: { backgroundColor: colors.primary },
      disabledButton: { backgroundColor: isDark ? "#31577D" : "#A9CDED" },
    }),
    [colors, isDark],
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow gallery access to use a custom goal icon.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets.length) {
      setIconType("uploaded_image");
      setIconImageUri(result.assets[0]?.uri ?? null);
    }
  };

  const closeEditFlow = () => router.replace("/(tabs)/goals");

  const handleSave = async () => {
    if (!goal) {
      return;
    }

    if (!isSaveEnabled) {
      Alert.alert("Complete required fields", "Add a valid goal name and target amount.");
      return;
    }

    setIsSaving(true);
    try {
      await goalsService.update(goal.id, {
        title: goalName.trim(),
        targetAmount: parsedTargetAmount,
        targetDate: selectedDate.toISOString(),
        iconType,
        iconName: iconType === "vector" ? iconName : null,
        iconImageUri: iconType === "uploaded_image" ? iconImageUri : null,
        emoji: iconType === "emoji" ? emoji : null,
        color,
        linkedWalletId,
      });
      await Haptics.selectionAsync();
      closeEditFlow();
    } catch (error) {
      Alert.alert("Unable to update goal", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!goal) {
    return null;
  }

  const isKeyboardOpen = keyboardHeight > 0;
  const maxSheetHeight = Math.min(
    windowHeight * 0.88,
    Math.max(320, windowHeight - keyboardHeight - 18),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={closeEditFlow} />
        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            { maxHeight: maxSheetHeight },
            isKeyboardOpen && styles.sheetCompact,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>Edit Goal</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={closeEditFlow}>
              <Feather name="x" size={20} color={ui.muted.color} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={isKeyboardOpen ? styles.scrollContentCompact : styles.scrollContent}>
            <View style={[styles.previewCard, ui.card, isKeyboardOpen && styles.previewCardCompact]}>
              <View style={[styles.previewIconWrap, { backgroundColor: `${color}22` }]}>
                <GoalAvatar goal={{ iconType, iconName, iconImageUri, emoji, color }} size={26} />
              </View>
              <View style={styles.previewText}>
                <Text style={[styles.previewTitle, ui.title]}>{goalName.trim() || goal.title}</Text>
                <Text style={[styles.previewSubtitle, ui.muted]}>
                  {`Monthly target: ${formatCurrency(monthlyTarget)}.`}
                </Text>
              </View>
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Goal name</Text>
              <TextInput value={goalName} onChangeText={setGoalName} selectionColor={colors.primary} style={[styles.textField, ui.card, ui.title, isKeyboardOpen && styles.textFieldCompact]} />
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Target amount</Text>
              <View style={[styles.amountField, ui.card, isKeyboardOpen && styles.amountFieldCompact]}>
                <Text style={[styles.currencyMark, ui.muted]}>₱</Text>
                <TextInput
                  value={targetAmount}
                  onChangeText={(value) => setTargetAmount(sanitizeAmountInput(value))}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                  style={[styles.amountInput, ui.title, isKeyboardOpen && styles.amountInputCompact]}
                />
              </View>
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Target date</Text>
              <Pressable style={[styles.dateField, ui.card, isKeyboardOpen && styles.dateFieldCompact]} onPress={() => setShowCalendar(true)}>
                <Text style={[styles.dateValue, ui.title, isKeyboardOpen && styles.dateValueCompact]}>{formatDateLabel(selectedDate)}</Text>
              </Pressable>
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Icon style</Text>
              <View style={styles.segmentedRow}>
                {(["vector", "emoji", "uploaded_image"] as const).map((value) => (
                  <Pressable key={value} style={[styles.segment, ui.card, isKeyboardOpen && styles.segmentCompact, iconType === value && ui.selectedCard]} onPress={() => setIconType(value)}>
                    <Text style={[styles.segmentText, ui.title]}>{value === "vector" ? "Built-in" : value === "emoji" ? "Emoji" : "Image"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {iconType === "vector" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <View style={styles.iconGrid}>
                  {GOAL_ICON_PRESETS.map((item) => (
                    <Pressable key={item} style={[styles.iconCell, ui.card, isKeyboardOpen && styles.iconCellCompact, iconName === item && ui.selectedCard]} onPress={() => setIconName(item)}>
                      <MaterialCommunityIcons name={item} size={20} color={color} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {iconType === "emoji" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <View style={styles.iconGrid}>
                  {GOAL_EMOJI_PRESETS.map((item) => (
                    <Pressable key={item} style={[styles.iconCell, ui.card, isKeyboardOpen && styles.iconCellCompact, emoji === item && ui.selectedCard]} onPress={() => setEmoji(item)}>
                      <Text style={styles.emojiCell}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {iconType === "uploaded_image" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <Pressable style={[styles.uploadButton, ui.card, isKeyboardOpen && styles.uploadButtonCompact]} onPress={() => void handlePickImage()}>
                  {iconImageUri ? <Image contentFit="cover" source={{ uri: iconImageUri }} style={styles.uploadPreview} /> : <View style={styles.uploadPlaceholder}><Feather name="image" size={18} color={ui.muted.color} /></View>}
                  <View style={styles.uploadTextBlock}>
                    <Text style={[styles.uploadTitle, ui.title]}>Update goal icon</Text>
                  </View>
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Accent color</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLOR_PRESETS.map((item) => (
                  <Pressable key={item} style={[styles.colorSwatch, { backgroundColor: item }, color === item && styles.colorSwatchSelected]} onPress={() => setColor(item)} />
                ))}
              </View>
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.fieldLabel, ui.title]}>Linked wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletRow}>
                <Pressable style={[styles.walletChip, ui.card, linkedWalletId === null && ui.selectedCard]} onPress={() => setLinkedWalletId(null)}>
                  <Text style={[styles.walletChipText, ui.title]}>None</Text>
                </Pressable>
                {methods.filter((method) => !method.isFallback).map((method) => (
                  <Pressable key={method.id} style={[styles.walletChip, ui.card, linkedWalletId === method.id && ui.selectedCard]} onPress={() => setLinkedWalletId(method.id)}>
                    <Text style={[styles.walletChipText, ui.title]}>{method.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.footerActions}>
            <Pressable style={[styles.footerButton, ui.card]} onPress={closeEditFlow}>
              <Text style={[styles.footerButtonText, ui.title]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.footerButton, isSaveEnabled ? ui.primaryButton : ui.disabledButton]} onPress={() => void handleSave()}>
              <Text style={styles.primaryButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
            </Pressable>
          </View>

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)} />
              <View style={[styles.calendarCard, ui.card, shadows.card]}>
                <View style={styles.calendarHeader}>
                  <Pressable style={[styles.calendarArrow, ui.card]} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                    <Feather name="chevron-left" size={16} color={ui.muted.color} />
                  </Pressable>
                  <Text style={[styles.calendarTitle, ui.title]}>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
                  <Pressable style={[styles.calendarArrow, ui.card]} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                    <Feather name="chevron-right" size={16} color={ui.muted.color} />
                  </Pressable>
                </View>
                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => <Text key={label} style={[styles.weekdayLabel, ui.muted]}>{label}</Text>)}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day) => {
                    const isSelected = isSameDay(day.date, selectedDate);
                    return (
                      <Pressable
                        key={day.key}
                        style={[styles.dayCell, isSelected && { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setSelectedDate(day.date);
                          setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                          setShowCalendar(false);
                        }}>
                        <Text style={[styles.dayLabel, { color: isSelected ? "#FFFFFF" : day.inMonth ? colors.foreground : colors.mutedForeground }]}>
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
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 22, paddingBottom: 28, borderWidth: 1, maxHeight: "90%" },
  sheetCompact: { paddingHorizontal: 18, paddingBottom: 18 },
  handle: { alignSelf: "center", width: 50, height: 6, borderRadius: radius.full, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: fontFamilies.sans, fontSize: 21, lineHeight: 28, fontWeight: fontWeights.bold },
  closeButton: { width: 34, height: 34, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  previewCard: { borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" },
  previewCardCompact: { borderRadius: 18, padding: 12 },
  previewIconWrap: { width: 50, height: 50, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewTitle: { fontFamily: fontFamilies.sans, fontSize: 17, lineHeight: 22, fontWeight: fontWeights.bold },
  previewSubtitle: { marginTop: 4, fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 18 },
  section: { marginTop: 18 },
  sectionCompact: { marginTop: 14 },
  fieldLabel: { marginBottom: 10, fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.medium },
  textField: { minHeight: 50, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, fontFamily: fontFamilies.sans, fontSize: 16, lineHeight: 20 },
  textFieldCompact: { minHeight: 44, borderRadius: 16, paddingHorizontal: 14, fontSize: 15, lineHeight: 18 },
  amountField: { minHeight: 52, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  amountFieldCompact: { minHeight: 46, borderRadius: 16, paddingHorizontal: 14 },
  currencyMark: { fontFamily: fontFamilies.sans, fontSize: 22, lineHeight: 26, fontWeight: fontWeights.medium },
  amountInput: { flex: 1, fontFamily: fontFamilies.sans, fontSize: 20, lineHeight: 24, fontWeight: fontWeights.bold, paddingVertical: 0 },
  amountInputCompact: { fontSize: 18, lineHeight: 22 },
  dateField: { minHeight: 50, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, justifyContent: "center" },
  dateFieldCompact: { minHeight: 44, borderRadius: 16, paddingHorizontal: 14 },
  dateValue: { fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.medium },
  dateValueCompact: { fontSize: 14, lineHeight: 18 },
  segmentedRow: { flexDirection: "row", gap: 10 },
  segment: { flex: 1, minHeight: 40, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  segmentCompact: { minHeight: 36, borderRadius: 14, paddingHorizontal: 10 },
  segmentText: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 17, fontWeight: fontWeights.bold },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconCell: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconCellCompact: { width: 46, height: 46, borderRadius: 14 },
  emojiCell: { fontSize: 24, lineHeight: 28 },
  uploadButton: { minHeight: 68, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  uploadButtonCompact: { minHeight: 58, borderRadius: 16, paddingHorizontal: 14 },
  uploadPlaceholder: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(148,163,184,0.12)" },
  uploadPreview: { width: 44, height: 44, borderRadius: 14 },
  uploadTextBlock: { flex: 1 },
  uploadTitle: { fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.bold },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorSwatch: { width: 34, height: 34, borderRadius: radius.full },
  colorSwatchSelected: { borderWidth: 2, borderColor: "#FFFFFF" },
  walletRow: { gap: 10, paddingRight: 12 },
  walletChip: { minWidth: 132, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  walletChipText: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.bold },
  footerActions: { marginTop: 18, flexDirection: "row", gap: 12 },
  footerButton: { flex: 1, minHeight: 48, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  footerButtonText: { fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.bold },
  primaryButtonText: { color: "#FFFFFF", fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 20, fontWeight: fontWeights.bold },
  scrollContent: { paddingBottom: 4 },
  scrollContentCompact: { paddingBottom: 4 },
  calendarOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", paddingHorizontal: 18 },
  calendarBackdrop: { ...StyleSheet.absoluteFillObject },
  calendarCard: { borderRadius: 24, padding: 16, borderWidth: 1 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarArrow: { width: 34, height: 34, borderRadius: radius.full, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  calendarTitle: { fontFamily: fontFamilies.sans, fontSize: 16, lineHeight: 20, fontWeight: fontWeights.bold },
  weekdayRow: { marginTop: 16, flexDirection: "row" },
  weekdayLabel: { flex: 1, textAlign: "center", fontFamily: fontFamilies.sans, fontSize: 12, lineHeight: 16 },
  calendarGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  dayLabel: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18, fontWeight: fontWeights.medium },
});
