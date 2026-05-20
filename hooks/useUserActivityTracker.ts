import { AppState, type AppStateStatus } from "react-native";
import { useEffect } from "react";

import { useCurrentUser, publishCurrentUserUpdate } from "@/hooks/useCurrentUser";
import { usersService } from "@/src/db/services";

export function useUserActivityTracker() {
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    usersService
      .validateCurrentStreak(user.id)
      .then((updated) => {
        if (updated) {
          publishCurrentUserUpdate(updated);
        }
      })
      .catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    let currentStatus = AppState.currentState;

    const subscription = AppState.addEventListener(
      "change",
      (nextStatus: AppStateStatus) => {
        const wasBackgrounded =
          currentStatus === "background" || currentStatus === "inactive";
        currentStatus = nextStatus;

        if (!user?.id || !wasBackgrounded || nextStatus !== "active") {
          return;
        }

        usersService
          .validateCurrentStreak(user.id)
          .then((updated) => {
            if (updated) {
              publishCurrentUserUpdate(updated);
            }
          })
          .catch(() => undefined);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [user?.id]);
}
