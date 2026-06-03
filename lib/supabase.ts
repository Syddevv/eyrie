import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import {
  createClient,
  processLock,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { ENV, assertEnvReady, getEnvErrorMessage } from "@/lib/env";

export const supabaseUrl = ENV.SUPABASE_URL || null;
export const supabasePublishableKey = ENV.SUPABASE_KEY || null;

export const supabaseConfigError =
  (() => {
    const message = getEnvErrorMessage("Supabase");
    return message ? new Error(message) : null;
  })();

if (!supabasePublishableKey) {
  console.error("[supabase] Missing publishable key configuration.");
}

if (!supabaseUrl) {
  console.error("[supabase] Missing URL configuration.");
}

export const isSupabaseConfigured = supabaseConfigError === null;

const AUTH_STORAGE_KEY = "eyrie-auth";

const nativeStorage: SupportedStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const webStorage: SupportedStorage = {
  getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key, value) => {
    globalThis.localStorage?.setItem(key, value);
  },
  removeItem: (key) => {
    globalThis.localStorage?.removeItem(key);
  },
};

const supabaseStorage =
  Platform.OS === "web" ? webStorage : nativeStorage;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey!, {
      auth: {
        storage: supabaseStorage,
        storageKey: AUTH_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

export function assertSupabaseConfigured(feature = "Supabase") {
  assertEnvReady(feature);
}

const INVALID_REFRESH_TOKEN_PATTERNS = [
  "invalid refresh token",
  "refresh token not found",
  "invalid_grant",
];

export function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return INVALID_REFRESH_TOKEN_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
}

function getLegacyStorageKey() {
  if (!supabaseUrl) {
    return null;
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

async function removeStoredAuthKey(key: string) {
  await AsyncStorage.removeItem(key).catch(() => undefined);

  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Ignore web/localStorage cleanup issues.
  }
}

export async function clearLocalSupabaseSession() {
  if (!supabase) {
    return;
  }

  const authClient = supabase.auth as typeof supabase.auth & {
    storageKey?: string;
  };
  const storageKey = authClient.storageKey ?? AUTH_STORAGE_KEY;
  const legacyStorageKey = getLegacyStorageKey();
  const storageKeys = [
    storageKey,
    `${storageKey}-user`,
    `${storageKey}-code-verifier`,
    ...(legacyStorageKey
      ? [
          legacyStorageKey,
          `${legacyStorageKey}-user`,
          `${legacyStorageKey}-code-verifier`,
        ]
      : []),
  ];

  supabase.auth.stopAutoRefresh();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Fall through to direct storage cleanup when the stored refresh token is stale.
  }

  await Promise.all(storageKeys.map((key) => removeStoredAuthKey(key)));
}

if (Platform.OS !== "web" && supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
