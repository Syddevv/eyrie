import Constants from "expo-constants";
import { router } from "expo-router";
import { Platform } from "react-native";

import { updateNotificationPreferences } from "./notifications-api";
import type { AppNotification } from "./types";

type NotificationsModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");

let cachedNotificationsModule: NotificationsModule | null | undefined;
let cachedDeviceModule: DeviceModule | null | undefined;
let isConfigured = false;
let responseSubscription: { remove: () => void } | null = null;
let receivedSubscription: { remove: () => void } | null = null;

function hasNotificationsNativeModules() {
  const proxy = (globalThis as any)?.expo?.modules?.NativeModulesProxy;
  if (!proxy) {
    return false;
  }

  return Boolean(
    proxy.ExpoPushTokenManager &&
      proxy.ExpoNotificationsEmitter &&
      proxy.ExpoNotificationsHandlerModule,
  );
}

function getNotificationsModule() {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }

  if (!hasNotificationsNativeModules()) {
    cachedNotificationsModule = null;
    return cachedNotificationsModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotificationsModule = require("expo-notifications") as NotificationsModule;
  } catch {
    cachedNotificationsModule = null;
  }

  return cachedNotificationsModule;
}

function getDeviceModule() {
  if (cachedDeviceModule !== undefined) {
    return cachedDeviceModule;
  }

  if (!(globalThis as any)?.expo?.modules?.NativeModulesProxy?.ExpoDevice) {
    cachedDeviceModule = null;
    return cachedDeviceModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedDeviceModule = require("expo-device") as DeviceModule;
  } catch {
    cachedDeviceModule = null;
  }

  return cachedDeviceModule;
}

function notificationUrlFromPayload(payload: {
  request?: { content?: { data?: { url?: unknown } } };
}) {
  const url = payload.request?.content?.data?.url;
  return typeof url === "string" ? url : null;
}

export async function configureNotificationChannels() {
  const Notifications = getNotificationsModule();
  if (!Notifications || Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150, 150, 150],
    lightColor: "#1495FF",
  });

  await Notifications.setNotificationChannelAsync("high-priority-alerts", {
    name: "High Priority Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 180, 220],
    lightColor: "#EF4444",
  });
}

export async function requestNotificationPermissions() {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { status: "undetermined" as const };
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") {
    return existing;
  }

  return Notifications.requestPermissionsAsync();
}

export async function registerPushToken(userId: string) {
  const Notifications = getNotificationsModule();
  const Device = getDeviceModule();

  if (!Notifications || !Device) {
    return null;
  }

  const permissions = await requestNotificationPermissions();

  if (permissions.status !== "granted") {
    await updateNotificationPreferences(userId, {
      push_enabled: false,
      push_token: null,
      push_token_platform: Platform.OS,
    });
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  await updateNotificationPreferences(userId, {
    push_enabled: true,
    push_token: token,
    push_token_platform: Platform.OS,
  });

  return token;
}

export function initializeNotificationListeners() {
  const Notifications = getNotificationsModule();
  if (!Notifications || isConfigured) {
    return () => undefined;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  isConfigured = true;

  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse?.notification) {
    const url = notificationUrlFromPayload(lastResponse.notification);
    if (url) {
      router.push(url as any);
    }
  }

  receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    // Foreground presentation is handled by the notification handler.
  });

  responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const url = notificationUrlFromPayload(response.notification);
      if (url) {
        router.push(url as any);
      }
    });

  return () => {
    receivedSubscription?.remove();
    responseSubscription?.remove();
    receivedSubscription = null;
    responseSubscription = null;
    isConfigured = false;
  };
}

export async function presentLocalNotification(notification: AppNotification) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.message,
      data: {
        ...(notification.data ?? {}),
        url: notification.action_url ?? notification.data?.url ?? "/notifications",
      },
      sound: notification.priority === "high" ? "default" : undefined,
    },
    trigger: null,
  });
}

export async function scheduleReminderNotification(input: {
  title: string;
  body: string;
  secondsFromNow: number;
  url?: string;
}) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: {
        url: input.url ?? "/notifications",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: input.secondsFromNow,
    },
  });
}

export async function syncNotificationBadge(count: number) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Ignore badge support gaps on unsupported platforms.
  }
}
