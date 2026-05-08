import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PaymentOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
};

const paymentOptions: readonly PaymentOption[] = [
  {
    id: 'card',
    title: 'Debit/Credit Card',
    subtitle: 'Visa, Mastercard',
    icon: 'credit-card-outline',
    iconColor: '#2563EB',
  },
  {
    id: 'wallet',
    title: 'E-Wallet',
    subtitle: 'GCash, Maya, etc.',
    icon: 'wallet-outline',
    iconColor: '#16C347',
  },
] as const;

export default function AddPaymentMethodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || '/payment-methods-modal';

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
      subtitle: { color: isDark ? '#A9B6C8' : '#6C7A8B' },
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      optionCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#DCE4EE',
      },
      optionTitle: { color: isDark ? '#F8FAFC' : '#202733' },
      optionSubtitle: { color: isDark ? '#A9B6C8' : '#6B7280' },
      cancelButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E9EEF5',
      },
      cancelButtonText: { color: isDark ? '#F8FAFC' : '#111827' },
    }),
    [isDark]
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.replace(returnTo)} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Add Payment Method</Text>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.replace(returnTo)}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, ui.subtitle]}>What would you like to add?</Text>

        <View style={styles.optionsRow}>
          {paymentOptions.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.optionCard, ui.optionCard]}
              onPress={() =>
                router.replace({
                  pathname: option.id === 'card' ? '/add-bank-card-method-modal' : '/add-e-wallet-method-modal',
                  params: {
                    returnTo: '/add-payment-method-modal',
                    parentTo: returnTo,
                  },
                })
              }>
              <View style={[styles.optionIconWrap, { backgroundColor: option.iconColor }]}>
                <MaterialCommunityIcons name={option.icon} size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.optionTitle, ui.optionTitle]}>{option.title}</Text>
              <Text style={[styles.optionSubtitle, ui.optionSubtitle]}>{option.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.cancelButton, ui.cancelButton]} onPress={() => router.replace(returnTo)}>
          <Text style={[styles.cancelButtonText, ui.cancelButtonText]}>Cancel</Text>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 28,
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
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
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
    marginTop: 24,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  optionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minHeight: 130,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  optionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    marginTop: 16,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
  optionSubtitle: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 18,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
