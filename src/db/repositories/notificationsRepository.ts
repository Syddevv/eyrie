import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import { notifications } from "../schema";
import type { NewNotification } from "../types";

export class NotificationsRepository {
  async create(input: NewNotification) {
    await db.insert(notifications).values(input);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<NewNotification>) {
    await db.update(notifications).set(input).where(eq(notifications.id, id));
    return this.findById(id);
  }

  async findById(id: string) {
    return db.query.notifications.findFirst({
      where: eq(notifications.id, id),
    });
  }

  async findByDedupeKey(userId: string, dedupeKey: string) {
    return db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.dedupeKey, dedupeKey),
      ),
    });
  }

  async findAllActiveByUser(userId: string) {
    return db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        isNull(notifications.deletedAt),
      ),
      orderBy: [desc(notifications.updatedAt), desc(notifications.createdAt)],
    });
  }

  async findAllByUser(userId: string) {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.updatedAt), desc(notifications.createdAt)],
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
