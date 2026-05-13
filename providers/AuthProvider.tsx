import { useEffect, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { OtpVerificationModal } from "@/components/auth/OtpVerificationModal";
import { AuthSnackbar } from "@/components/auth/AuthSnackbar";
import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHasCompletedOnboarding } from "@/lib/onboarding-storage";
import { supabase } from "@/lib/supabase";
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
  const colorScheme = useColorScheme() ?? "light";
  const isReady = useAuthStore((state) => state.isReady);
  const user = useAuthStore((state) => state.user);
  const hasCompletedOnboarding = useAuthStore(
    (state) => state.hasCompletedOnboarding,
  );
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const setHasCompletedOnboarding = useAuthStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const closeOtpModal = useAuthStore((state) => state.closeOtpModal);

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
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }

      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        closeOtpModal();
      }

      if (event === "SIGNED_OUT") {
        closeOtpModal();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [closeOtpModal, setReady, setSession]);

  useEffect(() => {
    if (!isReady || !isOnboardingReady) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // Ignore repeated hide attempts during dev reloads.
    });
  }, [isOnboardingReady, isReady]);

  useEffect(() => {
    if (!isReady || !isOnboardingReady || !navigationState?.key) {
      return;
    }

    const currentRoot = segments[0];
    const isAuthRoute = currentRoot === "sign-in" || currentRoot === "sign-up";
    const isOnboardingRoute = currentRoot === "onboarding";

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
    isOnboardingReady,
    isReady,
    navigationState?.key,
    router,
    segments,
    user,
  ]);

  if (!isReady || !isOnboardingReady) {
    return <FullScreenLoader />;
  }

  return (
    <>
      {children}
      <OtpVerificationModal />
      <AuthSnackbar />
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
