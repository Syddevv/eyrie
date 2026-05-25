import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";
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

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey!, {
      auth: {
        storage: globalThis.localStorage,
        storageKey: "eyrie-auth",
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

export async function clearLocalSupabaseSession() {
  if (!supabase) {
    return;
  }

  const authClient = supabase.auth as typeof supabase.auth & {
    storageKey?: string;
  };
  const storageKey = authClient.storageKey ?? "eyrie-auth";

  try {
    await supabase.auth.signOut({ scope: "local" });
    return;
  } catch {
    // Fall through to direct storage cleanup when the stored refresh token is stale.
  }

  globalThis.localStorage?.removeItem(storageKey);
  globalThis.localStorage?.removeItem(`${storageKey}-user`);
  globalThis.localStorage?.removeItem(`${storageKey}-code-verifier`);
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
