import { Feather } from "@expo/vector-icons";
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

import Logo from "@/components/logo";
import { BANKS } from "@/constants/banks";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import LOGO_MAP from "@/constants/logoMap";
import { WALLETS } from "@/constants/wallets";
import { useAccounts } from "@/hooks/useAccounts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { paylatersService } from "@/src/db/services";
import { formatPaylaterAmount } from "@/src/lib/paylaters-presentation";
import { onPaylatersChanged } from "@/src/lib/dbSync";
import {
  formatCurrencyPHP,
  getCurrentCycleDueDate,
  getNextUpcomingDueDate,
} from "@/src/db/utils/paylaters";

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
  const [whole = "", ...decimals] = normalized.split(".");
  const decimalPart = decimals.join("").slice(0, 2);

  if (!normalized.includes(".")) {
    return whole;
  }

  return `${whole}.${decimalPart}`;
}

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDateInput(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatAmountInputValue(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "0";
  }

  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
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
    paylaterId?: string | string[];
    paylaterName?: string | string[];
    currentBalance?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const paylaterId = getParamValue(params.paylaterId);
  const fallbackName = getParamValue(params.paylaterName) || "PayLater";
  const fallbackBalance = getParamValue(params.currentBalance) || "PHP 0.00";
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1),
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paylaterName, setPaylaterName] = useState(fallbackName);
  const [currentBalance, setCurrentBalance] = useState(fallbackBalance);
  const [remainingBalanceAmount, setRemainingBalanceAmount] = useState(0);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [dueDay, setDueDay] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { methods: paymentMethods } = usePaymentMethods();
  const { accounts } = useAccounts();
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const selectedAmount = Number(paymentAmount) || 0;
  const activePaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0] ??
    null;
  const selectedPaymentMethodIsInsufficient =
    Boolean(activePaymentMethod) &&
    !activePaymentMethod?.isFallback &&
    activePaymentMethod?.kind !== "credit" &&
    selectedAmount > (activePaymentMethod?.balance ?? 0);
  const insufficientBalanceMessage = selectedPaymentMethodIsInsufficient
    ? "Selected account does not have enough balance for this repayment."
    : null;
  const activePaymentMethodAccountId =
    activePaymentMethod && "accountId" in activePaymentMethod
      ? activePaymentMethod.accountId
      : undefined;

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

  useEffect(() => {
    if (!paymentMethods.length) {
      setSelectedPaymentMethodId(null);
      return;
    }

    setSelectedPaymentMethodId((current) => {
      if (current && paymentMethods.some((method) => method.id === current)) {
        return current;
      }

      return paymentMethods[0]?.id ?? null;
    });
  }, [paymentMethods]);

  useEffect(() => {
    if (!paylaterId) {
      return;
    }

    const loadPaylater = async () => {
      const paylater = await paylatersService.fetchById(paylaterId);
      if (!paylater) {
        return;
      }

      setPaylaterName(paylater.itemName);
      setCurrentBalance(formatPaylaterAmount(Number(paylater.remainingBalance ?? 0)));
      setRemainingBalanceAmount(Number(paylater.remainingBalance ?? 0));
      setInstallmentAmount(Number(paylater.installmentAmount ?? 0));
      setDueDay(paylater.dueDay ?? null);
    };

    void loadPaylater().catch(() => undefined);
    const off = onPaylatersChanged(() => {
      void loadPaylater().catch(() => undefined);
    });

    return () => off();
  }, [paylaterId]);

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
      summaryHelper: {
        color: isDark ? "#D7E8FF" : "#29597A",
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
      helperText: {
        color: isDark ? "#8F9CAF" : "#6B7280",
      },
      infoBanner: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#E8F3FF",
        borderColor: isDark ? "rgba(96, 165, 250, 0.22)" : "#BFDBFE",
      },
      infoBannerText: {
        color: isDark ? "#BFDBFE" : "#245A8A",
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
        opacity: isSubmitting ? 0.7 : 1,
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
      valueText: {
        color: colors.foreground,
      },
      placeholderText: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      dropdownItemBorder: {
        borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#E6EBF2",
      },
      dropdownItemMuted: {
        color: isDark ? "#8F9CAF" : "#7D8898",
      },
      defaultPill: {
        backgroundColor: isDark ? "rgba(59,130,246,0.16)" : "#DBEAFE",
      },
      defaultPillText: {
        color: isDark ? "#93C5FD" : "#2563EB",
      },
    }),
    [colors, isDark, isSubmitting],
  );

  const scheduledAmountDue = useMemo(
    () => Math.min(Math.max(installmentAmount, 0), Math.max(remainingBalanceAmount, 0)),
    [installmentAmount, remainingBalanceAmount],
  );
  const currentCycleDueDate = useMemo(
    () => getCurrentCycleDueDate(dueDay),
    [dueDay],
  );
  const upcomingDueDate = useMemo(
    () => getNextUpcomingDueDate(dueDay),
    [dueDay],
  );
  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);
  const currentCycleDueDateStart = currentCycleDueDate
    ? startOfLocalDay(currentCycleDueDate)
    : null;
  const isRepaymentDue = currentCycleDueDateStart
    ? todayStart.getTime() >= currentCycleDueDateStart.getTime()
    : false;
  const dueDate = isRepaymentDue
    ? currentCycleDueDate
    : (upcomingDueDate ?? currentCycleDueDate);
  const isAdvanceRepayment =
    Boolean(currentCycleDueDateStart) &&
    todayStart.getTime() < currentCycleDueDateStart.getTime();
  const headerHelperText =
    dueDate && scheduledAmountDue > 0
      ? `Amount due: ${formatCurrencyPHP(scheduledAmountDue)} • Due on ${formatLongDate(dueDate)}`
      : null;
  const paymentAmountHelperText = isRepaymentDue
    ? "This repayment is due, so the required amount is fixed for this period."
    : isAdvanceRepayment
      ? "You can enter any amount you want to pay before the due date."
      : null;

  useEffect(() => {
    if (!isRepaymentDue || scheduledAmountDue <= 0) {
      return;
    }

    setPaymentAmount((current) => {
      const scheduledValue = formatAmountInputValue(scheduledAmountDue);
      return current === scheduledValue ? current : scheduledValue;
    });
  }, [isRepaymentDue, scheduledAmountDue]);

  const handleSave = async () => {
    if (!paylaterId) {
      Alert.alert("Unable to save", "Missing paylater record.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (!selectedPaymentMethodId) {
        setErrorMessage("Please select a wallet or card.");
        return;
      }
      if (selectedPaymentMethodIsInsufficient) {
        setErrorMessage("Selected account does not have enough balance.");
        return;
      }
      await paylatersService.recordPayment(paylaterId, {
        amount: Number(paymentAmount || 0),
        paymentDate: paymentDate.toISOString(),
        accountId: activePaymentMethod?.isFallback
          ? null
          : (activePaymentMethodAccountId ?? selectedPaymentMethodId),
        notes: null,
      });
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to save payment",
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

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, ui.title]}>Record Payment</Text>
                {headerHelperText ? (
                  <Text style={[styles.headerHelperText, ui.summaryHelper]}>
                    {headerHelperText}
                  </Text>
                ) : null}
              </View>
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

            {isAdvanceRepayment ? (
              <View style={[styles.infoBanner, ui.infoBanner]}>
                <Text style={[styles.infoBannerText, ui.infoBannerText]}>
                  You are making an advance repayment.
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Payment Amount</Text>
              <View
                style={[
                  styles.fieldSurface,
                  ui.fieldSurface,
                  styles.currencyField,
                  isRepaymentDue && styles.fieldSurfaceDisabled,
                ]}
              >
                <Text style={[styles.peso, ui.peso]}>PHP</Text>
                <TextInput
                  value={paymentAmount}
                  onChangeText={(value) => setPaymentAmount(sanitizeAmountInput(value))}
                  placeholder={
                    isRepaymentDue && scheduledAmountDue > 0
                      ? formatAmountInputValue(scheduledAmountDue)
                      : "0"
                  }
                  placeholderTextColor={ui.placeholder.color}
                  keyboardType="decimal-pad"
                  selectionColor="#6DB2EE"
                  editable={!isRepaymentDue}
                  showSoftInputOnFocus={!isRepaymentDue}
                  style={[styles.fieldInput, styles.flexFieldInput, ui.fieldText]}
                />
              </View>
              {paymentAmountHelperText ? (
                <Text style={[styles.inputHelperText, ui.helperText]}>
                  {paymentAmountHelperText}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, ui.label]}>Pay With</Text>
              <Pressable
                style={[styles.selectField, ui.pillSurface]}
                onPress={() => {
                  if (paymentMethods.length > 1) {
                    setIsPaymentMethodsOpen((current) => !current);
                  }
                }}
              >
                <View style={styles.selectFieldContent}>
                  {(() => {
                    const account = accounts.find(
                      (a) => a.id === activePaymentMethodAccountId,
                    );

                  let logoAsset: any = null;

                  if (account) {
                    const nameLower = (account.name || "").toLowerCase();

                    const matchWallet = WALLETS.find(
                      (w) =>
                        (w.name && nameLower.includes(w.name.toLowerCase())) ||
                        (w.shortName &&
                          nameLower.includes(w.shortName.toLowerCase())) ||
                        nameLower.includes(w.id),
                    );

                    const matchBank = BANKS.find(
                      (b) =>
                        (b.name && nameLower.includes(b.name.toLowerCase())) ||
                        (b.shortName &&
                          nameLower.includes(b.shortName.toLowerCase())) ||
                        nameLower.includes(b.id),
                    );

                    if (matchWallet) {
                      logoAsset = matchWallet.logo;
                    } else if (matchBank) {
                      logoAsset = matchBank.logo;
                    } else {
                      const key = account.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "");
                      logoAsset = LOGO_MAP[key];
                    }
                  }

                  if (logoAsset) {
                    return (
                      <Logo
                        logo={logoAsset}
                        size={24}
                        backgroundColor={account?.color || colors.secondary}
                        style={{ marginRight: 10 }}
                      />
                    );
                  }

                  return null;
                })()}
                <View style={styles.selectFieldText}>
                  <View style={styles.methodTitleRow}>
                    <Text
                      style={[styles.selectValue, ui.valueText]}
                      numberOfLines={1}
                    >
                      {activePaymentMethod?.sublabel ??
                        activePaymentMethod?.label ??
                        "Select account"}
                    </Text>
                    {activePaymentMethod?.isDefault ? (
                      <View style={[styles.defaultPill, ui.defaultPill]}>
                        <Text
                          style={[styles.defaultPillText, ui.defaultPillText]}
                        >
                          Default
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <Feather name="chevron-down" size={18} color={ui.iconTint.color} />
            </Pressable>

            {isPaymentMethodsOpen && paymentMethods.length > 1 ? (
              <View style={[styles.methodDropdown, ui.pillSurface, shadows.card]}>
                {paymentMethods.map((method, index) => {
                  const isSelected = method.id === activePaymentMethod?.id;
                  const isInsufficient =
                    !method.isFallback &&
                    method.kind !== "credit" &&
                    selectedAmount > method.balance;
                  const isLast = index === paymentMethods.length - 1;

                  return (
                    <Pressable
                      key={method.id}
                      style={[
                        styles.methodItem,
                        !isLast && styles.methodItemBorder,
                        !isLast && ui.dropdownItemBorder,
                        isInsufficient && styles.methodItemDisabled,
                      ]}
                      disabled={isInsufficient}
                      onPress={() => {
                        setSelectedPaymentMethodId(method.id);
                        setIsPaymentMethodsOpen(false);
                      }}
                    >
                      <View style={styles.methodItemLeft}>
                        {(() => {
                          const methodAccountId =
                            "accountId" in method ? method.accountId : undefined;
                          const account = accounts.find(
                            (a) => a.id === methodAccountId,
                          );

                          let logoAsset: any = null;

                          if (account) {
                            const nameLower = (account.name || "").toLowerCase();

                            const matchWallet = WALLETS.find(
                              (w) =>
                                (w.name &&
                                  nameLower.includes(w.name.toLowerCase())) ||
                                (w.shortName &&
                                  nameLower.includes(
                                    w.shortName.toLowerCase(),
                                  )) ||
                                nameLower.includes(w.id),
                            );

                            const matchBank = BANKS.find(
                              (b) =>
                                (b.name &&
                                  nameLower.includes(b.name.toLowerCase())) ||
                                (b.shortName &&
                                  nameLower.includes(
                                    b.shortName.toLowerCase(),
                                  )) ||
                                nameLower.includes(b.id),
                            );

                            if (matchWallet) {
                              logoAsset = matchWallet.logo;
                            } else if (matchBank) {
                              logoAsset = matchBank.logo;
                            } else {
                              const key = account.name
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, "");
                              logoAsset = LOGO_MAP[key];
                            }
                          }

                          if (logoAsset) {
                            return (
                              <Logo
                                logo={logoAsset}
                                size={24}
                                backgroundColor={account?.color || colors.secondary}
                              />
                            );
                          }

                          return (
                            <View style={styles.methodBadge}>
                              <Text style={styles.methodBadgeText}>
                                {method.label.slice(0, 2).toUpperCase()}
                              </Text>
                            </View>
                          );
                        })()}

                        <View style={styles.methodTextBlock}>
                          <View style={styles.methodTitleRow}>
                            <Text
                              style={[styles.methodTitle, ui.valueText]}
                              numberOfLines={1}
                            >
                              {method.label}
                            </Text>
                            {method.isDefault ? (
                              <View style={[styles.defaultPill, ui.defaultPill]}>
                                <Text
                                  style={[
                                    styles.defaultPillText,
                                    ui.defaultPillText,
                                  ]}
                                >
                                  Default
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[styles.methodBalanceText, ui.valueText]}
                          >
                            {method.balanceLabel}
                          </Text>
                          {isInsufficient ? (
                            <Text
                              style={[
                                styles.methodAvailabilityText,
                                styles.methodBalanceTextDanger,
                              ]}
                            >
                              Insufficient balance
                            </Text>
                          ) : method.isFallback ? (
                            <Text
                              style={[
                                styles.methodAvailabilityText,
                                ui.dropdownItemMuted,
                              ]}
                            >
                              Cash will be created automatically
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected ? (
                        <Feather
                          name="check"
                          size={16}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

              {insufficientBalanceMessage ? (
                <Text
                  style={[
                    styles.inlineWarningMessage,
                    { color: "#EF4444" },
                  ]}
                >
                  {insufficientBalanceMessage}
                </Text>
              ) : null}
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

          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.cancelButton, ui.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, ui.cancelText]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.saveButton, ui.saveButton]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={[styles.saveButtonText, ui.saveButtonText]}>
                Save Payment
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}

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
    maxHeight: "90%",
  },
  contentScroll: {
    flexGrow: 0,
  },
  contentScrollInner: {
    paddingBottom: 8,
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
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  headerHelperText: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
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
  infoBanner: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoBannerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
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
  fieldSurfaceDisabled: {
    opacity: 0.72,
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
  inputHelperText: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  selectField: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectFieldContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectFieldText: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  selectValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  methodDropdown: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  methodItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodItemBorder: {
    borderBottomWidth: 1,
  },
  methodItemDisabled: {
    opacity: 0.45,
  },
  methodItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  methodTextBlock: {
    flex: 1,
    gap: 1,
  },
  methodBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CBD5E1",
  },
  methodBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: fontWeights.bold,
  },
  methodTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
  methodBalanceText: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
  },
  methodAvailabilityText: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
  },
  methodBalanceTextDanger: {
    color: "#DC2626",
  },
  defaultPill: {
    height: 20,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  defaultPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeights.semibold,
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
  inlineWarningMessage: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  errorMessage: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    textAlign: "center",
    color: "#EF4444",
  },
});
