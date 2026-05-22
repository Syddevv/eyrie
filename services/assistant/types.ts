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
  budgets: Array<{
    title: string;
    progress: number;
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
    topGoals: Array<{
      title: string;
      progress: number;
      remaining: number;
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

export type AssistantResponse = {
  reply: string;
  remainingMessages?: number;
  dailyLimit?: number;
  cooldownRemaining?: number;
};
