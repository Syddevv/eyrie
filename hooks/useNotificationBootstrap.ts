import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { notificationsService } from "@/src/db/services";
import {
  configureNotificationChannels,
  ensureNotificationPreferences,
  generatePeriodicNotifications,
  initializeNotificationListeners,
  reconcileScheduledReminderNotifications,
  registerPushToken,
  subscribeToNotifications,
  syncNotificationBadge,
  syncNotificationsWithLocalStore,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";

export function useNotificationBootstrap() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  useEffect(() => {
    console.log("[notifications:bootstrap] Initializing native notification layer");
    configureNotificationChannels().catch(() => undefined);
    const cleanup = initializeNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!userId) {
      console.log("[notifications:bootstrap] No user, resetting badge state");
      setUnreadCount(0);
      void syncNotificationBadge(0);
      return;
    }

    console.log("[notifications:bootstrap] Starting user notification bootstrap", {
      userId,
    });

    ensureNotificationPreferences(userId)
      .then(() => registerPushToken(userId))
      .catch(() => undefined);

    generatePeriodicNotifications(userId).catch(() => undefined);

    Promise.all([
      notificationsService.fetchUnreadCount(userId),
      syncNotificationsWithLocalStore(userId).catch(() => undefined),
      reconcileScheduledReminderNotifications(userId).catch(() => undefined),
    ])
      .then(async ([count]) => {
        setUnreadCount(count);
        await syncNotificationBadge(count);
      })
      .catch(() => undefined);

    return subscribeToNotifications(userId, async () => {
      console.log("[notifications:bootstrap] Remote subscription event");
      await syncNotificationsWithLocalStore(userId).catch(() => undefined);
      const count = await notificationsService.fetchUnreadCount(userId).catch(
        () => 0,
      );
      setUnreadCount(count);
      await syncNotificationBadge(count);
    });
  }, [setUnreadCount, userId]);
}

