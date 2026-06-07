import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import { paylaters } from "../schema";
import type { NewPaylater } from "../types";
import { nowIso } from "../utils/time";

export class PaylatersRepository {
  async create(input: NewPaylater) {
    await db.insert(paylaters).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewPaylater>) {
    await db
      .update(paylaters)
      .set({
        ...input,
        updatedAt: input.updatedAt ?? nowIso(),
      })
      .where(eq(paylaters.id, id));
    return this.findById(id);
  }

  async findAllByUser(userId: string) {
    return db.query.paylaters.findMany({
      where: and(eq(paylaters.userId, userId), isNull(paylaters.deletedAt)),
      orderBy: [desc(paylaters.updatedAt), desc(paylaters.createdAt)],
      with: {
        payments: true,
      },
    });
  }

  async findById(id: string) {
    return db.query.paylaters.findFirst({
      where: and(eq(paylaters.id, id), isNull(paylaters.deletedAt)),
      with: {
        payments: true,
      },
    });
  }

  async findAnyById(id: string) {
    return db.query.paylaters.findFirst({
      where: eq(paylaters.id, id),
      with: {
        payments: true,
      },
    });
  }
}

export const paylatersRepository = new PaylatersRepository();
