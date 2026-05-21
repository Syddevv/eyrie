import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";

import { ToastHost } from "@/components/ui/ToastHost";
import { themeColors } from "@/constants/colors";
import { radius, shadows, spacing } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useModalMotion } from "@/hooks/useModalMotion";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  cancelPasswordResetFlow,
  requestPasswordResetCode,
} from "@/services/password-reset";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingActionButton } from "@/components/loading-action-button";

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function isValidGmailAddress(email: string) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());
}

export function ForgotPasswordEmailModal() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const passwordResetFlow = useAuthStore((state) => state.passwordResetFlow);
  const isSendingPasswordReset = useAuthStore(
    (state) => state.isSendingPasswordReset,
  );
  const showSnackbar = useAuthStore((state) => state.showSnackbar);
  const [email, setEmail] = useState("");

  const { animatedBackdropStyle, animatedCardStyle } = useModalMotion({
    visible: passwordResetFlow.phase === "email",
    enteringOffset: 22,
  });

  useEffect(() => {
    return;
  }, [passwordResetFlow.phase]);

  useEffect(() => {
    if (passwordResetFlow.phase === "email") {
      setEmail(passwordResetFlow.email);
    }
  }, [passwordResetFlow.email, passwordResetFlow.phase]);

  const surfaceStyles = useMemo(
    () => ({
      cardBackground:
        colorScheme === "light"
          ? "rgba(255, 255, 255, 0.84)"
          : "rgba(15, 23, 42, 0.9)",
      cardBorder: withOpacity(
        colors.border,
        colorScheme === "light" ? 0.88 : 1,
      ),
      iconBackground: withOpacity(
        colors.primary,
        colorScheme === "light" ? 0.12 : 0.2,
      ),
      inputBackground:
        colorScheme === "light"
          ? "rgba(248, 250, 252, 0.92)"
          : "rgba(30, 41, 59, 0.82)",
      inputBorder: withOpacity(
        colors.border,
        colorScheme === "light" ? 0.85 : 1,
      ),
      buttonBackground: colorScheme === "light" ? "#75B1E8" : colors.primary,
      buttonDisabled: colorScheme === "light" ? "#A9CDED" : "#31577D",
    }),
    [colorScheme, colors],
  );

  const canSubmit = email.trim().length > 0;

  async function handleSendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showSnackbar("Enter your Gmail address to continue.", "error");
      return;
    }

    if (!isValidGmailAddress(normalizedEmail)) {
      showSnackbar("Enter a valid Gmail address.", "error");
      return;
    }

    try {
      await requestPasswordResetCode(normalizedEmail);
    } catch {
      // Global feedback is handled by the auth store/service.
    }
  }

  if (passwordResetFlow.phase !== "email") {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={() => {
        void cancelPasswordResetFlow();
      }}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <Animated.View style={[styles.overlay, animatedBackdropStyle]}>
        <BlurView
          intensity={colorScheme === "light" ? 42 : 56}
          tint={colorScheme}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                colorScheme === "light"
                  ? "rgba(15, 23, 42, 0.28)"
                  : "rgba(2, 6, 23, 0.58)",
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.centerWrap}
        >
          <Animated.View style={[styles.cardWrap, animatedCardStyle]}>
            <View
              style={[
                styles.card,
                shadows.floating,
                {
                  backgroundColor: surfaceStyles.cardBackground,
                  borderColor: surfaceStyles.cardBorder,
                },
              ]}
            >
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: surfaceStyles.iconBackground },
                  ]}
                >
                  <Ionicons
                    name="mail-open-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Pressable
                  accessibilityLabel="Close forgot password modal"
                  hitSlop={10}
                  onPress={() => {
                    void cancelPasswordResetFlow();
                  }}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: withOpacity(
                        colors.card,
                        colorScheme === "light" ? 0.7 : 0.16,
                      ),
                      borderColor: withOpacity(
                        colors.border,
                        colorScheme === "light" ? 0.72 : 1,
                      ),
                    },
                  ]}
                >
                  <Feather color={colors.mutedForeground} name="x" size={16} />
                </Pressable>
              </View>

              <Text style={[styles.title, { color: colors.foreground }]}>
                Forgot Password?
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Enter the Gmail address linked to your account. We&apos;ll send
                a 6-digit reset code.
              </Text>

              <View style={styles.fieldGroup}>
                <Text
                  style={[styles.fieldLabel, { color: colors.cardForeground }]}
                >
                  Gmail address
                </Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: surfaceStyles.inputBackground,
                      borderColor: surfaceStyles.inputBorder,
                    },
                  ]}
                >
                  <Feather
                    name="mail"
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="you@gmail.com"
                    placeholderTextColor={withOpacity(
                      colors.mutedForeground,
                      0.8,
                    )}
                    selectionColor={colors.primary}
                    style={[styles.input, { color: colors.foreground }]}
                    value={email}
                  />
                </View>
              </View>

              <LoadingActionButton
                accessibilityRole="button"
                disabled={!canSubmit}
                haptic="none"
                label="Send reset code"
                loading={isSendingPasswordReset}
                loadingLabel="Sending code..."
                onPress={() => {
                  void handleSendCode();
                }}
                spinnerColor={colors.primaryForeground}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: canSubmit
                      ? surfaceStyles.buttonBackground
                      : surfaceStyles.buttonDisabled,
                  },
                ]}
                textStyle={styles.primaryButtonText}
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
        <ToastHost />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrap: {
    width: "100%",
  },
  card: {
    borderRadius: radius["3xl"],
    borderWidth: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: spacing[4],
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: spacing[2],
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldGroup: {
    marginTop: spacing[5],
    gap: spacing[2],
  },
  fieldLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  inputShell: {
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.xl,
    marginTop: spacing[5],
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
});
