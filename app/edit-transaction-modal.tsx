import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { getTransactionRecord } from '@/constants/transactions';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatAmount(value: string) {
  return value.replace(/[^\d]/g, '').slice(0, 10);
}

export default function EditTransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const transactionId = Array.isArray(params.transactionId) ? params.transactionId[0] : params.transactionId;
  const transaction = getTransactionRecord(transactionId);

  const [merchant, setMerchant] = useState(transaction.title);
  const [amount, setAmount] = useState(transaction.amount.replace(/[^\d]/g, ''));
  const [type, setType] = useState<'Expense' | 'Income'>(transaction.type);
  const [category] = useState(transaction.category);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.62)' : 'rgba(15, 23, 42, 0.34)',
      },
      sheet: {
        backgroundColor: isDark ? '#111A27' : '#F4F8FC',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.05)',
      },
      handle: {
        backgroundColor: isDark ? '#526173' : '#C9D3DF',
      },
      title: { color: isDark ? '#F8FAFC' : '#111827' },
      subtitle: { color: isDark ? '#9EA6B5' : '#5B78A2' },
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      iconWrap: {
        backgroundColor: isDark ? transaction.iconBackgroundDark : transaction.iconBackgroundLight,
      },
      label: { color: isDark ? '#F8FAFC' : '#111827' },
      fieldSurface: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEF2F7',
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#E2E8F0',
      },
      fieldText: { color: isDark ? '#F8FAFC' : '#202733' },
      placeholder: { color: isDark ? '#8F9CAF' : '#8A94A6' },
      peso: { color: isDark ? '#A9B6C8' : '#6B7280' },
      typeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F7',
      },
      typeButtonActive: { backgroundColor: '#1681DD' },
      typeText: { color: isDark ? '#F8FAFC' : '#111827' },
      typeTextActive: { color: '#FFFFFF' },
      secondaryButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F7',
      },
      secondaryButtonText: { color: isDark ? '#F8FAFC' : '#111827' },
      primaryButton: { backgroundColor: '#1681DD' },
      primaryButtonText: { color: '#FFFFFF' },
    }),
    [isDark, transaction.iconBackgroundDark, transaction.iconBackgroundLight]
  );

  const transactionIcon =
    transaction.iconLibrary === 'material' ? (
      <MaterialCommunityIcons
        name={transaction.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={22}
        color={transaction.iconColor}
      />
    ) : (
      <Feather
        name={transaction.iconName as React.ComponentProps<typeof Feather>['name']}
        size={20}
        color={transaction.iconColor}
      />
    );

  const returnToDetails = () =>
    router.replace({
      pathname: '/transaction-details-modal',
      params: { transactionId: transaction.id },
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
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
            <View style={[styles.iconWrap, ui.iconWrap]}>{transactionIcon}</View>
            <View style={styles.headerText}>
              <Text style={[styles.title, ui.title]}>{transaction.title}</Text>
              <Text style={[styles.subtitle, ui.subtitle]}>{transaction.dateLabel}</Text>
            </View>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Merchant / Description</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface]}>
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Merchant"
                placeholderTextColor={ui.placeholder.color}
                selectionColor="#1681DD"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Amount</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface, styles.balanceField]}>
              <Text style={[styles.peso, ui.peso]}>₱</Text>
              <TextInput
                value={amount}
                onChangeText={(value) => setAmount(formatAmount(value))}
                placeholder="0"
                placeholderTextColor={ui.placeholder.color}
                keyboardType="number-pad"
                selectionColor="#1681DD"
                style={[styles.fieldInput, ui.fieldText]}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Type</Text>
            <View style={styles.typeRow}>
              {(['Expense', 'Income'] as const).map((option) => {
                const isActive = type === option;

                return (
                  <Pressable
                    key={option}
                    style={[styles.typeButton, ui.typeButton, isActive && ui.typeButtonActive]}
                    onPress={() => setType(option)}>
                    <Text style={[styles.typeText, ui.typeText, isActive && ui.typeTextActive]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, ui.label]}>Category</Text>
            <View style={[styles.fieldSurface, ui.fieldSurface, styles.dropdownField]}>
              <Text style={[styles.fieldInput, ui.fieldText]}>{category}</Text>
              <Feather name="chevron-down" size={18} color={ui.fieldText.color} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.secondaryButton, ui.secondaryButton]} onPress={() => router.back()}>
              <Text style={[styles.secondaryButtonText, ui.secondaryButtonText]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, ui.primaryButton]} onPress={returnToDetails}>
              <Feather name="check" size={16} color={ui.primaryButtonText.color} />
              <Text style={[styles.primaryButtonText, ui.primaryButtonText]}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
  },
  handle: {
    alignSelf: 'center',
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  formSection: {
    marginTop: 18,
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
    justifyContent: 'center',
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  balanceField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peso: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
