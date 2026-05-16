import { and, eq, isNull } from "drizzle-orm";

import { accountsRepository } from "../repositories/accountsRepository";
import type { Account, NewAccount } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { DEFAULT_CURRENCY_CODE } from "../utils/constants";
import {
  assertAccountType,
  assertNonNegativeAmount,
  assertRequiredText,
} from "../utils/validation";
import { emitAccountsChanged } from "@/src/lib/dbSync";
import {
  prepareCreateForSync,
  prepareDeleteForSync,
  prepareUpdateForSync,
} from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { showSuccessToast } from "@/store/useToastStore";

const defaultCashAccountRequests = new Map<
  string,
  Promise<Account | undefined>
>();
const defaultCashAccountCreated = new Set<string>();
const CASH_BALANCE_EPSILON = 0.000001;

/**
 * Generate deterministic ID for default CASH account
 * Uses userId to ensure same user always gets same CASH account ID
 * This prevents duplicate CASH accounts with different IDs
 */
function getDefaultCashAccountId(userId: string): string {
  return `cash_default_${userId}`;
}

function hasMeaningfulBalance(account: Pick<Account, "balance">) {
  return Math.abs(Number(account.balance) || 0) > CASH_BALANCE_EPSILON;
}

function isDefaultCashAccount(account: Pick<Account, "id" | "userId">) {
  return account.id === getDefaultCashAccountId(account.userId);
}

function accountLabel(type: string) {
  if (type === "ewallet" || type === "cash") {
    return "Wallet";
  }

  return "Card";
}

function pickCanonicalCashAccount<
  T extends Pick<
    Account,
    "id" | "userId" | "balance" | "createdAt" | "updatedAt"
  >,
>(cashAccounts: T[], transactionCounts = new Map<string, number>()) {
  return [...cashAccounts].sort((left, right) => {
    const leftHasTransactions = (transactionCounts.get(left.id) ?? 0) > 0;
    const rightHasTransactions = (transactionCounts.get(right.id) ?? 0) > 0;
    if (leftHasTransactions !== rightHasTransactions) {
      return leftHasTransactions ? -1 : 1;
    }

    const leftHasBalance = hasMeaningfulBalance(left);
    const rightHasBalance = hasMeaningfulBalance(right);
    if (leftHasBalance !== rightHasBalance) {
      return leftHasBalance ? -1 : 1;
    }

    const leftIsDefault = isDefaultCashAccount(left);
    const rightIsDefault = isDefaultCashAccount(right);
    if (leftIsDefault !== rightIsDefault) {
      return leftIsDefault ? -1 : 1;
    }

    const updatedDelta =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  })[0];
}

export function dedupeCashAccountsForDisplay<T extends Account>(accounts: T[]) {
  const cashByUser = new Map<string, T[]>();

  for (const account of accounts) {
    if (account.type !== "cash") {
      continue;
    }

    const userCashAccounts = cashByUser.get(account.userId) ?? [];
    userCashAccounts.push(account);
    cashByUser.set(account.userId, userCashAccounts);
  }

  if (![...cashByUser.values()].some((items) => items.length > 1)) {
    return accounts;
  }

  const canonicalCashIds = new Set<string>();
  for (const userCashAccounts of cashByUser.values()) {
    const canonical = pickCanonicalCashAccount(userCashAccounts);
    if (canonical) {
      canonicalCashIds.add(canonical.id);
    }
  }

  return accounts.filter(
    (account) => account.type !== "cash" || canonicalCashIds.has(account.id),
  );
}

export type CreateAccountInput = Omit<
  NewAccount,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "isHidden"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
  isHidden?: boolean;
};

type AccountMutationOptions = {
  notifySuccess?: boolean;
};

