import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CurrencyOption = {
  id: string;
  code: string;
  shortCode: string;
  name: string;
  symbol: string;
};

const currencyOptions: readonly CurrencyOption[] = [
  { id: 'php', code: 'PH', shortCode: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { id: 'usd', code: 'US', shortCode: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 'eur', code: 'EU', shortCode: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'gbp', code: 'GB', shortCode: 'GBP', name: 'British Pound', symbol: '£' },
  { id: 'jpy', code: 'JP', shortCode: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { id: 'sgd', code: 'SG', shortCode: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { id: 'aud', code: 'AU', shortCode: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { id: 'krw', code: 'KR', shortCode: 'KRW', name: 'Korean Won', symbol: '₩' },
] as const;

export default function CurrencyModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [selectedCurrency, setSelectedCurrency] = useState('php');

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.56)' : 'rgba(15, 23, 42, 0.32)',
      },
      sheet: {
        backgroundColor: isDark ? '#111A27' : '#F4F8FC',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.05)',
      },
      handle: {
        backgroundColor: isDark ? '#526173' : '#C9D3DF',
      },
      title: { color: isDark ? '#F8FAFC' : '#1A202C' },
      subtitle: { color: isDark ? '#A9B6C8' : '#66758A' },
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      optionCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EEF2F7',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E1E7EF',
      },
      optionCardSelected: {
        backgroundColor: isDark ? 'rgba(20, 149, 255, 0.12)' : '#DDEEFF',
        borderColor: colors.primary,
      },
      code: { color: isDark ? '#F8FAFC' : '#111827' },
      name: { color: isDark ? '#F8FAFC' : '#111827' },
      meta: { color: isDark ? '#A9B6C8' : '#66758A' },
      checkWrap: { backgroundColor: colors.primary },
      button: { backgroundColor: '#1684E5' },
      buttonText: { color: '#FFFFFF' },
    }),
    [colors.primary, isDark]
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Currency</Text>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, ui.subtitle]}>Choose your preferred currency for displaying amounts.</Text>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.listArea}>
          {currencyOptions.map((currency) => {
            const isSelected = currency.id === selectedCurrency;

            return (
              <Pressable
                key={currency.id}
                style={[styles.optionCard, ui.optionCard, isSelected && ui.optionCardSelected]}
                onPress={() => setSelectedCurrency(currency.id)}>
                <Text style={[styles.code, ui.code]}>{currency.code}</Text>

                <View style={styles.optionContent}>
                  <Text style={[styles.name, ui.name]}>{currency.name}</Text>
                  <Text style={[styles.meta, ui.meta]}>
                    {currency.shortCode} ({currency.symbol})
                  </Text>
                </View>

                {isSelected ? (
                  <View style={[styles.checkWrap, ui.checkWrap]}>
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={[styles.saveButton, ui.button]} onPress={() => router.back()}>
          <Text style={[styles.saveButtonText, ui.buttonText]}>Save Currency</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 16,
    maxHeight: '83%',
  },
  handle: {
    alignSelf: 'center',
    width: 58,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 16,
    marginBottom: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    maxWidth: 300,
  },
  listArea: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  optionCard: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  code: {
    width: 28,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
  optionContent: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: fontWeights.medium,
  },
  meta: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
