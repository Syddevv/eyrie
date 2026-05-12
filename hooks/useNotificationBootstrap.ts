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

    ensureNotificationPreferences(userId)
      .then(() => registerPushToken(userId))
      .catch(() => undefined);

    generatePeriodicNotifications(userId).catch(() => undefined);

    fetchUnreadNotificationCount(userId)
      .then((count) => {
        setUnreadCount(count);
        return syncNotificationBadge(count);
      })
      .catch(() => undefined);

    return subscribeToNotifications(userId, async () => {
      const count = await fetchUnreadNotificationCount(userId).catch(() => 0);
      setUnreadCount(count);
      await syncNotificationBadge(count);
    });
  }, [setUnreadCount, userId]);
}

