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
  syncNotificationBadge,
  type AppNotification,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";

const NOTIFICATIONS_STALE_MS = 60_000;
const inflightRefreshes = new Map<string, Promise<void>>();

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

function hasFreshNotificationCache(lastFetchedAt: number | null) {
  return (
    typeof lastFetchedAt === "number" &&
    Date.now() - lastFetchedAt < NOTIFICATIONS_STALE_MS
  );
}

export function useNotifications(enabled = true) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const cache = useNotificationStore((state) =>
    userId ? (state.cacheByUserId[userId] ?? null) : null,
  );
  const getCacheForUser = useNotificationStore((state) => state.getCacheForUser);
  const setCacheForUser = useNotificationStore((state) => state.setCacheForUser);
  const patchNotificationsForUser = useNotificationStore(
    (state) => state.patchNotificationsForUser,
  );
  const patchUnreadCountForUser = useNotificationStore(
    (state) => state.patchUnreadCountForUser,
  );
  const clearCacheForUser = useNotificationStore((state) => state.clearCacheForUser);
  const notifications = cache?.notifications ?? [];
  const hasCachedData = notifications.length > 0;
  const hasHydrated = cache?.hasHydrated ?? false;

  const refresh = useCallback(
    async ({
      force = false,
      silent = false,
    }: {
      force?: boolean;
      silent?: boolean;
    } = {}) => {
      if (!userId || !enabled) {
        if (userId) {
          clearCacheForUser(userId);
        } else {
          setUnreadCount(0);
        }
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        await syncNotificationBadge(0);
        return;
      }

      const currentCache = getCacheForUser(userId);
      const shouldUseBlockingLoader =
        !silent &&
        !currentCache?.hasHydrated &&
        !currentCache?.notifications.length;
      const isFresh = hasFreshNotificationCache(currentCache?.lastFetchedAt ?? null);

      if (!force && !silent && currentCache?.hasHydrated && isFresh) {
        return;
      }

      const inflightKey = `${userId}:${enabled ? "on" : "off"}`;
      const existingRequest = inflightRefreshes.get(inflightKey);
      if (existingRequest) {
        return existingRequest;
      }

      if (shouldUseBlockingLoader) {
        setIsLoading(true);
      } else if (!silent) {
        setIsRefreshing(true);
      }

      if (!silent) {
        setError(null);
      }

      const request = (async () => {
        try {
          await generatePeriodicNotifications(userId).catch(() => undefined);
          const [rows, count] = await Promise.all([
            fetchNotifications(userId),
            fetchUnreadNotificationCount(userId),
          ]);

          setCacheForUser(userId, {
            notifications: rows,
            unreadCount: count,
            lastFetchedAt: Date.now(),
            hasHydrated: true,
          });
          await syncNotificationBadge(count);
          setError(null);
        } catch (refreshError) {
          if (!currentCache?.notifications.length) {
            setError(normalizeNotificationsError(refreshError));
          }
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          inflightRefreshes.delete(inflightKey);
        }
      })();

      inflightRefreshes.set(inflightKey, request);
      return request;
    },
    [
      clearCacheForUser,
      enabled,
      getCacheForUser,
      setCacheForUser,
      setUnreadCount,
      userId,
    ],
  );

  const toggleRead = useCallback(
    async (notification: AppNotification, nextReadState: boolean) => {
      if (!userId) {
        return;
      }

      const previous = getCacheForUser(userId)?.notifications ?? [];
      const updatedLocal = previous.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: nextReadState,
              read_at: nextReadState ? new Date().toISOString() : null,
            }
          : item,
      );

      const nextUnreadCount = updatedLocal.filter((item) => !item.is_read).length;
      setCacheForUser(userId, {
        notifications: updatedLocal,
        unreadCount: nextUnreadCount,
      });
      await syncNotificationBadge(nextUnreadCount);

      try {
        await markNotificationRead(notification.id, nextReadState);
      } catch (toggleError) {
        const restoredCount = previous.filter((item) => !item.is_read).length;
        setCacheForUser(userId, {
          notifications: previous,
          unreadCount: restoredCount,
        });
        await syncNotificationBadge(restoredCount);
        throw toggleError;
      }
    },
    [getCacheForUser, setCacheForUser, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      return;
    }

    const previous = getCacheForUser(userId)?.notifications ?? [];
    const updatedLocal = previous.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    }));

    setCacheForUser(userId, {
      notifications: updatedLocal,
      unreadCount: 0,
    });
    await syncNotificationBadge(0);

    try {
      await markAllNotificationsRead(userId);
    } catch (markError) {
      const restoredCount = previous.filter((item) => !item.is_read).length;
      setCacheForUser(userId, {
        notifications: previous,
        unreadCount: restoredCount,
      });
      await syncNotificationBadge(restoredCount);
      throw markError;
    }
  }, [getCacheForUser, setCacheForUser, userId]);

  const deleteNotification = useCallback(
    async (notification: AppNotification) => {
      if (!userId) {
        return;
      }

      const previous = getCacheForUser(userId)?.notifications ?? [];
      const updatedLocal = previous.filter((item) => item.id !== notification.id);
      const nextUnreadCount = updatedLocal.filter((item) => !item.is_read).length;

      setCacheForUser(userId, {
        notifications: updatedLocal,
        unreadCount: nextUnreadCount,
      });
      await syncNotificationBadge(nextUnreadCount);

      try {
        await softDeleteNotification(notification.id);
      } catch (deleteError) {
        const restoredCount = previous.filter((item) => !item.is_read).length;
        setCacheForUser(userId, {
          notifications: previous,
          unreadCount: restoredCount,
        });
        await syncNotificationBadge(restoredCount);
        throw deleteError;
      }
    },
    [getCacheForUser, setCacheForUser, userId],
  );

  useEffect(() => {
    if (!userId || !enabled) {
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    const currentCache = getCacheForUser(userId);
    const shouldHydrate = !currentCache?.hasHydrated;
    const isFresh = hasFreshNotificationCache(currentCache?.lastFetchedAt ?? null);

    void refresh({
      force: shouldHydrate || !isFresh,
      silent: !shouldHydrate && !!currentCache?.notifications.length,
    }).catch(() => undefined);
  }, [enabled, getCacheForUser, refresh, userId]);

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    return subscribeToNotifications(userId, (event) => {
      if (event.eventType === "DELETE" && event.old) {
        patchNotificationsForUser(userId, (current) =>
          current.filter((item) => item.id !== event.old.id),
        );
      } else if (event.new && !event.new.deleted_at) {
        patchNotificationsForUser(userId, (current) =>
          mergeNotifications(current, event.new!),
        );
      }

      void fetchUnreadNotificationCount(userId)
        .then((count) => {
          patchUnreadCountForUser(userId, count);
          return syncNotificationBadge(count);
        })
        .catch(() => undefined);
    });
  }, [enabled, patchNotificationsForUser, patchUnreadCountForUser, userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const cachedUnreadCount = getCacheForUser(userId)?.unreadCount ?? 0;
    setUnreadCount(cachedUnreadCount);
  }, [getCacheForUser, setUnreadCount, userId]);

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    isRefreshing,
    hasHydrated,
    hasCachedData,
    error,
    refresh,
    markAllAsRead,
    toggleRead,
    deleteNotification,
  } as const;
}
