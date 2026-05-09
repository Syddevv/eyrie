import { accountsRepository } from "../repositories/accountsRepository";
import type { NewAccount } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { assertAccountType, assertNonNegativeAmount, assertRequiredText } from "../utils/validation";

export type CreateAccountInput = Omit<NewAccount, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export class AccountsService {
  async create(input: CreateAccountInput) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.name, "account name");
    assertAccountType(input.type);
    assertNonNegativeAmount(input.balance ?? 0, "balance");

    const timestamp = nowIso();

    return accountsRepository.create({
      ...input,
      balance: input.balance ?? 0,
      id: input.id ?? createId("acct"),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
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

    return accountsRepository.update(id, input);
  }

  async delete(id: string) {
    await accountsRepository.delete(id);
  }

  async fetch(userId: string) {
    return accountsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return accountsRepository.findById(id);
  }
}

export const accountsService = new AccountsService();
