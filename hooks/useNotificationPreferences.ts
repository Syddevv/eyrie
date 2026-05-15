import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  defaultNotificationPreferences,
  ensureNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notifications";

export function useNotificationPreferences() {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
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
      const next = await ensureNotificationPreferences(userId).catch(() =>
        defaultNotificationPreferences(userId),
      );
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

      const next = await updateNotificationPreferences(userId, updates).catch(
        () => ({
          ...(preferences ?? defaultNotificationPreferences(userId)),
          ...updates,
          user_id: userId,
          updated_at: new Date().toISOString(),
        }),
      );
      setPreferences(next);
      return next;
    },
    [preferences, userId],
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { preferences, isLoading, refresh, updatePreference } as const;
}