export class AccountsService {
  async create(input: CreateAccountInput, options?: AccountMutationOptions) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.name, "account name");
    assertAccountType(input.type);
    assertNonNegativeAmount(input.balance ?? 0, "balance");

    const timestamp = nowIso();

    const created = await accountsRepository.create({
      ...prepareCreateForSync({
        ...input,
        balance: input.balance ?? 0,
        isHidden: input.isHidden ?? false,
        id: input.id ?? createId("acct"),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (created) {
      await enqueueSync("accounts", created.id, "upsert", created.userId);
    }
    emitAccountsChanged();
    if (
      (options?.notifySuccess ?? true) &&
      created &&
      created.type !== "cash"
    ) {
      showSuccessToast({
        title: `${accountLabel(created.type)} added`,
        message: `${created.name} is ready to use.`,
        dedupeKey: `account:create:${created.id}`,
        source: "accounts-service",
      });
    }
    return created;
  }

  async ensureDefaultCashAccount(userId: string, currencyCode?: string | null) {
    assertRequiredText(userId, "userId");
    console.log(`[accounts:cash] Ensure CASH for user: ${userId}`);

    const deterministicCashId = getDefaultCashAccountId(userId);
    console.log(`[accounts:cash] Deterministic ID: ${deterministicCashId}`);

    // Check session cache first
    if (defaultCashAccountCreated.has(userId)) {
      console.log(`[accounts:cash] Found in session cache, verifying DB`);
      const accounts = await accountsRepository.findAllByUser(userId);
      const existingCash = dedupeCashAccountsForDisplay(accounts).find(
        (a) => a.type === "cash",
      );
      if (existingCash) {
        console.log(`[accounts:cash] Verified in DB: ${existingCash.id}`);
        return existingCash;
      }
    }

    // Check in-flight requests
    const inFlight = defaultCashAccountRequests.get(userId);
    if (inFlight) {
      console.log(`[accounts:cash] Request in flight, waiting`);
      return inFlight;
    }

    const request = (async () => {
      try {
        // Try deterministic ID first
        console.log(
          `[accounts:cash] Checking deterministic ID: ${deterministicCashId}`,
        );
        let byId = await accountsRepository.findById(deterministicCashId);
        if (byId) {
          console.log(`[accounts:cash] ✓ Found by deterministic ID`);
          defaultCashAccountCreated.add(userId);
          return byId;
        }

        // Fallback: check for any CASH account
        console.log(
          `[accounts:cash] No deterministic ID, checking for any CASH`,
        );
        const accounts = await accountsRepository.findAllByUser(userId);
        const cashAccounts = accounts.filter(
          (account) => account.type === "cash",
        );
        const existingCashAccount = pickCanonicalCashAccount(cashAccounts);

        if (existingCashAccount) {
          console.log(
            `[accounts:cash] ✓ Found existing canonical: ${existingCashAccount.id} (${cashAccounts.length} CASH row${cashAccounts.length === 1 ? "" : "s"})`,
          );
          defaultCashAccountCreated.add(userId);
          return existingCashAccount;
        }

        // Create with deterministic ID
        console.log(`[accounts:cash] Creating new with deterministic ID`);
        const created = await this.create({
          userId,
          type: "cash",
          name: "Cash",
          balance: 0,
          currencyCode: currencyCode ?? DEFAULT_CURRENCY_CODE,
          isHidden: false,
          id: deterministicCashId,
        });

        console.log(`[accounts:cash] ✓ Created: ${created?.id}`);
        defaultCashAccountCreated.add(userId);
        return created;
      } catch (error) {
        console.error(`[accounts:cash] ✗ Error: ${error}`);
        return undefined;
      }
    })().finally(() => {
      defaultCashAccountRequests.delete(userId);
    });

    defaultCashAccountRequests.set(userId, request);
    return request;
  }

  async update(
    id: string,
    input: Partial<NewAccount>,
    options?: AccountMutationOptions,
  ) {
    if (input.type) {
      assertAccountType(input.type);
    }

    if (typeof input.balance === "number") {
      assertNonNegativeAmount(input.balance, "balance");
    }

    if (input.name) {
      assertRequiredText(input.name, "account name");
    }

    const updated = await accountsRepository.update(
      id,
      prepareUpdateForSync(input),
    );
    if (updated) {
      await enqueueSync("accounts", updated.id, "upsert", updated.userId);
    }
    emitAccountsChanged();
    if (
      (options?.notifySuccess ?? true) &&
      updated &&
      updated.type !== "cash"
    ) {
      showSuccessToast({
        title: `${accountLabel(updated.type)} updated`,
        message: "Your account changes were saved successfully.",
        dedupeKey: `account:update:${updated.id}:${updated.updatedAt}`,
        source: "accounts-service",
      });
    }
    return updated;
  }

  async delete(id: string, options?: AccountMutationOptions) {
    const existing = await accountsRepository.findById(id);
    if (!existing) {
      return;
    }

    await accountsRepository.update(id, prepareDeleteForSync());
    await enqueueSync("accounts", existing.id, "delete", existing.userId);
    if ((options?.notifySuccess ?? true) && existing.type !== "cash") {
      showSuccessToast({
        title: `${accountLabel(existing.type)} deleted`,
        message: `${existing.name} was removed successfully.`,
        dedupeKey: `account:delete:${existing.id}`,
        source: "accounts-service",
      });
    }
    emitAccountsChanged();
  }

  async fetch(userId: string) {
    const rows = await accountsRepository.findAllByUser(userId);
    const deduped = dedupeCashAccountsForDisplay(rows);

    if (deduped.length !== rows.length) {
      const cashRows = rows
        .filter((account) => account.type === "cash")
        .map(
          (account) => `${account.id}:${account.balance}:${account.updatedAt}`,
        );
      console.log("[accounts:cash] Display deduped duplicate CASH rows", {
        before: rows.length,
        after: deduped.length,
        cashRows,
      });
    }

    return deduped;
  }

  async fetchById(id: string) {
    return accountsRepository.findById(id);
  }

  /**
   * Remove duplicate CASH accounts, keeping deterministic or oldest one per user
   * Runs once during app boot to clean up historical duplicates
   */
  async cleanupDuplicateCashAccounts() {
    try {
      // Import db and accounts schema to query directly
      const { db } = await import("../client");
      const { accounts: accountsTable, transactions } =
        await import("../schema");

      // Get all CASH accounts that aren't deleted
      const allCashAccounts = await db
        .select()
        .from(accountsTable)
        .where(
          and(eq(accountsTable.type, "cash"), isNull(accountsTable.deletedAt)),
        );

      console.log(
        `[accounts:cleanup] Found ${allCashAccounts.length} total CASH accounts`,
      );

      if (allCashAccounts.length === 0) {
        return { removed: 0, errors: [] };
      }

      const transactionRefs = await db
        .select({
          accountId: transactions.accountId,
          transferAccountId: transactions.transferAccountId,
        })
        .from(transactions)
        .where(isNull(transactions.deletedAt));

      const transactionCounts = new Map<string, number>();
      for (const ref of transactionRefs) {
        transactionCounts.set(
          ref.accountId,
          (transactionCounts.get(ref.accountId) ?? 0) + 1,
        );

        if (ref.transferAccountId) {
          transactionCounts.set(
            ref.transferAccountId,
            (transactionCounts.get(ref.transferAccountId) ?? 0) + 1,
          );
        }
      }

      // Group by userId
      const cashByUser = new Map<string, typeof allCashAccounts>();
      for (const account of allCashAccounts) {
        if (!cashByUser.has(account.userId)) {
          cashByUser.set(account.userId, []);
        }
        cashByUser.get(account.userId)!.push(account);
      }

      let removedCount = 0;
      const errors: string[] = [];

      // For each user with multiple CASH accounts
      for (const [userId, userCashAccounts] of cashByUser.entries()) {
        if (userCashAccounts.length > 1) {
          console.log(
            `[accounts:cleanup] User ${userId} has ${userCashAccounts.length} CASH accounts`,
          );

          const keepAccount = pickCanonicalCashAccount(
            userCashAccounts,
            transactionCounts,
          );

          console.log("[accounts:cleanup] Keeping canonical CASH account", {
            userId,
            keepAccountId: keepAccount?.id,
            cashAccounts: userCashAccounts.map((account) => ({
              id: account.id,
              balance: account.balance,
              transactionCount: transactionCounts.get(account.id) ?? 0,
              isDeterministic: isDefaultCashAccount(account),
            })),
          });

          // Delete only empty duplicates. Accounts with balance or transaction
          // references are hidden from display but preserved for manual review.
          for (const account of userCashAccounts) {
            if (account.id !== keepAccount!.id) {
              const transactionCount = transactionCounts.get(account.id) ?? 0;
              if (hasMeaningfulBalance(account) || transactionCount > 0) {
                console.log(
                  "[accounts:cleanup] Preserving non-empty CASH duplicate",
                  {
                    id: account.id,
                    balance: account.balance,
                    transactionCount,
                  },
                );
                continue;
              }

              try {
                await this.delete(account.id);
                removedCount++;
                console.log(`[accounts:cleanup] Removed: ${account.id}`);
              } catch (error) {
                const msg =
                  error instanceof Error ? error.message : String(error);
                errors.push(`Failed to delete ${account.id}: ${msg}`);
                console.error(
                  `[accounts:cleanup] Error deleting ${account.id}:`,
                  error,
                );
              }
            }
          }
        }
      }

      if (removedCount > 0) {
        console.log(
          `[accounts:cleanup] Complete: removed ${removedCount} duplicate CASH accounts`,
        );
      }

      return { removed: removedCount, errors };
    } catch (error) {
      console.error("[accounts:cleanup] Error:", error);
      return { removed: 0, errors: [String(error)] };
    }
  }

  /**
   * Reset cache when user logs out
   * Prevents duplicate cash accounts on next login
   */
  resetDefaultCashCache() {
    defaultCashAccountRequests.clear();
    defaultCashAccountCreated.clear();
  }
}

export const accountsService = new AccountsService();
