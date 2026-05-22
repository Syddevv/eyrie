import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
export const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !supabaseUrl
    ? new Error(
        "Missing Supabase URL. Set EXPO_PUBLIC_SUPABASE_URL before launching the app.",
      )
    : !supabasePublishableKey
      ? new Error(
          "Missing Supabase publishable key. Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
        )
      : null;

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
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (Platform.OS !== "web" && supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
