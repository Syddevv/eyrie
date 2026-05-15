import { supabase } from "@/lib/supabase";
import { notificationsService } from "@/src/db/services";

import {
  defaultNotificationPreferences,
  toCreateNotificationInput,
} from "./notifications-metadata";
import type {
  AppNotification,
  CreateNotificationInput,
  NotificationCandidate,
  NotificationPreferences,
  NotificationRealtimeEvent,
} from "./types";

function mapNotification(row: any): AppNotification {
  return {
    ...row,
    data: row.data ?? null,
    updated_at: row.updated_at ?? row.created_at,
    read_at: row.read_at ?? null,
    scheduled_for: row.scheduled_for ?? null,
    delivered_at: row.delivered_at ?? null,
    delivery_state: row.delivery_state ?? "delivered",
    action_url: row.action_url ?? null,
    deleted_at: row.deleted_at ?? null,
    sync_status: "synced",
    last_synced_at: row.last_synced_at ?? null,
    sync_error: null,
    local_schedule_id: null,
  };
}

function mapPreferences(row: any): NotificationPreferences {
  return row as NotificationPreferences;
}

export async function ensureNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return mapPreferences(data);
  }

  const defaults = defaultNotificationPreferences(userId);
  const { data: inserted, error: insertError } = await supabase
    .from("notification_preferences")
    .upsert(defaults, { onConflict: "user_id" })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return mapPreferences(inserted);
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, "user_id" | "updated_at">>,
) {
  const payload = {
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPreferences(data);
}

export async function fetchNotifications(
  userId: string,
  limit = 100,
  options?: { includeDeleted?: boolean },
) {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapNotification);
}

export async function fetchUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationRead(id: string, isRead = true) {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: isRead,
      read_at: isRead ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapNotification(data);
}

export async function markAllNotificationsRead(userId: string) {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function softDeleteNotification(id: string) {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapNotification(data);
}

export async function upsertNotifications(
  userId: string,
  candidates: NotificationCandidate[],
) {
  if (!candidates.length) {
    return [] as AppNotification[];
  }

  const payload: CreateNotificationInput[] = candidates.map((candidate) =>
    toCreateNotificationInput(userId, candidate),
  );

  const { data, error } = await supabase
    .from("notifications")
    .upsert(payload, {
      onConflict: "user_id,dedupe_key",
      ignoreDuplicates: true,
    })
    .select("*");

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapNotification);
}

function toRemoteNotificationPayload(notification: AppNotification) {
  return {
    id: notification.id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    is_read: notification.is_read,
    created_at: notification.created_at,
    read_at: notification.read_at,
    action_url: notification.action_url,
    category: notification.category,
    priority: notification.priority,
    icon: notification.icon,
    color: notification.color,
    dedupe_key: notification.dedupe_key,
    deleted_at: notification.deleted_at,
  };
}

export async function syncNotificationsWithLocalStore(userId: string) {
  console.log("[notifications:sync] Starting notification sync", { userId });

  const pending = await notificationsService.fetchPendingSync(userId);
  const pendingIds = new Set(pending.map((notification) => notification.id));
  for (const notification of pending) {
    try {
      if (notification.deleted_at) {
        await softDeleteNotification(notification.id);
      } else if (notification.is_read) {
        await markNotificationRead(notification.id, true);
      } else {
        const { error } = await supabase
          .from("notifications")
          .upsert(toRemoteNotificationPayload(notification), {
            onConflict: "id",
          });

        if (error) {
          throw error;
        }
      }

      await notificationsService.markSyncResult(notification.id, {
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
        syncError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[notifications:sync] Failed to push notification change", {
        id: notification.id,
        message,
      });
      await notificationsService.markSyncResult(notification.id, {
        syncStatus: "failed",
        syncError: message,
      });
    }
  }

  try {
    const remoteRows = await fetchNotifications(userId, 200, {
      includeDeleted: true,
    });
    for (const row of remoteRows) {
      if (pendingIds.has(row.id)) {
        continue;
      }

      if (row.sync_status === "pending") {
        continue;
      }

      await notificationsService.upsertLocal(userId, {
        id: row.id,
        user_id: userId,
        type: row.type,
        title: row.title,
        message: row.message,
        data: row.data,
        action_url: row.action_url,
        category: row.category,
        priority: row.priority,
        icon: row.icon,
        color: row.color,
        dedupe_key: row.dedupe_key,
        is_read: row.is_read,
        read_at: row.read_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        scheduled_for: row.scheduled_for ?? null,
        delivered_at: row.delivered_at ?? null,
        delivery_state: row.delivery_state ?? "delivered",
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      }, {
        syncStatus: "synced",
        preserveCreatedAt: true,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[notifications:sync] Failed to pull remote notifications", {
      userId,
      message,
    });
  }
}

export function subscribeToNotifications(
  userId: string,
  onEvent: (event: NotificationRealtimeEvent) => void,
) {
  const channelId = `notifications:${userId}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onEvent({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          new: payload.new ? mapNotification(payload.new) : null,
          old: payload.old ? mapNotification(payload.old) : null,
        } as NotificationRealtimeEvent);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
