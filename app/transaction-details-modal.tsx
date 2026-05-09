import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
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

export default function TransactionDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const transactionId = Array.isArray(params.transactionId) ? params.transactionId[0] : params.transactionId;
  const { transaction, isLoading } = useTransaction(transactionId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      tipCard: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#DCEEFE",
        borderColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#B7D7FB",
      },
      tipText: { color: getTipTextColor(isDark) },
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
      router.replace("/transactions");
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unable to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  const transactionIcon =
    transaction?.iconLibrary === "material" ? (
      <MaterialCommunityIcons
        name={transaction.iconName as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
        size={22}
        color={transaction.iconColor}
      />
    ) : (
      <Feather
        name={(transaction?.iconName ?? "circle") as React.ComponentProps<typeof Feather>["name"]}
        size={20}
        color={transaction?.iconColor ?? "#94A3B8"}
      />
    );

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
                  ? isDark
                    ? transaction.iconBackgroundDark
                    : transaction.iconBackgroundLight
                  : getMutedSurface(isDark),
              },
            ]}>
            {transactionIcon}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, ui.title]}>{transaction?.title ?? "Transaction"}</Text>
            <Text style={[styles.subtitle, ui.subtitle]}>
              {transaction?.dateLabel ?? (isLoading ? "Loading transaction..." : "Transaction not found")}
            </Text>
          </View>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <View style={[styles.amountCard, ui.amountCard]}>
          <Text style={[styles.amountLabel, ui.amountLabel]}>
            {transaction?.typeValue === "income" ? "Amount Received" : "Amount Spent"}
          </Text>
          <Text style={[styles.amountValue, ui.amountValue]}>
            {transaction?.signedAmountLabel ?? (isLoading ? "Loading..." : "Unavailable")}
          </Text>
        </View>

        <View style={styles.detailList}>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Category</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction?.category ?? "Uncategorized"}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Type</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction?.type ?? "Unknown"}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Date</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction?.dateLabel ?? "Unavailable"}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Notes</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction?.notes?.trim() || "No notes"}</Text>
          </View>
        </View>

        <View style={[styles.tipCard, ui.tipCard]}>
          <View style={styles.tipAvatarFrame}>
            <Image
              contentFit="cover"
              source={require("@/assets/images/Eyrie_Mascot_3.png")}
              style={styles.tipAvatar}
            />
          </View>
          <Text style={[styles.tipText, ui.tipText]}>Track your spending to stay within budget!</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={!transaction}
            style={[styles.editButton, ui.editButton, !transaction && styles.disabledButton]}
            onPress={() =>
              transaction
                ? router.replace({
                    pathname: "/edit-transaction-modal",
                    params: { transactionId: transaction.id },
                  })
                : undefined
            }>
            <Feather name="edit-2" size={16} color={ui.editText.color} />
            <Text style={[styles.editText, ui.editText]}>Edit Transaction</Text>
          </Pressable>
          <Pressable
            disabled={!transaction}
            style={[styles.deleteButton, ui.deleteButton, !transaction && styles.disabledButton]}
            onPress={() => setShowDeleteConfirm(true)}>
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
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
  },
  handle: {
    alignSelf: "center",
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  amountCard: {
    marginTop: 22,
    minHeight: 102,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  amountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  amountValue: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
  },
  detailList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 46,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  tipCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipAvatarFrame: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tipAvatar: {
    width: 31,
    height: 31,
    borderRadius: radius.full,
  },
  tipText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  actionsRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  deleteButton: {
    width: 58,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
