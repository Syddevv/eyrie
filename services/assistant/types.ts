export type AssistantMessageRole = "user" | "assistant";
export type AssistantMessageStatus = "sent" | "loading" | "error";
export type AssistantMessageSource = "manual" | "suggestion" | "system";

export type AssistantChatMessage = {
  id: string;
  role: AssistantMessageRole;
  text: string;
  createdAt: string;
  status: AssistantMessageStatus;
  source?: AssistantMessageSource;
};

export type AssistantFinancialContext = {
  currencyCode: string;
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
  };
  currentPeriod: {
    label: string;
    budgetHealthScore: number;
    budgetHealthTone: string;
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    topCategory: string | null;
  };
  budgetsSummary: {
    activeBudgetCount: number;
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
  };
  budgetedCategories: string[];
  budgets: Array<{
    categoryName: string;
    title: string;
    amount: number;
    spent: number;
    remaining: number;
    progressPercent: number;
    status: "over" | "limit" | "healthy";
    spentLabel: string;
    remainingLabel: string;
  }>;
  categories: Array<{
    name: string;
    total: number;
  }>;
  recentTransactions: Array<{
    merchant: string;
    category: string;
    amountLabel: string;
    dateLabel: string;
    typeLabel: "Expense" | "Income" | "Transfer";
  }>;
  goals: {
    activeGoalsCount: number;
    completedGoalsCount: number;
    totalSaved: number;
    totalTarget: number;
    totalRemaining: number;
    items: Array<{
      title: string;
      currentAmount: number;
      targetAmount: number;
      remaining: number;
      progressPercent: number;
      isCompleted: boolean;
    }>;
  };
  insights: string[];
};

export type AssistantRequestInput = {
  messages: Array<{
    role: AssistantMessageRole;
    text: string;
  }>;
  financialContext: AssistantFinancialContext;
  requestMeta?: {
    screen?: string;
    source?: AssistantMessageSource;
    localTimestamp?: string;
  };
};

export type AssistantUsageDetails = {
  remainingMessages?: number;
  dailyLimit?: number;
  cooldownRemaining?: number;
  resetAt?: string | null;
  messageCount?: number;
  reservedCount?: number;
  lastReset?: string | null;
  lastRequestAt?: string | null;
};

export type AssistantResponse = {
  reply: string;
} & AssistantUsageDetails;

export type AssistantUsageStatus = AssistantUsageDetails;
