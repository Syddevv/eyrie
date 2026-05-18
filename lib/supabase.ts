import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabasePublishableKey) {
  throw new Error(
    "Missing Supabase publishable key. Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
