import { and, eq, isNull, or, sql } from "drizzle-orm";

import type {
  AppNotification,
  CreateNotificationInput,
  NotificationData,
} from "@/services/notifications/types";
import { emitNotificationsChanged } from "@/src/lib/dbSync";

import { db } from "../client";
import { notifications } from "../schema";
import { notificationsRepository } from "../repositories/notificationsRepository";
import type { NewNotification } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function parseNotificationData(
  value: string | null | undefined,
): NotificationData | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as NotificationData;
  } catch {
    console.warn("[notifications:local] Failed to parse notification data");
    return null;
  }
}

function serializeNotificationData(data: NotificationData | null | undefined) {
  return data ? JSON.stringify(data) : null;
}

function mapNotification(
  row: Awaited<ReturnType<typeof notificationsRepository.findById>>,
): AppNotification | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.userId,
    type: row.type as AppNotification["type"],
    title: row.title,
    message: row.body,
    data: parseNotificationData(row.data),
    is_read: row.isRead,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    read_at: row.readAt ?? null,
    scheduled_for: row.scheduledFor ?? null,
    delivered_at: row.deliveredAt ?? null,
    delivery_state: (row.deliveryState as AppNotification["delivery_state"]) ?? "delivered",
    action_url: row.actionUrl ?? null,
    category: row.category as AppNotification["category"],
    priority: row.priority as AppNotification["priority"],
    icon: row.icon,
    color: row.color,
    dedupe_key: row.dedupeKey,
    deleted_at: row.deletedAt ?? null,
    sync_status: (row.syncStatus as AppNotification["sync_status"]) ?? "synced",
    last_synced_at: row.lastSyncedAt ?? null,
    sync_error: row.syncError ?? null,
    local_schedule_id: row.localScheduleId ?? null,
  } satisfies AppNotification;
}

function isAppNotification(
  value: AppNotification | null,
): value is AppNotification {
  return value !== null;
}

function notificationSortValue(notification: AppNotification) {
  if (notification.updated_at && !notification.updated_at.startsWith("1970-")) {
    return notification.updated_at;
  }

  return notification.created_at;
}

export class NotificationsService {
  async fetchActive(userId: string): Promise<AppNotification[]> {
    console.log("[notifications:local] Fetching active notifications", { userId });
    const rows = await notificationsRepository.findAllActiveByUser(userId);
    return rows
      .map((row) => mapNotification(row as never))
      .filter(isAppNotification)
      .sort((left, right) => {
        const leftStamp = notificationSortValue(left);
        const rightStamp = notificationSortValue(right);
        return new Date(rightStamp).getTime() - new Date(leftStamp).getTime();
      });
  }

  async fetchAll(userId: string): Promise<AppNotification[]> {
    const rows = await notificationsRepository.findAllByUser(userId);
    return rows
      .map((row) => mapNotification(row as never))
      .filter(isAppNotification)
      .sort((left, right) => {
        const leftStamp = notificationSortValue(left);
        const rightStamp = notificationSortValue(right);
        return new Date(rightStamp).getTime() - new Date(leftStamp).getTime();
      });
  }

  async fetchUnreadCount(userId: string) {
    const rows = await db
      .select({ value: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt),
        ),
      );

