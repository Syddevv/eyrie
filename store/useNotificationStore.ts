import { create } from "zustand";

import type { AppNotification } from "@/services/notifications";

type NotificationCacheEntry = {
  notifications: AppNotification[];
  unreadCount: number;
  lastFetchedAt: number | null;
  hasHydrated: boolean;
  scrollOffset: number;
};

type NotificationState = {
  unreadCount: number;
  cacheByUserId: Record<string, NotificationCacheEntry>;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  getCacheForUser: (userId: string) => NotificationCacheEntry | null;
  setCacheForUser: (
    userId: string,
    payload: Partial<NotificationCacheEntry> & {
      notifications: AppNotification[];
      unreadCount: number;
    },
  ) => void;
  patchNotificationsForUser: (
    userId: string,
    updater: (current: AppNotification[]) => AppNotification[],
  ) => void;
  patchUnreadCountForUser: (userId: string, unreadCount: number) => void;
  setScrollOffsetForUser: (userId: string, scrollOffset: number) => void;
  clearCacheForUser: (userId: string) => void;
};

function createEmptyEntry(): NotificationCacheEntry {
  return {
    notifications: [],
    unreadCount: 0,
    lastFetchedAt: null,
    hasHydrated: false,
    scrollOffset: 0,
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  cacheByUserId: {},
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  getCacheForUser: (userId) => get().cacheByUserId[userId] ?? null,
  setCacheForUser: (userId, payload) =>
    set((state) => {
      const current = state.cacheByUserId[userId] ?? createEmptyEntry();
      const nextUnreadCount = Math.max(0, payload.unreadCount);

      return {
        unreadCount: nextUnreadCount,
        cacheByUserId: {
          ...state.cacheByUserId,
          [userId]: {
            ...current,
            ...payload,
            unreadCount: nextUnreadCount,
            hasHydrated: payload.hasHydrated ?? true,
          },
        },
      };
    }),
  patchNotificationsForUser: (userId, updater) =>
    set((state) => {
      const current = state.cacheByUserId[userId] ?? createEmptyEntry();
      const notifications = updater(current.notifications);
      const unreadCount = notifications.filter((item) => !item.is_read).length;

      return {
        unreadCount,
        cacheByUserId: {
          ...state.cacheByUserId,
          [userId]: {
            ...current,
            notifications,
            unreadCount,
            hasHydrated: true,
          },
        },
      };
    }),
  patchUnreadCountForUser: (userId, unreadCount) =>
    set((state) => {
      const current = state.cacheByUserId[userId] ?? createEmptyEntry();
      const nextUnreadCount = Math.max(0, unreadCount);

      return {
        unreadCount: nextUnreadCount,
        cacheByUserId: {
          ...state.cacheByUserId,
          [userId]: {
            ...current,
            unreadCount: nextUnreadCount,
            hasHydrated: true,
          },
        },
      };
    }),
  setScrollOffsetForUser: (userId, scrollOffset) =>
    set((state) => {
      const current = state.cacheByUserId[userId] ?? createEmptyEntry();

      return {
        cacheByUserId: {
          ...state.cacheByUserId,
          [userId]: {
            ...current,
            scrollOffset: Math.max(0, scrollOffset),
          },
        },
      };
    }),
  clearCacheForUser: (userId) =>
    set((state) => {
      const nextCache = { ...state.cacheByUserId };
      delete nextCache[userId];

      return {
        unreadCount: 0,
        cacheByUserId: nextCache,
      };
    }),
}));
