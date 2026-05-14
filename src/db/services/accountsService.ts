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
import { prepareCreateForSync, prepareDeleteForSync, prepareUpdateForSync } from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";

const defaultCashAccountRequests = new Map<string, Promise<Account | undefined>>();

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

export class AccountsService {
  async create(input: CreateAccountInput) {
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
    return created;
  }

  async ensureDefaultCashAccount(userId: string, currencyCode?: string | null) {
    assertRequiredText(userId, "userId");

    const inFlight = defaultCashAccountRequests.get(userId);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      const accounts = await accountsRepository.findAllByUser(userId);
      const existingCashAccount = accounts.find(
        (account) => account.type === "cash",
      );

      if (existingCashAccount) {
        return existingCashAccount;
      }

      return this.create({
        userId,
        type: "cash",
        name: "Cash",
        balance: 0,
        currencyCode: currencyCode ?? DEFAULT_CURRENCY_CODE,
        isHidden: false,
      });
    })().finally(() => {
      defaultCashAccountRequests.delete(userId);
    });

    defaultCashAccountRequests.set(userId, request);
    return request;
  }

  async update(id: string, input: Partial<NewAccount>) {
    if (input.type) {
      assertAccountType(input.type);
    }

    if (typeof input.balance === "number") {
      assertNonNegativeAmount(input.balance, "balance");
    }

    if (input.name) {
      assertRequiredText(input.name, "account name");
    }

    const updated = await accountsRepository.update(id, prepareUpdateForSync(input));
    if (updated) {
      await enqueueSync("accounts", updated.id, "upsert", updated.userId);
    }
    emitAccountsChanged();
    return updated;
  }

  async delete(id: string) {
    const existing = await accountsRepository.findById(id);
    if (!existing) {
      return;
    }

    const deleted = await accountsRepository.update(id, prepareDeleteForSync());
    if (deleted) {
      await enqueueSync("accounts", deleted.id, "delete", deleted.userId);
    }
    emitAccountsChanged();
  }

  async fetch(userId: string) {
    return accountsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return accountsRepository.findById(id);
  }
}

export const accountsService = new AccountsService();
