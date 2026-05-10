import { categoriesRepository } from "../repositories/categoriesRepository";
import type { NewCategory } from "../types";
import { emitCategoriesChanged } from "@/src/lib/dbSync";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import {
  assertCategoryIconType,
  assertCategoryType,
  assertRequiredText,
} from "../utils/validation";
import { SYSTEM_CATEGORY_USER_ID } from "../utils/constants";

export type CreateCategoryInput = Omit<NewCategory, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type ManagedCategory = Awaited<ReturnType<CategoriesRepositoryLike["findAllManagedByUser"]>>[number] & {
  usageCount: number;
  transactionCount: number;
  budgetCount: number;
};

type CategoriesRepositoryLike = typeof categoriesRepository;

type DeleteCategoryInput =
  | { mode: "delete" }
  | { mode: "archive" }
  | { mode: "reassign"; targetCategoryId: string };

export class CategoriesService {
  async create(input: CreateCategoryInput) {
    assertRequiredText(input.name, "category name");
    assertCategoryType(input.type);
    assertCategoryIconType(input.iconType);
    await this.ensureUniqueName(input.userId ?? SYSTEM_CATEGORY_USER_ID, input.name, input.type);

    const created = await categoriesRepository.create({
      ...input,
      id: input.id ?? createId("cat"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    emitCategoriesChanged();
    return created;
  }

  async update(id: string, input: Partial<NewCategory>) {
    if (input.type) {
      assertCategoryType(input.type);
    }

    if (input.iconType) {
      assertCategoryIconType(input.iconType);
    }

    if (input.name) {
      assertRequiredText(input.name, "category name");
    }

    const existing = await categoriesRepository.findById(id);
    if (!existing) {
      throw new Error("Category not found.");
    }

    const nextType = input.type ?? existing.type;
    const nextName = input.name ?? existing.name;
    if (nextType !== existing.type || nextName.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
      await this.ensureUniqueName(existing.userId ?? SYSTEM_CATEGORY_USER_ID, nextName, nextType, id);
    }

    const updated = await categoriesRepository.update(id, {
      ...input,
      updatedAt: nowIso(),
    });
    emitCategoriesChanged();
    return updated;
  }

  async delete(id: string) {
    await categoriesRepository.delete(id);
    emitCategoriesChanged();
  }

  async archive(id: string) {
    const category = await categoriesRepository.findById(id);

    if (!category) {
      throw new Error("Category not found.");
    }

    const archived = await categoriesRepository.update(id, {
      isArchived: true,
      updatedAt: nowIso(),
    });
    emitCategoriesChanged();
    return archived;
  }

  async restore(id: string) {
    const restored = await categoriesRepository.update(id, {
      isArchived: false,
      updatedAt: nowIso(),
    });
    emitCategoriesChanged();
    return restored;
  }

  async fetch(userId: string, type?: string, includeArchived = false) {
    return categoriesRepository.findAllByUser(userId, type, includeArchived);
  }

  async fetchManaged(userId: string, includeArchived = true): Promise<ManagedCategory[]> {
    const rows = await categoriesRepository.findAllManagedByUser(userId, includeArchived);
    const usageMap = await categoriesRepository.getUsageCountsByCategoryIds(rows.map((category) => category.id));

    return rows.map((category) => {
      const usage = usageMap.get(category.id) ?? { transactions: 0, budgets: 0 };

      return {
        ...category,
        usageCount: usage.transactions + usage.budgets,
        transactionCount: usage.transactions,
        budgetCount: usage.budgets,
      };
    });
  }

  async fetchById(id: string) {
    return categoriesRepository.findById(id);
  }

  async deleteManaged(id: string, input: DeleteCategoryInput) {
    const category = await categoriesRepository.findById(id);

    if (!category) {
      throw new Error("Category not found.");
    }

    if (input.mode === "reassign") {
      if (!input.targetCategoryId || input.targetCategoryId === id) {
        throw new Error("Choose a different category to reassign linked items.");
      }

      await categoriesRepository.reassignTransactions(id, input.targetCategoryId);
    }

    if (category.isSystem || input.mode === "archive" || input.mode === "reassign") {
      await this.archive(id);
      return;
    }

    await this.delete(id);
  }

  private async ensureUniqueName(
    userId: string,
    name: string,
    type: string,
    ignoreId?: string,
  ) {
    const existing = await categoriesRepository.findByUserAndName(userId, name.trim(), type);

    if (existing && existing.id !== ignoreId) {
      throw new Error("A category with this name already exists for the selected type.");
    }
  }
}

export const categoriesService = new CategoriesService();
