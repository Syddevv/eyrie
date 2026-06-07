import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { CategoryIconType } from "@/hooks/useCategories";
import { formatCurrency } from "@/hooks/use-dashboard";
import { resolveBrandLabel } from "@/hooks/usePaymentMethods";
import { transactionsService } from "@/src/db/services";
import { onAccountsChanged, onTransactionsChanged } from "@/src/lib/dbSync";
import { getMerchantPresetByName } from "@/constants/expense-merchants";
import {
  PAYLATER_TRANSACTION_REFERENCE_TYPE,
  PAYLATER_TRANSACTION_SOURCE,
} from "@/src/db/utils/paylaters";

type IconLibrary = "feather" | "material";
type TransactionTypeValue = "expense" | "income" | "transfer";
type TransactionTypeLabel = "Expense" | "Income" | "Transfer";
const TRANSACTIONS_STALE_MS = 30_000;

type TransactionRow = Awaited<
  ReturnType<typeof transactionsService.fetch>
>[number];
type TransactionDetailRow = Awaited<
  ReturnType<typeof transactionsService.fetchById>
>;

export type TransactionListItem = {
  id: string;
  title: string;
  merchant: string;
  merchantId: string | null;
  category: string;
  categoryId: string | null;
  accountId: string;
  accountLabel: string;
  transactionDate: string;
  dateKey: string;
  dateLabel: string;
  sectionTitle: string;
  amount: number;
  amountLabel: string;
  signedAmountLabel: string;
  type: TransactionTypeLabel;
  typeValue: TransactionTypeValue;
  currencyCode: string;
  notes: string | null;
  source: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isPaylaterTransaction: boolean;
  iconLibrary: IconLibrary;
  iconName: string;
  iconColor: string;
  iconBackgroundLight: string;
  iconBackgroundDark: string;
  categoryIconType: CategoryIconType | null;
  categoryIconName: string | null;
  categoryIconImageUri: string | null;
  categoryEmoji: string | null;
  categoryColor: string | null;
  amountColor: "income" | "default";
};

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isYesterday(date: Date, reference = new Date()) {
  const comparison = new Date(reference);
  comparison.setDate(comparison.getDate() - 1);
  return isSameDay(date, comparison);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTransactionDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  if (isSameDay(date, new Date())) {
    return `Today, ${formatTime(date)}`;
  }

  if (isYesterday(date)) {
    return `Yesterday, ${formatTime(date)}`;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSectionTitle(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  if (isSameDay(date, new Date())) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function categoryKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

const merchantAcronyms = new Set([
  "bir",
  "bpi",
  "ched",
  "kfc",
  "lrt",
  "mrt",
  "pldt",
  "sm",
  "sr",
  "sss",
  "up",
]);

function formatMerchantToken(token: string) {
  if (!token) {
    return "";
  }

  const normalized = token.trim().toLowerCase();

  if (merchantAcronyms.has(normalized)) {
    return normalized.toUpperCase();
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeMerchantName(value?: string | null) {
  const raw = value?.trim();

  if (!raw) {
    return "";
  }

  const normalized = raw.toLowerCase();
  const prefix = normalized.startsWith("merchant_default_")
    ? "merchant_default_"
    : normalized.startsWith("merchant_")
      ? "merchant_"
      : null;

  if (!prefix) {
    return raw;
  }

  const cleaned = raw.slice(prefix.length);
  const formatted = cleaned
    .split("_")
    .filter(Boolean)
    .map(formatMerchantToken)
    .join(" ");

  return formatted || raw;
}

export function resolveTransactionVisual(
  categoryName?: string | null,
  type?: string | null,
  options?: {
    merchantName?: string | null;
    categoryIcon?: string | null;
    categoryColor?: string | null;
    source?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
  },
) {
  if (isPaylaterTransactionReference(options)) {
    return {
      iconLibrary: "material" as const,
      iconName: "calendar-clock-outline",
      iconColor: "#168CF3",
      iconBackgroundLight: "#DCEEFE",
      iconBackgroundDark: "#11243B",
    };
  }

  const normalizedCategory = categoryKey(categoryName);
  const matchedMerchant = getMerchantPresetByName(options?.merchantName);

  if (type === "income") {
    if (options?.categoryIcon || options?.categoryColor) {
      return {
        iconLibrary: "material" as const,
        iconName: options.categoryIcon ?? "cash-plus",
        iconColor: options.categoryColor ?? "#10B981",
        iconBackgroundLight: withOpacity(
          options.categoryColor ?? "#10B981",
          0.18,
        ),
        iconBackgroundDark: withOpacity(
          options.categoryColor ?? "#10B981",
          0.22,
        ),
      };
    }

    return {
      iconLibrary: "feather" as const,
      iconName: "arrow-down-left",
      iconColor: "#00C665",
      iconBackgroundLight: "#DDF8E8",
      iconBackgroundDark: "#07261D",
    };
  }

  if (type === "transfer") {
    return {
      iconLibrary: "material" as const,
      iconName: "swap-horizontal",
      iconColor: "#60A5FA",
      iconBackgroundLight: "#E3F0FF",
      iconBackgroundDark: "#11243B",
    };
  }

  if (matchedMerchant?.icon || matchedMerchant?.color) {
    return {
      iconLibrary: "material" as const,
      iconName: matchedMerchant.icon ?? "storefront-outline",
      iconColor: matchedMerchant.color ?? "#94A3B8",
      iconBackgroundLight: withOpacity(
        matchedMerchant.color ?? "#94A3B8",
        0.16,
      ),
      iconBackgroundDark: withOpacity(matchedMerchant.color ?? "#94A3B8", 0.2),
    };
  }

  if (normalizedCategory.includes("food")) {
    return {
      iconLibrary: "material" as const,
      iconName: "silverware-fork-knife",
      iconColor: "#A78BFA",
      iconBackgroundLight: "#EEF0FF",
      iconBackgroundDark: "#181D33",
    };
  }

  if (normalizedCategory.includes("transport")) {
    return {
      iconLibrary: "material" as const,
      iconName: "car-outline",
      iconColor: "#94A3B8",
      iconBackgroundLight: "#EEF2F7",
      iconBackgroundDark: "#1A2433",
    };
  }

  if (normalizedCategory.includes("shopping")) {
    return {
      iconLibrary: "feather" as const,
      iconName: "shopping-bag",
      iconColor: "#F472B6",
      iconBackgroundLight: "#FDE7F3",
      iconBackgroundDark: "#321726",
    };
  }

  if (
    normalizedCategory.includes("bill") ||
    normalizedCategory.includes("utility")
  ) {
    return {
      iconLibrary: "feather" as const,
      iconName: "zap",
      iconColor: "#F59E0B",
      iconBackgroundLight: "#FFF1CC",
      iconBackgroundDark: "#31220A",
    };
  }

  if (normalizedCategory.includes("entertain")) {
    return {
      iconLibrary: "material" as const,
      iconName: "filmstrip-box-multiple",
      iconColor: "#A78BFA",
      iconBackgroundLight: "#EFE7FF",
      iconBackgroundDark: "#23153B",
    };
  }

  if (normalizedCategory.includes("health")) {
    return {
      iconLibrary: "feather" as const,
      iconName: "heart",
      iconColor: "#F87171",
      iconBackgroundLight: "#FFE5E5",
      iconBackgroundDark: "#351417",
    };
  }

  return {
    iconLibrary: "material" as const,
    iconName: "cash-multiple",
    iconColor: "#94A3B8",
    iconBackgroundLight: "#EEF2F7",
    iconBackgroundDark: "#1A2433",
  };
}

export function isPaylaterTransactionReference(input?: {
  source?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}) {
  if (!input) {
    return false;
  }

  if (input.source === PAYLATER_TRANSACTION_SOURCE) {
    return true;
  }

  if (
    input.referenceType === PAYLATER_TRANSACTION_REFERENCE_TYPE ||
    input.referenceType === "paylater"
  ) {
    return true;
  }

  return Boolean(input.referenceId && input.referenceType?.includes("paylater"));
}

function mapTransactionRow(source: TransactionRow): TransactionListItem {
  const merchant =
    source.merchant?.name ||
    normalizeMerchantName(source.merchantName) ||
    source.category?.name ||
    source.account?.name ||
    "Transaction";
  const categoryName =
    source.category?.name ??
    (source.type === "income"
      ? "Income"
      : source.type === "transfer"
        ? "Transfer"
        : "Expense");
  const visual = resolveTransactionVisual(
    source.category?.name ?? categoryName,
    source.type,
    {
      merchantName: merchant,
      categoryIcon: source.category?.icon ?? null,
      categoryColor: source.category?.color ?? null,
      source: source.source ?? null,
      referenceType: source.referenceType ?? null,
      referenceId: source.referenceId ?? null,
    },
  );
  const isPaylaterTransaction = isPaylaterTransactionReference({
    source: source.source ?? null,
    referenceType: source.referenceType ?? null,
    referenceId: source.referenceId ?? null,
  });
  const isIncome = source.type === "income";
  const isTransfer = source.type === "transfer";
  const accountLabel = source.account
    ? resolveBrandLabel(source.account.type as any, source.account.name)
    : "Unknown account";

  return {
    id: source.id,
    title: merchant,
    merchant,
    merchantId: source.merchantId ?? null,
    category: categoryName,
    categoryId: source.categoryId ?? null,
    accountId: source.accountId,
    accountLabel,
    transactionDate: source.transactionDate,
    dateKey: source.transactionDate.slice(0, 10),
    dateLabel: formatTransactionDate(source.transactionDate),
    sectionTitle: formatSectionTitle(source.transactionDate),
    amount: source.amount,
    amountLabel: formatCurrency(source.amount, source.currencyCode),
    signedAmountLabel: `${isIncome ? "+" : "-"}${formatCurrency(source.amount, source.currencyCode)}`,
    type: isTransfer ? "Transfer" : isIncome ? "Income" : "Expense",
    typeValue: source.type as TransactionTypeValue,
    currencyCode: source.currencyCode,
    notes: source.notes ?? null,
    source: source.source ?? null,
    referenceType: source.referenceType ?? null,
    referenceId: source.referenceId ?? null,
    isPaylaterTransaction,
    categoryIconType: source.category?.iconType ?? null,
    categoryIconName: source.category?.icon ?? null,
    categoryIconImageUri: source.category?.iconImageUri ?? null,
    categoryEmoji: source.category?.emoji ?? null,
    categoryColor: source.category?.color ?? null,
    ...visual,
    amountColor: isIncome ? "income" : "default",
  };
}

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useTransactions() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!userId) {
      setTransactions([]);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setHasResolved(false);
      setLastLoadedAt(null);
      return;
    }

    const shouldRefreshInBackground = force && transactions.length > 0;
    setIsLoading((prev) => prev || transactions.length === 0);
    setIsRefreshing(shouldRefreshInBackground);
    setError(null);

    try {
      const rows = await transactionsService.fetch(userId);
      setTransactions(rows.map(mapTransactionRow));
      setHasResolved(true);
      setLastLoadedAt(Date.now());
    } catch (error) {
      setError(describeError(error, "Unable to load transactions."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, transactions.length]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      void refresh(true);
    });
    const offTransactions = onTransactionsChanged(() => {
      void refresh(true);
    });

    return () => {
      off();
      offTransactions();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      const shouldRefresh =
        !hasResolved ||
        lastLoadedAt === null ||
        Date.now() - lastLoadedAt > TRANSACTIONS_STALE_MS;

      if (shouldRefresh) {
        void refresh(lastLoadedAt !== null);
      }

      return undefined;
    }, [hasResolved, lastLoadedAt, refresh]),
  );

  const summary = useMemo(() => {
    return transactions.reduce(
      (totals, transaction) => {
        if (transaction.typeValue === "income") {
          totals.income += transaction.amount;
        } else if (transaction.typeValue === "expense") {
          totals.expenses += transaction.amount;
        }

        return totals;
      },
      { income: 0, expenses: 0 },
    );
  }, [transactions]);

  return {
    transactions,
    summary,
    isLoading,
    isRefreshing,
    hasResolved,
    error,
    refresh,
  } as const;
}

export function useTransaction(transactionId?: string | null) {
  const [transaction, setTransaction] = useState<TransactionListItem | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!transactionId) {
      setTransaction(null);
      setError(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const row: TransactionDetailRow =
        await transactionsService.fetchById(transactionId);
      const next = row ? mapTransactionRow(row) : null;
      setTransaction(next);
      return next;
    } catch (error) {
      setError(describeError(error, "Unable to load transaction."));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onAccountsChanged(() => {
      void refresh();
    });
    const offTransactions = onTransactionsChanged(() => {
      void refresh();
    });

    return () => {
      off();
      offTransactions();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh]),
  );

  return {
    transaction,
    isLoading,
    error,
    refresh,
  } as const;
}

