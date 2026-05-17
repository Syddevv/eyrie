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
import { LoadingActionButton } from "@/components/loading-action-button";
import {
  GOAL_EMOJI_PRESETS,
  GOAL_ICON_PRESETS,
} from "@/constants/goal-presets";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { goalsService } from "@/src/db/services";
import { formatCurrency } from "@/src/lib/goals";

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

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
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
  const leadingDays = firstDay.getDay();
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({
      key: `prev-${index}`,
      date: new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        index - leadingDays + 1,
      ),
      inMonth: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push({
      key: `current-${day}`,
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const index = cells.length;
    cells.push({
      key: `next-${index}`,
      date: new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        index - cells.length + 1,
      ),
      inMonth: false,
    });
  }

  return cells;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function NewSavingsGoalModal() {
  const router = useRouter();
  const { suggestedName, suggestedIconName, suggestedColor } =
    useLocalSearchParams<{
      suggestedName?: string;
      suggestedIconName?: string;
      suggestedColor?: string;
    }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useCurrentUser();
  const { methods } = usePaymentMethods();

  const [goalName, setGoalName] = useState(
    typeof suggestedName === "string" ? suggestedName : "",
  );
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 6);
    return next;
  });
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [iconType, setIconType] = useState<
    "vector" | "emoji" | "uploaded_image"
  >("vector");
  const [iconName, setIconName] = useState(
    typeof suggestedIconName === "string"
      ? suggestedIconName
      : GOAL_ICON_PRESETS[0],
  );
  const [emoji, setEmoji] = useState<string | null>(GOAL_EMOJI_PRESETS[0]);
  const [iconImageUri, setIconImageUri] = useState<string | null>(null);
  const [linkedWalletId, setLinkedWalletId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { isRunning: isSaving, run } = useAsyncAction();

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardHeight(0),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const defaultWallet = methods.find((method) => !method.isFallback);
    setLinkedWalletId(defaultWallet?.id ?? null);
  }, [methods]);

  const goalColor =
    typeof suggestedColor === "string" ? suggestedColor : colors.primary;

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const parsedTargetAmount = Number(targetAmount) || 0;
  const dayDifference = Math.max(
    1,
    Math.ceil((selectedDate.getTime() - Date.now()) / 86400000),
  );
  const monthsRemaining = Math.max(1, Math.ceil(dayDifference / 30));
  const monthlyTarget =
    parsedTargetAmount > 0 ? parsedTargetAmount / monthsRemaining : 0;
  const weeklyTarget =
    parsedTargetAmount > 0
      ? parsedTargetAmount / Math.max(1, Math.ceil(dayDifference / 7))
      : 0;
  const linkedWallet =
    methods.find((method) => method.id === linkedWalletId) ?? null;
  const isCreateEnabled =
    goalName.trim().length > 0 &&
    parsedTargetAmount > 0 &&
    selectedDate.getTime() > Date.now();
  const isKeyboardOpen = keyboardHeight > 0;
  const maxSheetHeight = Math.min(
    windowHeight * 0.9,
    Math.max(320, windowHeight - keyboardHeight - 20),
  );

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.64)"
          : "rgba(15, 23, 42, 0.34)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(15, 23, 42, 0.04)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      card: {
        backgroundColor: colors.secondary,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(226,232,240,0.92)",
      },
      selectedCard: {
        backgroundColor: isDark
          ? "rgba(20,149,255,0.16)"
          : "rgba(20,149,255,0.1)",
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
      Alert.alert(
        "Photo access needed",
        "Allow gallery access to use a custom goal icon.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setIconType("uploaded_image");
    setIconImageUri(result.assets[0]?.uri ?? null);
  };

  const handleCreate = async () => {
    if (!user) {
      return;
    }

    if (!isCreateEnabled) {
      Alert.alert(
        "Complete required fields",
        "Add a name, valid target amount, and future deadline.",
      );
      return;
    }

    await run(async () => {
      await goalsService.create({
        userId: user.id,
        title: goalName.trim(),
        targetAmount: parsedTargetAmount,
        targetDate: selectedDate.toISOString(),
        iconType,
        iconName: iconType === "vector" ? iconName : null,
        iconImageUri: iconType === "uploaded_image" ? iconImageUri : null,
        emoji: iconType === "emoji" ? emoji : null,
        color: goalColor,
        linkedWalletId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }).catch((error) => {
      Alert.alert(
        "Unable to create goal",
        error instanceof Error ? error.message : "Please try again.",
      );
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable
          disabled={isSaving}
          style={styles.backdrop}
          onPress={() => router.back()}
        />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            { maxHeight: maxSheetHeight },
            isKeyboardOpen && styles.sheetCompact,
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>New Savings Goal</Text>
            <Pressable
              disabled={isSaving}
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.muted.color} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              isKeyboardOpen
                ? styles.scrollContentCompact
                : styles.scrollContent
            }
          >
            <View
              style={[
                styles.previewCard,
                ui.card,
                isKeyboardOpen && styles.previewCardCompact,
              ]}
            >
              <View style={styles.previewIconWrap}>
                <GoalAvatar
                  goal={{
                    iconType,
                    iconName,
                    iconImageUri,
                    emoji,
                    color: goalColor,
                  }}
                  size={34}
                />
              </View>
              <View style={styles.previewText}>
                <Text style={[styles.previewTitle, ui.title]}>
                  {goalName.trim() || "New Goal"}
                </Text>
                <Text style={[styles.previewSubtitle, ui.muted]}>
                  {parsedTargetAmount > 0
                    ? `Save about ${formatCurrency(monthlyTarget)} per month to hit this goal.`
                    : "Set a target amount and deadline to see your monthly pace."}
                </Text>
              </View>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Goal name</Text>
              <TextInput
                value={goalName}
                onChangeText={setGoalName}
                placeholder="e.g. Emergency Buffer"
                placeholderTextColor={ui.muted.color}
                selectionColor={colors.primary}
                style={[
                  styles.textField,
                  ui.card,
                  ui.title,
                  isKeyboardOpen && styles.textFieldCompact,
                ]}
              />
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Target amount</Text>
              <View
                style={[
                  styles.amountField,
                  ui.card,
                  isKeyboardOpen && styles.amountFieldCompact,
                ]}
              >
                <Text style={[styles.currencyMark, ui.muted]}>₱</Text>
                <TextInput
                  value={targetAmount}
                  onChangeText={(value) =>
                    setTargetAmount(sanitizeAmountInput(value))
                  }
                  placeholder="0.00"
                  placeholderTextColor={ui.muted.color}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                  style={[
                    styles.amountInput,
                    ui.title,
                    isKeyboardOpen && styles.amountInputCompact,
                  ]}
                />
              </View>
            </View>

            <View
              style={[
                styles.metricsRow,
                isKeyboardOpen && styles.metricsRowCompact,
              ]}
            >
              <View
                style={[
                  styles.metricCard,
                  ui.card,
                  isKeyboardOpen && styles.metricCardCompact,
                ]}
              >
                <Text style={[styles.metricLabel, ui.muted]}>Monthly</Text>
                <Text style={[styles.metricValue, ui.title]}>
                  {formatCurrency(monthlyTarget)}
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  ui.card,
                  isKeyboardOpen && styles.metricCardCompact,
                ]}
              >
                <Text style={[styles.metricLabel, ui.muted]}>Weekly</Text>
                <Text style={[styles.metricValue, ui.title]}>
                  {formatCurrency(weeklyTarget)}
                </Text>
              </View>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Target date</Text>
              <Pressable
                style={[
                  styles.dateField,
                  ui.card,
                  isKeyboardOpen && styles.dateFieldCompact,
                ]}
                onPress={() => setShowCalendar(true)}
              >
                <View style={styles.dateFieldLeft}>
                  <Feather name="calendar" size={16} color={ui.muted.color} />
                  <Text style={[styles.dateValue, ui.title]}>
                    {formatDateLabel(selectedDate)}
                  </Text>
                </View>
                <Text
                  style={[styles.dateHint, ui.muted]}
                >{`${monthsRemaining} month${monthsRemaining === 1 ? "" : "s"} away`}</Text>
              </Pressable>
            </View>

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>Icon style</Text>
              <View style={styles.segmentedRow}>
                {(["vector", "emoji", "uploaded_image"] as const).map(
                  (value) => {
                    const isSelected = iconType === value;
                    return (
                      <Pressable
                        key={value}
                        style={[
                          styles.segment,
                          ui.card,
                          isKeyboardOpen && styles.segmentCompact,
                          isSelected && ui.selectedCard,
                        ]}
                        onPress={() => setIconType(value)}
                      >
                        <Text style={[styles.segmentText, ui.title]}>
                          {value === "vector"
                            ? "Built-in"
                            : value === "emoji"
                              ? "Emoji"
                              : "Image"}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>

            {iconType === "vector" ? (
              <View
                style={[
                  styles.section,
                  isKeyboardOpen && styles.sectionCompact,
                ]}
              >
                <Text style={[styles.fieldLabel, ui.title]}>Choose icon</Text>
                <View
                  style={[
                    styles.iconGrid,
                    isKeyboardOpen && styles.iconGridCompact,
                  ]}
                >
                  {GOAL_ICON_PRESETS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.iconCell,
                        ui.card,
                        isKeyboardOpen && styles.iconCellCompact,
                        iconName === item && ui.selectedCard,
                      ]}
                      onPress={() => setIconName(item)}
                    >
                      <MaterialCommunityIcons
                        name={item}
                        size={20}
                        color={goalColor}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {iconType === "emoji" ? (
              <View
                style={[
                  styles.section,
                  isKeyboardOpen && styles.sectionCompact,
                ]}
              >
                <Text style={[styles.fieldLabel, ui.title]}>Choose emoji</Text>
                <View
                  style={[
                    styles.iconGrid,
                    isKeyboardOpen && styles.iconGridCompact,
                  ]}
                >
                  {GOAL_EMOJI_PRESETS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.iconCell,
                        ui.card,
                        isKeyboardOpen && styles.iconCellCompact,
                        emoji === item && ui.selectedCard,
                      ]}
                      onPress={() => setEmoji(item)}
                    >
                      <Text style={styles.emojiCell}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {iconType === "uploaded_image" ? (
              <View
                style={[
                  styles.section,
                  isKeyboardOpen && styles.sectionCompact,
                ]}
              >
                <Text style={[styles.fieldLabel, ui.title]}>Custom image</Text>
                <Pressable
                  style={[
                    styles.uploadButton,
                    ui.card,
                    isKeyboardOpen && styles.uploadButtonCompact,
                  ]}
                  onPress={() => void handlePickImage()}
                >
                  {iconImageUri ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: iconImageUri }}
                      style={styles.uploadPreview}
                    />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Feather name="image" size={18} color={ui.muted.color} />
                    </View>
                  )}
                  <View style={styles.uploadTextBlock}>
                    <Text style={[styles.uploadTitle, ui.title]}>
                      Upload goal icon
                    </Text>
                    <Text style={[styles.uploadCaption, ui.muted]}>
                      Square images work best.
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null}

            <View
              style={[styles.section, isKeyboardOpen && styles.sectionCompact]}
            >
              <Text style={[styles.fieldLabel, ui.title]}>
                Linked wallet (optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.walletRow}
              >
                <Pressable
                  style={[
                    styles.walletChip,
                    ui.card,
                    isKeyboardOpen && styles.walletChipCompact,
                    linkedWalletId === null && ui.selectedCard,
                  ]}
                  onPress={() => setLinkedWalletId(null)}
                >
                  <Text style={[styles.walletChipText, ui.title]}>None</Text>
                </Pressable>
                {methods
                  .filter((method) => !method.isFallback)
                  .map((method) => (
                    <Pressable
                      key={method.id}
                      style={[
                        styles.walletChip,
                        ui.card,
                        isKeyboardOpen && styles.walletChipCompact,
                        linkedWalletId === method.id && ui.selectedCard,
                      ]}
                      onPress={() => setLinkedWalletId(method.id)}
                    >
                      <Text style={[styles.walletChipText, ui.title]}>
                        {method.label}
                      </Text>
                      <Text style={[styles.walletChipSubtext, ui.muted]}>
                        {method.balanceLabel}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
              <Text style={[styles.walletHint, ui.muted]}>
                {linkedWallet
                  ? `Contributions can deduct from ${linkedWallet.label} automatically.`
                  : "You can still add manual contributions later without selecting a wallet."}
              </Text>
            </View>
          </ScrollView>

          <LoadingActionButton
            label="Create Goal"
            loadingLabel="Creating..."
            loading={isSaving}
            style={[
              styles.createButton,
              isCreateEnabled ? ui.primaryButton : ui.disabledButton,
            ]}
            onPress={() => void handleCreate()}
            disabled={!isCreateEnabled}
            textStyle={styles.createButtonText}
            spinnerColor="#FFFFFF"
          />

          {showCalendar ? (
            <View style={styles.calendarOverlay}>
              <Pressable
                style={styles.calendarBackdrop}
                onPress={() => setShowCalendar(false)}
              />
              <View style={[styles.calendarCard, ui.card, shadows.card]}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={[styles.calendarArrow, ui.card]}
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
                      color={ui.muted.color}
                    />
                  </Pressable>
                  <Text style={[styles.calendarTitle, ui.title]}>
                    {monthNames[calendarMonth.getMonth()]}{" "}
                    {calendarMonth.getFullYear()}
                  </Text>
                  <Pressable
                    style={[styles.calendarArrow, ui.card]}
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
                      color={ui.muted.color}
                    />
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
                    return (
                      <Pressable
                        key={day.key}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => {
                          setSelectedDate(day.date);
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
                            {
                              color: isSelected
                                ? "#FFFFFF"
                                : day.inMonth
                                  ? colors.foreground
                                  : colors.mutedForeground,
                            },
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
  keyboardWrap: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderWidth: 1,
  },
  sheetCompact: {
    paddingHorizontal: 18,
    paddingBottom: 18,
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
    marginBottom: 12,
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
  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  previewCardCompact: { padding: 12, gap: 10 },
  previewIconWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { flex: 1 },
  previewTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  previewSubtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  section: { marginTop: 18 },
  sectionCompact: { marginTop: 14 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  textField: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
  },
  textFieldCompact: { minHeight: 46, borderRadius: 18 },
  amountField: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountFieldCompact: { minHeight: 46, borderRadius: 18 },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    paddingVertical: 0,
  },
  amountInputCompact: { fontSize: 18, lineHeight: 22 },
  metricsRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  metricsRowCompact: { marginTop: 10, gap: 10 },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricCardCompact: { paddingHorizontal: 12, paddingVertical: 10 },
  metricLabel: { fontFamily: fontFamilies.sans, fontSize: 12, lineHeight: 16 },
  metricValue: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  dateField: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dateFieldCompact: { minHeight: 46, borderRadius: 18 },
  dateFieldLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  dateHint: { fontFamily: fontFamilies.sans, fontSize: 12, lineHeight: 16 },
  segmentedRow: { flexDirection: "row", gap: 10 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentCompact: { minHeight: 36, borderRadius: 16 },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.bold,
  },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconGridCompact: { gap: 8 },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellCompact: { width: 46, height: 46, borderRadius: 16 },
  emojiCell: { fontSize: 24, lineHeight: 28 },
  uploadButton: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadButtonCompact: { minHeight: 60, borderRadius: 18 },
  uploadPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  uploadPreview: { width: 44, height: 44, borderRadius: 14 },
  uploadTextBlock: { flex: 1 },
  uploadTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  uploadCaption: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorGridCompact: { gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: radius.full },
  colorSwatchCompact: { width: 30, height: 30 },
  colorSwatchSelected: { borderWidth: 2, borderColor: "#FFFFFF" },
  walletRow: { gap: 10, paddingRight: 12 },
  walletChip: {
    minWidth: 132,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  walletChipCompact: {
    minWidth: 118,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  walletChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  walletChipSubtext: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  walletHint: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  createButton: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  scrollContent: { paddingBottom: 4 },
  scrollContentCompact: { paddingBottom: 4 },
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  calendarBackdrop: { ...StyleSheet.absoluteFillObject },
  calendarCard: { borderRadius: 24, padding: 16, borderWidth: 1 },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  calendarTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  weekdayRow: { marginTop: 16, flexDirection: "row" },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  calendarGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  dayLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
});
