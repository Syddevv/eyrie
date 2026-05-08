import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showIncompleteFormAlert } from '@/lib/utils/form-feedback';

type CategoryOption = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const categoryOptions: readonly CategoryOption[] = [
  { id: 'food', label: 'Food & Dining', icon: 'silverware-fork-knife' },
  { id: 'transport', label: 'Transportation', icon: 'car-outline' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-outline' },
  { id: 'bills', label: 'Bills & Utilities', icon: 'lightning-bolt-outline' },
  { id: 'health', label: 'Health', icon: 'heart-pulse' },
  { id: 'education', label: 'Education', icon: 'school-outline' },
] as const;

function sanitizeBudgetAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export default function AddCategoryModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAddEnabled = Boolean(selectedCategory) && Number(budgetAmount) > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

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
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.52)' : 'rgba(15, 23, 42, 0.22)',
      },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
      },
      handle: { backgroundColor: isDark ? '#64748B' : '#CBD5E1' },
      title: { color: colors.foreground },
      label: { color: colors.foreground },
      fieldSurface: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.26)' : 'rgba(241, 245, 249, 0.8)',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226, 232, 240, 0.92)',
      },
      placeholder: { color: colors.mutedForeground },
      value: { color: colors.foreground },
      closeButton: {
        backgroundColor: colors.secondary,
      },
      closeIcon: { color: colors.mutedForeground },
      addButton: {
        backgroundColor: colors.primary,
      },
      addButtonDisabled: {
        backgroundColor: isDark ? '#31577D' : '#A9CDED',
      },
      addButtonText: { color: '#FFFFFF' },
      dropdownSurface: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.92)',
      },
      dropdownItemBorder: {
        borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226, 232, 240, 0.72)',
      },
    }),
    [colors, isDark]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>Add New Category</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Category</Text>
            <Pressable
              style={[styles.selectField, ui.fieldSurface]}
              onPress={() => setShowCategoryList((current) => !current)}>
              <Text style={[styles.selectText, ui.value]}>
                {selectedCategory ? selectedCategory.label : 'Select category'}
              </Text>
              <Feather
                name={showCategoryList ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            {showCategoryList ? (
              <View style={[styles.dropdownCard, ui.dropdownSurface, shadows.card]}>
                {categoryOptions.map((option, index) => {
                  const isSelected = option.id === selectedCategory?.id;
                  const isLast = index === categoryOptions.length - 1;

                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.dropdownItem,
                        !isLast && styles.dropdownItemBorder,
                        !isLast && ui.dropdownItemBorder,
                      ]}
                      onPress={() => {
                        setSelectedCategory(option);
                        setShowCategoryList(false);
                      }}>
                      <View style={styles.dropdownItemLeft}>
                        <MaterialCommunityIcons
                          name={option.icon}
                          size={18}
                          color={isSelected ? colors.primary : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected ? { color: colors.primary } : ui.value,
                          ]}>
                          {option.label}
                        </Text>
                      </View>
                      {isSelected ? <Feather name="check" size={16} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, ui.label]}>Budget Amount</Text>
            <View style={[styles.amountField, ui.fieldSurface]}>
              <Text style={[styles.currencyMark, ui.placeholder]}>₱</Text>
              <TextInput
                value={budgetAmount}
                onChangeText={(value) => setBudgetAmount(sanitizeBudgetAmount(value))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={ui.placeholder.color}
                selectionColor={colors.primary}
                style={[styles.amountInput, ui.value]}
              />
            </View>
          </View>

          <Pressable
            style={[styles.addButton, isAddEnabled ? ui.addButton : ui.addButtonDisabled]}
            onPress={() => {
              if (!isAddEnabled) {
                showIncompleteFormAlert();
                return;
              }

              router.back();
            }}>
            <Text style={[styles.addButtonText, ui.addButtonText]}>Add Category</Text>
          </Pressable>
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
    justifyContent: 'flex-end',
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
  handle: {
    alignSelf: 'center',
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 22,
  },
  label: {
    marginBottom: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectField: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  dropdownCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownItemText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  amountField: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    paddingVertical: 0,
  },
  addButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
