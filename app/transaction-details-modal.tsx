import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import MerchantLogo from "@/components/merchant-logo";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getBackdropButtonColor,
  getDestructiveTint,
  getDetailLabelColor,
  getHandleColor,
  getMutedSurface,
  getSheetSurface,
  getSubtitleColor,
  getSurfaceOverlay,
  getTipTextColor,
  getTitleColor,
  useTransaction,
} from "@/hooks/useTransactions";
import { transactionsService } from "@/src/db/services";
import { getMerchantLogo } from "@/utils/getMerchantLogo";

export default function TransactionDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const transactionId = Array.isArray(params.transactionId)
    ? params.transactionId[0]
    : params.transactionId;
  const { transaction, isLoading } = useTransaction(transactionId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasMerchantLogo = Boolean(getMerchantLogo(transaction?.merchant));

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: getSurfaceOverlay(isDark),
      },
      sheet: getSheetSurface(isDark),
      handle: {
        backgroundColor: getHandleColor(isDark),
      },
      title: { color: getTitleColor(isDark) },
      subtitle: { color: getSubtitleColor(isDark) },
      closeButton: {
        backgroundColor: getBackdropButtonColor(isDark),
      },
      closeIcon: { color: isDark ? "#D4DCE6" : "#202733" },
      amountCard: {
        backgroundColor: getMutedSurface(isDark),
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0",
      },
      amountLabel: { color: isDark ? "#A9B6C8" : "#5B78A2" },
      amountValue: { color: isDark ? "#F8FAFC" : "#0F172A" },
      detailCard: {
        backgroundColor: getMutedSurface(isDark),
      },
      detailLabel: { color: getDetailLabelColor(isDark) },
      detailValue: { color: getTitleColor(isDark) },
      editButton: { backgroundColor: "#1681DD" },
      editText: { color: "#FFFFFF" },
      deleteButton: {
        backgroundColor: getDestructiveTint(isDark),
      },
      deleteIcon: { color: "#FF5C73" },
    }),
    [isDark],
  );

  const handleDelete = async () => {
    if (!transaction) {
      return;
    }

    setIsDeleting(true);

    try {
      await transactionsService.delete(transaction.id);
      setShowDeleteConfirm(false);
      router.back();
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Unable to delete transaction.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: transaction
                  ? hasMerchantLogo
                    ? "transparent"
                    : isDark
                      ? transaction.iconBackgroundDark
                      : transaction.iconBackgroundLight
                  : getMutedSurface(isDark),
              },
            ]}
          >
            <MerchantLogo
              merchant={transaction?.merchant}
              size={48}
              fallbackIcon={{
                library: transaction?.iconLibrary,
                name: transaction?.iconName ?? "circle",
                color: transaction?.iconColor ?? "#94A3B8",
              }}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, ui.title]}>
              {transaction?.title ?? "Transaction"}
            </Text>
            <Text style={[styles.subtitle, ui.subtitle]}>
              {transaction?.dateLabel ??
                (isLoading
                  ? "Loading transaction..."
                  : "Transaction not found")}
            </Text>
          </View>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <View style={[styles.amountCard, ui.amountCard]}>
          <Text style={[styles.amountLabel, ui.amountLabel]}>
            {transaction?.typeValue === "income"
              ? "Amount Received"
              : "Amount Spent"}
          </Text>
          <Text style={[styles.amountValue, ui.amountValue]}>
            {transaction?.signedAmountLabel ??
              (isLoading ? "Loading..." : "Unavailable")}
          </Text>
        </View>

        <View style={styles.detailList}>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Merchant</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.merchant ?? "Unknown merchant"}
            </Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Category</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.category ?? "Uncategorized"}
            </Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>
              Funding Source
            </Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.accountLabel ?? "Unknown account"}
            </Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Type</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.type ?? "Unknown"}
            </Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Date</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.dateLabel ?? "Unavailable"}
            </Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Notes</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>
              {transaction?.notes?.trim() || "No notes"}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={!transaction}
            style={[
              styles.editButton,
              ui.editButton,
              !transaction && styles.disabledButton,
            ]}
            onPress={() =>
              transaction
                ? router.replace({
                    pathname: "/edit-transaction-modal",
                    params: { transactionId: transaction.id },
                  })
                : undefined
            }
          >
            <Feather name="edit-2" size={16} color={ui.editText.color} />
            <Text style={[styles.editText, ui.editText]}>Edit Transaction</Text>
          </Pressable>
          <Pressable
            disabled={!transaction}
            style={[
              styles.deleteButton,
              ui.deleteButton,
              !transaction && styles.disabledButton,
            ]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Feather name="trash-2" size={18} color={ui.deleteIcon.color} />
          </Pressable>
        </View>
      </View>

      <DeleteConfirmationModal
        visible={showDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete this transaction?"
        message={`Delete ${transaction?.title ?? "this transaction"} permanently? Your totals, balances, and budgets will update immediately.`}
        onCancel={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: radius.full,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  amountCard: {
    marginTop: 18,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  amountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  amountValue: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  detailList: {
    marginTop: 14,
    gap: 10,
  },
  detailCard: {
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  detailLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  deleteButton: {
    width: 52,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
