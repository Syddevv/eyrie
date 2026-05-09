import { useCallback, useState } from "react";
import { transactionsService } from "@/src/db/services";
import { accountsService } from "@/src/db/services";
import { useCurrentUser } from "./useCurrentUser";
import { useAuthStore } from "@/store/useAuthStore";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import { useDashboardStore } from "./use-dashboard";
import { toTransactionIso } from "@/src/db/utils/time";

const CASH_FALLBACK_ID = "cash-fallback";

export type CreateExpenseInput = {
  amount: number;
  categoryId: string;
  accountId: string;
  merchantName?: string;
  notes?: string;
  transactionDate?: Date;
};

export type CreateExpenseResult = {
  success: boolean;
  error?: string;
};

export function useCreateExpense() {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const showSnackbar = useAuthStore((state) => state.showSnackbar);

  const create = useCallback(
    async (input: CreateExpenseInput): Promise<CreateExpenseResult> => {
      // Validation
      if (!user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      if (!input.amount || input.amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" };
      }

      if (!input.categoryId) {
        return { success: false, error: "Category is required" };
      }

      if (!input.accountId) {
        return { success: false, error: "Account is required" };
      }

      setIsLoading(true);

      try {
        let accountId = input.accountId;

        // If cash fallback is selected but no cash account exists, fail gracefully
        if (accountId === CASH_FALLBACK_ID) {
          const cashAccount = await accountsService.ensureDefaultCashAccount(
            user.id,
            user.currency_code,
          );

          accountId = cashAccount.id;
        }

        const transactionDate = input.transactionDate ?? new Date();
        const isoDate = toTransactionIso(transactionDate);

        // Create the transaction
        await transactionsService.create({
          userId: user.id,
          type: "expense",
          amount: input.amount,
          categoryId: input.categoryId,
          accountId,
          merchantName: input.merchantName,
          notes: input.notes,
          transactionDate: isoDate,
          currencyCode: user.currency_code ?? DEFAULT_CURRENCY_CODE,
        });

        await useDashboardStore.getState().loadDashboard(user.id, {
          force: true,
        });

        // Show success notification
        showSnackbar("Expense added successfully", "success");

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create expense";
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user, showSnackbar],
  );

  return { create, isLoading };
}
