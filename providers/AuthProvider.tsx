import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { LoadingScreen } from "@/app/loading-screen";
import { CreateNewPasswordModal } from "@/components/auth/CreateNewPasswordModal";
import { ForgotPasswordEmailModal } from "@/components/auth/ForgotPasswordEmailModal";
import { OtpVerificationModal } from "@/components/auth/OtpVerificationModal";
import { PasswordResetCodeModal } from "@/components/auth/PasswordResetCodeModal";
import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";
import { getHasCompletedOnboarding } from "@/lib/onboarding-storage";
import {
  clearLocalSupabaseSession,
  isInvalidRefreshTokenError,
  supabase,
  supabaseConfigError,
} from "@/lib/supabase";
import {
  beginPasswordResetFromRecoveryUrl,
  clearPasswordResetFlow,
  hydratePasswordResetFlow,
} from "@/services/password-reset";
import { useAuthStore } from "@/store/useAuthStore";
import { useDatabaseBootstrap } from "@/src/db/DatabaseProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash can already be controlled elsewhere during fast refresh.
});

const STARTUP_MINIMUM_MS = 2600;

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isReady: isDatabaseReady, error: databaseError } =
    useDatabaseBootstrap();
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
  const passwordResetPhase = useAuthStore(
    (state) => state.passwordResetFlow.phase,
  );
  const [hasMinimumElapsed, setHasMinimumElapsed] = useState(false);
  const [hasHiddenNativeSplash, setHasHiddenNativeSplash] = useState(false);
  const [isLoadingScreenReady, setIsLoadingScreenReady] = useState(false);
  const [showStartupScreen, setShowStartupScreen] = useState(true);
  const startupOpacity = useSharedValue(1);

  const hideStartupScreen = () => {
    setShowStartupScreen(false);
  };
  const markLoadingScreenReady = useCallback(() => {
    setIsLoadingScreenReady(true);
  }, []);

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
    if (!supabase) {
      setSession(null);
      setReady(true);
      setIsAuthStateValidating(false);
      return;
    }

    let isMounted = true;
    const client = supabase;

    const reconcileSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            await clearLocalSupabaseSession();
          }
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearLocalSupabaseSession();
        }

        if (!isMounted) {
          return;
        }

        setSession(null);
      } finally {
        if (isMounted) {
          setReady(true);
          setIsAuthStateValidating(false);
        }
      }
    };

    void reconcileSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        closeOtpModal();
        setIsAuthStateValidating(true);
        void client.auth
          .getSession()
          .then(async ({ data, error }) => {
            if (!isMounted) {
              return;
            }

            if (error) {
              if (isInvalidRefreshTokenError(error)) {
                await clearLocalSupabaseSession();
                setSession(null);
              } else {
                setSession(session ?? null);
              }
            } else {
              setSession(data.session ?? session ?? null);
            }

            setIsAuthStateValidating(false);
          })
          .catch(async (error) => {
            if (!isMounted) {
              return;
            }

            if (isInvalidRefreshTokenError(error)) {
              await clearLocalSupabaseSession();
              setSession(null);
            } else {
              setSession(session ?? null);
            }
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
    const minimumTimer = setTimeout(() => {
      setHasMinimumElapsed(true);
    }, STARTUP_MINIMUM_MS);

    return () => {
      clearTimeout(minimumTimer);
    };
  }, []);

  useEffect(() => {
    if (!isLoadingScreenReady || hasHiddenNativeSplash) {
      return;
    }

    let isCancelled = false;
    let frameId: number | null = null;

    frameId = requestAnimationFrame(() => {
      SplashScreen.hideAsync()
        .then(() => {
          if (!isCancelled) {
            setHasHiddenNativeSplash(true);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setHasHiddenNativeSplash(true);
          }
        });
    });

    return () => {
      isCancelled = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [hasHiddenNativeSplash, isLoadingScreenReady]);

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

  const isStartupReady =
    isDatabaseReady &&
    isReady &&
    isOnboardingReady &&
    !isAuthStateValidating &&
    Boolean(navigationState?.key);
  const canDismissStartupScreen =
    hasMinimumElapsed &&
    hasHiddenNativeSplash &&
    (isStartupReady || Boolean(databaseError));

  useEffect(() => {
    if (!showStartupScreen || !canDismissStartupScreen) {
      return;
    }

    startupOpacity.value = withTiming(
      0,
      {
        duration: MOTION_DURATION.STARTUP_FADE,
        easing: MOTION_EASING.OUT_CUBIC,
      },
      (finished) => {
        if (finished) {
          runOnJS(hideStartupScreen)();
        }
      },
    );
  }, [canDismissStartupScreen, showStartupScreen, startupOpacity]);

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

  const startupAnimatedStyle = useAnimatedStyle(() => ({
    opacity: startupOpacity.value,
  }));

  const canRenderAppContent = isDatabaseReady && isReady && isOnboardingReady;

  return (
    <>
      {databaseError || supabaseConfigError ? (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Startup failed</Text>
          <Text style={styles.errorMessage}>
            {(databaseError ?? supabaseConfigError)?.message}
          </Text>
        </View>
      ) : canRenderAppContent ? (
        <>
          {children}
          <OtpVerificationModal />
          <ForgotPasswordEmailModal />
          <PasswordResetCodeModal />
          <CreateNewPasswordModal />
        </>
      ) : null}
      {showStartupScreen ? (
        <Animated.View style={[styles.startupOverlay, startupAnimatedStyle]}>
          <LoadingScreen onReady={markLoadingScreenReady} />
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F7F7FF",
  },
  errorTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#101A78",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
  },
});
