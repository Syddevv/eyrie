import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryAvatar } from "@/components/category-avatar";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import type { CategoryOption } from "@/hooks/useCategories";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getBackdropButtonColor, getHandleColor, getSheetSurface, getSurfaceOverlay, getTitleColor } from "@/hooks/useTransactions";

type DeleteMode = "archive" | "delete" | "reassign";

type CategoryDeleteSheetProps = {
  visible: boolean;
  category: (CategoryOption & {
    usageCount: number;
    transactionCount: number;
    budgetCount: number;
  }) | null;
  reassignOptions: CategoryOption[];
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { mode: DeleteMode; targetCategoryId?: string }) => void;
};

export function CategoryDeleteSheet({
  visible,
  category,
  reassignOptions,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: CategoryDeleteSheetProps) {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const hasLinkedRecords = Boolean((category?.transactionCount ?? 0) > 0 || (category?.budgetCount ?? 0) > 0);
  const canHardDelete = Boolean(category && !category.isSystem && !hasLinkedRecords);

  const message = useMemo(() => {
    if (!category) {
      return "";
    }

    if (hasLinkedRecords) {
      return `${category.label} is linked to ${category.transactionCount} transaction${category.transactionCount === 1 ? "" : "s"} and ${category.budgetCount} budget${category.budgetCount === 1 ? "" : "s"}.`;
    }

    if (category.isSystem) {
      return "System categories should be archived instead of removed permanently.";
    }

    return "This custom category can be removed permanently because nothing is linked to it.";
  }, [category, hasLinkedRecords]);

  if (!visible || !category) {
    return null;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: getSurfaceOverlay(isDark) }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />

      <View style={[styles.card, getSheetSurface(isDark), shadows.floating]}>
        <View style={[styles.handle, { backgroundColor: getHandleColor(isDark) }]} />

        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${category.color}22` }]}>
            <CategoryAvatar category={category} size={20} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: getTitleColor(isDark) }]}>Manage category</Text>
            <Text style={[styles.subtitle, { color: isDark ? "#9EA6B5" : "#5B78A2" }]}>{message}</Text>
          </View>
          <Pressable
            disabled={isSubmitting}
            style={[styles.closeButton, { backgroundColor: getBackdropButtonColor(isDark) }]}
            onPress={onCancel}>
            <Feather name="x" size={18} color={getTitleColor(isDark)} />
          </Pressable>
        </View>

        {hasLinkedRecords ? (
          <>
            <Text style={[styles.sectionLabel, { color: getTitleColor(isDark) }]}>Reassign linked records</Text>
            <View style={styles.reassignList}>
              {reassignOptions.map((option) => {
                const isSelected = selectedTargetId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.reassignItem,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EEF2F7" },
                      isSelected && { borderColor: "#1495FF", borderWidth: 1 },
                    ]}
                    onPress={() => setSelectedTargetId(option.id)}>
                    <View style={[styles.reassignIconWrap, { backgroundColor: `${option.color}22` }]}>
                      <CategoryAvatar category={option} size={18} />
                    </View>
                    <Text style={[styles.reassignLabel, { color: getTitleColor(isDark) }]}>{option.label}</Text>
                    {isSelected ? <Feather name="check" size={16} color="#1495FF" /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actionsColumn}>
              <Pressable
                disabled={!selectedTargetId || isSubmitting}
                style={[styles.primaryButton, (!selectedTargetId || isSubmitting) && styles.disabledButton]}
                onPress={() => onConfirm({ mode: "reassign", targetCategoryId: selectedTargetId ?? undefined })}>
                <Text style={styles.primaryButtonText}>Reassign and Archive</Text>
              </Pressable>
              <Pressable
                disabled={isSubmitting}
                style={[styles.secondaryButton, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7" }]}
                onPress={() => onConfirm({ mode: "archive" })}>
                <Text style={[styles.secondaryButtonText, { color: getTitleColor(isDark) }]}>Archive Category</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.actionsColumn}>
            {canHardDelete ? (
              <Pressable
                disabled={isSubmitting}
                style={[styles.destructiveButton, isSubmitting && styles.disabledButton]}
                onPress={() => onConfirm({ mode: "delete" })}>
                <Text style={styles.primaryButtonText}>{isSubmitting ? "Working..." : "Delete Category"}</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={isSubmitting}
              style={[styles.secondaryButton, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7" }]}
              onPress={() => onConfirm({ mode: "archive" })}>
              <Text style={[styles.secondaryButtonText, { color: getTitleColor(isDark) }]}>Archive Category</Text>
            </Pressable>
          </View>
        )}
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
