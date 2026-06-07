import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import { paylaterPayments } from "../schema";
import type { NewPaylaterPayment } from "../types";
import { nowIso } from "../utils/time";

export class PaylaterPaymentsRepository {
  async create(input: NewPaylaterPayment) {
    await db.insert(paylaterPayments).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewPaylaterPayment>) {
    await db
      .update(paylaterPayments)
      .set({
        ...input,
        updatedAt: input.updatedAt ?? nowIso(),
      })
      .where(eq(paylaterPayments.id, id));
    return this.findById(id);
  }

  async findById(id: string) {
    return db.query.paylaterPayments.findFirst({
      where: and(eq(paylaterPayments.id, id), isNull(paylaterPayments.deletedAt)),
    });
  }

  async findAnyById(id: string) {
    return db.query.paylaterPayments.findFirst({
      where: eq(paylaterPayments.id, id),
    });
  }

  async findAllByPaylaterId(paylaterId: string) {
    return db.query.paylaterPayments.findMany({
      where: and(
        eq(paylaterPayments.paylaterId, paylaterId),
        isNull(paylaterPayments.deletedAt),
      ),
      orderBy: [desc(paylaterPayments.paymentDate), desc(paylaterPayments.createdAt)],
    });
  }

  async findAllByUser(userId: string) {
    return db.query.paylaterPayments.findMany({
      where: and(eq(paylaterPayments.userId, userId), isNull(paylaterPayments.deletedAt)),
      orderBy: [desc(paylaterPayments.paymentDate), desc(paylaterPayments.createdAt)],
    });
  }

  async findAllByPaylaterIdIncludingDeleted(paylaterId: string) {
    return db.query.paylaterPayments.findMany({
      where: eq(paylaterPayments.paylaterId, paylaterId),
      orderBy: [desc(paylaterPayments.paymentDate), desc(paylaterPayments.createdAt)],
    });
  }
}

export const paylaterPaymentsRepository = new PaylaterPaymentsRepository();
