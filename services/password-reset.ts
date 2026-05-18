import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Haptics from "expo-haptics";
import {
  createClient,
  type Session,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { NativeModules } from "react-native";

import {
  supabase,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase";
import { createSessionFromRedirectUrlForClient } from "@/services/auth";
import { useAuthStore, type PasswordResetFlowState } from "@/store/useAuthStore";

const PASSWORD_RESET_STORAGE_KEY = "eyrie:password-reset-flow:v1";
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60_000;
const MAX_VERIFY_ATTEMPTS = 5;

const resetClientStorage: SupportedStorage = {
  isServer: false,
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const passwordResetClient = createClient(supabaseUrl, supabasePublishableKey!, {
  auth: {
    storage: resetClientStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModule = {
  fetch: () => Promise<NetInfoState>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getPasswordResetResendAvailableAt() {
  return Date.now() + PASSWORD_RESET_RESEND_COOLDOWN_MS;
}

function getPasswordResetRedirectUri() {
  return makeRedirectUri({
    scheme: "eyrie",
    path: "sign-in",
  });
}

function getPasswordResetRedirectTypeFromUrl(url: string) {
  const { params } = QueryParams.getQueryParams(url);
  const type = Array.isArray(params.type) ? params.type[0] : params.type;

  return typeof type === "string" ? type : null;
}

function getPersistableState(
  state: PasswordResetFlowState,
): PasswordResetFlowState | null {
  if (state.phase === "idle" || !state.email) {
    return null;
  }

  return {
    phase: state.phase,
    email: state.email,
    resendAvailableAt: state.resendAvailableAt,
    attempts: state.attempts,
    status: "idle",
  };
}

async function persistPasswordResetFlow(state: PasswordResetFlowState) {
  const persistable = getPersistableState(state);

  if (!persistable) {
    await AsyncStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    PASSWORD_RESET_STORAGE_KEY,
    JSON.stringify(persistable),
  );
}

async function getNetInfoModule(): Promise<NetInfoModule | null> {
  const nativeModule = (NativeModules as { RNCNetInfo?: unknown }).RNCNetInfo;

  if (!nativeModule) {
    return null;
  }

  try {
    const module = await import("@react-native-community/netinfo");
    return module.default as NetInfoModule;
  } catch {
    return null;
  }
}

async function ensureOnline() {
  const netInfo = await getNetInfoModule();

  if (!netInfo) {
    return;
  }

  const state = await netInfo.fetch();
  const isOnline =
    Boolean(state.isConnected) && state.isInternetReachable !== false;

  if (!isOnline) {
    throw new Error("offline");
  }
}

async function ensurePasswordResetEmailExists(email: string) {
  const { data, error } = await supabase.rpc("password_reset_email_exists", {
    target_email: email,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("no_account_linked");
  }
}

async function clearPasswordResetSession() {
  try {
    await passwordResetClient.auth.signOut();
  } catch {
    // Ignore reset-client cleanup failures.
  }
}

async function hasActivePasswordResetSession() {
  const { data } = await passwordResetClient.auth.getSession();
  return Boolean(data.session?.access_token);
}

function getPasswordResetRequestErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to send a reset code right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("no_account_linked")) {
    return "No account is linked to that Gmail address.";
  }

  if (
    lower.includes("offline") ||
    lower.includes("network") ||
    lower.includes("fetch")
  ) {
    return "You're offline. Reconnect to the internet and try again.";
  }

  if (lower.includes("rate limit") || lower.includes("security purposes")) {
    return "Too many reset requests. Please wait before trying again.";
  }

  if (lower.includes("email") && lower.includes("invalid")) {
    return "Enter a valid Gmail address.";
  }

  return error.message;
}

function getPasswordResetVerifyErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to verify that code right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (
    lower.includes("offline") ||
    lower.includes("network") ||
    lower.includes("fetch")
  ) {
    return "You're offline. Reconnect to the internet and try again.";
  }

  if (lower.includes("expired")) {
    return "That reset code has expired. Request a new code and try again.";
  }

  if (lower.includes("rate limit")) {
    return "Too many verification attempts. Please wait before trying again.";
  }

  if (
    lower.includes("token") ||
    lower.includes("otp") ||
    lower.includes("invalid")
  ) {
    return "That reset code is invalid. Check the 6 digits and try again.";
  }

  return error.message;
}

function getPasswordUpdateErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to update your password right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (
    lower.includes("offline") ||
    lower.includes("network") ||
    lower.includes("fetch")
  ) {
    return "You're offline. Reconnect to the internet and try again.";
  }

  if (lower.includes("reset_session_expired")) {
    return "Your verification session expired. Verify the reset code again.";
  }

  if (lower.includes("password")) {
    return error.message;
  }

  if (lower.includes("session") || lower.includes("auth")) {
    return "Your reset session has expired. Start the password reset flow again.";
  }

  return error.message;
}

async function showErrorFeedback(message: string) {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  useAuthStore.getState().showSnackbar(message, "error");
}

export async function hydratePasswordResetFlow() {
  const raw = await AsyncStorage.getItem(PASSWORD_RESET_STORAGE_KEY);

  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as PasswordResetFlowState;
    const store = useAuthStore.getState();

    if (parsed.phase === "password") {
      store.setPasswordResetFlow({
        ...parsed,
        phase: "code",
        status: "error",
      });
      await persistPasswordResetFlow(store.passwordResetFlow);
      store.showSnackbar(
        "Please verify the reset code again to continue after reopening the app.",
        "info",
      );
      return;
    }

    store.setPasswordResetFlow({
      ...parsed,
      status: "idle",
    });
  } catch {
    await AsyncStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
  }
}

export async function clearPasswordResetFlow() {
  useAuthStore.getState().closePasswordResetFlow();
  await AsyncStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
  await clearPasswordResetSession();
}

export async function openForgotPasswordFlow(email = "") {
  useAuthStore.getState().openPasswordResetEmailModal(email);
  await persistPasswordResetFlow(useAuthStore.getState().passwordResetFlow);
}

export async function beginPasswordResetFromRecoverySession(
  session: Session | null,
  emailOverride?: string | null,
) {
  const email = normalizeEmail(
    emailOverride ??
      session?.user?.email ??
      useAuthStore.getState().passwordResetFlow.email,
  );
  const store = useAuthStore.getState();

  if (!email) {
    return;
  }

  if (!session?.access_token) {
    throw new Error("reset_session_expired");
  }

  store.openPasswordResetPasswordModal({ email });
  await persistPasswordResetFlow(useAuthStore.getState().passwordResetFlow);
}

export async function beginPasswordResetFromRecoveryUrl(url: string) {
  const redirectType = getPasswordResetRedirectTypeFromUrl(url);

  if (redirectType !== "recovery") {
    return null;
  }

  const session = await createSessionFromRedirectUrlForClient(
    passwordResetClient,
    url,
  );

  if (!session) {
    throw new Error("reset_session_expired");
  }

  await beginPasswordResetFromRecoverySession(session);
  return session;
}

export async function requestPasswordResetCode(email: string) {
  const store = useAuthStore.getState();
  const normalizedEmail = normalizeEmail(email);
  store.setSendingPasswordReset(true);
  store.setPasswordResetStatus("idle");

  try {
    await ensureOnline();
    await ensurePasswordResetEmailExists(normalizedEmail);

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: getPasswordResetRedirectUri(),
      },
    );

    if (error) {
      throw error;
    }

    store.openPasswordResetCodeModal({
      email: normalizedEmail,
      resendAvailableAt: getPasswordResetResendAvailableAt(),
      attempts: 0,
    });
    await persistPasswordResetFlow(useAuthStore.getState().passwordResetFlow);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Reset code sent. Check your Gmail inbox.", "success");
  } catch (error) {
    await showErrorFeedback(getPasswordResetRequestErrorMessage(error));
    throw error;
  } finally {
    useAuthStore.getState().setSendingPasswordReset(false);
  }
}

export async function resendPasswordResetCode() {
  const store = useAuthStore.getState();
  const email = store.passwordResetFlow.email;

  if (!email) {
    throw new Error("Missing email address for password reset.");
  }

  store.setSendingPasswordReset(true);
  store.setPasswordResetStatus("idle");

  try {
    await ensureOnline();
    await ensurePasswordResetEmailExists(email);
    await clearPasswordResetSession();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUri(),
    });

    if (error) {
      throw error;
    }

    const resendAvailableAt = getPasswordResetResendAvailableAt();
    store.openPasswordResetCodeModal({
      email,
      resendAvailableAt,
      attempts: 0,
    });
    await persistPasswordResetFlow(useAuthStore.getState().passwordResetFlow);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.showSnackbar("A new reset code has been sent.", "success");
  } catch (error) {
    store.setPasswordResetStatus("error");
    await showErrorFeedback(getPasswordResetRequestErrorMessage(error));
    throw error;
  } finally {
    useAuthStore.getState().setSendingPasswordReset(false);
  }
}

