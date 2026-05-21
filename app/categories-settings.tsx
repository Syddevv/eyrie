import { Feather } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import {
  MOTION_DURATION,
  createStaggerDelay,
  createSpringLayoutTransition,
} from "@/constants/motion";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "@/store/useAuthStore";

import { CategoryAvatar } from "@/components/category-avatar";
import { CategoryDeleteSheet } from "@/components/category-delete-sheet";
import {
  CategoryEditorSheet,
  type CategoryDraft,
} from "@/components/category-editor-sheet";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import {
  useManagedCategories,
  type CategoryOption,
} from "@/hooks/useCategories";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { categoriesService } from "@/src/db/services";

type FilterType = "all" | "expense" | "income";

const HEADER_HORIZONTAL_PADDING = 14;
const HEADER_TOP_PADDING = 12;
const HEADER_CONTENT_MIN_HEIGHT = 94;
const SEARCH_FIELD_HEIGHT = 50;
const SEGMENT_HEIGHT = 40;

export default function CategoriesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { user, isLoading: isCurrentUserLoading } = useCurrentUser();
  const { categories, isLoading, refresh } = useManagedCategories(true);
  const showSnackbar = useAuthStore((s) => s.showSnackbar);
  const [iconFontLoaded, iconFontError] = useFonts(Feather.font);

  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isUnarchivingId, setIsUnarchivingId] = useState<string | null>(null);
  const [hasSettledNavigation, setHasSettledNavigation] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setHasSettledNavigation(true);
    });

    return () => {
      task.cancel();
    };
  }, []);

  const ui = useMemo(
    () => ({
      background: { backgroundColor: isDark ? "#060B15" : colors.background },
      title: { color: isDark ? "#FFFFFF" : colors.foreground },
      subtitle: { color: isDark ? "#9EA6B5" : "#5B6980" },
      fieldSurface: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(226,232,240,0.92)",
      },
      pillSurface: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(226,232,240,0.92)",
      },
      pillSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      card: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(226,232,240,0.92)",
      },
      badgeExpense: {
        backgroundColor: isDark
          ? "rgba(249, 115, 22, 0.14)"
          : "rgba(255, 237, 213, 0.96)",
        color: isDark ? "#FDBA74" : "#EA580C",
      },
      badgeIncome: {
        backgroundColor: isDark
          ? "rgba(16, 185, 129, 0.14)"
          : "rgba(220, 252, 231, 0.96)",
        color: isDark ? "#6EE7B7" : "#059669",
      },
      archivedBadge: {
        backgroundColor: isDark
          ? "rgba(148, 163, 184, 0.16)"
          : "rgba(226, 232, 240, 0.9)",
        color: isDark ? "#CBD5E1" : "#475569",
      },
      fab: { backgroundColor: colors.primary },
      skeletonLine: isDark
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(148, 163, 184, 0.16)",
      skeletonLineStrong: isDark
        ? "rgba(148, 163, 184, 0.28)"
        : "rgba(148, 163, 184, 0.2)",
    }),
    [colors, isDark],
  );

  const hasResolvedSafeAreaTop = Platform.OS === "android" || insets.top > 0;
  const hasHeaderAssetsReady = iconFontLoaded || iconFontError !== null;
  const isInitialCategoriesLoading = isLoading && categories.length === 0;
  const shouldShowStartupSkeleton =
    !hasResolvedSafeAreaTop ||
    !hasHeaderAssetsReady ||
    !hasSettledNavigation ||
    isCurrentUserLoading ||
    isInitialCategoriesLoading;

  const headerBlockStyle = useMemo(
    () => ({
      paddingTop: insets.top + HEADER_TOP_PADDING,
      minHeight: insets.top + HEADER_TOP_PADDING + HEADER_CONTENT_MIN_HEIGHT,
    }),
    [insets.top],
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

  const activeCategories = useMemo(
    () => visibleCategories.filter((cat) => !cat.isArchived),
    [visibleCategories],
  );

  const archivedCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories.filter((category) => {
      if (!category.isArchived) {
        return false;
      }

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
  const isProtectedCategory = (category?: CategoryOption | null) =>
    Boolean(category?.isDefault || category?.isSystem);
  const getProtectionLabel = (category?: CategoryOption | null) => {
    if (!category) {
      return null;
    }

    if (category.isSystem) {
      return "System";
    }

    if (category.isDefault) {
      return "Default";
    }

    return null;
  };

  const openCreate = () => {
    setEditingCategoryId(null);
    setIsEditorVisible(true);
  };

  const openEdit = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId) ?? null;

    if (isProtectedCategory(category)) {
      showSnackbar("Default categories cannot be edited.", "error");
      return;
    }

    setEditingCategoryId(categoryId);
    setIsEditorVisible(true);
  };

  const handleSaveCategory = async (draft: CategoryDraft) => {
    setIsSavingCategory(true);

    try {
      if (editingCategory) {
        if (isProtectedCategory(editingCategory)) {
          showSnackbar("Default categories cannot be edited.", "error");
          return;
        }

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
      Keyboard.dismiss();
      await refresh();
      if (!editingCategory) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        showSnackbar("Category created successfully", "success");
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (payload: {
    mode: "archive" | "delete";
  }) => {
    if (!deleteCategory) {
      return;
    }

    if (isProtectedCategory(deleteCategory)) {
      showSnackbar("Default categories cannot be deleted.", "error");
      return;
    }

    setIsDeletingCategory(true);

    try {
      await categoriesService.deleteManaged(deleteCategory.id, {
        mode: payload.mode,
      });
      setDeleteCategoryId(null);
      await refresh();
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleUnarchiveCategory = async (categoryId: string) => {
    setIsUnarchivingId(categoryId);

    try {
      await categoriesService.restore(categoryId);
      await refresh();
    } finally {
      setIsUnarchivingId(null);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, ui.background]}
    >
      <View style={styles.flex}>
        <View style={[styles.headerBlock, headerBlockStyle]}>
          <View style={styles.headerRow}>
            {hasHeaderAssetsReady ? (
              <Pressable
                style={[styles.iconButton, ui.fieldSurface]}
                onPress={() => router.back()}
              >
                <Feather
                  name="chevron-left"
                  size={20}
                  color={colors.foreground}
                />
              </Pressable>
            ) : (
              <View style={[styles.iconButton, ui.fieldSurface]} />
            )}
            <View style={styles.headerTextBlock}>
              {shouldShowStartupSkeleton ? (
                <View style={styles.headerSkeletonWrap}>
                  <View
                    style={[
                      styles.headerSkeletonLine,
                      styles.headerSkeletonTitle,
                      { backgroundColor: ui.skeletonLineStrong },
                    ]}
                  />
                  <View
                    style={[
                      styles.headerSkeletonLine,
                      styles.headerSkeletonSubtitlePrimary,
                      { backgroundColor: ui.skeletonLine },
                    ]}
                  />
                  <View
                    style={[
                      styles.headerSkeletonLine,
                      styles.headerSkeletonSubtitleSecondary,
                      { backgroundColor: ui.skeletonLine },
                    ]}
                  />
                </View>
              ) : (
                <>
                  <Text style={[styles.title, ui.title]}>Categories</Text>
                  <Text style={[styles.subtitle, ui.subtitle]}>
                    Manage the categories used in transactions, budgets,
                    analytics, and insights.
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {shouldShowStartupSkeleton ? (
          <View style={[styles.searchField, ui.fieldSurface]}>
            <View
              style={[
                styles.searchSkeletonIcon,
                { backgroundColor: ui.skeletonLine },
              ]}
            />
            <View
              style={[
                styles.searchSkeletonText,
                { backgroundColor: ui.skeletonLineStrong },
              ]}
            />
          </View>
        ) : (
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
        )}

        <View style={styles.segmentedRow}>
          {(["all", "expense", "income"] as const).map((value) => {
            const isSelected = filterType === value;

            if (shouldShowStartupSkeleton) {
              return (
                <View key={value} style={[styles.segment, ui.pillSurface]}>
                  <View
                    style={[
                      styles.segmentSkeletonText,
                      { backgroundColor: ui.skeletonLineStrong },
                    ]}
                  />
                </View>
              );
            }

            return (
              <Pressable
                key={value}
                style={[
                  styles.segment,
                  ui.pillSurface,
                  isSelected && ui.pillSelected,
                ]}
                onPress={() => setFilterType(value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: isSelected ? "#FFFFFF" : ui.title.color },
                  ]}
                >
                  {value === "all"
                    ? "All"
                    : value === "expense"
                      ? "Expense"
                      : "Income"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {shouldShowStartupSkeleton ? (
            <View style={styles.skeletonList}>
              <View
                style={[
                  styles.sectionTitleSkeleton,
                  { backgroundColor: ui.skeletonLineStrong },
                ]}
              />
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={`category-skeleton-${index}`}
                  style={[styles.categoryCard, ui.card, shadows.soft]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIdentity}>
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: ui.skeletonLine },
                        ]}
                      />
                      <View style={styles.cardTextBlock}>
                        <View
                          style={[
                            styles.cardTitleSkeleton,
                            { backgroundColor: ui.skeletonLineStrong },
                          ]}
                        />
                        <View
                          style={[
                            styles.cardMetaSkeleton,
                            { backgroundColor: ui.skeletonLine },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <View
                        style={[
                          styles.actionButton,
                          ui.fieldSurface,
                          styles.actionButtonSkeleton,
                        ]}
                      />
                      <View
                        style={[
                          styles.actionButton,
                          ui.fieldSurface,
                          styles.actionButtonSkeleton,
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.badgeSkeleton,
                        { backgroundColor: ui.skeletonLine },
                      ]}
                    />
                    <View
                      style={[
                        styles.badgeSkeletonSecondary,
                        { backgroundColor: ui.skeletonLine },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {archivedCategories.length ? (
                <View style={styles.archivedSection}>
                  <Text style={[styles.archivedSectionTitle, ui.title]}>
                    Archived Categories
                  </Text>
                  <View style={styles.archivedCategoriesList}>
                    {archivedCategories.map((category) => (
                      <View
                        key={category.id}
                        style={[
                          styles.archivedCategoryCard,
                          ui.card,
                          shadows.soft,
                        ]}
                      >
                        <View style={styles.archivedCardContent}>
                          <View
                            style={[
                              styles.iconWrap,
                              { backgroundColor: `${category.color}22` },
                            ]}
                          >
                            <CategoryAvatar
                              category={{
                                iconType: (category.iconType ??
                                  "vector") as CategoryOption["iconType"],
                                iconName:
                                  category.iconName ??
                                  category.icon ??
                                  "shape-outline",
                                iconImageUri: category.iconImageUri ?? null,
                                emoji: category.emoji ?? null,
                                color: category.color ?? "#64748B",
                              }}
                              size={20}
                            />
                          </View>
                          <View style={styles.cardTextBlock}>
                            <Text style={[styles.cardTitle, ui.title]}>
                              {category.name}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          disabled={isUnarchivingId === category.id}
                          style={[
                            styles.unarchiveButton,
                            isUnarchivingId === category.id &&
                              styles.unarchiveButtonDisabled,
                          ]}
                          onPress={() => handleUnarchiveCategory(category.id)}
                        >
                          <Feather
                            name="rotate-ccw"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.unarchiveButtonText,
                              { color: colors.primary },
                            ]}
                          >
                            {isUnarchivingId === category.id
                              ? "Restoring..."
                              : "Restore"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {activeCategories.length ? (
                <Text style={[styles.activeSectionTitle, ui.title]}>
                  Active Categories
                </Text>
              ) : null}

              {activeCategories.map((category, index) => (
                <Animated.View
                  key={category.id}
                  entering={FadeInUp.delay(
                    createStaggerDelay(index, 0, 24),
                  ).duration(MOTION_DURATION.FAST)}
                  layout={createSpringLayoutTransition()}
                >
                  <View style={[styles.categoryCard, ui.card, shadows.soft]}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardIdentity}>
                        <View
                          style={[
                            styles.iconWrap,
                            { backgroundColor: `${category.color}22` },
                          ]}
                        >
                          <CategoryAvatar
                            category={{
                              iconType: (category.iconType ??
                                "vector") as CategoryOption["iconType"],
                              iconName:
                                category.iconName ??
                                category.icon ??
                                "shape-outline",
                              iconImageUri: category.iconImageUri ?? null,
                              emoji: category.emoji ?? null,
                              color: category.color ?? "#64748B",
                            }}
                            size={22}
                          />
                        </View>
                        <View style={styles.cardTextBlock}>
                          <Text style={[styles.cardTitle, ui.title]}>
                            {category.name}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        {!isProtectedCategory(category) ? (
                          <>
                            <Pressable
                              style={[styles.actionButton, ui.fieldSurface]}
                              onPress={() => openEdit(category.id)}
                            >
                              <Feather
                                name="edit-3"
                                size={16}
                                color={colors.foreground}
                              />
                            </Pressable>
                            <Pressable
                              style={[styles.actionButton, ui.fieldSurface]}
                              onPress={() => setDeleteCategoryId(category.id)}
                            >
                              <Feather
                                name="trash-2"
                                size={16}
                                color={colors.foreground}
                              />
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.badgesRow}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              category.type === "expense"
                                ? ui.badgeExpense.backgroundColor
                                : ui.badgeIncome.backgroundColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                category.type === "expense"
                                  ? ui.badgeExpense.color
                                  : ui.badgeIncome.color,
                            },
                          ]}
                        >
                          {category.type === "expense" ? "Expense" : "Income"}
                        </Text>
                      </View>
                      {getProtectionLabel(category) ? (
                        <View style={[styles.badge, ui.archivedBadge]}>
                          <Text
                            style={[
                              styles.badgeText,
                              { color: ui.archivedBadge.color },
                            ]}
                          >
                            {getProtectionLabel(category)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Animated.View>
              ))}

              {!activeCategories.length && !archivedCategories.length ? (
                <View style={[styles.emptyCard, ui.card, shadows.soft]}>
                  <Text style={[styles.emptyTitle, ui.title]}>
                    {isLoading
                      ? "Loading categories..."
                      : "No categories found"}
                  </Text>
                  <Text style={[styles.emptyText, ui.subtitle]}>
                    Try a different search or create a new category for your
                    flows.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <Pressable
          style={[styles.fab, ui.fab, shadows.floating]}
          onPress={openCreate}
        >
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
                iconType: (editingCategory.iconType ??
                  "vector") as CategoryDraft["iconType"],
                iconName:
                  editingCategory.iconName ??
                  editingCategory.icon ??
                  "shape-outline",
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
                iconType: (deleteCategory.iconType ??
                  "vector") as CategoryOption["iconType"],
                icon:
                  deleteCategory.iconName ??
                  deleteCategory.icon ??
                  "shape-outline",
                iconName:
                  deleteCategory.iconName ??
                  deleteCategory.icon ??
                  "shape-outline",
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
  headerBlock: {
    paddingHorizontal: HEADER_HORIZONTAL_PADDING,
  },
  headerRow: {
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
    minHeight: HEADER_CONTENT_MIN_HEIGHT,
  },
  headerSkeletonWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  headerSkeletonLine: {
    borderRadius: radius.full,
  },
  headerSkeletonTitle: {
    width: "44%",
    height: 26,
  },
  headerSkeletonSubtitlePrimary: {
    width: "92%",
    height: 16,
  },
  headerSkeletonSubtitleSecondary: {
    width: "72%",
    height: 16,
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
    marginHorizontal: HEADER_HORIZONTAL_PADDING,
    height: SEARCH_FIELD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchSkeletonIcon: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
  },
  searchSkeletonText: {
    width: "56%",
    height: 18,
    borderRadius: radius.full,
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
    marginHorizontal: HEADER_HORIZONTAL_PADDING,
    paddingBottom: 14,
    flexDirection: "row",
    gap: 10,
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSkeletonText: {
    width: "42%",
    height: 16,
    borderRadius: radius.full,
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    paddingHorizontal: HEADER_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 12,
  },
  skeletonList: {
    gap: 12,
  },
  sectionTitleSkeleton: {
    width: 168,
    height: 18,
    borderRadius: radius.full,
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 2,
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
  cardTitleSkeleton: {
    width: "78%",
    height: 18,
    borderRadius: radius.full,
  },
  cardMetaSkeleton: {
    width: "46%",
    height: 14,
    borderRadius: radius.full,
    marginTop: 8,
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
  actionButtonSkeleton: {
    opacity: 0.9,
  },
  badgesRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeSkeleton: {
    width: 92,
    height: 28,
    borderRadius: radius.full,
  },
  badgeSkeletonSecondary: {
    width: 126,
    height: 28,
    borderRadius: radius.full,
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
  archivedSection: {
    marginTop: 20,
  },
  archivedSectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    marginBottom: 12,
    marginHorizontal: 2,
  },
  activeSectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    marginBottom: 12,
    marginHorizontal: 2,
    marginTop: 20,
  },
  archivedCategoriesList: {
    gap: 10,
  },
  archivedCategoryCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  archivedCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  unarchiveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  unarchiveButtonDisabled: {
    opacity: 0.5,
  },
  unarchiveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
  },
});
