import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function queueBadgeSync(count: number) {
  void syncNotificationBadge(count).catch(() => undefined);
}

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
  const existingIndex = current.findIndex((item) => item.id === incoming.id);

  if (existingIndex === -1) {
    if (incoming.deleted_at) {
      return current;
    }

    const incomingCreatedAt = new Date(incoming.created_at).getTime();
    const insertIndex = current.findIndex((item) => {
      const itemCreatedAt = new Date(item.created_at).getTime();
      return incomingCreatedAt > itemCreatedAt;
    });

    if (insertIndex === -1) {
      return [...current, incoming];
    }

    return [
      ...current.slice(0, insertIndex),
      incoming,
      ...current.slice(insertIndex),
    ];
  }

  if (incoming.deleted_at) {
    return current.filter((item) => item.id !== incoming.id);
  }

  const existing = current[existingIndex];
  if (
    existing.id === incoming.id &&
    existing.is_read === incoming.is_read &&
    existing.read_at === incoming.read_at &&
    existing.deleted_at === incoming.deleted_at &&
    existing.created_at === incoming.created_at
  ) {
    return current;
  }

  const next = [...current];
  next[existingIndex] = {
    ...next[existingIndex],
    ...incoming,
  };
  return next;
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
  const notificationMutationVersionRef = useRef<Record<string, number>>({});
  const markAllMutationVersionRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const cache = useNotificationStore((state) =>
    userId ? (state.cacheByUserId[userId] ?? null) : null,
  );
  const getCacheForUser = useNotificationStore(
    (state) => state.getCacheForUser,
  );
  const setCacheForUser = useNotificationStore(
    (state) => state.setCacheForUser,
  );
  const patchNotificationsForUser = useNotificationStore(
    (state) => state.patchNotificationsForUser,
  );
  const clearCacheForUser = useNotificationStore(
    (state) => state.clearCacheForUser,
  );
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
        queueBadgeSync(0);
        return;
      }

      const currentCache = getCacheForUser(userId);
      const shouldUseBlockingLoader =
        !silent &&
        !currentCache?.hasHydrated &&
        !currentCache?.notifications.length;
      const isFresh = hasFreshNotificationCache(
        currentCache?.lastFetchedAt ?? null,
      );

      if (!force && currentCache?.hasHydrated && isFresh) {
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
          queueBadgeSync(count);
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

      const nextUnreadCount = updatedLocal.filter(
        (item) => !item.is_read,
      ).length;
      const mutationVersion =
        (notificationMutationVersionRef.current[notification.id] ?? 0) + 1;
      notificationMutationVersionRef.current[notification.id] = mutationVersion;
      setCacheForUser(userId, {
        notifications: updatedLocal,
        unreadCount: nextUnreadCount,
      });
      queueBadgeSync(nextUnreadCount);

      return markNotificationRead(notification.id, nextReadState).catch(
        (toggleError) => {
          const current =
            useNotificationStore.getState().getCacheForUser(userId)
              ?.notifications ?? [];
          const currentItem = current.find(
            (item) => item.id === notification.id,
          );
          const shouldRollback =
            notificationMutationVersionRef.current[notification.id] ===
              mutationVersion && currentItem?.is_read === nextReadState;

          if (shouldRollback) {
            const restoredCount = previous.filter(
              (item) => !item.is_read,
            ).length;
            setCacheForUser(userId, {
              notifications: previous,
              unreadCount: restoredCount,
            });
            queueBadgeSync(restoredCount);
          }

          throw toggleError;
        },
      );
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
    const mutationVersion = markAllMutationVersionRef.current + 1;
    markAllMutationVersionRef.current = mutationVersion;

    setCacheForUser(userId, {
      notifications: updatedLocal,
      unreadCount: 0,
    });
    queueBadgeSync(0);

    return markAllNotificationsRead(userId).catch((markError) => {
      const current =
        useNotificationStore.getState().getCacheForUser(userId)
          ?.notifications ?? [];
      const shouldRollback =
        markAllMutationVersionRef.current === mutationVersion &&
        current.length === updatedLocal.length &&
        current.every(
          (item, index) =>
            item.id === updatedLocal[index]?.id &&
            item.is_read === updatedLocal[index]?.is_read,
        );

      if (shouldRollback) {
        const restoredCount = previous.filter((item) => !item.is_read).length;
        setCacheForUser(userId, {
          notifications: previous,
          unreadCount: restoredCount,
        });
        queueBadgeSync(restoredCount);
      }

      throw markError;
    });
  }, [getCacheForUser, setCacheForUser, userId]);

  const deleteNotification = useCallback(
    async (notification: AppNotification) => {
      if (!userId) {
        return;
      }

      const previous = getCacheForUser(userId)?.notifications ?? [];
      const updatedLocal = previous.filter(
        (item) => item.id !== notification.id,
      );
      const nextUnreadCount = updatedLocal.filter(
        (item) => !item.is_read,
      ).length;
      const mutationVersion =
        (notificationMutationVersionRef.current[notification.id] ?? 0) + 1;
      notificationMutationVersionRef.current[notification.id] = mutationVersion;

      setCacheForUser(userId, {
        notifications: updatedLocal,
        unreadCount: nextUnreadCount,
      });
      queueBadgeSync(nextUnreadCount);

      return softDeleteNotification(notification.id).catch((deleteError) => {
        const current =
          useNotificationStore.getState().getCacheForUser(userId)
            ?.notifications ?? [];
        const shouldRollback =
          notificationMutationVersionRef.current[notification.id] ===
            mutationVersion &&
          !current.some((item) => item.id === notification.id);

        if (shouldRollback) {
          const restoredCount = previous.filter((item) => !item.is_read).length;
          setCacheForUser(userId, {
            notifications: previous,
            unreadCount: restoredCount,
          });
          queueBadgeSync(restoredCount);
        }

        throw deleteError;
      });
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
    const isFresh = hasFreshNotificationCache(
      currentCache?.lastFetchedAt ?? null,
    );

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

      const nextUnreadCount =
        useNotificationStore.getState().getCacheForUser(userId)?.unreadCount ??
        0;
      queueBadgeSync(nextUnreadCount);
    });
  }, [enabled, patchNotificationsForUser, userId]);

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
