import { getMerchantPresetByName } from "@/constants/expense-merchants";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { create } from "zustand";

import {
  getBudgetProgress,
  getGoalsProgress,
  getRecentTransactions,
  getSpendingBreakdown,
  getTotalBalance,
  getTotalExpenses,
  getTotalIncome,
} from "@/src/db";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import {
  onAccountsChanged,
  onGoalsChanged,
  onTransactionsChanged,
} from "@/src/lib/dbSync";

type IconLibrary = "feather" | "material";

export type DashboardSummary = {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
};

export type DashboardRecentTransaction = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  amountLabel: string;
  dateLabel: string;
  typeLabel: "Expense" | "Income" | "Transfer";
  iconLibrary: IconLibrary;
  iconName: string;
  iconColor: string;
  iconBackground: string;
  isIncome: boolean;
};

export type DashboardBudgetProgress = {
  id: string;
  title: string;
  spentLabel: string;
  remainingLabel: string;
  progress: number;
  status: "over" | "limit" | "healthy";
  iconLibrary: IconLibrary;
  iconName: string;
  iconColor: string;
  iconBackground: string;
};

export type DashboardSpendingBreakdownItem = {
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
};

export type DashboardGoalProgress = Awaited<
  ReturnType<typeof getGoalsProgress>
>[number];

