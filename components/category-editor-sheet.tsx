import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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
  useWindowDimensions,
  View,
} from "react-native";

import { CategoryAvatar } from "@/components/category-avatar";
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_EMOJI_PRESETS,
  CATEGORY_ICON_PRESETS,
} from "@/constants/category-presets";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { CategoryType } from "@/src/db/utils/constants";

export type CategoryDraft = {
  name: string;
  type: CategoryType;
  iconType: "vector" | "emoji" | "uploaded_image";
  iconName: string;
  iconImageUri: string | null;
  emoji: string | null;
  color: string;
};

type CategoryEditorSheetProps = {
  visible: boolean;
  title: string;
  saveLabel: string;
  initialValue?: Partial<CategoryDraft>;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (draft: CategoryDraft) => Promise<void> | void;
};

const DEFAULT_DRAFT: CategoryDraft = {
  name: "",
  type: "expense",
  iconType: "vector",
  iconName: "shape-outline",
  iconImageUri: null,
  emoji: "🏷️",
  color: "#1495FF",
};

function buildDraft(initialValue?: Partial<CategoryDraft>): CategoryDraft {
  return {
    ...DEFAULT_DRAFT,
    ...initialValue,
    iconName: initialValue?.iconName ?? DEFAULT_DRAFT.iconName,
    emoji: initialValue?.emoji ?? DEFAULT_DRAFT.emoji,
  };
}

function isSupportedImage(uri: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(uri);
}

