import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CategoryAvatar } from "@/components/category-avatar";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { LoadingActionButton } from "@/components/loading-action-button";
import MerchantLogo from "@/components/merchant-logo";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import {
  getBackdropButtonColor,
  getDestructiveTint,
  getDetailLabelColor,
  getHandleColor,
  getMutedSurface,
  getSheetSurface,
  getSubtitleColor,
  getSurfaceOverlay,
  getTitleColor,
  useTransaction,
} from "@/hooks/useTransactions";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import {
  canExportReceiptImage,
  exportReceiptImage,
  type ReceiptImageFormat,
} from "@/services/receipt-export";
import { transactionsService } from "@/src/db/services";
import { getMerchantLogo } from "@/utils/getMerchantLogo";

const DEFAULT_RECEIPT_FORMAT: ReceiptImageFormat = "png";

function formatReceiptId(transactionId: string, transactionDate: string) {
  const compactDate = transactionDate.slice(0, 10).replace(/-/g, "");
  return `ERY-${compactDate}-${transactionId.slice(-3).toUpperCase()}`;
}

function formatReceiptTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatReceiptTransactionDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeLabel = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isToday) {
    return `Today, ${timeLabel}`;
  }

  const dayLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return `${dayLabel}, ${timeLabel}`;
}

export default function TransactionDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const transactionId = Array.isArray(params.transactionId)
    ? params.transactionId[0]
    : params.transactionId;
  const { transaction, isLoading } = useTransaction(transactionId);
  const { categories: expenseCategories } = useExpenseCategories();
  const { categories: incomeCategories } = useIncomeCategories();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [isReceiptPreviewReady, setIsReceiptPreviewReady] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptGeneratedAt, setReceiptGeneratedAt] = useState<Date | null>(
    null,
  );
  const receiptRef = useRef<View | null>(null);
  const hasMerchantLogo = Boolean(getMerchantLogo(transaction?.merchant));
  const { isRunning: isSavingReceipt, run: runSaveReceipt } = useAsyncAction();
  const hasCategoryAvatar = Boolean(transaction?.categoryIconType);
  const usesUploadedCategoryImage =
    !transaction?.isPaylaterTransaction &&
    transaction?.categoryIconType === "uploaded_image" &&
    Boolean(transaction.categoryIconImageUri);

  const selectedCategory = useMemo(() => {
    if (!transaction?.categoryId) {
      return null;
    }

    const source =
      transaction.typeValue === "income" ? incomeCategories : expenseCategories;
    return source.find((item) => item.id === transaction.categoryId) ?? null;
  }, [
    expenseCategories,
    incomeCategories,
    transaction?.categoryId,
    transaction?.typeValue,
  ]);

  const receiptBrandTitle =
    transaction?.merchant || transaction?.category || "Eyrie";
  const receiptPaymentLabel = transaction?.accountLabel ?? "Unknown account";
  const receiptAccountLabel =
    transaction?.typeValue === "income" ? "RECEIVING ACCOUNT" : "PAYMENT TYPE";
  const receiptDateLabel = transaction?.transactionDate
    ? formatReceiptTransactionDate(transaction.transactionDate)
    : "Unavailable";
  const receiptId = transaction
    ? formatReceiptId(transaction.id, transaction.transactionDate)
    : "ERY-00000000-000";
  const generatedLabel = formatReceiptTimestamp(
    receiptGeneratedAt ?? new Date(),
  );
  const colors = themeColors[colorScheme];
  const canDownloadReceipt = canExportReceiptImage();

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
      receiptButton: { backgroundColor: "#1681DD" },
      receiptButtonText: { color: "#FFFFFF" },
      editButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#E5E7EB",
      },
      editText: { color: isDark ? "#FFFFFF" : "#111827" },
      deleteButton: {
        backgroundColor: getDestructiveTint(isDark),
      },
      deleteIcon: { color: "#FF5C73" },
      previewBackdrop: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.74)"
          : "rgba(15, 23, 42, 0.16)",
      },
      previewShell: {
        backgroundColor: isDark ? "#162033" : "#EAF1FB",
        borderColor: isDark
          ? "rgba(96, 165, 250, 0.18)"
          : "rgba(255,255,255,0.78)",
      },
      previewTitle: { color: colors.foreground },
      previewHint: { color: colors.mutedForeground },
      previewCloseButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0.8)",
        borderColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(223,227,232,0.9)",
      },
      previewCloseIcon: { color: colors.foreground },
      previewActionArea: {
        borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#D8E2EF",
      },
      receiptCard: {
        backgroundColor: "#FFFFFF",
        borderColor: "#E6ECF5",
        shadowColor: "#7B93B6",
      },
      receiptBrandTitle: { color: "#111827" },
      receiptCaption: { color: "#64748B" },
      receiptMetaLabel: { color: "#5B78A2" },
      receiptAmountValue: { color: "#111827" },
      receiptInfoValue: { color: "#111827" },
      receiptTypePill: {
        backgroundColor: "#E8EEF8",
      },
      receiptTypePillText: { color: "#5B78A2" },
      receiptDashedDivider: {
        borderColor: "#DBE4F1",
      },
      receiptSolidDivider: {
        borderColor: "#D8E2EF",
      },
      ticketNotch: {
        backgroundColor: isDark ? "#162033" : "#EAF1FB",
      },
    }),
    [colors.foreground, colors.mutedForeground, isDark],
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

  const openReceiptPreview = () => {
    if (!transaction) {
      return;
    }

    setReceiptGeneratedAt(new Date());
    setIsReceiptPreviewReady(false);
    setShowReceiptPreview(true);
  };

  const handleDownloadReceipt = () => {
    if (!transaction) {
      return;
    }

    void runSaveReceipt(async () => {
      const result = await exportReceiptImage(
        receiptRef.current,
        DEFAULT_RECEIPT_FORMAT,
      );

      if (result.ok) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
        Alert.alert("Receipt saved", "Saved to your photo library.");
        return;
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
      Alert.alert("Save failed", result.message);
    });
  };

  return (
    <View style={[styles.overlay, ui.overlay]}>
      {!showReceiptPreview ? (
        <>
          <Pressable style={styles.backdrop} onPress={() => router.back()} />

          <View style={[styles.sheet, ui.sheet, shadows.floating]}>
            <View style={[styles.handle, ui.handle]} />

            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: transaction
                      ? transaction.isPaylaterTransaction
                        ? isDark
                          ? transaction.iconBackgroundDark
                          : transaction.iconBackgroundLight
                        : hasMerchantLogo || usesUploadedCategoryImage
                          ? "transparent"
                          : isDark
                            ? transaction.iconBackgroundDark
                            : transaction.iconBackgroundLight
                      : getMutedSurface(isDark),
                  },
                ]}
              >
                {transaction?.isPaylaterTransaction ? (
                  <MerchantLogo
                    merchant={null}
                    size={48}
                    fallbackIcon={{
                      library: transaction?.iconLibrary,
                      name: transaction?.iconName ?? "circle",
                      color: transaction?.iconColor ?? "#94A3B8",
                    }}
                  />
                ) : hasMerchantLogo ? (
                  <MerchantLogo
                    merchant={transaction?.merchant}
                    size={48}
                    fallbackIcon={{
                      library: transaction?.iconLibrary,
                      name: transaction?.iconName ?? "circle",
                      color: transaction?.iconColor ?? "#94A3B8",
                    }}
                  />
                ) : hasCategoryAvatar && transaction ? (
                  <CategoryAvatar
                    category={{
                      iconType: transaction.categoryIconType!,
                      iconName: transaction.categoryIconName,
                      iconImageUri: transaction.categoryIconImageUri,
                      emoji: transaction.categoryEmoji,
                      color: transaction.categoryColor ?? transaction.iconColor,
                    }}
                    size={usesUploadedCategoryImage ? 48 : 28}
                  />
                ) : (
                  <MerchantLogo
                    merchant={transaction?.merchant}
                    size={48}
                    fallbackIcon={{
                      library: transaction?.iconLibrary,
                      name: transaction?.iconName ?? "circle",
                      color: transaction?.iconColor ?? "#94A3B8",
                    }}
                  />
                )}
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
                <Text style={[styles.detailLabel, ui.detailLabel]}>
                  Merchant
                </Text>
                <Text style={[styles.detailValue, ui.detailValue]}>
                  {transaction?.merchant ?? "Unknown merchant"}
                </Text>
              </View>
              <View style={[styles.detailCard, ui.detailCard]}>
                <Text style={[styles.detailLabel, ui.detailLabel]}>
                  Category
                </Text>
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

            <View style={styles.actionsBlock}>
              <LoadingActionButton
                label="Generate Receipt"
                loadingLabel="Preparing..."
                disabled={!transaction}
                haptic="default"
                style={[
                  styles.receiptButton,
                  ui.receiptButton,
                  !transaction && styles.disabledButton,
                ]}
                textStyle={[styles.receiptButtonText, ui.receiptButtonText]}
                leftAdornment={
                  <Feather
                    name="file-text"
                    size={16}
                    color={ui.receiptButtonText.color}
                  />
                }
                onPress={openReceiptPreview}
              />

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
                  <Text style={[styles.editText, ui.editText]}>Edit</Text>
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
                  <Feather
                    name="trash-2"
                    size={18}
                    color={ui.deleteIcon.color}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </>
      ) : null}

      <Modal
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent
        visible={showReceiptPreview}
        onRequestClose={() => setShowReceiptPreview(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewBackdrop} />
          <View
            style={[styles.previewScreen, ui.previewShell, shadows.floating]}
          >
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewTitle, ui.previewTitle]}>
                Receipt Preview
              </Text>
              <Pressable
                style={[styles.previewCloseButton, ui.previewCloseButton]}
                onPress={() => setShowReceiptPreview(false)}
              >
                <Feather name="x" size={22} color={ui.previewCloseIcon.color} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={styles.receiptCaptureWrap}
                ref={(node) => {
                  receiptRef.current = node;
                }}
                collapsable={false}
                onLayout={() => {
                  setIsReceiptPreviewReady(true);
                }}
              >
                <View style={[styles.receiptCard, ui.receiptCard]}>
                  <View style={styles.receiptLogoWrap}>
                    {transaction?.isPaylaterTransaction ? (
                      <MerchantLogo
                        merchant={null}
                        size={72}
                        backgroundColor="#E8EEF8"
                        fallbackIcon={{
                          library: transaction?.iconLibrary,
                          name: transaction?.iconName ?? "circle",
                          color: transaction?.iconColor ?? "#5B78A2",
                        }}
                      />
                    ) : transaction?.merchant && hasMerchantLogo ? (
                      <MerchantLogo
                        merchant={transaction.merchant}
                        size={72}
                        style={styles.receiptMerchantLogo}
                      />
                    ) : hasCategoryAvatar && transaction ? (
                      <View
                        style={[
                          styles.receiptCategoryLogo,
                          {
                            backgroundColor: usesUploadedCategoryImage
                              ? "transparent"
                              : `${transaction.categoryColor ?? transaction.iconColor}18`,
                          },
                        ]}
                      >
                        <CategoryAvatar
                          category={{
                            iconType: transaction.categoryIconType!,
                            iconName: transaction.categoryIconName,
                            iconImageUri: transaction.categoryIconImageUri,
                            emoji: transaction.categoryEmoji,
                            color:
                              transaction.categoryColor ??
                              transaction.iconColor,
                          }}
                          size={usesUploadedCategoryImage ? 72 : 38}
                        />
                      </View>
                    ) : selectedCategory ? (
                      <View
                        style={[
                          styles.receiptCategoryLogo,
                          { backgroundColor: `${selectedCategory.color}18` },
                        ]}
                      >
                        <CategoryAvatar
                          category={{
                            iconType: selectedCategory.iconType,
                            iconName: selectedCategory.iconName,
                            iconImageUri: selectedCategory.iconImageUri,
                            emoji: selectedCategory.emoji,
                            color: selectedCategory.color,
                          }}
                          size={38}
                        />
                      </View>
                    ) : (
                      <MerchantLogo
                        merchant={null}
                        size={72}
                        backgroundColor="#E8EEF8"
                        fallbackIcon={{
                          library: transaction?.iconLibrary,
                          name: transaction?.iconName ?? "circle",
                          color: transaction?.iconColor ?? "#5B78A2",
                        }}
                      />
                    )}
                  </View>

                  <Text
                    style={[styles.receiptBrandTitle, ui.receiptBrandTitle]}
                  >
                    {receiptBrandTitle}
                  </Text>
                  <Text style={[styles.receiptCaption, ui.receiptCaption]}>
                    Transaction Receipt
                  </Text>

                  <View
                    style={[
                      styles.receiptDashedDivider,
                      ui.receiptDashedDivider,
                    ]}
                  />

                  <View style={styles.receiptTopRow}>
                    <Text
                      style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                    >
                      AMOUNT
                    </Text>
                    <Text
                      style={[styles.receiptAmountValue, ui.receiptAmountValue]}
                    >
                      {transaction?.signedAmountLabel ?? "-₱0"}
                    </Text>
                  </View>

                  <View style={styles.receiptInfoRow}>
                    <Text
                      style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                    >
                      CATEGORY
                    </Text>
                    <Text
                      style={[styles.receiptInfoValue, ui.receiptInfoValue]}
                    >
                      {transaction?.category ?? "Uncategorized"}
                    </Text>
                  </View>

                  <View style={styles.receiptInfoRow}>
                    <Text
                      style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                    >
                      {receiptAccountLabel}
                    </Text>
                    <View style={[styles.receiptTypePill, ui.receiptTypePill]}>
                      <Text
                        style={[
                          styles.receiptTypePillText,
                          ui.receiptTypePillText,
                        ]}
                      >
                        {receiptPaymentLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptInfoRow}>
                    <Text
                      style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                    >
                      DATE
                    </Text>
                    <Text
                      style={[styles.receiptInfoValue, ui.receiptInfoValue]}
                    >
                      {receiptDateLabel}
                    </Text>
                  </View>

                  <View
                    style={[styles.receiptSolidDivider, ui.receiptSolidDivider]}
                  />

                  <View style={styles.receiptMetaGrid}>
                    <View style={styles.receiptMetaCell}>
                      <Text
                        style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                      >
                        RECEIPT ID
                      </Text>
                      <Text
                        style={[
                          styles.receiptMetaValueCompact,
                          ui.receiptInfoValue,
                        ]}
                      >
                        {receiptId}
                      </Text>
                    </View>
                    <View style={styles.receiptMetaCell}>
                      <Text
                        style={[styles.receiptMetaLabel, ui.receiptMetaLabel]}
                      >
                        GENERATED
                      </Text>
                      <Text
                        style={[
                          styles.receiptMetaValueCompact,
                          ui.receiptInfoValue,
                        ]}
                      >
                        {generatedLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptFooter}>
                    <Text style={[styles.receiptFooterText, ui.receiptCaption]}>
                      Recorded securely in Eyrie
                    </Text>
                  </View>

                  <View style={styles.ticketEdgeRow}>
                    {Array.from({ length: 9 }).map((_, index) => (
                      <View
                        key={`notch-${index}`}
                        style={[styles.ticketNotch, ui.ticketNotch]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.previewActionArea, ui.previewActionArea]}>
              <Text style={[styles.previewActionTitle, ui.previewTitle]}>
                Download Receipt
              </Text>
              <Text style={[styles.previewActionSubtitle, ui.previewHint]}>
                {canDownloadReceipt
                  ? "Save this receipt as an image"
                  : "Receipt download is temporarily unavailable."}
              </Text>
              <LoadingActionButton
                label="Download Receipt"
                loadingLabel="Saving..."
                loading={isSavingReceipt}
                disabled={!canDownloadReceipt || !isReceiptPreviewReady}
                haptic="default"
                style={styles.downloadButton}
                textStyle={styles.downloadButtonText}
                spinnerColor="#FFFFFF"
                leftAdornment={
                  <Feather name="download" size={18} color="#FFFFFF" />
                }
                onPress={handleDownloadReceipt}
              />
            </View>
          </View>
        </View>
      </Modal>

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
  actionsBlock: {
    marginTop: 16,
    gap: 10,
  },
  receiptButton: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  actionsRow: {
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
  previewOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewScreen: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "82%",
    borderRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 0,
    borderWidth: 1,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
    color: "#111827",
  },
  previewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  previewSubtitleText: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  previewSubtitleTight: {
    marginTop: 0,
  },
  previewScroll: {
    flexGrow: 0,
  },
  previewScrollContent: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  receiptCaptureWrap: {
    alignItems: "center",
  },
  receiptCard: {
    width: "100%",
    borderRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    shadowOpacity: 0.22,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  receiptLogoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  receiptMerchantLogo: {
    borderRadius: 48,
    overflow: "hidden",
  },
  receiptCategoryLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptBrandTitle: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  receiptCaption: {
    marginTop: 2,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
  },
  receiptDashedDivider: {
    marginTop: 12,
    marginBottom: 10,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  receiptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  receiptMetaLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.1,
    fontWeight: fontWeights.medium,
  },
  receiptAmountValue: {
    textAlign: "right",
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  receiptInfoRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  receiptInfoValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  receiptTypePill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptTypePillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
  },
  receiptSolidDivider: {
    marginTop: 0,
    marginBottom: 10,
    borderTopWidth: 1,
  },
  receiptMetaGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  receiptMetaCell: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  receiptMetaValueCompact: {
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.semibold,
  },
  receiptFooter: {
    marginTop: 14,
    alignItems: "center",
  },
  receiptFooterText: {
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  ticketEdgeRow: {
    marginTop: 12,
    marginHorizontal: -14,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  ticketNotch: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
  },
  previewActionArea: {
    width: "100%",
    marginTop: 18,
    paddingTop: 16,
    paddingBottom: 2,
    borderTopWidth: 1,
  },
  previewActionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  previewActionSubtitle: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  downloadButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1681DD",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  downloadButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
});
