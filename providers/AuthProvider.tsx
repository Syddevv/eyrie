import { useEffect, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { CreateNewPasswordModal } from "@/components/auth/CreateNewPasswordModal";
import { ForgotPasswordEmailModal } from "@/components/auth/ForgotPasswordEmailModal";
import { OtpVerificationModal } from "@/components/auth/OtpVerificationModal";
import { PasswordResetCodeModal } from "@/components/auth/PasswordResetCodeModal";
import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHasCompletedOnboarding } from "@/lib/onboarding-storage";
import { supabase } from "@/lib/supabase";
import {
  beginPasswordResetFromRecoveryUrl,
  clearPasswordResetFlow,
  hydratePasswordResetFlow,
} from "@/services/password-reset";
import { useAuthStore } from "@/store/useAuthStore";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash can already be controlled elsewhere during fast refresh.
});

function FullScreenLoader() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];

  return (
    <View style={[styles.loaderWrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const isReady = useAuthStore((state) => state.isReady);
  const user = useAuthStore((state) => state.user);
  const hasCompletedOnboarding = useAuthStore(
    (state) => state.hasCompletedOnboarding,
  );
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [isAuthStateValidating, setIsAuthStateValidating] = useState(true);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const setHasCompletedOnboarding = useAuthStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const closeOtpModal = useAuthStore((state) => state.closeOtpModal);
  const passwordResetPhase = useAuthStore((state) => state.passwordResetFlow.phase);

  useEffect(() => {
    let isMounted = true;

    async function loadOnboardingState() {
      const completed = await getHasCompletedOnboarding();

      if (!isMounted) {
        return;
      }

      setHasCompletedOnboarding(completed);
      setIsOnboardingReady(true);
    }

    loadOnboardingState().catch(() => {
      if (!isMounted) {
        return;
      }

      setHasCompletedOnboarding(false);
      setIsOnboardingReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [setHasCompletedOnboarding]);

  useEffect(() => {
    let isMounted = true;

    const reconcileSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }

      setReady(true);
      setIsAuthStateValidating(false);
    };

    void reconcileSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        closeOtpModal();
        setIsAuthStateValidating(true);
        void supabase.auth
          .getSession()
          .then(({ data, error }) => {
            if (!isMounted) {
              return;
            }

            if (error) {
              setSession(session ?? null);
            } else {
              setSession(data.session ?? session ?? null);
            }

            setIsAuthStateValidating(false);
          })
          .catch(() => {
            if (!isMounted) {
              return;
            }

            setSession(session ?? null);
            setIsAuthStateValidating(false);
          });
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        setIsAuthStateValidating(false);
        closeOtpModal();
        void clearPasswordResetFlow();
        return;
      }

      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [closeOtpModal, setReady, setSession]);

  useEffect(() => {
    void hydratePasswordResetFlow();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function handleIncomingUrl(url: string | null) {
      if (!url) {
        return;
      }

      try {
        await beginPasswordResetFromRecoveryUrl(url);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to complete the password reset link.";
        useAuthStore.getState().showSnackbar(message, "error");
      }
    }

    void Linking.getInitialURL().then((url) => {
      void handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady || !isOnboardingReady || isAuthStateValidating) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // Ignore repeated hide attempts during dev reloads.
    });
  }, [isAuthStateValidating, isOnboardingReady, isReady]);

  useEffect(() => {
    if (
      !isReady ||
      !isOnboardingReady ||
      isAuthStateValidating ||
      !navigationState?.key
    ) {
      return;
    }

    const currentRoot = segments[0];
    const isAuthRoute = currentRoot === "sign-in" || currentRoot === "sign-up";
    const isOnboardingRoute = currentRoot === "onboarding";

    if (passwordResetPhase !== "idle") {
      if (!isAuthRoute && !isOnboardingRoute) {
        router.replace("/sign-in");
      }
      return;
    }

    if (!hasCompletedOnboarding) {
      if (!isOnboardingRoute) {
        router.replace("/onboarding");
      }

      return;
    }

    if (isOnboardingRoute) {
      router.replace(user ? "/(tabs)" : "/sign-in");
      return;
    }

    if (!user && !isAuthRoute) {
      router.replace("/sign-in");
      return;
    }

    if (user && isAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [
    hasCompletedOnboarding,
    isAuthStateValidating,
    isOnboardingReady,
    isReady,
    navigationState?.key,
    router,
    segments,
    user,
    passwordResetPhase,
  ]);

  if (!isReady || !isOnboardingReady) {
    return <FullScreenLoader />;
  }

  return (
    <>
      {children}
      <OtpVerificationModal />
      <ForgotPasswordEmailModal />
      <PasswordResetCodeModal />
      <CreateNewPasswordModal />
    </>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
