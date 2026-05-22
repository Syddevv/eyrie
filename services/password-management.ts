import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export type PasswordAuthProvider = "email" | "google";

export type PasswordFlowMode = "change-password" | "create-password";

export type PasswordProviderInfo = {
  mode: PasswordFlowMode;
  primaryProvider: PasswordAuthProvider;
};

const PASSWORD_ENABLED_STORAGE_PREFIX = "eyrie:password-enabled:";

function getPasswordEnabledStorageKey(userId: string) {
  return `${PASSWORD_ENABLED_STORAGE_PREFIX}${userId}`;
}

export async function markPasswordEnabledForUser(userId: string) {
  await AsyncStorage.setItem(getPasswordEnabledStorageKey(userId), "true");
}

export async function hasLocalPasswordEnabledMarker(userId: string) {
  return (await AsyncStorage.getItem(getPasswordEnabledStorageKey(userId))) === "true";
}

function getProviders(user: User | null) {
  const identityProviders =
    user?.identities
      ?.map((identity) => identity.provider)
      .filter((provider): provider is string => Boolean(provider)) ?? [];

  const metadataProvider =
    typeof user?.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;

  return new Set([metadataProvider, ...identityProviders].filter(Boolean));
}

export function getPasswordProviderInfo(user: User | null): PasswordProviderInfo {
  const providers = getProviders(user);
  const hasEmail = providers.has("email");
  const hasGoogle = providers.has("google");
  const hasPasswordMetadata =
    user?.user_metadata?.has_password === true ||
    user?.app_metadata?.has_password === true;

  if (hasGoogle && !hasEmail && !hasPasswordMetadata) {
    return {
      mode: "create-password",
      primaryProvider: "google",
    };
  }

  return {
    mode: "change-password",
    primaryProvider: "email",
  };
}

function isReauthenticationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("reauth") ||
    message.includes("re-auth") ||
    message.includes("recent") ||
    message.includes("jwt") ||
    message.includes("session")
  );
}

function getGoogleRedirectUri() {
  return makeRedirectUri({
    scheme: "eyrie",
  });
}

async function reauthenticateWithGoogle() {
  assertSupabaseConfigured("Password management");

  const redirectTo = getGoogleRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Google re-authentication could not start.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    throw new Error("Google re-authentication was canceled.");
  }

  const { queryParams } = Linking.parse(result.url);
  const oauthError = Array.isArray(queryParams?.error_description)
    ? queryParams.error_description[0]
    : queryParams?.error_description;

  if (oauthError) {
    throw new Error(String(oauthError));
  }

  const params = Linking.parse(result.url).queryParams ?? {};

  const accessToken = Array.isArray(params.access_token)
    ? params.access_token[0]
    : params.access_token;
  const refreshToken = Array.isArray(params.refresh_token)
    ? params.refresh_token[0]
    : params.refresh_token;

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      throw sessionError;
    }

    return;
  }

  const codeParam = params.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

  if (!code || typeof code !== "string") {
    throw new Error("Google re-authentication did not return a session.");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw exchangeError;
  }
}

export async function updatePasswordForEmailUser(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  assertSupabaseConfigured("Password management");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.currentPassword,
  });

  if (signInError) {
    throw new Error("The current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) {
    throw error;
  }
}

export async function createPasswordForGoogleUser(newPassword: string) {
  assertSupabaseConfigured("Password management");

  const update = async () => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        has_password: true,
      },
    });

    if (error) {
      throw error;
    }
  };

  try {
    await update();
  } catch (error) {
    if (!isReauthenticationError(error)) {
      throw error;
    }

    await reauthenticateWithGoogle();
    await update();
  }
}