type DashboardState = {
  activeUserId: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastLoadedAt: number | null;
  summary: DashboardSummary | null;
  recentTransactions: DashboardRecentTransaction[];
  budgetProgress: DashboardBudgetProgress[];
  spendingBreakdown: DashboardSpendingBreakdownItem[];
  goalsProgress: DashboardGoalProgress[];
  loadDashboard: (
    userId: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  loadDasboard: (
    userId: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  clearDashboard: () => void;
};

const dashboardLoadRequests = new Map<string, Promise<void>>();
const pendingDashboardRefreshes = new Set<string>();
const DASHBOARD_STALE_MS = 30_000;

function describeDashboardError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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

export function formatCurrency(
  value: number,
  currencyCode = DEFAULT_CURRENCY_CODE,
) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

function formatBudgetLabel(value: number) {
  return formatCurrency(value);
}

function getCurrentMonthRange(reference = new Date()) {
  const start = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
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
  const prefix =
    normalized.startsWith("merchant_default_")
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

function resolveTransactionVisual(
  categoryName?: string | null,
  type?: string | null,
  merchantName?: string | null,
) {
  const normalizedCategory = categoryKey(categoryName);
  const merchantPreset = getMerchantPresetByName(merchantName);

  if (type === "income") {
    return {
      iconLibrary: "feather" as const,
      iconName: "arrow-down-left",
      iconColor: "#00A76F",
      iconBackground: withOpacity("#CDEFE4", 0.9),
    };
  }

  if (type === "transfer") {
    return {
      iconLibrary: "material" as const,
      iconName: "swap-horizontal",
      iconColor: "#5B6475",
      iconBackground: withOpacity("#E9EDF3", 0.92),
    };
  }

  if (merchantPreset?.icon || merchantPreset?.color) {
    return {
      iconLibrary: "material" as const,
      iconName: merchantPreset.icon ?? "storefront-outline",
      iconColor: merchantPreset.color ?? "#5B6475",
      iconBackground: withOpacity(merchantPreset.color ?? "#E9EDF3", 0.2),
    };
  }

  if (normalizedCategory.includes("food")) {
    return {
      iconLibrary: "material" as const,
      iconName: "silverware-fork-knife",
      iconColor: "#D97706",
      iconBackground: withOpacity("#FFEEBC", 0.92),
    };
  }

  if (normalizedCategory.includes("transport")) {
    return {
      iconLibrary: "material" as const,
      iconName: "car-outline",
      iconColor: "#2563EB",
      iconBackground: withOpacity("#DDEAFF", 0.92),
    };
  }

  if (normalizedCategory.includes("shopping")) {
    return {
      iconLibrary: "feather" as const,
      iconName: "shopping-bag",
      iconColor: "#DB2777",
      iconBackground: withOpacity("#FCE2F4", 0.92),
    };
  }

  if (
    normalizedCategory.includes("bill") ||
    normalizedCategory.includes("utility")
  ) {
    return {
      iconLibrary: "feather" as const,
      iconName: "zap",
      iconColor: "#D97706",
      iconBackground: withOpacity("#FFF0C7", 0.92),
    };
  }

  if (normalizedCategory.includes("entertain")) {
    return {
      iconLibrary: "material" as const,
      iconName: "filmstrip-box-multiple",
      iconColor: "#7C3AED",
      iconBackground: withOpacity("#ECE2FF", 0.92),
    };
  }

  if (normalizedCategory.includes("health")) {
    return {
      iconLibrary: "feather" as const,
      iconName: "heart",
      iconColor: "#DC2626",
      iconBackground: withOpacity("#FDE2E2", 0.92),
    };
  }

  return {
    iconLibrary: "material" as const,
    iconName: "cash-multiple",
    iconColor: "#5B6475",
    iconBackground: withOpacity("#E9EDF3", 0.92),
  };
}

function resolveBudgetVisual(
  categoryName?: string | null,
  categoryColor?: string | null,
) {
  const normalizedCategory = categoryKey(categoryName);
  const visual = resolveTransactionVisual(normalizedCategory, "expense");

  if (categoryColor) {
    return {
      ...visual,
      iconColor: categoryColor,
      iconBackground: withOpacity(categoryColor, 0.16),
    };
  }

  return visual;
}

function mapRecentTransaction(
  source: Awaited<ReturnType<typeof getRecentTransactions>>[number],
): DashboardRecentTransaction {
  const merchant =
    source.merchant?.name ||
    normalizeMerchantName(source.merchantName) ||
    source.category?.name ||
    source.account?.name ||
    "Transaction";
  const categoryName =
    source.category?.name ?? (source.type === "income" ? "Income" : "Expense");
  const visual = resolveTransactionVisual(
    source.category?.name ?? categoryName,
    source.type,
    merchant,
  );
  const isIncome = source.type === "income";

  return {
    id: source.id,
    merchant,
    category: categoryName,
    amount: source.amount,
    amountLabel: `${isIncome ? "+" : "-"}${formatCurrency(source.amount, source.currencyCode)}`,
    dateLabel: formatTransactionDate(source.transactionDate),
    typeLabel:
      source.type === "transfer"
        ? "Transfer"
        : source.type === "income"
          ? "Income"
          : "Expense",
    ...visual,
    isIncome,
  };
}

function mapBudgetProgress(
  source: Awaited<ReturnType<typeof getBudgetProgress>>[number],
): DashboardBudgetProgress {
  const visual = resolveBudgetVisual(
    source.category?.name,
    source.category?.color ?? null,
  );

  return {
    id: source.id,
    title: source.category?.name ?? "Budget",
    spentLabel: `Spent ${formatBudgetLabel(source.spent)} of ${formatBudgetLabel(source.amount)}`,
    remainingLabel: formatBudgetLabel(source.remaining),
    progress: source.progress / 100,
    status: source.status as DashboardBudgetProgress["status"],
    ...visual,
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeUserId: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastLoadedAt: null,
  summary: null,
  recentTransactions: [],
  budgetProgress: [],
  spendingBreakdown: [],
  goalsProgress: [],
  loadDashboard: async (userId, options = {}) => {
    const force = options.force ?? false;
    const existing = get();

    if (!userId) {
      set({
        activeUserId: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastLoadedAt: null,
        summary: null,
        recentTransactions: [],
        budgetProgress: [],
        spendingBreakdown: [],
        goalsProgress: [],
      });
      return;
    }

    const inFlight = dashboardLoadRequests.get(userId);

    if (
      !force &&
      existing.activeUserId === userId &&
      existing.lastLoadedAt &&
      !inFlight
    ) {
      return;
    }

    if (inFlight) {
      if (force) {
        pendingDashboardRefreshes.add(userId);
        return inFlight.finally(async () => {
          const refreshedRequest = dashboardLoadRequests.get(userId);

          // Wait for the queued follow-up refresh so callers do not proceed
          // with stale summary totals after a transaction write.
          if (refreshedRequest && refreshedRequest !== inFlight) {
            await refreshedRequest;
          }
        });
      }

      return inFlight;
    }

    const hasCachedData =
      existing.activeUserId === userId && existing.lastLoadedAt !== null;

    set({
      activeUserId: userId,
      error: null,
      isLoading: !hasCachedData,
      isRefreshing: hasCachedData,
    });

    const request = (async () => {
      const { startDate, endDate } = getCurrentMonthRange();
      const [
        summaryResult,
        recentTransactionsResult,
        budgetProgressResult,
        spendingBreakdownResult,
        goalsProgressResult,
      ] = await Promise.allSettled([
        Promise.all([
          getTotalBalance(userId),
          getTotalIncome(userId, startDate, endDate),
          getTotalExpenses(userId, startDate, endDate),
        ]),
        getRecentTransactions(userId, 5),
        getBudgetProgress(userId),
        getSpendingBreakdown(userId, startDate, endDate),
        getGoalsProgress(userId),
      ]);

      const nextState: Partial<DashboardState> = {
        activeUserId: userId,
        isLoading: false,
        isRefreshing: false,
        lastLoadedAt: Date.now(),
      };
      const errors: string[] = [];

      if (summaryResult.status === "fulfilled") {
        const [totalBalance, totalIncome, totalExpenses] = summaryResult.value;
        nextState.summary = {
          totalBalance,
          totalIncome,
          totalExpenses,
          netCashFlow: totalIncome - totalExpenses,
        };
      } else {
        errors.push(
          `summary: ${describeDashboardError(
            summaryResult.reason,
            "Unable to load summary totals.",
          )}`,
        );
      }

      if (recentTransactionsResult.status === "fulfilled") {
        nextState.recentTransactions = recentTransactionsResult.value.map(
          mapRecentTransaction,
        );
      } else {
        errors.push(
          `recent transactions: ${describeDashboardError(
            recentTransactionsResult.reason,
            "Unable to load recent transactions.",
          )}`,
        );
      }

      if (budgetProgressResult.status === "fulfilled") {
        const now = new Date().toISOString();
        nextState.budgetProgress = budgetProgressResult.value
          .filter((budget) => budget.startDate <= now && budget.endDate >= now)
          .map(mapBudgetProgress);
      } else {
        errors.push(
          `budgets: ${describeDashboardError(
            budgetProgressResult.reason,
            "Unable to load budget progress.",
          )}`,
        );
      }

      if (spendingBreakdownResult.status === "fulfilled") {
        nextState.spendingBreakdown = spendingBreakdownResult.value.map(
          (item) => ({
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            categoryColor: item.categoryColor,
            total: item.total,
          }),
        );
      } else {
        errors.push(
          `spending breakdown: ${describeDashboardError(
            spendingBreakdownResult.reason,
            "Unable to load spending breakdown.",
          )}`,
        );
      }

      if (goalsProgressResult.status === "fulfilled") {
        nextState.goalsProgress = goalsProgressResult.value;
      } else {
        errors.push(
          `goals: ${describeDashboardError(
            goalsProgressResult.reason,
            "Unable to load goals progress.",
          )}`,
        );
      }

      nextState.error = errors.length ? errors.join(" | ") : null;
      set(nextState);
    })()
      .catch((error: unknown) => {
        const message = describeDashboardError(
          error,
          "Unable to load dashboard data.",
        );
        set({
          isLoading: false,
          isRefreshing: false,
          error: message,
        });
      })
      .finally(() => {
        dashboardLoadRequests.delete(userId);

        if (pendingDashboardRefreshes.has(userId)) {
          pendingDashboardRefreshes.delete(userId);
          void get().loadDashboard(userId, { force: true });
        }
      });

    dashboardLoadRequests.set(userId, request);
    return request;
  },
  loadDasboard: async (userId, options = {}) => get().loadDashboard(userId, options),
  clearDashboard: () =>
    set({
      activeUserId: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastLoadedAt: null,
      summary: null,
      recentTransactions: [],
      budgetProgress: [],
      spendingBreakdown: [],
      goalsProgress: [],
    }),
}));

export function useDashboardBootstrap(userId?: string | null) {
  const loadDashboard = useDashboardStore((state) => state.loadDashboard);
  const clearDashboard = useDashboardStore((state) => state.clearDashboard);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const off = onAccountsChanged(() => {
      void loadDashboard(userId, { force: true });
    });
    const offGoals = onGoalsChanged(() => {
      void loadDashboard(userId, { force: true });
    });
    const offTransactions = onTransactionsChanged(() => {
      void loadDashboard(userId, { force: true });
    });

    return () => {
      off();
      offGoals();
      offTransactions();
    };
  }, [loadDashboard, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        clearDashboard();
        return undefined;
      }

      const snapshot = useDashboardStore.getState();
      const shouldRefresh =
        snapshot.activeUserId !== userId ||
        snapshot.lastLoadedAt === null ||
        Date.now() - snapshot.lastLoadedAt > DASHBOARD_STALE_MS;

      if (shouldRefresh) {
        void loadDashboard(userId, { force: snapshot.lastLoadedAt !== null });
      }

      return undefined;
    }, [clearDashboard, loadDashboard, userId]),
  );
}

export function useDashboardStatus() {
  return useDashboardStore((state) => state);
}

export function useDashboardLoading() {
  return useDashboardStore((state) => state.isLoading);
}

export function useDashboardRefreshing() {
  return useDashboardStore((state) => state.isRefreshing);
}

export function useDashboardError() {
  return useDashboardStore((state) => state.error);
}

export function useDashboardSummary() {
  return useDashboardStore((state) => state.summary);
}

export function useRecentTransactions() {
  return useDashboardStore((state) => state.recentTransactions);
}

export function useBudgetProgress() {
  return useDashboardStore((state) => state.budgetProgress);
}

export function useSpendingBreakdown() {
  return useDashboardStore((state) => state.spendingBreakdown);
}

export function useGoalsProgress() {
  return useDashboardStore((state) => state.goalsProgress);
}
