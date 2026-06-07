import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LoadingActionButton } from "@/components/loading-action-button";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { paylatersService } from "@/src/db/services";
import { onPaylatersChanged } from "@/src/lib/dbSync";

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export default function EditPaylaterModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paylaterId?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const paylaterId = getParamValue(params.paylaterId);
  const [title, setTitle] = useState("Paylater");
  const [remainingBalance, setRemainingBalance] = useState("0");
  const [installmentAmount, setInstallmentAmount] = useState("0");
  const [dueDay, setDueDay] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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
    if (!paylaterId) {
      return;
    }

    const hydrate = async () => {
      const paylater = await paylatersService.fetchById(paylaterId);
      if (!paylater) {
        return;
      }

      setTitle(paylater.itemName);
      setRemainingBalance(String(Number(paylater.remainingBalance ?? 0)));
      setInstallmentAmount(String(Number(paylater.installmentAmount ?? 0)));
      setDueDay(paylater.dueDay ?? "1");
    };

    void hydrate().catch(() => undefined);
    const off = onPaylatersChanged(() => {
      void hydrate().catch(() => undefined);
    });

    return () => off();
  }, [paylaterId]);

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.56)"
          : "rgba(15, 23, 42, 0.26)",
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.06)",
      },
      handle: {
        backgroundColor: isDark ? "#64748B" : "#CBD5E1",
      },
      title: {
        color: colors.foreground,
      },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(241, 245, 249, 0.98)",
      },
      closeIcon: {
        color: isDark ? "#D4DCE6" : "#202733",
      },
      label: {
        color: colors.foreground,
      },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EEF2F7",
        borderColor: isDark ? "rgba(255,255,255,0.04)" : "#E6EBF2",
      },
      fieldText: {
        color: colors.foreground,
      },
      placeholder: {
        color: isDark ? "#8F9CAF" : "#8A94A6",
      },
      peso: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
      cancelButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
      cancelText: {
        color: colors.foreground,
      },
      saveButton: {
        backgroundColor: "#168CF3",
        opacity: isSubmitting ? 0.7 : 1,
      },
      saveButtonText: {
        color: "#FFFFFF",
      },
      helperText: {
        color: isDark ? "#A9B6C8" : "#6B7280",
      },
    }),
    [colors, isDark, isSubmitting],
  );

  const handleSave = async () => {
    if (!paylaterId) {
      Alert.alert("Unable to save", "Missing paylater record.");
      return;
    }

    try {
      setIsSubmitting(true);
      await waitForNextFrame();
      await paylatersService.update(paylaterId, {
        remainingBalance: Number(remainingBalance || 0),
        installmentAmount: Number(installmentAmount || 0),
        dueDay: dueDay.trim(),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to save changes",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - 8),
            },
          ]}
        >
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>{title}</Text>
            <Pressable
              style={[styles.closeButton, ui.closeButton]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <View style={styles.section}>
                <Text style={[styles.label, ui.label]}>Remaining Balance</Text>
                <View
                  style={[styles.fieldSurface, ui.fieldSurface, styles.currencyField]}
                >
                  <Text style={[styles.peso, ui.peso]}>PHP</Text>
                  <TextInput
                    value={remainingBalance}
                    onChangeText={(value) => setRemainingBalance(digitsOnly(value))}
                    placeholder="0"
                    placeholderTextColor={ui.placeholder.color}
                    keyboardType="number-pad"
                    selectionColor="#6DB2EE"
                    style={[styles.fieldInput, styles.flexFieldInput, ui.fieldText]}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, ui.label]}>Installment Amount</Text>
                <View
                  style={[styles.fieldSurface, ui.fieldSurface, styles.currencyField]}
                >
                  <Text style={[styles.peso, ui.peso]}>PHP</Text>
                  <TextInput
                    value={installmentAmount}
                    onChangeText={(value) => setInstallmentAmount(digitsOnly(value))}
                    placeholder="0"
                    placeholderTextColor={ui.placeholder.color}
                    keyboardType="number-pad"
                    selectionColor="#6DB2EE"
                    style={[styles.fieldInput, styles.flexFieldInput, ui.fieldText]}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, ui.label]}>Due Date (Day of Month)</Text>
                <View style={[styles.fieldSurface, ui.fieldSurface]}>
                  <TextInput
                    value={dueDay}
                    onChangeText={(value) => setDueDay(digitsOnly(value))}
                    placeholder="1"
                    placeholderTextColor={ui.placeholder.color}
                    keyboardType="number-pad"
                    selectionColor="#6DB2EE"
                    style={[styles.fieldInput, ui.fieldText]}
                  />
                </View>
              </View>

              <Text style={[styles.helperText, ui.helperText]}>
                Changes update the paylater record after saving.
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, ui.cancelButton]}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.actionText, ui.cancelText]}>Cancel</Text>
                </Pressable>

                <LoadingActionButton
                  style={[styles.actionButton, styles.saveActionButton, ui.saveButton]}
                  label="Save Changes"
                  loadingLabel="Saving..."
                  loading={isSubmitting}
                  spinnerColor={ui.saveButtonText.color}
                  haptic="default"
                  textStyle={[styles.actionText, ui.saveButtonText]}
                  contentStyle={styles.loadingButtonContent}
                  preserveLabelWidth={false}
                  leftAdornment={
                    <Feather
                      name="check"
                      size={16}
                      color={ui.saveButtonText.color}
                    />
                  }
                  onPress={() => {
                    void handleSave();
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollInner: {
    paddingBottom: 8,
  },
  handle: {
    alignSelf: "center",
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    paddingTop: 20,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 48,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  flexFieldInput: {
    flex: 1,
  },
  currencyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-start",
  },
  peso: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  helperText: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
  saveActionButton: {
    flex: 1.3,
  },
  loadingButtonContent: {
    minWidth: 0,
  },
  actionText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
