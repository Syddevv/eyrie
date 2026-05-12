import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
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
      return next;
    },
    [userId],
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { preferences, isLoading, refresh, updatePreference } as const;
}

