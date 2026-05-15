import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  cancelScheduledReminderNotification,
  generatePeriodicNotifications,
  subscribeToNotifications,
  syncNotificationBadge,
  syncNotificationsWithLocalStore,
  type AppNotification,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";
import { notificationsService } from "@/src/db/services";
import { onNotificationsChanged } from "@/src/lib/dbSync";

function normalizeNotificationsError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Notifications are temporarily unavailable.";
}

type RefreshOptions = {
  showLoading?: boolean;
};

export function useNotifications() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      await syncNotificationBadge(0);
      return;
    }

    console.log("[notifications:hook] Loading notifications from SQLite", {
      userId,
    });
    const [rows, count] = await Promise.all([
      notificationsService.fetchActive(userId),
      notificationsService.fetchUnreadCount(userId),
    ]);
    setNotifications(rows);
    setUnreadCount(count);
    await syncNotificationBadge(count);
  }, [setUnreadCount, userId]);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const showLoading = options.showLoading ?? true;

      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      try {
        await loadLocal();

        if (showLoading) {
          setIsLoading(false);
        }

        void (async () => {
          try {
            await generatePeriodicNotifications(userId).catch(() => undefined);
            await syncNotificationsWithLocalStore(userId).catch(
              () => undefined,
            );
            await loadLocal();
          } catch (backgroundError) {
            setError(normalizeNotificationsError(backgroundError));
          }
        })();
      } catch (refreshError) {
        setError(normalizeNotificationsError(refreshError));
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [loadLocal, setUnreadCount, userId],
  );

  const toggleRead = useCallback(
    async (notification: AppNotification, nextReadState: boolean) => {
      await notificationsService.markRead(notification.id, nextReadState);
      await loadLocal();
      if (userId) {
        void syncNotificationsWithLocalStore(userId).catch(() => undefined);
      }
    },
    [loadLocal, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      return;
    }

    await notificationsService.markAllRead(userId);
    await loadLocal();
    void syncNotificationsWithLocalStore(userId).catch(() => undefined);
  }, [loadLocal, userId]);

  const deleteNotification = useCallback(
    async (notification: AppNotification) => {
      await cancelScheduledReminderNotification(notification.local_schedule_id);
      await notificationsService.softDelete(notification.id);
      await loadLocal();
      if (userId) {
        void syncNotificationsWithLocalStore(userId).catch(() => undefined);
      }
    },
    [loadLocal, userId],
  );

  const clearNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }

    const currentNotifications = await notificationsService.fetchActive(userId);
    await Promise.all(
      currentNotifications.map((notification) =>
        cancelScheduledReminderNotification(notification.local_schedule_id),
      ),
    );
    await notificationsService.clearAll(userId);
    await loadLocal();
    void syncNotificationsWithLocalStore(userId).catch(() => undefined);
  }, [loadLocal, userId]);

  useEffect(() => {
    refresh({ showLoading: false }).catch(() => undefined);
  }, [refresh]);

  useEffect(
    () =>
      onNotificationsChanged(() => {
        void loadLocal().catch(() => undefined);
      }),
    [loadLocal],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    return subscribeToNotifications(userId, () => {
      console.log("[notifications:hook] Remote notification event observed");
      void syncNotificationsWithLocalStore(userId)
        .then(() => loadLocal())
        .catch(() => undefined);
    });
  }, [loadLocal, userId]);

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
    clearNotifications,
  } as const;
}
