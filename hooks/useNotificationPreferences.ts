import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  ensureNotificationPreferences,
  fetchUnreadNotificationCount,
  syncNotificationBadge,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/useNotificationStore";

export function useNotificationPreferences() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPreferences(null);
      return null;
    }

    setIsLoading(true);
    try {
      const next = await ensureNotificationPreferences(userId);
      setPreferences(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreference = useCallback(
    async (
      updates: Partial<
        Omit<NotificationPreferences, "user_id" | "updated_at">
      >,
    ) => {
      if (!userId) {
        return null;
      }

      const next = await updateNotificationPreferences(userId, updates);
      setPreferences(next);

      if ("notifications_enabled" in updates) {
        if (!next.notifications_enabled) {
          setUnreadCount(0);
          await syncNotificationBadge(0);
        } else {
          const unreadCount = await fetchUnreadNotificationCount(userId).catch(
            () => 0,
          );
          setUnreadCount(unreadCount);
          await syncNotificationBadge(unreadCount);
        }
      }

      return next;
    },
    [setUnreadCount, userId],
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { preferences, isLoading, refresh, updatePreference } as const;
}

