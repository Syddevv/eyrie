import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type WalletOption = {
  id: string;
  label: string;
  code: string;
  color: string;
};

const walletOptions: readonly WalletOption[] = [
  { id: 'gcash', label: 'GCash', code: 'G', color: '#3B82F6' },
  { id: 'maya', label: 'Maya', code: 'M', color: '#16C347' },
  { id: 'grabpay', label: 'GrabPay', code: 'G', color: '#16A34A' },
  { id: 'shopeepay', label: 'ShopeePay', code: 'S', color: '#F97316' },
  { id: 'coinsph', label: 'Coins.ph', code: 'C', color: '#2563EB' },
] as const;

export default function AddEWalletMethodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[]; parentTo?: string | string[]; selectedWallet?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || '/add-payment-method-modal';
  const parentTo = Array.isArray(params.parentTo) ? params.parentTo[0] : params.parentTo || '/payment-methods-modal';
  const selectedWalletParam = Array.isArray(params.selectedWallet) ? params.selectedWallet[0] : params.selectedWallet;

  const [selectedWallet, setSelectedWallet] = useState(selectedWalletParam || 'gcash');

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
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      backText: { color: isDark ? '#A9B6C8' : '#6B7280' },
      sectionTitle: { color: isDark ? '#F8FAFC' : '#1F2937' },
      walletCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#DCE4EE',
      },
      walletCardSelected: {
        borderColor: '#60A5FA',
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : '#E8F3FF',
      },
      walletText: { color: isDark ? '#F8FAFC' : '#202733' },
      button: { backgroundColor: '#6DB2EE' },
      buttonText: { color: '#FFFFFF' },
    }),
    [isDark]
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.replace(parentTo)} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Add Payment Method</Text>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.replace(parentTo)}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <Pressable
          style={styles.backRow}
          onPress={() => router.replace({ pathname: returnTo, params: { returnTo: parentTo } })}>
          <Feather name="chevron-left" size={18} color={ui.backText.color} />
          <Text style={[styles.backText, ui.backText]}>Back</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, ui.sectionTitle]}>Select your e-wallet</Text>

        <View style={styles.walletList}>
          {walletOptions.map((wallet) => {
            const isSelected = wallet.id === selectedWallet;

            return (
              <Pressable
                key={wallet.id}
                style={[styles.walletCard, ui.walletCard, isSelected && ui.walletCardSelected]}
                onPress={() => setSelectedWallet(wallet.id)}>
                <View style={[styles.logoBubble, { backgroundColor: wallet.color }]}>
                  <Text style={styles.logoText}>{wallet.code}</Text>
                </View>
                <Text style={[styles.walletText, ui.walletText]}>{wallet.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.continueButton, ui.button]}
          onPress={() =>
            router.replace({
              pathname: '/add-e-wallet-account-modal',
              params: {
                returnTo: '/add-e-wallet-method-modal',
                parentTo,
                selectedWallet,
              },
            })
          }>
          <Text style={[styles.continueButtonText, ui.buttonText]}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
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
  backRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  backText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  sectionTitle: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  walletList: {
    marginTop: 14,
    gap: 10,
  },
  walletCard: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  walletText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  continueButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
