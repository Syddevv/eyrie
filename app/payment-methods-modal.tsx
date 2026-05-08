import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PaymentMethod = {
  id: string;
  brand: string;
  title: string;
  details: string;
  balance: string;
  color: string;
  defaultLabel: string;
};

const initialPaymentMethods: PaymentMethod[] = [
  {
    id: 'bpi-debit',
    brand: 'VISA',
    title: 'BPI Debit Card',
    details: '**** 4521 • 12/26',
    balance: '₱25,000',
    color: '#2563EB',
    defaultLabel: 'Default',
  },
  {
    id: 'bdo-credit',
    brand: 'MC',
    title: 'BDO Credit Card',
    details: '**** 8832 • 08/27',
    balance: '₱50,000',
    color: '#F97316',
    defaultLabel: 'Set Default',
  },
  {
    id: 'gcash',
    brand: 'G',
    title: 'GCash',
    details: 'Connected',
    balance: '₱5,500',
    color: '#3B82F6',
    defaultLabel: 'Set Default',
  },
  {
    id: 'maya',
    brand: 'M',
    title: 'Maya',
    details: 'Connected',
    balance: '₱3,200',
    color: '#22C55E',
    defaultLabel: 'Set Default',
  },
];

export default function PaymentMethodsModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [defaultMethodId, setDefaultMethodId] = useState('bpi-debit');

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
      infoCard: {
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : '#DCEEFE',
        borderColor: isDark ? 'rgba(96, 165, 250, 0.2)' : '#B7D7FB',
      },
      infoText: { color: isDark ? '#D6E8FF' : '#607185' },
      methodCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.52)',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
      },
      methodTitle: { color: isDark ? '#F8FAFC' : '#111827' },
      methodDetails: { color: isDark ? '#A9B6C8' : '#6B7280' },
      methodBalance: { color: '#1C8CFF' },
      defaultPill: {
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.18)' : '#D9ECFF',
      },
      defaultPillText: { color: '#1495FF' },
      setDefaultText: { color: isDark ? '#E2E8F0' : '#1F2937' },
      trashIcon: { color: isDark ? '#D4DCE6' : '#111827' },
      addButton: {
        borderColor: isDark ? 'rgba(255,255,255,0.16)' : '#D0D7E2',
        backgroundColor: 'transparent',
      },
      addButtonText: { color: isDark ? '#A9B6C8' : '#7A8596' },
    }),
    [isDark]
  );

  function handleDeleteMethod(methodId: string) {
    setPaymentMethods((current) => {
      const nextMethods = current.filter((method) => method.id !== methodId);

      if (defaultMethodId === methodId) {
        setDefaultMethodId(nextMethods[0]?.id ?? '');
      }

      return nextMethods;
    });
  }

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Payment Methods</Text>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.content}>
          <View style={[styles.infoCard, ui.infoCard]}>
            <View style={styles.infoAvatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_3.png')}
                style={styles.infoAvatar}
              />
            </View>
            <Text style={[styles.infoText, ui.infoText]}>Your payment methods are securely stored and encrypted.</Text>
          </View>

          {paymentMethods.map((method) => {
            const isDefault = method.id === defaultMethodId;

            return (
              <View key={method.id} style={[styles.methodCard, ui.methodCard]}>
                <View style={[styles.brandBubble, { backgroundColor: method.color }]}>
                  <Text style={styles.brandText}>{method.brand}</Text>
                </View>

                <View style={styles.methodInfo}>
                  <Text style={[styles.methodTitle, ui.methodTitle]}>{method.title}</Text>
                  <Text style={[styles.methodDetails, ui.methodDetails]}>{method.details}</Text>
                  <Text style={[styles.methodBalance, ui.methodBalance]}>{method.balance}</Text>
                </View>

                <View style={styles.methodActions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      if (!isDefault) {
                        setDefaultMethodId(method.id);
                      }
                    }}>
                    {isDefault ? (
                      <View style={[styles.defaultPill, ui.defaultPill]}>
                        <Text style={[styles.defaultPillText, ui.defaultPillText]}>{method.defaultLabel}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.setDefaultText, ui.setDefaultText]}>{method.defaultLabel}</Text>
                    )}
                  </Pressable>

                  <Pressable hitSlop={8} onPress={() => handleDeleteMethod(method.id)}>
                    <Feather name="trash-2" size={18} color={ui.trashIcon.color} />
                  </Pressable>
                </View>
              </View>
            );
          })}

          <Pressable
            style={[styles.addButton, ui.addButton]}
            onPress={() =>
              router.replace({
                pathname: '/add-payment-method-modal',
                params: { returnTo: '/payment-methods-modal' },
              })
            }>
            <Feather name="plus" size={18} color={ui.addButtonText.color} />
            <Text style={[styles.addButtonText, ui.addButtonText]}>Add Payment Method</Text>
          </Pressable>
        </ScrollView>
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
    paddingBottom: 24,
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
  content: {
    paddingTop: 18,
    gap: 10,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  infoAvatar: {
    width: 27,
    height: 27,
    borderRadius: radius.full,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  methodCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBubble: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  methodInfo: {
    flex: 1,
    paddingRight: 8,
  },
  methodTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  methodDetails: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
  },
  methodBalance: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  methodActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  defaultPill: {
    minWidth: 58,
    height: 26,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  setDefaultText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.medium,
  },
  addButton: {
    marginTop: 2,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
