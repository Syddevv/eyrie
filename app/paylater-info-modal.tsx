import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
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

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      "Remove payment?",
      "This will remove the selected payment and reverse the linked expense.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void paylatersService
              .deletePayment(paymentId)
              .catch((error) =>
                Alert.alert(
                  "Unable to remove payment",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  };

  const handleMarkPaid = () => {
    if (!paylater) {
      return;
    }

    Alert.alert(
      "Mark as paid?",
      "This will record a final payment for the remaining balance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          onPress: () => {
            void paylatersService
              .markPaylaterAsPaid(paylater.id)
              .catch((error) =>
                Alert.alert(
                  "Unable to mark as paid",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  };

  const handleDeletePaylater = () => {
    if (!paylater) {
      return;
    }

    Alert.alert(
      "Delete paylater?",
      "This will soft-delete the paylater, its payment history, and linked repayment expenses.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void paylatersService
              .delete(paylater.id)
              .then(() => router.back())
              .catch((error) =>
                Alert.alert(
                  "Unable to delete paylater",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
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

          <View style={styles.secondaryActionsRow}>
            <Pressable
              style={[styles.secondaryButton, ui.neutralButton]}
              onPress={() =>
                router.push({
                  pathname: "/edit-paylater-modal",
                  params: {
                    paylaterId: paylater.id,
                  },
                })
              }
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

            <Pressable
              style={[styles.iconDangerButton, ui.dangerButton]}
              onPress={handleDeletePaylater}
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

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePayment(entry.id)}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={ui.dangerButtonIcon.color}
                    />
                  </Pressable>
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
