import { useCallback, useState } from "react";
import { accountsService, transactionsService } from "@/src/db/services";
import { useCurrentUser } from "./useCurrentUser";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import { useDashboardStore } from "./use-dashboard";
import { toTransactionIso } from "@/src/db/utils/time";
import { waitForHydrationReady } from "@/src/sync/store";

const CASH_FALLBACK_ID = "cash-fallback";

export type CreateExpenseInput = {
  amount: number;
  categoryId: string;
  accountId: string;
  merchantId?: string | null;
  merchantName?: string;
  merchantDefaultCategoryId?: string | null;
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
          await waitForHydrationReady();
          const cashAccount = await accountsService.ensureDefaultCashAccount(
            user.id,
            user.currency_code,
          );

          if (!cashAccount) {
            return { success: false, error: "Unable to create the default cash account." };
          }

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
          merchantId: input.merchantId ?? null,
          accountId,
          merchantName: input.merchantName,
          merchantDefaultCategoryId:
            input.merchantDefaultCategoryId ?? input.categoryId,
          notes: input.notes,
          transactionDate: isoDate,
          currencyCode: user.currency_code ?? DEFAULT_CURRENCY_CODE,
        });

        await useDashboardStore.getState().loadDashboard(user.id, {
          force: true,
        });

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create expense";
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  return { create, isLoading };
}
