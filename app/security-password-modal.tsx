import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { PasswordInput } from "@/components/password-input";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuthStore } from "@/store/useAuthStore";
import {
  createPasswordForGoogleUser,
  getPasswordProviderInfo,
  hasLocalPasswordEnabledMarker,
  markPasswordEnabledForUser,
  updatePasswordForEmailUser,
} from "@/services/password-management";
import { processPasswordChangedNotificationEvent } from "@/services/notifications";
import {
  validatePasswordConfirmation,
  validatePasswordStrength,
} from "@/lib/validation/password";

type FieldErrors = {
  currentPassword?: string | null;
  newPassword?: string | null;
  confirmPassword?: string | null;
  form?: string | null;
};

export default function SecurityPasswordModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const authUser = useAuthStore((state) => state.user);
  const showSnackbar = useAuthStore((state) => state.showSnackbar);
  const { preferences, isLoading: isLoadingPreferences, updatePreference } =
    useNotificationPreferences();
  const providerInfo = useMemo(() => getPasswordProviderInfo(authUser), [authUser]);
  const [hasLocalPasswordEnabled, setHasLocalPasswordEnabled] = useState(false);
  const isGooglePasswordCreation =
    providerInfo.mode === "create-password" && !hasLocalPasswordEnabled;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSecurityAlerts, setIsSavingSecurityAlerts] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isSavingSecurityAlerts) {
      return;
    }

    setSecurityAlertsEnabled(preferences?.security_alerts ?? true);
  }, [isSavingSecurityAlerts, preferences?.security_alerts]);

  useEffect(() => {
    let isMounted = true;

    if (!authUser?.id) {
      setHasLocalPasswordEnabled(false);
      return;
    }

    hasLocalPasswordEnabledMarker(authUser.id)
      .then((enabled) => {
        if (isMounted) {
          setHasLocalPasswordEnabled(enabled);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasLocalPasswordEnabled(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authUser?.id]);

  const passwordStrength = useMemo(
    () => validatePasswordStrength(newPassword),
    [newPassword],
  );
  const confirmError = useMemo(
    () =>
      confirmPassword
        ? validatePasswordConfirmation(newPassword, confirmPassword)
        : null,
    [confirmPassword, newPassword],
  );
  const canSubmit =
    !isSubmitting &&
    passwordStrength.isValid &&
    !confirmError &&
    confirmPassword.length > 0 &&
    (isGooglePasswordCreation || currentPassword.trim().length > 0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setErrors((current) => ({
      ...current,
      currentPassword: currentPassword.trim() ? null : current.currentPassword,
      newPassword: newPassword ? null : current.newPassword,
      confirmPassword: confirmPassword ? confirmError : current.confirmPassword,
      form: null,
    }));
  }, [confirmError, confirmPassword, currentPassword, newPassword]);

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark ? "rgba(2, 6, 23, 0.56)" : "rgba(15, 23, 42, 0.32)",
      },
      sheet: {
        backgroundColor: isDark ? "#111A27" : "#F4F8FC",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.05)",
      },
      handle: {
        backgroundColor: isDark ? "#526173" : "#C9D3DF",
      },
      title: { color: isDark ? "#F8FAFC" : "#1A202C" },
      closeButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
      },
      closeIcon: { color: isDark ? "#D4DCE6" : "#202733" },
      securityCard: {
        backgroundColor: isDark ? "rgba(21, 168, 106, 0.14)" : "#D8F4E6",
        borderColor: isDark ? "rgba(94, 234, 166, 0.3)" : "#9BE2BF",
      },
      securityCardIcon: {
        backgroundColor: isDark ? "rgba(94, 234, 166, 0.18)" : "#B6ECCD",
      },
      infoCard: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#E6F1FF",
        borderColor: isDark ? "rgba(96, 165, 250, 0.24)" : "#BFDBFE",
      },
      securityTitle: { color: isDark ? "#F8FAFC" : "#1F2937" },
      securitySubtitle: { color: isDark ? "#A9B6C8" : "#6B7280" },
      divider: { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#DCE4EE" },
      sectionTitle: { color: isDark ? "#F8FAFC" : "#1F2937" },
      fieldLabel: { color: isDark ? "#A9B6C8" : "#6B7280" },
      fieldSurface: isDark ? "rgba(255,255,255,0.05)" : "#E9EEF5",
      fieldBorder: isDark ? "rgba(255,255,255,0.04)" : "rgba(223, 230, 238, 0.96)",
      fieldValue: { color: isDark ? "#F8FAFC" : "#202733" },
      placeholder: { color: isDark ? "#8F9CAF" : "#8A94A6" },
      eyeButton: { color: isDark ? "#A9B6C8" : "#6B7280" },
      updateButton: {
        backgroundColor: canSubmit ? "#0AB363" : isDark ? "rgba(255,255,255,0.08)" : "#E6EBF2",
      },
      updateButtonText: { color: canSubmit ? "#FFFFFF" : isDark ? "#A9B6C8" : "#677385" },
      switchTrackOff: isDark ? "#4B5563" : "#D1D5DB",
      switchTrackOn: "#0AB363",
      switchThumb: "#FFFFFF",
      modalCard: {
        backgroundColor: isDark ? "#111A27" : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E1E7EF",
      },
    }),
    [canSubmit, isDark],
  );

  function getValidatedErrors() {
    const nextErrors: FieldErrors = {};

    if (!isGooglePasswordCreation && !currentPassword.trim()) {
      nextErrors.currentPassword = "Enter your current password.";
    }

    if (!newPassword) {
      nextErrors.newPassword = "Enter a new password.";
    } else if (!passwordStrength.isValid) {
      nextErrors.newPassword = passwordStrength.errors[0];
    }

    const nextConfirmError = validatePasswordConfirmation(newPassword, confirmPassword);
    if (nextConfirmError) {
      nextErrors.confirmPassword = nextConfirmError;
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = getValidatedErrors();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean) || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const passwordChangedAt = new Date().toISOString();

      if (isGooglePasswordCreation) {
        await createPasswordForGoogleUser(newPassword);
        if (authUser?.id) {
          await markPasswordEnabledForUser(authUser.id);
          setHasLocalPasswordEnabled(true);
        }
      } else {
        const email = authUser?.email;
        if (!email) {
          throw new Error("Your email address could not be found.");
        }

        await updatePasswordForEmailUser({
          email,
          currentPassword,
          newPassword,
        });
      }

      if (authUser?.id && securityAlertsEnabled) {
        await processPasswordChangedNotificationEvent({
          userId: authUser.id,
          changedAt: passwordChangedAt,
        });
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setShowSuccess(true);
      showSnackbar(
        isGooglePasswordCreation
          ? "Password created successfully."
          : "Password updated successfully.",
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update password.";

      if (message.toLowerCase().includes("current password")) {
        setErrors({ currentPassword: message });
      } else {
        setErrors({ form: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSecurityAlertsToggle(nextValue: boolean) {
    if (!authUser?.id || isSavingSecurityAlerts) {
      return;
    }

    const previousValue = securityAlertsEnabled;
    setSecurityAlertsEnabled(nextValue);
    setIsSavingSecurityAlerts(true);

    try {
      await updatePreference({
        security_alerts: nextValue,
      });
    } catch (error) {
      setSecurityAlertsEnabled(previousValue);
      showSnackbar(
        error instanceof Error
          ? error.message
          : "Unable to update security alerts.",
        "error",
      );
    } finally {
      setIsSavingSecurityAlerts(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}
    >
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>Security & Password</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={[styles.securityCard, ui.securityCard]}>
              <View style={styles.securityInfo}>
                <View style={[styles.securityIconWrap, ui.securityCardIcon]}>
                  <Feather name="shield" size={18} color="#0AB363" />
                </View>
                <View style={styles.securityCopy}>
                  <Text style={[styles.securityCardTitle, ui.securityTitle]}>Security Alerts</Text>
                  <Text style={[styles.securityCardSubtitle, ui.securitySubtitle]}>
                    Get notified about password changes
                  </Text>
                </View>
              </View>

              <Switch
                value={securityAlertsEnabled}
                onValueChange={(nextValue) => {
                  void handleSecurityAlertsToggle(nextValue);
                }}
                disabled={!authUser?.id || isLoadingPreferences || isSavingSecurityAlerts}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackOn }}
                thumbColor={ui.switchThumb}
                ios_backgroundColor={ui.switchTrackOff}
              />
            </View>

            <View style={[styles.divider, ui.divider]} />

            <Text style={[styles.sectionTitle, ui.sectionTitle]}>
              {isGooglePasswordCreation ? "Create Password" : "Change Password"}
            </Text>

            {isGooglePasswordCreation ? (
              <View style={[styles.infoCard, ui.infoCard]}>
                <Feather name="info" size={17} color={colors.primary} />
                <Text style={[styles.infoText, ui.securitySubtitle]}>
                  You currently sign in using Google. Create a password to also enable email/password login.
                </Text>
              </View>
            ) : null}

            {!isGooglePasswordCreation ? (
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                isVisible={showCurrentPassword}
                onToggleVisibility={() => setShowCurrentPassword((value) => !value)}
                selectionColor={colors.primary}
                labelColor={ui.fieldLabel.color}
                textColor={ui.fieldValue.color}
                placeholderColor={ui.placeholder.color}
                iconColor={ui.eyeButton.color}
                surfaceColor={ui.fieldSurface}
                borderColor={ui.fieldBorder}
                error={errors.currentPassword}
                editable={!isSubmitting}
              />
            ) : null}

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              isVisible={showNewPassword}
              onToggleVisibility={() => setShowNewPassword((value) => !value)}
              selectionColor={colors.primary}
              labelColor={ui.fieldLabel.color}
              textColor={ui.fieldValue.color}
              placeholderColor={ui.placeholder.color}
              iconColor={ui.eyeButton.color}
              surfaceColor={ui.fieldSurface}
              borderColor={ui.fieldBorder}
              error={errors.newPassword}
              editable={!isSubmitting}
            />

            {newPassword ? (
              <View style={styles.strengthList}>
                {["Use at least 8 characters.", "Include at least one letter.", "Include at least one number."].map(
                  (rule) => {
                    const isMet = !passwordStrength.errors.includes(rule);
                    return (
                      <View key={rule} style={styles.strengthRow}>
                        <Feather
                          name={isMet ? "check-circle" : "circle"}
                          size={13}
                          color={isMet ? "#16A34A" : ui.securitySubtitle.color}
                        />
                        <Text
                          style={[
                            styles.strengthText,
                            { color: isMet ? "#16A34A" : ui.securitySubtitle.color },
                          ]}
                        >
                          {rule}
                        </Text>
                      </View>
                    );
                  },
                )}
              </View>
            ) : null}

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              isVisible={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((value) => !value)}
              selectionColor={colors.primary}
              labelColor={ui.fieldLabel.color}
              textColor={ui.fieldValue.color}
              placeholderColor={ui.placeholder.color}
              iconColor={ui.eyeButton.color}
              surfaceColor={ui.fieldSurface}
              borderColor={ui.fieldBorder}
              error={errors.confirmPassword}
              editable={!isSubmitting}
            />

            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

            <Pressable
              style={[styles.updateButton, ui.updateButton]}
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.updateButtonText, ui.updateButtonText]}>
                  {isGooglePasswordCreation ? "Create Password" : "Update Password"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>

        {showSuccess ? (
          <View style={styles.successOverlay}>
            <View style={[styles.successCard, ui.modalCard, shadows.floating]}>
              <View style={styles.successIconWrap}>
                <Feather name="check" size={30} color="#FFFFFF" />
              </View>
              <Text style={[styles.successTitle, ui.title]}>
                {isGooglePasswordCreation ? "Password Created" : "Password Updated"}
              </Text>
              <Text style={[styles.successMessage, ui.securitySubtitle]}>
                {isGooglePasswordCreation
                  ? "Password created successfully. You can now log in using both Google and email/password."
                  : "Your password was updated successfully."}
              </Text>
              <Pressable
                style={styles.successButton}
                onPress={() => {
                  setShowSuccess(false);
                  router.back();
                }}
              >
                <Text style={styles.successButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: 24,
    paddingBottom: 4,
  },
  securityCard: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  securityCopy: {
    flex: 1,
  },
  securityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  securityCardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  securityCardSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginTop: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  infoCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  strengthList: {
    marginTop: 10,
    gap: 6,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  strengthText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  formError: {
    marginTop: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    color: "#EF4444",
  },
  updateButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
  },
  successIconWrap: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    marginTop: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  successMessage: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  successButton: {
    marginTop: 20,
    height: 44,
    minWidth: 132,
    borderRadius: 22,
    backgroundColor: "#0AB363",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  successButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
});
