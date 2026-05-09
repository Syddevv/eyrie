import { categoriesRepository } from "../repositories/categoriesRepository";
import type { NewCategory } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { assertCategoryType, assertRequiredText } from "../utils/validation";

export type CreateCategoryInput = Omit<NewCategory, "id" | "createdAt"> & { id?: string };

export class CategoriesService {
  async create(input: CreateCategoryInput) {
    assertRequiredText(input.name, "category name");
    assertCategoryType(input.type);

    return categoriesRepository.create({
      ...input,
      id: input.id ?? createId("cat"),
      createdAt: nowIso(),
    });
  }

  async update(id: string, input: Partial<NewCategory>) {
    if (input.type) {
      assertCategoryType(input.type);
    }

    if (input.name) {
      assertRequiredText(input.name, "category name");
    }

    return categoriesRepository.update(id, input);
  }

  async delete(id: string) {
    await categoriesRepository.delete(id);
  }

  async fetch(userId: string, type?: string) {
    return categoriesRepository.findAllByUser(userId, type);
  }

  async fetchById(id: string) {
    return categoriesRepository.findById(id);
  }
}

export const categoriesService = new CategoriesService();
