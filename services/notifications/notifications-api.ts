import { supabase } from "@/lib/supabase";

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
    read_at: row.read_at ?? null,
    action_url: row.action_url ?? null,
    deleted_at: row.deleted_at ?? null,
  };
}

function mapPreferences(row: any): NotificationPreferences {
  return {
    ...row,
    security_alerts: row?.security_alerts ?? true,
  } as NotificationPreferences;
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

export async function fetchNotifications(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

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
