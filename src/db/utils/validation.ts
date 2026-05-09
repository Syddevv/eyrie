import {
  ACCOUNT_TYPES,
  BUDGET_PERIODS,
  CATEGORY_TYPES,
  TRANSACTION_TYPES,
  type AccountType,
  type BudgetPeriod,
  type CategoryType,
  type TransactionType,
} from "./constants";

function assertEnumValue<T extends readonly string[]>(
  value: string,
  validValues: T,
  fieldName: string
): asserts value is T[number] {
  if (!validValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
}

export function assertAccountType(value: string): asserts value is AccountType {
  assertEnumValue(value, ACCOUNT_TYPES, "account type");
}

export function assertCategoryType(value: string): asserts value is CategoryType {
  assertEnumValue(value, CATEGORY_TYPES, "category type");
}

export function assertTransactionType(value: string): asserts value is TransactionType {
  assertEnumValue(value, TRANSACTION_TYPES, "transaction type");
}

export function assertBudgetPeriod(value: string): asserts value is BudgetPeriod {
  assertEnumValue(value, BUDGET_PERIODS, "budget period");
}

export function assertPositiveAmount(value: number, fieldName = "amount") {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

export function assertNonNegativeAmount(value: number, fieldName = "amount") {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be zero or greater.`);
  }
}

export function assertRequiredText(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
}

export function assertTransferAccounts(accountId: string, transferAccountId?: string | null) {
  if (!transferAccountId) {
    throw new Error("Transfer transactions require a destination account.");
  }

  if (accountId === transferAccountId) {
    throw new Error("Transfer source and destination accounts must be different.");
  }
}
