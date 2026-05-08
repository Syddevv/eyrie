import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

  return error.message;
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
    return "Please confirm your email before signing in.";
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

  if (lower.includes("password")) {
    return error.message;
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
  const store = useAuthStore.getState();
  store.setSigningIn(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      throw error;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Signed in successfully.", "success");
    return data;
  } catch (error) {
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
  const store = useAuthStore.getState();
  store.setSigningUp(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
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

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (data.user && !data.session) {
      store.showSnackbar(
        "Account created. Check your email to confirm your account before signing in.",
        "success",
      );
    } else {
      store.showSnackbar("Account created successfully.", "success");
    }

    return data;
  } catch (error) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getSignUpErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setSigningUp(false);
  }
}

export async function signInWithGoogle() {
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
    const codeParam = queryParams?.code;
    const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
    const oauthError = Array.isArray(queryParams?.error_description)
      ? queryParams.error_description[0]
      : queryParams?.error_description;

    if (oauthError) {
      throw new Error(String(oauthError));
    }

    if (!code || typeof code !== "string") {
      throw new Error("Google sign-in did not return an authorization code.");
    }

    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.showSnackbar("Signed in with Google.", "success");
    return sessionData.session ?? null;
  } catch (error) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    store.showSnackbar(getGoogleErrorMessage(error), "error");
    throw error;
  } finally {
    useAuthStore.getState().setGoogleLoading(false);
  }
}

export async function signOut() {
  const store = useAuthStore.getState();
  store.setSigningOut(true);

  try {
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
      error instanceof Error ? error.message : "Unable to sign out right now.";
    store.showSnackbar(message, "error");
    throw error;
  } finally {
    useAuthStore.getState().setSigningOut(false);
  }
}
