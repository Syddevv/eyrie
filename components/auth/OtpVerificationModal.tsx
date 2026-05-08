import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";

import { themeColors } from "@/constants/colors";
import { radius, shadows, spacing } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { resendSignupOtp, verifySignupOtp } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";

const OTP_LENGTH = 6;

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

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const visibleLocal = localPart.slice(0, 2);
  const hiddenLocal = Math.max(localPart.length - visibleLocal.length, 1);

  return `${visibleLocal}${"•".repeat(hiddenLocal)}@${domain}`;
}

export function OtpVerificationModal() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const { otpModal, isSendingOtp, isVerifyingOtp, closeOtpModal } = useAuth();
  const setOtpModalStatus = useAuthStore((state) => state.setOtpModalStatus);
  const [code, setCode] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const verifyRequestIdRef = useRef(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(otpModal.visible ? 1 : 0, {
      duration: otpModal.visible ? 280 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [otpModal.visible, progress]);

  useEffect(() => {
    if (!otpModal.visible) {
      setCode(Array.from({ length: OTP_LENGTH }, () => ""));
      return;
    }

    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 220);
    return () => clearTimeout(timer);
  }, [otpModal.visible]);

  useEffect(() => {
    if (!otpModal.visible) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const ms = otpModal.resendAvailableAt - Date.now();
      setRemainingSeconds(Math.max(0, Math.ceil(ms / 1000)));
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [otpModal.resendAvailableAt, otpModal.visible]);

  const joinedCode = code.join("");

  useEffect(() => {
    if (!otpModal.visible || joinedCode.length !== OTP_LENGTH || isVerifyingOtp) {
      return;
    }

    const requestId = verifyRequestIdRef.current + 1;
    verifyRequestIdRef.current = requestId;

    void (async () => {
      try {
        await verifySignupOtp({
          email: otpModal.email,
          token: joinedCode,
        });
      } catch {
        if (verifyRequestIdRef.current !== requestId) {
          return;
        }

        setCode(Array.from({ length: OTP_LENGTH }, () => ""));
        inputRefs.current[0]?.focus();
      }
    })();
  }, [isVerifyingOtp, joinedCode, otpModal.email, otpModal.visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [24, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const visualState = useMemo(() => {
    if (otpModal.status === "error") {
      return {
        borderColor: colorScheme === "light" ? "#F6B0B0" : "rgba(248, 113, 113, 0.42)",
        glowColor: colors.destructive,
        badgeColor: colors.destructive,
      };
    }

    if (otpModal.status === "success") {
      return {
        borderColor: colorScheme === "light" ? "#A7E3BE" : "rgba(74, 222, 128, 0.34)",
        glowColor: colors.success,
        badgeColor: colors.success,
      };
    }

    return {
      borderColor: withOpacity(colors.border, colorScheme === "light" ? 0.88 : 1),
      glowColor: colors.primary,
      badgeColor: colors.primary,
    };
  }, [colorScheme, colors.border, colors.destructive, colors.primary, colors.success, otpModal.status]);

  function handleChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits.length) {
      setOtpModalStatus("idle");
      setCode((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    if (digits.length > 1) {
      handlePaste(digits);
      return;
    }

    const nextCharacter = digits.slice(-1);

    setOtpModalStatus("idle");
    setCode((current) => {
      const next = [...current];
      next[index] = nextCharacter;
      return next;
    });

    if (nextCharacter && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key !== "Backspace") {
      return;
    }

    if (code[index]) {
      setCode((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
      setCode((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
    }
  }

  function handlePaste(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");

    if (!digits.length) {
      return;
    }

    setOtpModalStatus("idle");
    setCode((current) =>
      current.map((_, index) => digits[index] ?? "")
    );

    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleResend() {
    if (remainingSeconds > 0 || isSendingOtp) {
      return;
    }

    setCode(Array.from({ length: OTP_LENGTH }, () => ""));

    try {
      await resendSignupOtp(otpModal.email);
      inputRefs.current[0]?.focus();
    } catch {
      inputRefs.current[0]?.focus();
    }
  }

  if (!otpModal.visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={closeOtpModal}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={otpModal.visible}>
      <Animated.View style={[styles.overlay, animatedBackdropStyle]}>
        <BlurView
          intensity={colorScheme === "light" ? 28 : 42}
          tint={colorScheme}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                colorScheme === "light" ? "rgba(15, 23, 42, 0.18)" : "rgba(2, 6, 23, 0.45)",
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.centerWrap}>
          <Animated.View style={[styles.cardWrap, animatedCardStyle]}>
            <View
              style={[
                styles.cardGlow,
                { backgroundColor: withOpacity(visualState.glowColor, 0.14) },
              ]}
            />
            <View
              style={[
                styles.card,
                shadows.floating,
                {
                  backgroundColor:
                    colorScheme === "light"
                      ? "rgba(255, 255, 255, 0.84)"
                      : "rgba(15, 23, 42, 0.88)",
                  borderColor: visualState.borderColor,
                },
              ]}>
              <View style={styles.headerRow}>
                <View style={[styles.iconBadge, { backgroundColor: withOpacity(visualState.badgeColor, 0.14) }]}>
                  <Ionicons
                    color={visualState.badgeColor}
                    name={otpModal.status === "success" ? "checkmark-circle" : "mail-outline"}
                    size={24}
                  />
                </View>

                <Pressable
                  accessibilityLabel="Close verification modal"
                  hitSlop={10}
                  onPress={closeOtpModal}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: withOpacity(colors.card, colorScheme === "light" ? 0.7 : 0.16),
                      borderColor: withOpacity(colors.border, colorScheme === "light" ? 0.72 : 1),
                    },
                  ]}>
                  <Feather color={colors.mutedForeground} name="x" size={18} />
                </Pressable>
              </View>

              <Text style={[styles.title, { color: colors.foreground }]}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to {maskEmail(otpModal.email)} to finish{" "}
                {otpModal.mode === "sign-up" ? "creating your account." : "signing in."}
              </Text>

              <View style={styles.codeRow}>
                {code.map((digit, index) => {
                  const isError = otpModal.status === "error";

                  return (
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      autoCapitalize="none"
                      autoComplete="one-time-code"
                      contextMenuHidden={false}
                      importantForAutofill="yes"
                      key={index}
                      keyboardType="number-pad"
                      maxLength={1}
                      onChangeText={(value) => handleChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                      placeholder="•"
                      placeholderTextColor={withOpacity(colors.mutedForeground, 0.48)}
                      selectionColor={colors.primary}
                      style={[
                        styles.codeInput,
                        {
                          color: colors.foreground,
                          backgroundColor:
                            colorScheme === "light"
                              ? "rgba(255, 255, 255, 0.72)"
                              : "rgba(30, 41, 59, 0.72)",
                          borderColor: isError
                            ? withOpacity(colors.destructive, 0.62)
                            : withOpacity(colors.border, colorScheme === "light" ? 0.84 : 1),
                        },
                      ]}
                      textAlign="center"
                      value={digit}
                    />
                  );
                })}
              </View>

              <View style={styles.feedbackRow}>
                {isVerifyingOtp ? (
                  <View style={styles.inlineState}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                      Verifying code...
                    </Text>
                  </View>
                ) : otpModal.status === "error" ? (
                  <View style={styles.inlineState}>
                    <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                    <Text style={[styles.helperText, { color: colors.destructive }]}>
                      The code was rejected. Request another code if needed.
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                    Codes expire quickly for security. Keep this screen open while checking your inbox.
                  </Text>
                )}
              </View>

              <View style={styles.footerRow}>
                <View>
                  <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
                    {remainingSeconds > 0
                      ? `Resend available in 00:${String(remainingSeconds).padStart(2, "0")}`
                      : "Didn’t receive a code?"}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={remainingSeconds > 0 || isSendingOtp}
                  onPress={handleResend}
                  style={[
                    styles.resendButton,
                    {
                      opacity: remainingSeconds > 0 || isSendingOtp ? 0.55 : 1,
                      backgroundColor: withOpacity(colors.primary, colorScheme === "light" ? 0.12 : 0.18),
                      borderColor: withOpacity(colors.primary, colorScheme === "light" ? 0.16 : 0.28),
                    },
                  ]}>
                  {isSendingOtp ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={[styles.resendText, { color: colors.primary }]}>Resend code</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing[6],
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrap: {
    position: "relative",
  },
  cardGlow: {
    position: "absolute",
    top: -10,
    right: -10,
    bottom: -10,
    left: -10,
    borderRadius: radius["3xl"],
  },
  card: {
    borderRadius: radius["3xl"],
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
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
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing[2],
    marginTop: spacing[6],
  },
  codeInput: {
    flex: 1,
    minWidth: 44,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  feedbackRow: {
    minHeight: 46,
    justifyContent: "center",
    marginTop: spacing[4],
  },
  inlineState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  helperText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    marginTop: spacing[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
  },
  timerLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  resendButton: {
    minWidth: 112,
    minHeight: 40,
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resendText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
  },
});
