import { ThemeProvider } from "@react-navigation/native";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import "../global.css";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { STARTUP_BACKGROUND_COLOR } from "@/app/loading-screen";
import { ToastHost } from "@/components/ui/ToastHost";
import { navigationThemes } from "@/constants/theme";
import { useNotificationBootstrap } from "@/hooks/useNotificationBootstrap";
import { useUserActivityTracker } from "@/hooks/useUserActivityTracker";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/providers/AuthProvider";
import { useBudgetResetScheduler } from "@/hooks/useBudgetResetScheduler";
import { useAuthStore } from "@/store/useAuthStore";
import { DatabaseProvider } from "@/src/db/DatabaseProvider";
import { SyncProvider, SyncStatusBanner } from "@/src/sync";

export const unstable_settings = {
  anchor: "(tabs)",
};

SystemUI.setBackgroundColorAsync(STARTUP_BACKGROUND_COLOR).catch(() => {
  // Ignore unsupported platforms during boot.
});
WebBrowser.maybeCompleteAuthSession();

function AppShell() {
  useNotificationBootstrap();
  useUserActivityTracker();
  useBudgetResetScheduler();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: STARTUP_BACKGROUND_COLOR },
        animation: "fade",
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="loading-screen" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ headerShown: false }} />
      <Stack.Screen
        name="transaction-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-transaction-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen
        name="categories-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="goal-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-goal-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-contribution-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="new-savings-goal-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-category-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-paylater-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="paylater-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="paylater-repayment-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="paylater-info-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-paylater-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="personal-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="security-password-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="payment-methods-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="payment-card-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="payment-wallet-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-payment-card-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-payment-wallet-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-payment-method-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-bank-card-method-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-e-wallet-method-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-bank-account-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add-e-wallet-account-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="currency-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="privacy-policy-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="help-center-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="payment-method-details-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}

function GlobalToastLayer() {
  const passwordResetPhase = useAuthStore(
    (state) => state.passwordResetFlow.phase,
  );

  return <ToastHost disabled={passwordResetPhase === "email"} />;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={styles.errorRoot}>
      <SafeAreaProvider>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {error?.message ?? "Unexpected startup error."}
          </Text>
          <Pressable onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(STARTUP_BACKGROUND_COLOR).catch(() => {
      // Ignore unsupported platforms after mount.
    });
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: STARTUP_BACKGROUND_COLOR }}
    >
      <SafeAreaProvider>
        <ThemeProvider value={navigationThemes[colorScheme]}>
          <DatabaseProvider>
            <AuthProvider>
              <SyncProvider>
                <AppShell />
                <GlobalToastLayer />
                <SyncStatusBanner />
              </SyncProvider>
            </AuthProvider>
          </DatabaseProvider>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: STARTUP_BACKGROUND_COLOR,
  },
  errorContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: STARTUP_BACKGROUND_COLOR,
  },
  errorTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#101A78",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    minWidth: 132,
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#1495FF",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