export async function verifyPasswordResetCode(token: string) {
  const store = useAuthStore.getState();
  const { email, attempts } = store.passwordResetFlow;

  if (!email) {
    throw new Error("Missing email address for password reset.");
  }

  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    const message =
      "Too many invalid attempts. Request a new code to continue.";
    store.setPasswordResetStatus("error");
    await showErrorFeedback(message);
    throw new Error(message);
  }

  store.setVerifyingPasswordResetCode(true);
  store.setPasswordResetStatus("idle");

  try {
    await ensureOnline();
    await clearPasswordResetSession();

    const { data, error } = await passwordResetClient.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    if (error) {
      throw error;
    }

    store.openPasswordResetPasswordModal({ email });
    await persistPasswordResetFlow(useAuthStore.getState().passwordResetFlow);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Code verified. Create your new password.", "success");
    return data.session ?? null;
  } catch (error) {
    const nextAttempts = attempts + 1;
    store.setPasswordResetAttempts(nextAttempts);
    store.setPasswordResetStatus("error");
    await persistPasswordResetFlow(store.passwordResetFlow);
    await showErrorFeedback(getPasswordResetVerifyErrorMessage(error));
    throw error;
  } finally {
    useAuthStore.getState().setVerifyingPasswordResetCode(false);
  }
}

export async function completePasswordReset(newPassword: string) {
  const store = useAuthStore.getState();
  store.setUpdatingPasswordReset(true);

  try {
    await ensureOnline();

    if (!(await hasActivePasswordResetSession())) {
      throw new Error("reset_session_expired");
    }

    const { error } = await passwordResetClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    await clearPasswordResetFlow();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useAuthStore
      .getState()
      .showSnackbar(
        "Password updated. Sign in with your new password.",
        "success",
      );
  } catch (error) {
    await showErrorFeedback(getPasswordUpdateErrorMessage(error));
    throw error;
  } finally {
    useAuthStore.getState().setUpdatingPasswordReset(false);
  }
}

export async function cancelPasswordResetFlow() {
  await clearPasswordResetFlow();
}
