import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import Logo from "@/components/logo";
import { BANKS } from "@/constants/banks";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import LOGO_MAP from "@/constants/logoMap";
import { WALLETS } from "@/constants/wallets";
import { useAccounts } from "@/hooks/useAccounts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useModalMotion } from "@/hooks/useModalMotion";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import {
  paylatersService,
  type PaylaterListItem,
  type PaylaterPaymentListItem,
} from "@/src/db/services/paylatersService";
import {
  formatPaylaterAmount,
  formatPaylaterDueDayLabel,
  formatPaylaterEstimatedCompletion,
  formatPaylaterPaymentDate,
  getPaylaterOption,
  getPaylaterPaymentTitle,
  getPaylaterStatusLabel,
  getPaylaterStatusTone,
} from "@/src/lib/paylaters-presentation";
import { onPaylatersChanged } from "@/src/lib/dbSync";
import { toPaylaterProgressLabel } from "@/src/db/services/paylatersService";
import { LoadingActionButton } from "@/components/loading-action-button";

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function PaylaterInfoModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paylaterId?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const paylaterId = getParamValue(params.paylaterId);
  const [paylater, setPaylater] = useState<PaylaterListItem | null>(null);
  const [payments, setPayments] = useState<PaylaterPaymentListItem[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [isMarkPaidPickerVisible, setIsMarkPaidPickerVisible] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<
    string | null
  >(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [showDeletePaylaterConfirm, setShowDeletePaylaterConfirm] =
    useState(false);
  const [isDeletingPaylater, setIsDeletingPaylater] = useState(false);
  const { methods: paymentMethods } = usePaymentMethods();
  const { accounts } = useAccounts();
  const { animatedBackdropStyle, animatedCardStyle } = useModalMotion({
    visible: isMarkPaidPickerVisible,
    enteringOffset: 18,
  });

  useEffect(() => {
    if (!paylaterId) {
      return;
    }

    const hydrate = async () => {
      const [nextPaylater, nextPayments] = await Promise.all([
        paylatersService.fetchById(paylaterId),
        paylatersService.fetchPayments(paylaterId),
      ]);

      setPaylater(nextPaylater ?? null);
      setPayments(
        [...nextPayments].sort(
          (left, right) =>
            new Date(right.paymentDate).getTime() -
            new Date(left.paymentDate).getTime(),
        ),
      );
    };

    void hydrate().catch(() => undefined);
    const off = onPaylatersChanged(() => {
      void hydrate().catch(() => undefined);
    });

    return () => off();
  }, [paylaterId]);

  const platform = paylater ? getPaylaterOption(paylater.platform) : null;
  const statusTone = getPaylaterStatusTone(paylater?.status ?? "upcoming");
  const activePaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0] ??
    null;
  const activePaymentMethodAccountId =
    activePaymentMethod && "accountId" in activePaymentMethod
      ? activePaymentMethod.accountId
      : undefined;
  const markPaidAmount = Number(paylater?.remainingBalance ?? 0);
  const isPaidPaylater =
    statusTone === "paid" || Number(paylater?.remainingBalance ?? 0) <= 0;
  const selectedPaymentMethodIsInsufficient =
    Boolean(activePaymentMethod) &&
    !activePaymentMethod?.isFallback &&
    activePaymentMethod?.kind !== "credit" &&
    markPaidAmount > (activePaymentMethod?.balance ?? 0);
  const { progress, percentagePaid, installmentsRemaining } =
    toPaylaterProgressLabel(
      paylater ?? {
        totalAmount: 0,
        remainingBalance: 0,
        installmentAmount: 0,
      },
    );

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
      title: {
        color: colors.foreground,
      },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(241, 245, 249, 0.98)",
      },
      closeIcon: {
        color: isDark ? "#D4DCE6" : "#202733",
      },
      detailCard: {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F3F6FB",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7",
      },
      detailLabel: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      detailValue: {
        color: colors.foreground,
      },
      estimateCard: {
        backgroundColor: isDark ? "rgba(19, 74, 137, 0.22)" : "#DDEEFF",
        borderColor: isDark ? "rgba(96, 165, 250, 0.26)" : "#9CCFFF",
      },
      estimateLabel: {
        color: isDark ? "#7A8AA1" : "#6B7280",
      },
      estimateValue: {
        color: colors.foreground,
      },
      estimateSubtext: {
        color: isDark ? "#4E93D9" : "#456A9A",
      },
      primaryButton: {
        backgroundColor: "#168CF3",
      },
      primaryButtonText: {
        color: "#FFFFFF",
      },
      neutralButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
      neutralButtonText: {
        color: colors.foreground,
      },
      successButton: {
        backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "#DCFCE7",
      },
      successButtonText: {
        color: "#0F9F4A",
      },
      pillSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E6EBF2",
      },
      valueText: {
        color: colors.foreground,
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
      dangerButton: {
        backgroundColor: isDark ? "rgba(239,68,68,0.14)" : "#FEE2E2",
      },
      dangerButtonIcon: {
        color: "#EF4444",
      },
      divider: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
      },
      historyTitle: {
        color: colors.foreground,
      },
      historyDate: {
        color: colors.foreground,
      },
      historySubtitle: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      historyAmount: {
        color: "#168CF3",
      },
      statusPill: {
        backgroundColor:
          statusTone === "upcoming"
            ? "rgba(34,197,94,0.18)"
            : statusTone === "paid"
              ? "rgba(59,130,246,0.18)"
              : "rgba(239,68,68,0.18)",
      },
      statusText: {
        color:
          statusTone === "upcoming"
            ? "#86EFAC"
            : statusTone === "paid"
              ? "#93C5FD"
              : "#FCA5A5",
      },
    }),
    [colors, isDark, statusTone],
  );

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

  const handleDeletePayment = async () => {
    if (!pendingDeletePaymentId || isDeletingPayment) {
      return;
    }

    setIsDeletingPayment(true);

    try {
      await paylatersService.deletePayment(pendingDeletePaymentId);
      setPendingDeletePaymentId(null);
    } catch (error) {
      Alert.alert(
        "Unable to remove payment",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleMarkPaid = () => {
    if (!paylater) {
      return;
    }

    setMarkPaidError(null);
    setIsMarkPaidPickerVisible(true);
    setIsPaymentMethodsOpen(false);
  };

  const confirmMarkPaid = async () => {
    if (!paylater) {
      return;
    }

    if (!selectedPaymentMethodId) {
      setMarkPaidError("Please select a payment method.");
      return;
    }

    if (selectedPaymentMethodIsInsufficient) {
      setMarkPaidError("Selected wallet/card cannot cover the full payoff amount.");
      return;
    }

    try {
      setIsMarkingPaid(true);
      setMarkPaidError(null);
      await paylatersService.markPaylaterAsPaidWithAccount(
        paylater.id,
        activePaymentMethod?.isFallback
          ? null
          : (activePaymentMethodAccountId ?? selectedPaymentMethodId),
      );
      setIsMarkPaidPickerVisible(false);
      setIsPaymentMethodsOpen(false);
    } catch (error) {
      setMarkPaidError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleDeletePaylater = async () => {
    if (!paylater || isDeletingPaylater) {
      return;
    }

    setIsDeletingPaylater(true);

    try {
      await paylatersService.delete(paylater.id);
      setShowDeletePaylaterConfirm(false);
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to delete paylater",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsDeletingPaylater(false);
    }
  };

  if (!paylater) {
    return (
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />
        <View style={[styles.sheet, ui.sheet, shadows.floating]}>
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
          <Text style={[styles.historySubtitle, ui.historySubtitle, { marginTop: 20 }]}>
            Paylater record not found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>{paylater.itemName}</Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient
            colors={["#8A2BE2", "#9C27F4", "#4F46E5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.summaryLabel}>Outstanding Balance</Text>
                <Text style={styles.summaryAmount}>
                  {formatPaylaterAmount(Number(paylater.remainingBalance ?? 0))}
                </Text>
              </View>

              <View style={styles.summaryRight}>
                <Text style={styles.summaryProvider}>{platform?.name ?? "PayLater"}</Text>
                <View style={[styles.statusPill, ui.statusPill]}>
                  <Text style={[styles.statusText, ui.statusText]}>
                    {getPaylaterStatusLabel(paylater.status)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryTrack}>
              <View
                style={[
                  styles.summaryFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.summaryProgress}>{`${percentagePaid}% paid`}</Text>
          </LinearGradient>

          <View style={styles.detailsList}>
            <View style={[styles.detailCard, ui.detailCard]}>
              <Text style={[styles.detailLabel, ui.detailLabel]}>
                Installment Amount
              </Text>
              <Text style={[styles.detailValue, ui.detailValue]}>
                {formatPaylaterAmount(Number(paylater.installmentAmount ?? 0))}
              </Text>
            </View>

            <View style={[styles.detailCard, ui.detailCard]}>
              <Text style={[styles.detailLabel, ui.detailLabel]}>Due Date</Text>
              <Text style={[styles.detailValue, ui.detailValue]}>
                {formatPaylaterDueDayLabel(paylater.dueDay)}
              </Text>
            </View>

            <View style={[styles.detailCard, ui.detailCard]}>
              <Text style={[styles.detailLabel, ui.detailLabel]}>
                Total Amount
              </Text>
              <Text style={[styles.detailValue, ui.detailValue]}>
                {formatPaylaterAmount(Number(paylater.totalAmount ?? 0))}
              </Text>
            </View>
          </View>

          <View style={[styles.estimateCard, ui.estimateCard]}>
            <Text style={[styles.estimateLabel, ui.estimateLabel]}>
              Repayment Estimate
            </Text>
            <Text style={[styles.estimateValue, ui.estimateValue]}>
              {`${installmentsRemaining} installments remaining`}
            </Text>
            <Text style={[styles.estimateSubtext, ui.estimateSubtext]}>
              {formatPaylaterEstimatedCompletion(paylater)}
            </Text>
          </View>

          {isPaidPaylater ? null : (
            <Pressable
              style={[styles.primaryButton, ui.primaryButton]}
              onPress={() =>
                router.push({
                  pathname: "/paylater-repayment-modal",
                  params: {
                    paylaterId: paylater.id,
                  },
                })
              }
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={[styles.primaryButtonText, ui.primaryButtonText]}>
                Record Payment
              </Text>
            </Pressable>
          )}

          <View style={styles.secondaryActionsRow}>
            <Pressable
              style={[
                styles.secondaryButton,
                ui.neutralButton,
                isPaidPaylater && styles.secondaryButtonDisabled,
              ]}
              onPress={
                isPaidPaylater
                  ? undefined
                  : () =>
                      router.push({
                        pathname: "/edit-paylater-modal",
                        params: {
                          paylaterId: paylater.id,
                        },
                      })
              }
              disabled={isPaidPaylater}
            >
              <Feather
                name="edit-2"
                size={15}
                color={ui.neutralButtonText.color}
              />
              <Text style={[styles.secondaryButtonText, ui.neutralButtonText]}>
                Edit
              </Text>
            </Pressable>

            {isPaidPaylater ? null : (
              <Pressable
                style={[styles.secondaryButton, ui.successButton]}
                onPress={handleMarkPaid}
              >
                <Feather
                  name="award"
                  size={15}
                  color={ui.successButtonText.color}
                />
                <Text style={[styles.secondaryButtonText, ui.successButtonText]}>
                  Mark Paid
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.iconDangerButton, ui.dangerButton]}
              onPress={() => setShowDeletePaylaterConfirm(true)}
            >
              <Feather
                name="trash-2"
                size={16}
                color={ui.dangerButtonIcon.color}
              />
            </Pressable>
          </View>

          <View style={[styles.divider, ui.divider]} />

          <Text style={[styles.historyTitle, ui.historyTitle]}>
            Payment History
          </Text>

          <View style={styles.historyList}>
            {payments.map((entry, index) => (
              <View key={entry.id} style={styles.historyItem}>
                <View>
                  <Text style={[styles.historyDate, ui.historyDate]}>
                    {formatPaylaterPaymentDate(entry.paymentDate)}
                  </Text>
                  <Text style={[styles.historySubtitle, ui.historySubtitle]}>
                    {getPaylaterPaymentTitle(entry, index)}
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Text style={[styles.historyAmount, ui.historyAmount]}>
                    {formatPaylaterAmount(Number(entry.amount ?? 0))}
                  </Text>

                  {isPaidPaylater ? null : (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => setPendingDeletePaymentId(entry.id)}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={ui.dangerButtonIcon.color}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}

            {payments.length === 0 ? (
              <Text style={[styles.historySubtitle, ui.historySubtitle]}>
                No payment history yet.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="none"
        onRequestClose={() => {
          setIsMarkPaidPickerVisible(false);
          setIsPaymentMethodsOpen(false);
          setMarkPaidError(null);
        }}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isMarkPaidPickerVisible}
      >
        <Animated.View
          style={[
            styles.markPaidModalOverlay,
            ui.overlay,
            animatedBackdropStyle,
          ]}
        >
          <Pressable
            disabled={isMarkingPaid}
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              setIsMarkPaidPickerVisible(false);
              setIsPaymentMethodsOpen(false);
              setMarkPaidError(null);
            }}
          />

          <Animated.View style={[styles.markPaidModalWrap, animatedCardStyle]}>
            <View style={[styles.markPaidModalCard, ui.sheet, shadows.floating]}>
              <View style={[styles.handle, ui.handle]} />

              <View style={styles.headerRow}>
                <Text style={[styles.markPaidTitle, ui.title]}>
                  Mark Paid With
                </Text>
                <Pressable
                  disabled={isMarkingPaid}
                  style={[styles.closeButton, ui.closeButton]}
                  onPress={() => {
                    setIsMarkPaidPickerVisible(false);
                    setIsPaymentMethodsOpen(false);
                    setMarkPaidError(null);
                  }}
                >
                  <Feather name="x" size={20} color={ui.closeIcon.color} />
                </Pressable>
              </View>

              <Text style={[styles.markPaidSubtitle, ui.historySubtitle]}>
                Choose a wallet or card that can cover{" "}
                {formatPaylaterAmount(markPaidAmount)}.
              </Text>

              <ScrollView
                style={styles.markPaidScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.markPaidModalContent}
              >
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
                  <Feather name="chevron-down" size={18} color={colors.foreground} />
                </Pressable>

                {isPaymentMethodsOpen && paymentMethods.length > 1 ? (
                  <View
                    style={[styles.methodDropdown, ui.pillSurface, shadows.card]}
                  >
                    {paymentMethods.map((method, index) => {
                      const isSelected = method.id === activePaymentMethod?.id;
                      const isInsufficient =
                        !method.isFallback &&
                        method.kind !== "credit" &&
                        markPaidAmount > method.balance;
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
                                      nameLower.includes(w.shortName.toLowerCase())) ||
                                    nameLower.includes(w.id),
                                );
                                const matchBank = BANKS.find(
                                  (b) =>
                                    (b.name &&
                                      nameLower.includes(b.name.toLowerCase())) ||
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
                                style={[
                                  styles.methodBalanceText,
                                  ui.valueText,
                                  isInsufficient && styles.methodBalanceTextDanger,
                                ]}
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
                                  Balance too low for full payoff
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          {isSelected ? (
                            <Feather name="check" size={16} color={colors.primary} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {markPaidError ? (
                  <Text style={styles.markPaidError}>{markPaidError}</Text>
                ) : null}
              </ScrollView>

              <View style={styles.markPaidActions}>
                <Pressable
                  style={[styles.markPaidCancelButton, ui.neutralButton]}
                  onPress={() => {
                    setIsMarkPaidPickerVisible(false);
                    setIsPaymentMethodsOpen(false);
                    setMarkPaidError(null);
                  }}
                >
                  <Text style={[styles.secondaryButtonText, ui.neutralButtonText]}>
                    Cancel
                  </Text>
                </Pressable>

                <LoadingActionButton
                  style={[
                    styles.markPaidConfirmButton,
                    ui.successButton,
                    (isMarkingPaid || selectedPaymentMethodIsInsufficient) && {
                      opacity: 0.6,
                    },
                  ]}
                  label="Confirm"
                  loadingLabel="Saving..."
                  loading={isMarkingPaid}
                  disabled={selectedPaymentMethodIsInsufficient}
                  spinnerColor={ui.successButtonText.color}
                  haptic="default"
                  textStyle={[styles.secondaryButtonText, ui.successButtonText]}
                  onPress={() => {
                    void confirmMarkPaid();
                  }}
                />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <DeleteConfirmationModal
        visible={showDeletePaylaterConfirm}
        title="Delete paylater?"
        message={
          isPaidPaylater
            ? "This PayLater is already fully paid. Deleting it will only remove it from your PayLater list. Past repayment transactions will remain in your records and your balance will not be changed."
            : "This will remove the paylater, its payment history, and the linked repayment expenses."
        }
        isDeleting={isDeletingPaylater}
        onCancel={() => {
          if (!isDeletingPaylater) {
            setShowDeletePaylaterConfirm(false);
          }
        }}
        onConfirm={() => {
          void handleDeletePaylater();
        }}
      />

      <DeleteConfirmationModal
        visible={pendingDeletePaymentId !== null}
        title="Remove payment?"
        message="This will remove the selected payment and reverse the linked expense."
        isDeleting={isDeletingPayment}
        confirmLabel="Remove"
        loadingLabel="Removing..."
        onCancel={() => {
          if (!isDeletingPayment) {
            setPendingDeletePaymentId(null);
          }
        }}
        onConfirm={() => {
          void handleDeletePayment();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 24,
    maxHeight: "86%",
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
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  summaryCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: "hidden",
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    color: "rgba(255,255,255,0.9)",
  },
  summaryAmount: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  summaryRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  summaryProvider: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    color: "rgba(255,255,255,0.9)",
  },
  statusPill: {
    minHeight: 32,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  summaryTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  summaryProgress: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  detailsList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 42,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  detailValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  estimateCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  estimateLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  estimateValue: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  estimateSubtext: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 18,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  markPaidPanel: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  markPaidModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  markPaidModalWrap: {
    width: "100%",
  },
  markPaidModalCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    maxHeight: "98%",
  },
  markPaidScroll: {
    flexGrow: 0,
  },
  markPaidModalContent: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  markPaidTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  markPaidSubtitle: {
    marginTop: 4,
  },
  selectField: {
    marginTop: 12,
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
  markPaidActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  markPaidCancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  markPaidConfirmButton: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  markPaidError: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    color: "#EF4444",
  },
  secondaryActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  iconDangerButton: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    marginTop: 22,
    height: StyleSheet.hairlineWidth,
  },
  historyTitle: {
    marginTop: 22,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  historyList: {
    marginTop: 16,
    gap: 18,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  historyDate: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  historySubtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  historyAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  historyRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