export function CategoryEditorSheet({
  visible,
  title,
  saveLabel,
  initialValue,
  isSaving = false,
  onClose,
  onSave,
}: CategoryEditorSheetProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<CategoryDraft>(buildDraft(initialValue));
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(buildDraft(initialValue));
  }, [initialValue, visible]);

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

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark ? "rgba(2, 6, 23, 0.6)" : "rgba(15, 23, 42, 0.24)",
      },
      sheet: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(226, 232, 240, 0.92)",
      },
      handle: { backgroundColor: isDark ? "#64748B" : "#CBD5E1" },
      title: { color: colors.foreground },
      muted: { color: isDark ? "#9EA6B5" : "#64748B" },
      fieldSurface: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.26)" : "rgba(241, 245, 249, 0.8)",
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(226, 232, 240, 0.92)",
      },
      selectedSurface: {
        backgroundColor: isDark ? "rgba(20, 149, 255, 0.16)" : "rgba(20, 149, 255, 0.1)",
        borderColor: "#1495FF",
      },
      closeButton: {
        backgroundColor: isDark ? "#1A2230" : colors.secondary,
      },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
      },
    }),
    [colors, isDark],
  );

  const previewCategory = {
    ...draft,
    label: draft.name.trim() || "New Category",
  };
  const usesUploadedImage = draft.iconType === "uploaded_image";
  const isKeyboardOpen = keyboardHeight > 0;
  const maxSheetHeight = Math.min(
    windowHeight * 0.86,
    Math.max(320, windowHeight - keyboardHeight - 24),
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow gallery access to use a custom category icon.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri ?? "";

    if (!isSupportedImage(uri)) {
      Alert.alert("Unsupported image", "Use a PNG, JPG, or WebP image.");
      return;
    }

    if ((asset.fileSize ?? 0) > 4 * 1024 * 1024) {
      Alert.alert("Image too large", "Choose an image smaller than 4MB.");
      return;
    }

    await Haptics.selectionAsync();
    setDraft((current) => ({
      ...current,
      iconType: "uploaded_image",
      iconImageUri: uri,
    }));
  };

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      Alert.alert("Missing name", "Enter a category name.");
      return;
    }

    await onSave({
      ...draft,
      name: draft.name.trim(),
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            { maxHeight: maxSheetHeight },
            isKeyboardOpen && styles.sheetCompact,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>{title}</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={onClose}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={isKeyboardOpen ? styles.scrollContentCompact : styles.scrollContent}>
            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.label, ui.title]}>Category name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
                placeholder="e.g. Side Hustle"
                placeholderTextColor={ui.muted.color}
                selectionColor={colors.primary}
                style={[styles.textField, ui.fieldSurface, ui.title, isKeyboardOpen && styles.textFieldCompact]}
              />
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.label, ui.title]}>Type</Text>
              <View style={styles.segmentedRow}>
                {(["expense", "income"] as const).map((type) => {
                  const isSelected = draft.type === type;
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.segment,
                        ui.fieldSurface,
                        isKeyboardOpen && styles.segmentCompact,
                        isSelected && ui.selectedSurface,
                      ]}
                      onPress={() => setDraft((current) => ({ ...current, type }))}>
                      <Text style={[styles.segmentText, ui.title]}>
                        {type === "expense" ? "Expense" : "Income"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.label, ui.title]}>Icon style</Text>
              <View style={styles.segmentedRow}>
                {([
                  { key: "vector", label: "Built-in" },
                  { key: "emoji", label: "Emoji" },
                  { key: "uploaded_image", label: "Image" },
                ] as const).map((item) => {
                  const isSelected = draft.iconType === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      style={[
                        styles.segment,
                        ui.fieldSurface,
                        isKeyboardOpen && styles.segmentCompact,
                        isSelected && ui.selectedSurface,
                      ]}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          iconType: item.key,
                        }))
                      }>
                      <Text style={[styles.segmentText, ui.title]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {draft.iconType === "vector" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <Text style={[styles.label, ui.title]}>Built-in icon</Text>
                <View style={[styles.iconGrid, isKeyboardOpen && styles.iconGridCompact]}>
                  {CATEGORY_ICON_PRESETS.map((iconName) => {
                    const isSelected = draft.iconName === iconName;
                    return (
                      <Pressable
                        key={iconName}
                        style={[
                          styles.iconCell,
                          ui.fieldSurface,
                          isKeyboardOpen && styles.iconCellCompact,
                          isSelected && ui.selectedSurface,
                        ]}
                        onPress={async () => {
                          await Haptics.selectionAsync();
                          setDraft((current) => ({ ...current, iconName }));
                        }}>
                        <MaterialCommunityIcons
                          name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                          size={20}
                          color={draft.color}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {draft.iconType === "emoji" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <Text style={[styles.label, ui.title]}>Emoji icon</Text>
                <View style={[styles.iconGrid, isKeyboardOpen && styles.iconGridCompact]}>
                  {CATEGORY_EMOJI_PRESETS.map((emoji) => {
                    const isSelected = draft.emoji === emoji;
                    return (
                      <Pressable
                        key={emoji}
                        style={[
                          styles.iconCell,
                          ui.fieldSurface,
                          isKeyboardOpen && styles.iconCellCompact,
                          isSelected && ui.selectedSurface,
                        ]}
                        onPress={async () => {
                          await Haptics.selectionAsync();
                          setDraft((current) => ({ ...current, emoji }));
                        }}>
                        <Text style={styles.emojiCell}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {draft.iconType === "uploaded_image" ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <Text style={[styles.label, ui.title]}>Custom image</Text>
                <Pressable
                  style={[styles.uploadButton, ui.fieldSurface, isKeyboardOpen && styles.uploadButtonCompact]}
                  onPress={() => void handlePickImage()}>
                  {draft.iconImageUri ? (
                    <Image contentFit="cover" source={{ uri: draft.iconImageUri }} style={styles.uploadPreview} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Feather name="image" size={20} color={ui.muted.color} />
                    </View>
                  )}
                  <View style={styles.uploadTextBlock}>
                    <Text style={[styles.uploadTitle, ui.title]}>Upload square icon</Text>
                    <Text style={[styles.uploadCaption, ui.muted]}>
                      PNG, JPG, or WebP. The app will crop it to a square.
                    </Text>
                  </View>
                  <Feather name="upload" size={18} color={colors.primary} />
                </Pressable>
              </View>
            ) : null}

            {!usesUploadedImage ? (
              <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
                <Text style={[styles.label, ui.title]}>Color</Text>
                <View style={[styles.colorGrid, isKeyboardOpen && styles.colorGridCompact]}>
                  {CATEGORY_COLOR_PRESETS.map((color) => {
                    const isSelected = draft.color === color;
                    return (
                      <Pressable
                        key={color}
                        style={[
                          styles.colorSwatch,
                          isKeyboardOpen && styles.colorSwatchCompact,
                          { backgroundColor: color },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                        onPress={async () => {
                          await Haptics.selectionAsync();
                          setDraft((current) => ({ ...current, color }));
                        }}>
                        {isSelected ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={[styles.section, isKeyboardOpen && styles.sectionCompact]}>
              <Text style={[styles.label, ui.title]}>Live preview</Text>
              <View style={[styles.previewCard, ui.fieldSurface]}>
                {usesUploadedImage ? (
                  <CategoryAvatar category={previewCategory} size={40} />
                ) : (
                  <View style={[styles.previewIconWrap, { backgroundColor: `${draft.color}22` }]}>
                    <CategoryAvatar category={previewCategory} size={22} />
                  </View>
                )}
                <View style={styles.previewTextBlock}>
                  <Text style={[styles.previewTitle, ui.title]}>{previewCategory.label}</Text>
                  <Text style={[styles.previewSubtitle, ui.muted]}>
                    {draft.type === "expense" ? "Expense category" : "Income category"}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.secondaryButton, ui.secondaryButton]} onPress={onClose}>
              <Text style={[styles.secondaryButtonText, ui.title]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={isSaving}
              style={[styles.primaryButton, ui.primaryButton, isSaving && styles.disabledButton]}
              onPress={() => void handleSubmit()}>
              <Text style={styles.primaryButtonText}>{isSaving ? "Saving..." : saveLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    ...StyleSheet.absoluteFillObject,
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
  },
  sheetCompact: {
    paddingHorizontal: 18,
    paddingBottom: 18,
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
  },
  title: {
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
  section: {
    marginTop: 22,
  },
  sectionCompact: {
    marginTop: 16,
  },
  label: {
    marginBottom: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  textField: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
  },
  textFieldCompact: {
    minHeight: 46,
    borderRadius: 18,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 10,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentCompact: {
    minHeight: 38,
    borderRadius: 18,
  },
  segmentText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconGridCompact: {
    gap: 8,
  },
  iconCell: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  emojiCell: {
    fontSize: 24,
    lineHeight: 28,
  },
  uploadButton: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadButtonCompact: {
    minHeight: 64,
    borderRadius: 18,
  },
  uploadPreview: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  uploadPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },
  uploadTextBlock: {
    flex: 1,
  },
  uploadTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  uploadCaption: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorGridCompact: {
    gap: 10,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchCompact: {
    width: 30,
    height: 30,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTextBlock: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  previewSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  scrollContentCompact: {
    paddingBottom: 4,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
