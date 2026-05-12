import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  generatePeriodicNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  softDeleteNotification,
  subscribeToNotifications,
  type AppNotification,
} from "@/services/notifications";
import { syncNotificationBadge } from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";

function normalizeNotificationsError(error: unknown) {
  const fallback = "Notifications are temporarily unavailable.";

  if (!error) {
    return fallback;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  const normalized = message.toLowerCase();

  if (
    normalized.includes("relation") ||
    normalized.includes("does not exist") ||
    normalized.includes("schema cache") ||
    normalized.includes("notification_preferences") ||
    normalized.includes("notifications")
  ) {
    return "Notification tables are not ready yet. Apply the Supabase notification migration to enable synced notifications.";
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("not allowed")
  ) {
    return "Your account does not currently have access to notifications. Check the Supabase RLS policies for the notifications tables.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("timed out")
  ) {
    return "Could not reach the notification service. Check your connection and try again.";
  }

  return message || fallback;
}

function mergeNotifications(
  current: AppNotification[],
  incoming: AppNotification,
) {
  const next = current.filter((item) => item.id !== incoming.id);
  if (!incoming.deleted_at) {
    next.unshift(incoming);
  }
  return next.sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export function useNotifications() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await generatePeriodicNotifications(userId).catch(() => undefined);
      const [rows, count] = await Promise.all([
        fetchNotifications(userId),
        fetchUnreadNotificationCount(userId),
      ]);
      setNotifications(rows);
      setUnreadCount(count);
      await syncNotificationBadge(count);
    } catch (refreshError) {
      setError(normalizeNotificationsError(refreshError));
    } finally {
      setIsLoading(false);
    }
  }, [setUnreadCount, userId]);

  const toggleRead = useCallback(
    async (notification: AppNotification, nextReadState: boolean) => {
      const previous = notifications;
      const updatedLocal = notifications.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: nextReadState,
              read_at: nextReadState ? new Date().toISOString() : null,
            }
          : item,
      );

      const nextUnreadCount = updatedLocal.filter((item) => !item.is_read).length;
      setNotifications(updatedLocal);
      setUnreadCount(nextUnreadCount);
      await syncNotificationBadge(nextUnreadCount);

      try {
        await markNotificationRead(notification.id, nextReadState);
      } catch (toggleError) {
        setNotifications(previous);
        const restoredCount = previous.filter((item) => !item.is_read).length;
        setUnreadCount(restoredCount);
        await syncNotificationBadge(restoredCount);
        throw toggleError;
      }
    },
    [notifications, setUnreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      return;
    }

    const previous = notifications;
    const updatedLocal = notifications.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    }));
    setNotifications(updatedLocal);
    setUnreadCount(0);
    await syncNotificationBadge(0);

    try {
      await markAllNotificationsRead(userId);
    } catch (markError) {
      setNotifications(previous);
      const restoredCount = previous.filter((item) => !item.is_read).length;
      setUnreadCount(restoredCount);
      await syncNotificationBadge(restoredCount);
      throw markError;
    }
  }, [notifications, setUnreadCount, userId]);

  const deleteNotification = useCallback(
    async (notification: AppNotification) => {
      const previous = notifications;
      const updatedLocal = notifications.filter((item) => item.id !== notification.id);
      const nextUnreadCount = updatedLocal.filter((item) => !item.is_read).length;
      setNotifications(updatedLocal);
      setUnreadCount(nextUnreadCount);
      await syncNotificationBadge(nextUnreadCount);

      try {
        await softDeleteNotification(notification.id);
      } catch (deleteError) {
        setNotifications(previous);
        const restoredCount = previous.filter((item) => !item.is_read).length;
        setUnreadCount(restoredCount);
        await syncNotificationBadge(restoredCount);
        throw deleteError;
      }
    },
    [notifications, setUnreadCount],
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    return subscribeToNotifications(userId, (event) => {
      if (event.eventType === "DELETE" && event.old) {
        setNotifications((current) =>
          current.filter((item) => item.id !== event.old.id),
        );
      } else if (event.new && !event.new.deleted_at) {
        setNotifications((current) => mergeNotifications(current, event.new!));
      }

      void fetchUnreadNotificationCount(userId)
        .then((count) => {
          setUnreadCount(count);
          return syncNotificationBadge(count);
        })
        .catch(() => undefined);
    });
  }, [setUnreadCount, userId]);

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    error,
    refresh,
    markAllAsRead,
    toggleRead,
    deleteNotification,
  } as const;
}
