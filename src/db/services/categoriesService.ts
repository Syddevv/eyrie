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
import {
  prepareCreateForSync,
  prepareDeleteForSync,
  prepareUpdateForSync,
} from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";

export type CreateCategoryInput = Omit<
  NewCategory,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
};

export type ManagedCategory = Awaited<
  ReturnType<CategoriesRepositoryLike["findAllManagedByUser"]>
>[number] & {
  usageCount: number;
  transactionCount: number;
  budgetCount: number;
};

type CategoriesRepositoryLike = typeof categoriesRepository;

type DeleteCategoryInput = { mode: "delete" } | { mode: "archive" };

export class CategoriesService {
  private assertCategoryEditable(category: {
    isDefault?: boolean | null;
    isSystem?: boolean | null;
  }) {
    if (category.isDefault || category.isSystem) {
      throw new Error("System categories cannot be modified.");
    }
  }

  async create(input: CreateCategoryInput) {
    assertRequiredText(input.name, "category name");
    assertCategoryType(input.type);
    assertCategoryIconType(input.iconType ?? "vector");
    await this.ensureUniqueName(
      input.userId ?? SYSTEM_CATEGORY_USER_ID,
      input.name,
      input.type,
    );

    const created = await categoriesRepository.create({
      ...prepareCreateForSync({
        ...input,
        id: input.id ?? createId("cat"),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    });

    if (
      created &&
      created.userId &&
      created.userId !== SYSTEM_CATEGORY_USER_ID
    ) {
      await enqueueSync("categories", created.id, "upsert", created.userId);
    }
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

    this.assertCategoryEditable(existing);

    const nextType = input.type ?? existing.type;
    const nextName = input.name ?? existing.name;
    if (
      nextType !== existing.type ||
      nextName.trim().toLowerCase() !== existing.name.trim().toLowerCase()
    ) {
      await this.ensureUniqueName(
        existing.userId ?? SYSTEM_CATEGORY_USER_ID,
        nextName,
        nextType,
        id,
      );
    }

    const updated = await categoriesRepository.update(
      id,
      prepareUpdateForSync({
        ...input,
        updatedAt: nowIso(),
      }),
    );
    if (
      updated &&
      updated.userId &&
      updated.userId !== SYSTEM_CATEGORY_USER_ID
    ) {
      await enqueueSync("categories", updated.id, "upsert", updated.userId);
    }
    emitCategoriesChanged();
    return updated;
  }

  async delete(id: string) {
    const category = await categoriesRepository.findById(id);
    if (!category) {
      return;
    }

    this.assertCategoryEditable(category);

    const deleted = await categoriesRepository.update(
      id,
      prepareDeleteForSync(),
    );
    if (
      deleted &&
      deleted.userId &&
      deleted.userId !== SYSTEM_CATEGORY_USER_ID
    ) {
      await enqueueSync("categories", deleted.id, "delete", deleted.userId);
    }
    emitCategoriesChanged();
  }

  async archive(id: string) {
    const category = await categoriesRepository.findById(id);

    if (!category) {
      throw new Error("Category not found.");
    }

    this.assertCategoryEditable(category);

    const archived = await categoriesRepository.update(
      id,
      prepareUpdateForSync({
        isArchived: true,
        updatedAt: nowIso(),
      }),
    );
    if (
      archived &&
      archived.userId &&
      archived.userId !== SYSTEM_CATEGORY_USER_ID
    ) {
      await enqueueSync("categories", archived.id, "upsert", archived.userId);
    }
    emitCategoriesChanged();
    return archived;
  }

  async restore(id: string) {
    const category = await categoriesRepository.findById(id);

    if (!category) {
      throw new Error("Category not found.");
    }

    this.assertCategoryEditable(category);

    const restored = await categoriesRepository.update(
      id,
      prepareUpdateForSync({
        isArchived: false,
        updatedAt: nowIso(),
      }),
    );
    if (
      restored &&
      restored.userId &&
      restored.userId !== SYSTEM_CATEGORY_USER_ID
    ) {
      await enqueueSync("categories", restored.id, "upsert", restored.userId);
    }
    emitCategoriesChanged();
    return restored;
  }

  async fetch(userId: string, type?: string, includeArchived = false) {
    return categoriesRepository.findAllByUser(userId, type, includeArchived);
  }

  async fetchManaged(
    userId: string,
    includeArchived = true,
  ): Promise<ManagedCategory[]> {
    const rows = await categoriesRepository.findAllManagedByUser(
      userId,
      includeArchived,
    );
    const usageMap = await categoriesRepository.getUsageCountsByCategoryIds(
      rows.map((category) => category.id),
    );

    return rows.map((category) => {
      const usage = usageMap.get(category.id) ?? {
        transactions: 0,
        budgets: 0,
      };

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

    if (category.isDefault || category.isSystem) {
      throw new Error("System categories cannot be modified.");
    }

    if (input.mode === "archive") {
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
    const existing = await categoriesRepository.findByUserAndName(
      userId,
      name.trim(),
      type,
    );

    if (existing && existing.id !== ignoreId) {
      throw new Error(
        "A category with this name already exists for the selected type.",
      );
    }
  }
}

export const categoriesService = new CategoriesService();