export function groupTransactionsBySection(
  transactions: TransactionListItem[],
) {
  return Array.from(
    transactions.reduce((map, transaction) => {
      const existing = map.get(transaction.sectionTitle);

      if (existing) {
        existing.push(transaction);
      } else {
        map.set(transaction.sectionTitle, [transaction]);
      }

      return map;
    }, new Map<string, TransactionListItem[]>()),
  ).map(([title, items]) => ({ title, items }));
}

export function transactionDateMatches(
  transaction: TransactionListItem,
  selectedDate: Date | null,
) {
  if (!selectedDate) {
    return true;
  }

  const [year, month, day] = transaction.dateKey.split("-").map(Number);
  const transactionDate = new Date(year, month - 1, day);
  return isSameDay(transactionDate, selectedDate);
}

export function getSurfaceOverlay(isDark: boolean) {
  return isDark ? "rgba(2, 6, 23, 0.62)" : "rgba(15, 23, 42, 0.34)";
}

export function getMutedSurface(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7";
}

export function getFieldSurface(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.05)" : "#EEF2F7";
}

export function getFieldBorder(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.04)" : "#E2E8F0";
}

export function getTransactionTipCard(isDark: boolean) {
  return {
    backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#DCEEFE",
    borderColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#B7D7FB",
  };
}

export function getDestructiveTint(isDark: boolean) {
  return isDark ? "rgba(255, 95, 122, 0.16)" : "#FFE7EA";
}

export function getSheetSurface(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#111A27" : "#F4F8FC",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.05)",
  };
}

export function getHandleColor(isDark: boolean) {
  return isDark ? "#526173" : "#C9D3DF";
}

export function getBackdropButtonColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)";
}

export function getPlaceholderColor(isDark: boolean) {
  return isDark ? "#8F9CAF" : "#8A94A6";
}

export function getTitleColor(isDark: boolean) {
  return isDark ? "#F8FAFC" : "#111827";
}

export function getSubtitleColor(isDark: boolean) {
  return isDark ? "#9EA6B5" : "#5B78A2";
}

export function getDetailLabelColor(isDark: boolean) {
  return isDark ? "#AAB7C9" : "#5B78A2";
}

export function getTipTextColor(isDark: boolean) {
  return isDark ? "#D6E8FF" : "#4D5E78";
}
