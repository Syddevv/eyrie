import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";

import { LoadingActionButton } from "@/components/loading-action-button";
import { themeColors } from "@/constants/colors";
import { radius, shadows, spacing } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useModalMotion } from "@/hooks/useModalMotion";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  cancelPasswordResetFlow,
  completePasswordReset,
} from "@/services/password-reset";
import { useAuthStore } from "@/store/useAuthStore";

const MIN_PASSWORD_LENGTH = 8;

const hasNumber = (password: string) => /\d/.test(password);

function getPasswordErrors(password: string): string[] {
  const errors = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`At least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > 0 && !hasNumber(password)) {
    errors.push("Must contain at least one number");
  }
  return errors;
}

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

function PasswordField({
  colors,
  colorScheme,
  label,
  placeholder,
  value,
  onChangeText,
  error,
}: {
  colors: (typeof themeColors)[keyof typeof themeColors];
  colorScheme: "light" | "dark";
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.cardForeground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor:
              colorScheme === "light"
                ? "rgba(248, 250, 252, 0.92)"
                : "rgba(30, 41, 59, 0.82)",
            borderColor: error
              ? colors.destructive
              : withOpacity(colors.border, colorScheme === "light" ? 0.85 : 1),
          },
        ]}
      >
        <Feather name="lock" size={18} color={colors.mutedForeground} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={withOpacity(colors.mutedForeground, 0.8)}
          secureTextEntry={hidden}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.foreground }]}
          value={value}
        />
        <Pressable hitSlop={8} onPress={() => setHidden((current) => !current)}>
          <Feather
            name={hidden ? "eye" : "eye-off"}
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function CreateNewPasswordModal() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const passwordResetFlow = useAuthStore((state) => state.passwordResetFlow);
  const isUpdatingPasswordReset = useAuthStore(
    (state) => state.isUpdatingPasswordReset,
  );
  const showSnackbar = useAuthStore((state) => state.showSnackbar);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { animatedBackdropStyle, animatedCardStyle } = useModalMotion({
    visible: passwordResetFlow.phase === "password",
    enteringOffset: 22,
  });

  useEffect(() => {
    if (passwordResetFlow.phase !== "password") {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [passwordResetFlow.phase]);

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
        colors.success,
        colorScheme === "light" ? 0.14 : 0.2,
      ),
      buttonBackground: colorScheme === "light" ? "#75B1E8" : colors.primary,
      buttonDisabled: colorScheme === "light" ? "#A9CDED" : "#31577D",
    }),
    [colorScheme, colors],
  );

  const newPasswordErrors = getPasswordErrors(newPassword);
  const confirmPasswordErrors = getPasswordErrors(confirmPassword);
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSubmit =
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    hasNumber(newPassword);

  async function handleUpdatePassword() {
    if (newPasswordErrors.length > 0) {
      showSnackbar(
        `Password requirements not met: ${newPasswordErrors[0].toLowerCase()}`,
        "error",
      );
      return;
    }

    if (!hasNumber(newPassword)) {
      showSnackbar("Password must contain at least one number.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("Your passwords do not match.", "error");
      return;
    }

    try {
      await completePasswordReset(newPassword);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // Global feedback is handled by the auth store/service.
    }
  }

  if (passwordResetFlow.phase !== "password") {
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 100}
          style={styles.centerWrap}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: spacing[12] },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
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
                      name="shield-checkmark-outline"
                      size={24}
                      color={colors.success}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Close password update modal"
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
                    <Feather
                      color={colors.mutedForeground}
                      name="x"
                      size={16}
                    />
                  </Pressable>
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>
                  Create New Password
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.mutedForeground }]}
                >
                  Update your password for {passwordResetFlow.email}
                </Text>

                <PasswordField
                  colorScheme={colorScheme}
                  colors={colors}
                  error={
                    newPasswordErrors.length > 0
                      ? newPasswordErrors[0]
                      : undefined
                  }
                  label="New password"
                  onChangeText={setNewPassword}
                  placeholder="Enter a strong password"
                  value={newPassword}
                />
                <PasswordField
                  colorScheme={colorScheme}
                  colors={colors}
                  error={
                    passwordMismatch
                      ? "Passwords do not match"
                      : confirmPasswordErrors.length > 0
                        ? confirmPasswordErrors[0]
                        : undefined
                  }
                  label="Confirm password"
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                />

                <Text
                  style={[styles.ruleText, { color: colors.mutedForeground }]}
                >
                  Use at least {MIN_PASSWORD_LENGTH} characters and make sure
                  both fields match.
                </Text>

                <LoadingActionButton
                  accessibilityRole="button"
                  disabled={!canSubmit}
                  haptic="none"
                  label="Update password"
                  loading={isUpdatingPasswordReset}
                  loadingLabel="Updating password..."
                  onPress={() => {
                    void handleUpdatePassword();
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
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: spacing[4],
  },
  cardWrap: {
    width: "100%",
  },
  card: {
    borderRadius: radius["3xl"],
    borderWidth: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
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
    marginTop: spacing[2],
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: spacing[1],
    marginBottom: spacing[2],
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    marginTop: spacing[3],
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
  ruleText: {
    marginTop: spacing[3],
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing[1],
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
