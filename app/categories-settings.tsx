import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryAvatar } from "@/components/category-avatar";
import { CategoryDeleteSheet } from "@/components/category-delete-sheet";
import { CategoryEditorSheet, type CategoryDraft } from "@/components/category-editor-sheet";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useManagedCategories, type CategoryOption } from "@/hooks/useCategories";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { categoriesService } from "@/src/db/services";

type FilterType = "all" | "expense" | "income";

export default function CategoriesSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { user } = useCurrentUser();
  const { categories, isLoading, refresh } = useManagedCategories(true);

  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const ui = useMemo(
    () => ({
      background: { backgroundColor: isDark ? "#060B15" : colors.background },
      title: { color: isDark ? "#FFFFFF" : colors.foreground },
      subtitle: { color: isDark ? "#9EA6B5" : "#5B6980" },
      fieldSurface: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(226,232,240,0.92)",
      },
      pillSurface: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(226,232,240,0.92)",
      },
      pillSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      card: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(226,232,240,0.92)",
      },
      badgeExpense: {
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.14)" : "rgba(255, 237, 213, 0.96)",
        color: isDark ? "#FDBA74" : "#EA580C",
      },
      badgeIncome: {
        backgroundColor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(220, 252, 231, 0.96)",
        color: isDark ? "#6EE7B7" : "#059669",
      },
      archivedBadge: {
        backgroundColor: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(226, 232, 240, 0.9)",
        color: isDark ? "#CBD5E1" : "#475569",
      },
      fab: { backgroundColor: colors.primary },
    }),
    [colors, isDark],
  );

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories.filter((category) => {
      if (filterType !== "all" && category.type !== filterType) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return category.name.toLowerCase().includes(normalizedQuery);
    });
  }, [categories, filterType, query]);

  const editingCategory =
    categories.find((category) => category.id === editingCategoryId) ?? null;
  const deleteCategory =
    categories.find((category) => category.id === deleteCategoryId) ?? null;

  const deleteReassignOptions: CategoryOption[] = useMemo(() => {
    if (!deleteCategory) {
      return [];
    }

    return categories
      .filter(
        (category) =>
          category.id !== deleteCategory.id &&
          category.type === deleteCategory.type &&
          !category.isArchived,
      )
      .map((category) => ({
        id: category.id,
        label: category.name,
        type: category.type as "expense" | "income",
        iconType: (category.iconType ?? "vector") as CategoryOption["iconType"],
        icon: category.iconName ?? category.icon ?? "shape-outline",
        iconName: category.iconName ?? category.icon ?? "shape-outline",
        iconImageUri: category.iconImageUri ?? null,
        emoji: category.emoji ?? null,
        color: category.color ?? "#64748B",
        isDefault: Boolean(category.isDefault),
        isSystem: Boolean(category.isSystem),
        isArchived: Boolean(category.isArchived),
      }));
  }, [categories, deleteCategory]);

  const openCreate = () => {
    setEditingCategoryId(null);
    setIsEditorVisible(true);
  };

  const openEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setIsEditorVisible(true);
  };

  const handleSaveCategory = async (draft: CategoryDraft) => {
    setIsSavingCategory(true);

    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, {
          name: draft.name,
          type: draft.type,
          iconType: draft.iconType,
          iconName: draft.iconName,
          iconImageUri: draft.iconImageUri,
          emoji: draft.emoji,
          color: draft.color,
          icon: draft.iconType === "vector" ? draft.iconName : null,
        });
      } else {
        await categoriesService.create({
          userId: user?.id ?? null,
          name: draft.name,
          type: draft.type,
          iconType: draft.iconType,
          iconName: draft.iconName,
          iconImageUri: draft.iconImageUri,
          emoji: draft.emoji,
          color: draft.color,
          icon: draft.iconType === "vector" ? draft.iconName : null,
          isDefault: false,
          isSystem: false,
          isArchived: false,
        });
      }

      setIsEditorVisible(false);
      setEditingCategoryId(null);
      await refresh();
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (payload: {
    mode: "archive" | "delete" | "reassign";
    targetCategoryId?: string;
  }) => {
    if (!deleteCategory) {
      return;
    }

    setIsDeletingCategory(true);

    try {
      await categoriesService.deleteManaged(deleteCategory.id, payload.mode === "reassign"
        ? { mode: "reassign", targetCategoryId: payload.targetCategoryId ?? "" }
        : payload.mode === "archive"
          ? { mode: "archive" }
          : { mode: "delete" });
      setDeleteCategoryId(null);
      await refresh();
    } finally {
      setIsDeletingCategory(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, ui.background]}>
      <View style={styles.flex}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.iconButton, ui.fieldSurface]} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, ui.title]}>Categories</Text>
            <Text style={[styles.subtitle, ui.subtitle]}>
              Manage the categories used in transactions, budgets, analytics, and insights.
            </Text>
          </View>
        </View>

        <View style={[styles.searchField, ui.fieldSurface]}>
          <Feather name="search" size={18} color={ui.subtitle.color} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories"
            placeholderTextColor={ui.subtitle.color}
            selectionColor={colors.primary}
            style={[styles.searchInput, ui.title]}
          />
        </View>

        <View style={styles.segmentedRow}>
          {(["all", "expense", "income"] as const).map((value) => {
            const isSelected = filterType === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.segment,
                  ui.pillSurface,
                  isSelected && ui.pillSelected,
                ]}
                onPress={() => setFilterType(value)}>
                <Text style={[styles.segmentText, { color: isSelected ? "#FFFFFF" : ui.title.color }]}>
                  {value === "all" ? "All" : value === "expense" ? "Expense" : "Income"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {visibleCategories.map((category, index) => (
            <Animated.View
              key={category.id}
              entering={FadeInUp.delay(index * 24).duration(180)}
              layout={LinearTransition.springify().damping(18).stiffness(180)}>
              <View style={[styles.categoryCard, ui.card, shadows.soft]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIdentity}>
                    <View style={[styles.iconWrap, { backgroundColor: `${category.color}22` }]}>
                      <CategoryAvatar
                        category={{
                          iconType: (category.iconType ?? "vector") as CategoryOption["iconType"],
                          iconName: category.iconName ?? category.icon ?? "shape-outline",
                          iconImageUri: category.iconImageUri ?? null,
                          emoji: category.emoji ?? null,
                          color: category.color ?? "#64748B",
                        }}
                        size={22}
                      />
                    </View>
                    <View style={styles.cardTextBlock}>
                      <Text style={[styles.cardTitle, ui.title]}>{category.name}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable style={[styles.actionButton, ui.fieldSurface]} onPress={() => openEdit(category.id)}>
                      <Feather name="edit-3" size={16} color={colors.foreground} />
                    </Pressable>
                    <Pressable style={[styles.actionButton, ui.fieldSurface]} onPress={() => setDeleteCategoryId(category.id)}>
                      <Feather name="trash-2" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: category.type === "expense" ? ui.badgeExpense.backgroundColor : ui.badgeIncome.backgroundColor },
                    ]}>
                    <Text
                      style={[
                        styles.badgeText,
                        { color: category.type === "expense" ? ui.badgeExpense.color : ui.badgeIncome.color },
                      ]}>
                      {category.type === "expense" ? "Expense" : "Income"}
                    </Text>
                  </View>

                  {category.isArchived ? (
                    <View style={[styles.badge, { backgroundColor: ui.archivedBadge.backgroundColor }]}>
                      <Text style={[styles.badgeText, { color: ui.archivedBadge.color }]}>Archived</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ))}

          {!visibleCategories.length ? (
            <View style={[styles.emptyCard, ui.card, shadows.soft]}>
              <Text style={[styles.emptyTitle, ui.title]}>
                {isLoading ? "Loading categories..." : "No categories found"}
              </Text>
              <Text style={[styles.emptyText, ui.subtitle]}>
                Try a different search or create a new category for your flows.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <Pressable style={[styles.fab, ui.fab, shadows.floating]} onPress={openCreate}>
          <Feather name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>Create Category</Text>
        </Pressable>
      </View>

      <CategoryEditorSheet
        visible={isEditorVisible}
        title={editingCategory ? "Edit Category" : "Create Category"}
        saveLabel={editingCategory ? "Save Changes" : "Create Category"}
        initialValue={
          editingCategory
            ? {
                name: editingCategory.name,
                type: editingCategory.type as "expense" | "income",
                iconType: (editingCategory.iconType ?? "vector") as CategoryDraft["iconType"],
                iconName: editingCategory.iconName ?? editingCategory.icon ?? "shape-outline",
                iconImageUri: editingCategory.iconImageUri ?? null,
                emoji: editingCategory.emoji ?? "🏷️",
                color: editingCategory.color ?? "#1495FF",
              }
            : undefined
        }
        isSaving={isSavingCategory}
        onClose={() => {
          setIsEditorVisible(false);
          setEditingCategoryId(null);
        }}
        onSave={handleSaveCategory}
      />

      <CategoryDeleteSheet
        visible={Boolean(deleteCategory)}
        category={
          deleteCategory
            ? {
                id: deleteCategory.id,
                label: deleteCategory.name,
                type: deleteCategory.type as "expense" | "income",
                iconType: (deleteCategory.iconType ?? "vector") as CategoryOption["iconType"],
                icon: deleteCategory.iconName ?? deleteCategory.icon ?? "shape-outline",
                iconName: deleteCategory.iconName ?? deleteCategory.icon ?? "shape-outline",
                iconImageUri: deleteCategory.iconImageUri ?? null,
                emoji: deleteCategory.emoji ?? null,
                color: deleteCategory.color ?? "#64748B",
                isDefault: Boolean(deleteCategory.isDefault),
                isSystem: Boolean(deleteCategory.isSystem),
                isArchived: Boolean(deleteCategory.isArchived),
                usageCount: deleteCategory.usageCount,
                transactionCount: deleteCategory.transactionCount,
                budgetCount: deleteCategory.budgetCount,
              }
            : null
        }
        reassignOptions={deleteReassignOptions}
        isSubmitting={isDeletingCategory}
        onCancel={() => {
          if (!isDeletingCategory) {
            setDeleteCategoryId(null);
          }
        }}
        onConfirm={handleDeleteCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  searchField: {
    marginTop: 18,
    marginHorizontal: 14,
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  segmentedRow: {
    marginTop: 14,
    marginHorizontal: 14,
    flexDirection: "row",
    gap: 10,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 12,
  },
  categoryCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  cardMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgesRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    minHeight: 28,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
  },
  emptyCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 26,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 28,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fabText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
});
