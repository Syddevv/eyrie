import { useEffect, type PropsWithChildren } from 'react';
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
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const closeOtpModal = useAuthStore((state) => state.closeOtpModal);

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
    if (!isReady) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // Ignore repeated hide attempts during dev reloads.
    });
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !navigationState?.key) {
      return;
    }

    const currentRoot = segments[0];
    const isAuthRoute = currentRoot === 'sign-in' || currentRoot === 'sign-up';

    if (!user && !isAuthRoute) {
      router.replace('/sign-in');
      return;
    }

    if (user && isAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [isReady, navigationState?.key, router, segments, user]);

  if (!isReady) {
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
