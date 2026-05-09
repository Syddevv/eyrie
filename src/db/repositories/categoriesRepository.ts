import { and, asc, eq, or } from "drizzle-orm";

import { db } from "../client";
import { categories } from "../schema";
import type { NewCategory } from "../types";
import { SYSTEM_CATEGORY_USER_ID } from "../utils/constants";

export class CategoriesRepository {
  async create(input: NewCategory) {
    await db.insert(categories).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewCategory>) {
    await db.update(categories).set(input).where(eq(categories.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async findAllByUser(userId: string, type?: string) {
    return db.query.categories.findMany({
      where: type
        ? and(
            or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
            eq(categories.type, type)
          )
        : or(eq(categories.userId, userId), eq(categories.userId, SYSTEM_CATEGORY_USER_ID)),
      orderBy: [asc(categories.type), asc(categories.name)],
    });
  }

  async findById(id: string) {
    return db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
  }
}

export const categoriesRepository = new CategoriesRepository();
