import { useCallback, useState } from "react";
import { transactionsService } from "@/src/db/services";
import { accountsService } from "@/src/db/services";
import { useCurrentUser } from "./useCurrentUser";
import { useAuthStore } from "@/store/useAuthStore";
import { DEFAULT_CURRENCY_CODE } from "@/src/db/utils/constants";
import { useDashboardStore } from "./use-dashboard";

const CASH_FALLBACK_ID = "cash-fallback";

export type CreateIncomeInput = {
  amount: number;
  categoryId: string;
  accountId: string;
  source?: string;
  notes?: string;
  transactionDate?: Date;
};

export type CreateIncomeResult = {
  success: boolean;
  error?: string;
};

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useCreateIncome() {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const showSnackbar = useAuthStore((state) => state.showSnackbar);

  const create = useCallback(
    async (input: CreateIncomeInput): Promise<CreateIncomeResult> => {
      // Validation
      if (!user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      if (!input.amount || input.amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" };
      }

      if (!input.accountId) {
        return { success: false, error: "Account is required" };
      }

      if (!input.categoryId) {
        return { success: false, error: "Category is required" };
      }

      setIsLoading(true);

      try {
        let accountId = input.accountId;

        if (accountId === CASH_FALLBACK_ID) {
          const cashAccount = await accountsService.ensureDefaultCashAccount(
            user.id,
            user.currency_code,
          );

          accountId = cashAccount.id;
        }

        const transactionDate = input.transactionDate ?? new Date();
        const isoDate = formatDateISO(transactionDate);

        // Create the transaction
        await transactionsService.create({
          userId: user.id,
          type: "income",
          amount: input.amount,
          categoryId: input.categoryId,
          accountId,
          merchantName: input.source,
          notes: input.notes,
          transactionDate: isoDate,
          currencyCode: user.currency_code ?? DEFAULT_CURRENCY_CODE,
        });

        await useDashboardStore.getState().loadDashboard(user.id, {
          force: true,
        });

        // Show success notification
        showSnackbar("Income added successfully", "success");

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create income";
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user, showSnackbar],
  );

  return { create, isLoading };
}
