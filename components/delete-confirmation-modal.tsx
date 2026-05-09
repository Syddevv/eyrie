import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getBackdropButtonColor,
  getDestructiveTint,
  getHandleColor,
  getSheetSurface,
  getSurfaceOverlay,
  getTitleColor,
} from "@/hooks/useTransactions";

type DeleteConfirmationModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationModal({
  visible,
  title = "Delete transaction?",
  message = "This transaction will be removed permanently and your balances and budgets will be updated.",
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: getSurfaceOverlay(isDark) }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />

      <View style={[styles.card, getSheetSurface(isDark), shadows.floating]}>
        <View style={[styles.handle, { backgroundColor: getHandleColor(isDark) }]} />

        <View style={styles.iconRow}>
          <View style={[styles.iconWrap, { backgroundColor: getDestructiveTint(isDark) }]}>
            <Feather name="trash-2" size={18} color="#FF5C73" />
          </View>
          <Pressable
            disabled={isDeleting}
            style={[styles.closeButton, { backgroundColor: getBackdropButtonColor(isDark) }]}
            onPress={onCancel}>
            <Feather name="x" size={18} color={getTitleColor(isDark)} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: getTitleColor(isDark) }]}>{title}</Text>
        <Text style={[styles.message, { color: isDark ? "#9EA6B5" : "#5B78A2" }]}>{message}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={isDeleting}
            style={[styles.secondaryButton, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7" }]}
            onPress={onCancel}>
            <Text style={[styles.secondaryText, { color: getTitleColor(isDark) }]}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={isDeleting}
            style={[styles.primaryButton, isDeleting && styles.buttonDisabled]}
            onPress={onConfirm}>
            <Text style={styles.primaryText}>{isDeleting ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  message: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    marginTop: 22,
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5C73",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