    return Number(rows[0]?.value ?? 0);
  }

  async upsertLocal(
    userId: string,
    input: CreateNotificationInput,
    options?: {
      syncStatus?: AppNotification["sync_status"];
      localScheduleId?: string | null;
      deliveredAt?: string | null;
      scheduledFor?: string | null;
      deliveryState?: AppNotification["delivery_state"];
      preserveCreatedAt?: boolean;
    },
  ): Promise<AppNotification | null> {
    const timestamp = nowIso();
    const existing = input.dedupe_key
      ? await notificationsRepository.findByDedupeKey(userId, input.dedupe_key)
      : input.id
        ? await notificationsRepository.findById(input.id)
        : null;
    const id = existing?.id ?? input.id ?? createId("notif");

    const values: NewNotification = {
      id,
      userId,
      type: input.type,
      title: input.title,
      body: input.message,
      data: serializeNotificationData(input.data),
      actionUrl: input.action_url ?? null,
      category: input.category,
      priority: input.priority,
      icon: input.icon,
      color: input.color,
      dedupeKey: input.dedupe_key,
      isRead: input.is_read ?? existing?.isRead ?? false,
      readAt: input.read_at ?? existing?.readAt ?? null,
      scheduledFor:
        options?.scheduledFor ?? input.scheduled_for ?? existing?.scheduledFor ?? null,
      deliveredAt:
        options?.deliveredAt ?? input.delivered_at ?? existing?.deliveredAt ?? null,
      deliveryState:
        options?.deliveryState ??
        input.delivery_state ??
        existing?.deliveryState ??
        "delivered",
      localScheduleId:
        options?.localScheduleId ?? input.local_schedule_id ?? existing?.localScheduleId ?? null,
      createdAt:
        options?.preserveCreatedAt === false
          ? timestamp
          : existing?.createdAt ?? input.created_at ?? timestamp,
      updatedAt: input.updated_at ?? timestamp,
      deletedAt: input.deleted_at ?? existing?.deletedAt ?? null,
      syncStatus: options?.syncStatus ?? input.sync_status ?? "pending",
      lastSyncedAt: input.last_synced_at ?? existing?.lastSyncedAt ?? null,
      syncError: input.sync_error ?? null,
    };

    await db.insert(notifications).values(values).onConflictDoUpdate({
      target: notifications.id,
      set: values,
    });

    emitNotificationsChanged();
    return mapNotification(await notificationsRepository.findById(id));
  }

  async markRead(id: string, isRead: boolean) {
    const existing = await notificationsRepository.findById(id);
    if (!existing) {
      throw new Error(`Notification ${id} not found.`);
    }

    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({
        isRead,
        readAt: isRead ? timestamp : null,
        updatedAt: timestamp,
        syncStatus: "pending",
        syncError: null,
      })
      .where(eq(notifications.id, id));

    emitNotificationsChanged();
  }

  async markAllRead(userId: string) {
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: timestamp,
        updatedAt: timestamp,
        syncStatus: "pending",
        syncError: null,
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt),
        ),
      );

    emitNotificationsChanged();
  }

  async softDelete(id: string) {
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: "pending",
        syncError: null,
      })
      .where(eq(notifications.id, id));

    emitNotificationsChanged();
  }

  async clearAll(userId: string) {
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: "pending",
        syncError: null,
      })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.deletedAt)),
      );

    emitNotificationsChanged();
  }

  async fetchPendingSync(userId: string): Promise<AppNotification[]> {
    const rows = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        or(
          eq(notifications.syncStatus, "pending"),
          eq(notifications.syncStatus, "failed"),
        ),
      ),
    });

    return rows
      .map((row) => mapNotification(row as never))
      .filter(isAppNotification);
  }

  async markSyncResult(
    id: string,
    input: {
      syncStatus: "pending" | "synced" | "failed";
      lastSyncedAt?: string | null;
      syncError?: string | null;
    },
  ) {
    await db
      .update(notifications)
      .set({
        syncStatus: input.syncStatus,
        lastSyncedAt: input.lastSyncedAt ?? null,
        syncError: input.syncError ?? null,
      })
      .where(eq(notifications.id, id));
  }

  async markDelivered(id: string, localScheduleId?: string | null) {
    const timestamp = nowIso();
    await db
      .update(notifications)
      .set({
        deliveredAt: timestamp,
        deliveryState: "delivered",
        localScheduleId: localScheduleId ?? null,
        updatedAt: timestamp,
        syncStatus: "pending",
      })
      .where(eq(notifications.id, id));

    emitNotificationsChanged();
  }
}

export const notificationsService = new NotificationsService();
