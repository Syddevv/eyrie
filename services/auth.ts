import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { accountsService } from "@/src/db/services";

const EXISTING_ACCOUNT_ERROR_MESSAGE =
  "This email is already associated with an existing account.";
const EXISTING_GOOGLE_ACCOUNT_ERROR_MESSAGE =
  "This email is already associated with an existing account. Continue with Google instead.";

type EmailRegistrationStatus = {
  normalized_email: string;
  exists_in_auth: boolean;
  exists_in_users: boolean;
  matching_user_id: string | null;
  has_google: boolean;
  has_email: boolean;
  recommended_provider: string | null;
};

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getOtpResendAvailableAt() {
  return Date.now() + 60_000;
}

function getGoogleRedirectUri() {
  // Expo Go cannot register this app's custom scheme for OAuth callbacks because it owns the
  // native container. In Expo Go, the auth session falls back to an `exp://...` redirect that
  // belongs to Expo Go instead of `eyrie://`, which breaks Supabase's native callback flow.
  //
  // A development build includes this project's own Android shell, so Android registers the
  // `eyrie://` scheme to Eyrie itself. That lets Google return to the app natively and gives
  // Supabase an app-owned redirect URI it can exchange for a session.
  return makeRedirectUri({
    scheme: "eyrie",
  });
}

function getGoogleErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Google sign-in failed. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (
    lower.includes("provider is not enabled") ||
    lower.includes("unsupported provider")
  ) {
    return "Google sign-in is not enabled in Supabase. Enable the Google provider in Authentication > Providers.";
  }

  if (
    lower.includes("duplicate_email_google_only") ||
    lower.includes("continue with google instead")
  ) {
    return EXISTING_GOOGLE_ACCOUNT_ERROR_MESSAGE;
  }

  if (
    lower.includes("duplicate_email_account_exists") ||
    lower.includes("already associated with an existing account")
  ) {
    return EXISTING_ACCOUNT_ERROR_MESSAGE;
  }

  return error.message;
}

function getExistingAccountMessage(
  status: Pick<EmailRegistrationStatus, "has_google" | "has_email" | "recommended_provider">,
) {
  if (status.recommended_provider === "google") {
    return EXISTING_GOOGLE_ACCOUNT_ERROR_MESSAGE;
  }

  if (status.has_google && !status.has_email) {
    return EXISTING_GOOGLE_ACCOUNT_ERROR_MESSAGE;
  }

  return EXISTING_ACCOUNT_ERROR_MESSAGE;
}

async function getEmailRegistrationStatus(
  email: string,
): Promise<EmailRegistrationStatus | null> {
  assertSupabaseConfigured("Authentication");

  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase.rpc("get_email_registration_status", {
    target_email: normalizedEmail,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return (data[0] ?? null) as EmailRegistrationStatus | null;
  }

  return data as EmailRegistrationStatus;
}

async function assertEmailAvailableForRegistration(email: string) {
  const status = await getEmailRegistrationStatus(email);

  if (!status) {
    return;
  }

  if (status.exists_in_auth || status.exists_in_users) {
    throw new Error(getExistingAccountMessage(status));
  }
}

export async function createSessionFromRedirectUrlForClient(
  client: SupabaseClient,
  url: string,
) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = Array.isArray(params.access_token)
    ? params.access_token[0]
    : params.access_token;
  const refreshToken = Array.isArray(params.refresh_token)
    ? params.refresh_token[0]
    : params.refresh_token;

  // Google OAuth in Supabase mobile flows often returns tokens directly in the callback URL.
  // In that case there is no authorization code to exchange, so we restore the session from
  // the returned tokens instead of requiring a PKCE code.
  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return data.session ?? null;
  }

  const codeParam = params.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

  if (!code || typeof code !== "string") {
    return null;
  }

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session ?? null;
}

export async function createSessionFromRedirectUrl(url: string) {
  assertSupabaseConfigured("Authentication");
  return createSessionFromRedirectUrlForClient(supabase, url);
}

export function getAuthRedirectTypeFromUrl(url: string) {
  const { params } = QueryParams.getQueryParams(url);
  const type = Array.isArray(params.type) ? params.type[0] : params.type;

  return typeof type === "string" ? type : null;
}

function getSignInErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to sign in right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Verify your email with the 6-digit code before signing in.";
  }

  return error.message;
}

function getSignUpErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to create your account right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("user already registered")) {
    return "An account with that email already exists. Sign in instead.";
  }

  if (
    lower.includes("duplicate_email_google_only") ||
    lower.includes("continue with google instead")
  ) {
    return EXISTING_GOOGLE_ACCOUNT_ERROR_MESSAGE;
  }

  if (
    lower.includes("duplicate_email_account_exists") ||
    lower.includes("already associated with an existing account")
  ) {
    return EXISTING_ACCOUNT_ERROR_MESSAGE;
  }

  if (lower.includes("password")) {
    return error.message;
  }

  if (lower.includes("rate limit")) {
    return "Too many signup attempts. Please wait before trying again.";
  }

  return error.message;
}

function getVerifyOtpErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to verify that code right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("token has expired") || lower.includes("expired")) {
    return "That verification code has expired. Request a new code and try again.";
  }

  if (
    lower.includes("token") ||
    lower.includes("otp") ||
    lower.includes("invalid")
  ) {
    return "That verification code is invalid. Check the 6 digits and try again.";
  }

  if (lower.includes("rate limit")) {
    return "Too many attempts. Wait a moment before requesting another code.";
  }

  if (lower.includes("already") && lower.includes("confirmed")) {
    return "This email is already verified. Sign in to continue.";
  }

  return error.message;
}

function getResendOtpErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to resend the verification code right now. Please try again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("rate limit")) {
    return "You requested codes too quickly. Please wait before trying again.";
  }

  if (lower.includes("already") && lower.includes("confirmed")) {
    return "This email is already verified. Sign in to continue.";
  }

  return error.message;
}

export async function signInWithEmailPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  assertSupabaseConfigured("Authentication");

  const store = useAuthStore.getState();
  const normalizedEmail = normalizeEmail(email);
  store.setSigningIn(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Signed in successfully.", "success");

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("email not confirmed")
    ) {
      store.openOtpModal({
        email: normalizedEmail,
        mode: "sign-up",
        resendAvailableAt: getOtpResendAvailableAt(),
      });
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getSignInErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setSigningIn(false);
  }
}

export async function signUpWithEmailPassword({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}) {
  assertSupabaseConfigured("Authentication");

  const store = useAuthStore.getState();
  const normalizedEmail = normalizeEmail(email);
  store.setSigningUp(true);

  try {
    await assertEmailAvailableForRegistration(normalizedEmail);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      throw error;
    }

    store.openOtpModal({
      email: normalizedEmail,
      fullName: fullName.trim(),
      mode: "sign-up",
      resendAvailableAt: getOtpResendAvailableAt(),
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar(
      "Account created. Enter the 6-digit verification code sent to your email.",
      "success",
    );

    return data;
  } catch (error) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getSignUpErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setSigningUp(false);
  }
}

export async function verifySignupOtp({
  email,
  token,
}: {
  email: string;
  token: string;
}): Promise<Session | null> {
  assertSupabaseConfigured("Authentication");

  const store = useAuthStore.getState();
  store.setVerifyingOtp(true);
  store.setOtpModalStatus("idle");

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token,
      type: "signup",
    });

    if (error) {
      throw error;
    }

    store.setOtpModalStatus("success");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Email verified successfully.", "success");

    return data.session ?? null;
  } catch (error) {
    store.setOtpModalStatus("error");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getVerifyOtpErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setVerifyingOtp(false);
  }
}

export async function resendSignupOtp(email: string) {
  assertSupabaseConfigured("Authentication");

  const store = useAuthStore.getState();
  store.setSendingOtp(true);
  store.setOtpModalStatus("idle");

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizeEmail(email),
    });

    if (error) {
      throw error;
    }

    store.setOtpResendAvailableAt(getOtpResendAvailableAt());
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.showSnackbar("A new verification code has been sent.", "success");
  } catch (error) {
    store.setOtpModalStatus("error");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getResendOtpErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setSendingOtp(false);
  }
}

export async function signInWithGoogle() {
  assertSupabaseConfigured("Google sign-in");

  const store = useAuthStore.getState();

  store.setGoogleLoading(true);

  try {
    if (Constants.appOwnership === "expo") {
      throw new Error(
        "Google sign-in requires an Expo development build. Expo Go cannot receive the `eyrie://` OAuth callback for this app.",
      );
    }

    const redirectTo = getGoogleRedirectUri();
    console.log("Google redirect URI:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Custom URI schemes behave like app-specific URLs. In a dev build, Android routes
        // `eyrie://` back into this app instead of Expo Go's `exp://` runtime.
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
      throw new Error("Google sign-in URL was not returned.");
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== "success") {
      if (result.type === "cancel" || result.type === "dismiss") {
        store.showSnackbar("Google sign-in was canceled.", "info");
        return null;
      }

      throw new Error("Google sign-in did not complete.");
    }

    const { queryParams } = Linking.parse(result.url);
    const oauthError = Array.isArray(queryParams?.error_description)
      ? queryParams.error_description[0]
      : queryParams?.error_description;

    if (oauthError) {
      throw new Error(String(oauthError));
    }

    const session = await createSessionFromRedirectUrl(result.url);

    if (!session) {
      throw new Error(
        "Google sign-in completed, but Supabase did not return a session in the callback.",
      );
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Signed in with Google.", "success");
    return session;
  } catch (error) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getGoogleErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setGoogleLoading(false);
  }
}

export async function signOut() {
  assertSupabaseConfigured("Authentication");

  const store = useAuthStore.getState();
  store.setSigningOut(true);

  try {
    // Reset cached default cash account state before signing out
    accountsService.resetDefaultCashCache();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.closeOtpModal();
    store.showSnackbar("Signed out.", "success");
  } catch (error) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const message =
      error instanceof Error ? error.message : "Unable to sign out right now. ";
    store.showSnackbar(message, "error");
    throw error;
  } finally {
    useAuthStore.getState().setSigningOut(false);
  }
}
