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

if (Platform.OS !== "web" && supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
