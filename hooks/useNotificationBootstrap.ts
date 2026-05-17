import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  configureNotificationChannels,
  ensureNotificationPreferences,
  fetchUnreadNotificationCount,
  generatePeriodicNotifications,
  initializeNotificationListeners,
  registerPushToken,
  subscribeToNotifications,
  syncNotificationBadge,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";

export function useNotificationBootstrap() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  useEffect(() => {
    configureNotificationChannels().catch(() => undefined);
    const cleanup = initializeNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      void syncNotificationBadge(0);
      return;
    }

    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    void ensureNotificationPreferences(userId)
      .then(async (preferences) => {
        if (!isActive) {
          return;
        }

        if (!preferences.notifications_enabled) {
          setUnreadCount(0);
          await syncNotificationBadge(0);
          return;
        }

        await registerPushToken(userId).catch(() => undefined);
        await generatePeriodicNotifications(userId).catch(() => undefined);

        const count = await fetchUnreadNotificationCount(userId).catch(() => 0);
        if (!isActive) {
          return;
        }

        setUnreadCount(count);
        await syncNotificationBadge(count);

        unsubscribe = subscribeToNotifications(userId, async () => {
          const nextCount = await fetchUnreadNotificationCount(userId).catch(
            () => 0,
          );
          setUnreadCount(nextCount);
          await syncNotificationBadge(nextCount);
        });
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [setUnreadCount, userId]);
}

