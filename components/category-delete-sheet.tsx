import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryAvatar } from "@/components/category-avatar";
import { LoadingActionButton } from "@/components/loading-action-button";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import type { CategoryOption } from "@/hooks/useCategories";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getBackdropButtonColor,
  getHandleColor,
  getSheetSurface,
  getSurfaceOverlay,
  getTitleColor,
} from "@/hooks/useTransactions";

type DeleteMode = "archive" | "delete";

type CategoryDeleteSheetProps = {
  visible: boolean;
  category:
    | (CategoryOption & {
        usageCount: number;
        transactionCount: number;
        budgetCount: number;
      })
    | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { mode: DeleteMode }) => void;
};

export function CategoryDeleteSheet({
  visible,
  category,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: CategoryDeleteSheetProps) {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  const message = useMemo(() => {
    if (!category) {
      return "";
    }

    if (category.isSystem) {
      return "System categories cannot be deleted. You can archive it instead.";
    }

    return "Archive this category to hide it from future transactions while keeping its history intact.";
  }, [category]);

  if (!visible || !category) {
    return null;
  }

  return (
    <View
      style={[styles.overlay, { backgroundColor: getSurfaceOverlay(isDark) }]}
    >
      <Pressable
        disabled={isSubmitting}
        style={StyleSheet.absoluteFillObject}
        onPress={onCancel}
      />

      <View style={[styles.card, getSheetSurface(isDark), shadows.floating]}>
        <View
          style={[styles.handle, { backgroundColor: getHandleColor(isDark) }]}
        />

        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: `${category.color}22` },
            ]}
          >
            <CategoryAvatar category={category} size={20} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: getTitleColor(isDark) }]}>
              Manage category
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? "#9EA6B5" : "#5B78A2" },
              ]}
            >
              {message}
            </Text>
          </View>
          <Pressable
            disabled={isSubmitting}
            style={[
              styles.closeButton,
              { backgroundColor: getBackdropButtonColor(isDark) },
            ]}
            onPress={onCancel}
          >
            <Feather name="x" size={18} color={getTitleColor(isDark)} />
          </Pressable>
        </View>

        <View style={styles.actionsColumn}>
          {category.isSystem ? (
            <LoadingActionButton
              label="Archive Category"
              loadingLabel="Archiving..."
              loading={isSubmitting}
              haptic="destructive"
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#EEF2F7",
                },
              ]}
              textStyle={[
                styles.secondaryButtonText,
                { color: getTitleColor(isDark) },
              ]}
              spinnerColor={getTitleColor(isDark)}
              onPress={() => onConfirm({ mode: "archive" })}
            />
          ) : (
            <>
              <LoadingActionButton
                label="Archive Category"
                loadingLabel="Archiving..."
                loading={isSubmitting}
                haptic="destructive"
                style={[
                  styles.primaryButton,
                  isSubmitting && styles.disabledButton,
                ]}
                textStyle={styles.primaryButtonText}
                spinnerColor="#FFFFFF"
                onPress={() => onConfirm({ mode: "archive" })}
              />
              <LoadingActionButton
                label="Delete Category"
                loadingLabel="Deleting..."
                loading={isSubmitting}
                haptic="destructive"
                style={[
                  styles.destructiveButton,
                  isSubmitting && styles.disabledButton,
                ]}
                textStyle={styles.primaryButtonText}
                spinnerColor="#FFFFFF"
                onPress={() => onConfirm({ mode: "delete" })}
              />
            </>
          )}
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
    maxHeight: "82%",
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  reassignList: {
    gap: 10,
  },
  reassignItem: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reassignIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  reassignLabel: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  actionsColumn: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1495FF",
  },
  destructiveButton: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5C73",
  },
  secondaryButton: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  secondaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
