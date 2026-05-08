import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BankOption = {
  id: string;
  code: string;
  name: string;
  color: string;
};

type CardTypeOption = {
  id: string;
  label: string;
  code: string;
  color: string;
};

const bankOptions: readonly BankOption[] = [
  { id: 'bpi', code: 'BPI', name: 'BPI', color: '#E50914' },
  { id: 'bdo', code: 'BDO', name: 'BDO', color: '#1D4ED8' },
  { id: 'metrobank', code: 'MET', name: 'Metrobank', color: '#1E3A8A' },
  { id: 'unionbank', code: 'UNI', name: 'UnionBank', color: '#F97316' },
  { id: 'landbank', code: 'LAN', name: 'Landbank', color: '#0F8A46' },
  { id: 'pnb', code: 'PNB', name: 'PNB', color: '#1E40AF' },
] as const;

const cardTypeOptions: readonly CardTypeOption[] = [
  { id: 'visa', code: 'VISA', label: 'Visa', color: '#2563EB' },
  { id: 'mastercard', code: 'MC', label: 'Mastercard', color: '#F97316' },
] as const;

export default function AddBankCardMethodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[]; parentTo?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || '/add-payment-method-modal';
  const parentTo = Array.isArray(params.parentTo) ? params.parentTo[0] : params.parentTo || '/payment-methods-modal';

  const [selectedBank, setSelectedBank] = useState('bpi');
  const [selectedCardType, setSelectedCardType] = useState('visa');

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
      optionCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#DCE4EE',
      },
      optionCardSelected: {
        borderColor: '#60A5FA',
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : '#E8F3FF',
      },
      optionText: { color: isDark ? '#F8FAFC' : '#202733' },
      button: { backgroundColor: '#6DB2EE' },
      buttonText: { color: '#FFFFFF' },
      indicatorTrack: { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#D1D5DB' },
      indicatorThumb: { backgroundColor: isDark ? '#9CA3AF' : '#9CA3AF' },
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

        <Text style={[styles.sectionTitle, ui.sectionTitle]}>Select your bank</Text>

        <View style={styles.bankGridWrap}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bankGrid}>
            {bankOptions.map((bank) => {
              const isSelected = bank.id === selectedBank;

              return (
                <Pressable
                  key={bank.id}
                  style={[styles.bankCard, ui.optionCard, isSelected && ui.optionCardSelected]}
                  onPress={() => setSelectedBank(bank.id)}>
                  <View style={[styles.logoBubble, { backgroundColor: bank.color }]}>
                    <Text style={styles.logoText}>{bank.code}</Text>
                  </View>
                  <Text style={[styles.bankName, ui.optionText]}>{bank.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.scrollIndicator}>
            <View style={[styles.scrollIndicatorTrack, ui.indicatorTrack]} />
            <View style={[styles.scrollIndicatorThumb, ui.indicatorThumb]} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, styles.cardTypeTitle, ui.sectionTitle]}>Card Type</Text>

        <View style={styles.cardTypeRow}>
          {cardTypeOptions.map((cardType) => {
            const isSelected = cardType.id === selectedCardType;

            return (
              <Pressable
                key={cardType.id}
                style={[styles.cardTypeCard, ui.optionCard, isSelected && ui.optionCardSelected]}
                onPress={() => setSelectedCardType(cardType.id)}>
                <View style={[styles.logoBubble, { backgroundColor: cardType.color }]}>
                  <Text style={styles.logoText}>{cardType.code}</Text>
                </View>
                <Text style={[styles.cardTypeLabel, ui.optionText]}>{cardType.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.continueButton, ui.button]}
          onPress={() =>
            router.replace({
              pathname: '/add-bank-account-modal',
              params: {
                returnTo: '/add-bank-card-method-modal',
                parentTo,
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
  bankGridWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingRight: 10,
  },
  bankCard: {
    width: '48%',
    minHeight: 56,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  logoBubble: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  bankName: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  scrollIndicator: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scrollIndicatorTrack: {
    width: 6,
    flex: 1,
    borderRadius: radius.full,
  },
  scrollIndicatorThumb: {
    position: 'absolute',
    top: 20,
    width: 6,
    height: 64,
    borderRadius: radius.full,
  },
  cardTypeTitle: {
    marginTop: 18,
  },
  cardTypeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  cardTypeCard: {
    flex: 1,
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  cardTypeLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  continueButton: {
    marginTop: 18,
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
