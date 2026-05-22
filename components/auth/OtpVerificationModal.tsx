import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";

import { themeColors } from "@/constants/colors";
import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";
import { radius, shadows, spacing } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useModalMotion } from "@/hooks/useModalMotion";
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
  const [code, setCode] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const verifyRequestIdRef = useRef(0);
  const lastSubmittedCodeRef = useRef("");
  const caretOpacity = useSharedValue(1);

  const { animatedBackdropStyle, animatedCardStyle } = useModalMotion({
    visible: otpModal.visible,
    enteringOffset: 24,
    keyboardVisible: isKeyboardVisible,
    keyboardHeight,
  });

  useEffect(() => {
    caretOpacity.value = withTiming(isInputFocused ? 1 : 0, {
      duration: MOTION_DURATION.CARET,
      easing: MOTION_EASING.OUT_EASE,
    });
  }, [caretOpacity, isInputFocused]);

  useEffect(() => {
    if (!otpModal.visible) {
      setCode(Array.from({ length: OTP_LENGTH }, () => ""));
      setIsInputFocused(false);
      setFocusedIndex(null);
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      lastSubmittedCodeRef.current = "";
      return;
    }

    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 220);
    return () => clearTimeout(timer);
  }, [otpModal.visible]);

  useEffect(() => {
    if (!otpModal.visible) {
      return;
    }

    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      setIsInputFocused(false);
      setFocusedIndex(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
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
    if (
      !otpModal.visible ||
      joinedCode.length !== OTP_LENGTH ||
      isVerifyingOtp ||
      joinedCode === lastSubmittedCodeRef.current
    ) {
      return;
    }

    const requestId = verifyRequestIdRef.current + 1;
    verifyRequestIdRef.current = requestId;
    lastSubmittedCodeRef.current = joinedCode;

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
        lastSubmittedCodeRef.current = "";
        focusInput(0);
      }
    })();
  }, [isVerifyingOtp, joinedCode, otpModal.email, otpModal.visible]);

  const animatedCaretStyle = useAnimatedStyle(() => ({
    opacity: caretOpacity.value,
  }));

  const visualState = useMemo(() => {
    if (otpModal.status === "error") {
      return {
        borderColor:
          colorScheme === "light" ? "#F6B0B0" : "rgba(248, 113, 113, 0.42)",
        glowColor: colors.destructive,
        badgeColor: colors.destructive,
      };
    }

    if (otpModal.status === "success") {
      return {
        borderColor:
          colorScheme === "light" ? "#A7E3BE" : "rgba(74, 222, 128, 0.34)",
        glowColor: colors.success,
        badgeColor: colors.success,
      };
    }

    return {
      borderColor: withOpacity(
        colors.border,
        colorScheme === "light" ? 0.88 : 1,
      ),
      glowColor: colors.primary,
      badgeColor: colors.primary,
    };
  }, [
    colorScheme,
    colors.border,
    colors.destructive,
    colors.primary,
    colors.success,
    otpModal.status,
  ]);

  function focusInput(index: number) {
    const safeIndex = Math.max(0, Math.min(index, OTP_LENGTH - 1));
    inputRefs.current[safeIndex]?.focus();
  }

  function getNextFocusIndex() {
    const emptyIndex = code.findIndex((digit) => !digit);
    return emptyIndex === -1 ? OTP_LENGTH - 1 : emptyIndex;
  }

  function applyDigits(digits: string, startIndex: number) {
    lastSubmittedCodeRef.current = "";
    setOtpModalStatus("idle");

    setCode((current) => {
      const next = [...current];
      let writeIndex = startIndex;

      for (const digit of digits) {
        if (writeIndex >= OTP_LENGTH) {
          break;
        }

        next[writeIndex] = digit;
        writeIndex += 1;
      }

      return next;
    });

    const nextFocusIndex = Math.min(startIndex + digits.length, OTP_LENGTH - 1);
    requestAnimationFrame(() => {
      if (startIndex + digits.length >= OTP_LENGTH) {
        inputRefs.current[OTP_LENGTH - 1]?.focus();
        return;
      }

      focusInput(nextFocusIndex);
    });
  }

  function handleCodeChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits.length) {
      setCode((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      lastSubmittedCodeRef.current = "";
      setOtpModalStatus("idle");
      return;
    }

    if (digits.length > 1) {
      applyDigits(digits.slice(0, OTP_LENGTH - index), index);
      return;
    }

    applyDigits(digits, index);
  }

  function handleKeyPress(index: number, key: string) {
    if (key !== "Backspace") {
      return;
    }

    lastSubmittedCodeRef.current = "";
    setOtpModalStatus("idle");

    setCode((current) => {
      const next = [...current];

      if (next[index]) {
        next[index] = "";
        return next;
      }

      const previousIndex = index - 1;
      if (previousIndex >= 0) {
        next[previousIndex] = "";
        requestAnimationFrame(() => {
          focusInput(previousIndex);
        });
      }

      return next;
    });
  }

  async function handleResend() {
    if (remainingSeconds > 0 || isSendingOtp) {
      return;
    }

    setCode(Array.from({ length: OTP_LENGTH }, () => ""));
    lastSubmittedCodeRef.current = "";

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
      visible={otpModal.visible}
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.centerWrap}
        >
          <Animated.View
            style={[
              styles.cardWrap,
              animatedCardStyle,
              isKeyboardVisible ? styles.cardWrapKeyboard : null,
            ]}
          >
            <View
              style={[
                styles.cardGlow,
                { backgroundColor: withOpacity(visualState.glowColor, 0.08) },
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
              ]}
            >
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: withOpacity(
                        visualState.badgeColor,
                        0.14,
                      ),
                    },
                  ]}
                >
                  <Ionicons
                    color={visualState.badgeColor}
                    name={
                      otpModal.status === "success"
                        ? "checkmark-circle"
                        : "mail-outline"
                    }
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
                Verify Your Email
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Enter the 6-digit code sent to {maskEmail(otpModal.email)} to
                finish{" "}
                {otpModal.mode === "sign-up"
                  ? "creating your account."
                  : "signing in."}
              </Text>

              <Pressable
                onPress={() => focusInput(getNextFocusIndex())}
                style={styles.codeRow}
              >
                {code.map((digit, index) => {
                  const isError = otpModal.status === "error";
                  const isActiveSlot =
                    isInputFocused && focusedIndex === index && !digit;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor:
                            colorScheme === "light"
                              ? "rgba(255, 255, 255, 0.72)"
                              : "rgba(30, 41, 59, 0.72)",
                          borderColor: isError
                            ? withOpacity(colors.destructive, 0.62)
                            : withOpacity(
                                colors.border,
                                colorScheme === "light" ? 0.84 : 1,
                              ),
                        },
                        isActiveSlot
                          ? {
                              borderColor: withOpacity(colors.primary, 0.72),
                              backgroundColor:
                                colorScheme === "light"
                                  ? "rgba(255, 255, 255, 0.82)"
                                  : "rgba(30, 41, 59, 0.86)",
                            }
                          : null,
                      ]}
                    >
                      <TextInput
                        ref={(ref) => {
                          inputRefs.current[index] = ref;
                        }}
                        autoCapitalize="none"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        autoCorrect={false}
                        caretHidden
                        contextMenuHidden={false}
                        importantForAutofill="yes"
                        keyboardType="number-pad"
                        maxLength={OTP_LENGTH}
                        onBlur={() => {
                          setIsInputFocused(false);
                          setFocusedIndex(null);
                        }}
                        onChangeText={(value) => handleCodeChange(index, value)}
                        onFocus={() => {
                          setIsInputFocused(true);
                          setFocusedIndex(index);
                        }}
                        onKeyPress={({ nativeEvent }) =>
                          handleKeyPress(index, nativeEvent.key)
                        }
                        selectionColor="transparent"
                        style={styles.codeTextInput}
                        textAlign="center"
                        value={digit}
                      />
                      {digit ? (
                        <Text
                          pointerEvents="none"
                          style={[
                            styles.codeDigit,
                            { color: colors.foreground },
                          ]}
                        >
                          {digit}
                        </Text>
                      ) : null}
                      {!digit && isActiveSlot ? (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.fakeCaret,
                            animatedCaretStyle,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      ) : null}
                      {!digit && !isActiveSlot ? (
                        <Text
                          pointerEvents="none"
                          style={[
                            styles.codePlaceholder,
                            {
                              color: withOpacity(colors.mutedForeground, 0.48),
                            },
                          ]}
                        >
                          •
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </Pressable>

              <View style={styles.feedbackRow}>
                {isVerifyingOtp ? (
                  <View style={styles.inlineState}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text
                      style={[
                        styles.helperText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Verifying code...
                    </Text>
                  </View>
                ) : otpModal.status === "error" ? (
                  <View style={styles.inlineState}>
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color={colors.destructive}
                    />
                    <Text
                      style={[styles.helperText, { color: colors.destructive }]}
                    >
                      The code was rejected. Request another code if needed.
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.helperText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Codes expire quickly for security. Keep this screen open
                    while checking your inbox.
                  </Text>
                )}
              </View>

              <View style={styles.footerRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={remainingSeconds > 0 || isSendingOtp}
                  onPress={handleResend}
                  style={[
                    styles.resendButton,
                    {
                      opacity: remainingSeconds > 0 || isSendingOtp ? 0.55 : 1,
                      backgroundColor: withOpacity(
                        colors.primary,
                        colorScheme === "light" ? 0.12 : 0.18,
                      ),
                      borderColor: withOpacity(
                        colors.primary,
                        colorScheme === "light" ? 0.16 : 0.28,
                      ),
                    },
                  ]}
                >
                  {isSendingOtp ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text
                      style={[styles.resendText, { color: colors.primary }]}
                    >
                      Resend code
                    </Text>
                  )}
                </Pressable>
                <Text
                  style={[
                    styles.timerLabel,
                    {
                      color: withOpacity(
                        colors.mutedForeground,
                        colorScheme === "light" ? 0.82 : 0.9,
                      ),
                    },
                  ]}
                >
                  {remainingSeconds > 0
                    ? `Available again in 00:${String(remainingSeconds).padStart(2, "0")}`
                    : "Didn’t receive a code?"}
                </Text>
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
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrap: {
    position: "relative",
    width: "100%",
  },
  cardWrapKeyboard: {
    justifyContent: "flex-start",
  },
  cardGlow: {
    position: "absolute",
    top: -6,
    right: -6,
    bottom: -6,
    left: -6,
    borderRadius: radius["3xl"],
  },
  card: {
    borderRadius: radius["3xl"],
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
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
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
    gap: spacing[2],
    marginTop: spacing[5],
  },
  codeInput: {
    width: 46,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  codeTextInput: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },
  codeDigit: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  codePlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    includeFontPadding: false,
  },
  fakeCaret: {
    width: 2,
    height: 22,
    borderRadius: radius.full,
  },
  feedbackRow: {
    minHeight: 40,
    justifyContent: "center",
    marginTop: spacing[3],
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
    marginTop: spacing[2],
    alignItems: "flex-end",
    gap: spacing[2],
  },
  timerLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
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
