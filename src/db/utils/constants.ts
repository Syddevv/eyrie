export const ACCOUNT_TYPES = ["bank", "ewallet", "cash", "credit"] as const;
export const CATEGORY_TYPES = ["expense", "income"] as const;
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export const BUDGET_PERIODS = ["weekly", "biweekly", "monthly"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type CategoryType = (typeof CATEGORY_TYPES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const SYSTEM_CATEGORY_USER_ID = "__system__";
export const DEFAULT_CURRENCY_CODE = "PHP";
export const DATABASE_NAME = "eyrie.db";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "cat_default_expense_food_dining", name: "Food & Dining", icon: "restaurant-outline", color: "#F97316" },
  { id: "cat_default_expense_transportation", name: "Transportation", icon: "car-sport-outline", color: "#0EA5E9" },
  { id: "cat_default_expense_shopping", name: "Shopping", icon: "bag-handle-outline", color: "#EC4899" },
  { id: "cat_default_expense_bills_utilities", name: "Bills & Utilities", icon: "flash-outline", color: "#EAB308" },
  { id: "cat_default_expense_entertainment", name: "Entertainment", icon: "film-outline", color: "#8B5CF6" },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { id: "cat_default_income_salary", name: "Salary", icon: "wallet-outline", color: "#10B981" },
  { id: "cat_default_income_freelance", name: "Freelance", icon: "laptop-outline", color: "#3B82F6" },
  { id: "cat_default_income_business", name: "Business", icon: "briefcase-outline", color: "#14B8A6" },
] as const;

export const DEFAULT_CURRENCIES = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso", decimalPlaces: 2 },
  { code: "USD", symbol: "$", name: "US Dollar", decimalPlaces: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimalPlaces: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimalPlaces: 0 },
] as const;
