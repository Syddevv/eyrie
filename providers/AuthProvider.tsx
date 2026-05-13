import { useEffect, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { OtpVerificationModal } from '@/components/auth/OtpVerificationModal';
import { AuthSnackbar } from '@/components/auth/AuthSnackbar';
import { themeColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash can already be controlled elsewhere during fast refresh.
});

const ONBOARDING_STORAGE_KEY = 'onboardingCompleted';

function FullScreenLoader() {
  const colorScheme = useColorScheme() ?? 'light';
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
  const colorScheme = useColorScheme() ?? 'light';
  const isReady = useAuthStore((state) => state.isReady);
  const user = useAuthStore((state) => state.user);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const closeOtpModal = useAuthStore((state) => state.closeOtpModal);

  useEffect(() => {
    let isMounted = true;

    async function loadOnboardingState() {
      let completed: string | null = null;

      if (typeof window !== 'undefined') {
        completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      } else {
        completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      }

      if (!isMounted) {
        return;
      }

      setHasCompletedOnboarding(Boolean(completed));
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

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        closeOtpModal();
      }

      if (event === 'SIGNED_OUT') {
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
    const isAuthRoute = currentRoot === 'sign-in' || currentRoot === 'sign-up';
    const isOnboardingRoute = currentRoot === 'onboarding';
    const isPublicRoute = isAuthRoute || isOnboardingRoute;

    // TODO: Restore onboardingCompleted-only gating before production release.
    // Temporary testing behavior:
    // - signed-out users always see onboarding first
    // - signed-in users skip onboarding
    if (!user && !isOnboardingRoute) {
      router.replace('/onboarding');
      return;
    }

    // Original production logic:
    // if (!hasCompletedOnboarding && !isOnboardingRoute) {
    //   router.replace('/onboarding');
    //   return;
    // }
    //
    // if (hasCompletedOnboarding && isOnboardingRoute) {
    //   router.replace(user ? '/(tabs)' : '/sign-in');
    //   return;
    // }

    if (user && isOnboardingRoute) {
      router.replace('/(tabs)');
      return;
    }

    if (!user && !isPublicRoute) {
      router.replace('/onboarding');
      return;
    }

    if (user && isAuthRoute) {
      router.replace('/(tabs)');
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
