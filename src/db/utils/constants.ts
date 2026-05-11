export const ACCOUNT_TYPES = ["bank", "ewallet", "cash", "credit"] as const;
export const CATEGORY_TYPES = ["expense", "income"] as const;
export const CATEGORY_ICON_TYPES = ["vector", "emoji", "uploaded_image"] as const;
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export const BUDGET_PERIODS = ["weekly", "biweekly", "monthly"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type CategoryType = (typeof CATEGORY_TYPES)[number];
export type CategoryIconType = (typeof CATEGORY_ICON_TYPES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const SYSTEM_CATEGORY_USER_ID = "__system__";
export const DEFAULT_CURRENCY_CODE = "PHP";
export const DATABASE_NAME = "eyrie.db";

export const DEFAULT_EXPENSE_CATEGORIES = [
  {
    id: "cat_default_expense_food_dining",
    name: "Food & Dining",
    icon: "silverware-fork-knife",
    color: "#F97316",
  },
  {
    id: "cat_default_expense_transportation",
    name: "Transportation",
    icon: "car-sports",
    color: "#0EA5E9",
  },
  {
    id: "cat_default_expense_shopping",
    name: "Shopping",
    icon: "bag",
    color: "#EC4899",
  },
  {
    id: "cat_default_expense_bills_utilities",
    name: "Bills & Utilities",
    icon: "flash",
    color: "#EAB308",
  },
  {
    id: "cat_default_expense_entertainment",
    name: "Entertainment",
    icon: "film",
    color: "#8B5CF6",
  },
  {
    id: "cat_default_expense_health_medical",
    name: "Health & Medical",
    icon: "heart-pulse",
    color: "#EF4444",
  },
  {
    id: "cat_default_expense_education",
    name: "Education",
    icon: "school",
    color: "#2563EB",
  },
  {
    id: "cat_default_expense_travel",
    name: "Travel",
    icon: "airplane",
    color: "#14B8A6",
  },
  {
    id: "cat_default_expense_groceries",
    name: "Groceries",
    icon: "shopping-cart",
    color: "#10B981",
  },
  {
    id: "cat_default_expense_coffee",
    name: "Coffee",
    icon: "coffee",
    color: "#A16207",
  },
  {
    id: "cat_default_expense_subscriptions",
    name: "Subscriptions",
    icon: "bookmark",
    color: "#7C3AED",
  },
  {
    id: "cat_default_expense_insurance",
    name: "Insurance",
    icon: "shield-check",
    color: "#0F766E",
  },
  {
    id: "cat_default_expense_pets",
    name: "Pets",
    icon: "paw",
    color: "#F59E0B",
  },
  {
    id: "cat_default_expense_gifts_donations",
    name: "Gifts & Donations",
    icon: "gift",
    color: "#DB2777",
  },
  {
    id: "cat_default_expense_personal_care",
    name: "Personal Care",
    icon: "heart",
    color: "#FB7185",
  },
  {
    id: "cat_default_expense_electronics",
    name: "Electronics",
    icon: "laptop",
    color: "#2563EB",
  },
  {
    id: "cat_default_expense_home",
    name: "Home",
    icon: "home",
    color: "#16A34A",
  },
  {
    id: "cat_default_expense_investments",
    name: "Investments",
    icon: "chart-line",
    color: "#22C55E",
  },
  {
    id: "cat_default_expense_government_payments",
    name: "Government Payments",
    icon: "bank",
    color: "#1D4ED8",
  },
  {
    id: "cat_default_expense_taxes",
    name: "Taxes",
    icon: "receipt",
    color: "#7C2D12",
  },
  {
    id: "cat_default_expense_parking",
    name: "Parking",
    icon: "parking",
    color: "#64748B",
  },
  {
    id: "cat_default_expense_fuel",
    name: "Fuel",
    icon: "gas-station",
    color: "#DC2626",
  },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  {
    id: "cat_default_income_salary",
    name: "Salary",
    icon: "wallet-outline",
    color: "#10B981",
  },
  {
    id: "cat_default_income_freelance",
    name: "Freelance",
    icon: "laptop-outline",
    color: "#3B82F6",
  },
  {
    id: "cat_default_income_business",
    name: "Business",
    icon: "briefcase-outline",
    color: "#14B8A6",
  },
] as const;

export const DEFAULT_CURRENCIES = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso", decimalPlaces: 2 },
  { code: "USD", symbol: "$", name: "US Dollar", decimalPlaces: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimalPlaces: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", decimalPlaces: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimalPlaces: 0 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimalPlaces: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimalPlaces: 2 },
  { code: "KRW", symbol: "₩", name: "Korean Won", decimalPlaces: 0 },
] as const;
