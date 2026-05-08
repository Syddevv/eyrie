import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSettingsPaymentMethod } from '@/constants/settings-payment-methods';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export default function PaymentCardDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ methodId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const methodId = Array.isArray(params.methodId) ? params.methodId[0] : params.methodId;
  const method = getSettingsPaymentMethod(methodId);

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
      title: { color: isDark ? '#F8FAFC' : '#1A202C' },
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      backText: { color: isDark ? '#A9B6C8' : '#6B7280' },
      detailCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EEF2F7',
      },
      detailLabel: { color: isDark ? '#AAB7C9' : '#6B7280' },
      detailValue: { color: isDark ? '#F8FAFC' : '#111827' },
      balanceValue: { color: '#0E7CEB' },
      statusPill: {
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.18)' : '#D9ECFF',
      },
      statusPillText: { color: '#1495FF' },
      actionButton: { backgroundColor: '#1681DD' },
      actionText: { color: '#FFFFFF' },
    }),
    [isDark]
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>{method.title}</Text>
          <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <Pressable style={styles.backRow} onPress={() => router.replace('/payment-methods-modal')}>
          <Feather name="chevron-left" size={18} color={ui.backText.color} />
          <Text style={[styles.backText, ui.backText]}>Back</Text>
        </Pressable>

        <LinearGradient colors={['#2D62F0', '#244EE2', '#2849CF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardHero}>
          <View style={[styles.heroBubbleLarge, { backgroundColor: withOpacity('#FFFFFF', 0.12) }]} />
          <View style={[styles.heroBubbleSmall, { backgroundColor: withOpacity('#FFFFFF', 0.08) }]} />

          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>{method.cardLabel}</Text>
            <Text style={styles.heroBrand}>{method.brand}</Text>
          </View>

          <Text style={styles.heroNumber}>* * * *  * * * *  * * * *  {method.cardNumber?.slice(-4)}</Text>

          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.heroMetaLabel}>BALANCE</Text>
              <Text style={styles.heroBalance}>{method.balance}</Text>
            </View>
            <View style={styles.heroExpiryBlock}>
              <Text style={styles.heroMetaLabel}>EXPIRES</Text>
              <Text style={styles.heroExpiry}>{method.expiryDate}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.detailList}>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Name</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{method.title}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Balance</Text>
            <Text style={[styles.detailValue, ui.balanceValue]}>{method.balance}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Card Number</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{method.cardNumber}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Expiry Date</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{method.expiryDate}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Status</Text>
            {method.isDefault ? (
              <View style={[styles.statusPill, ui.statusPill]}>
                <Text style={[styles.statusPillText, ui.statusPillText]}>Default</Text>
              </View>
            ) : (
              <Text style={[styles.detailValue, ui.detailValue]}>{method.statusText}</Text>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.actionButton, ui.actionButton]}
          onPress={() =>
            router.replace({
              pathname: '/edit-payment-card-modal',
              params: { methodId: method.id },
            })
          }>
          <Feather name="edit-2" size={16} color={ui.actionText.color} />
          <Text style={[styles.actionText, ui.actionText]}>Edit Details</Text>
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
    justifyContent: 'space-between',
    paddingBottom: 6,
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
    marginTop: 8,
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
  cardHero: {
    marginTop: 22,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  heroBubbleLarge: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: radius.full,
    right: -18,
    top: -10,
  },
  heroBubbleSmall: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: radius.full,
    left: -18,
    bottom: -20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity('#FFFFFF', 0.8),
  },
  heroBrand: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  heroNumber: {
    marginTop: 24,
    fontFamily: fontFamilies.mono,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    color: '#FFFFFF',
    letterSpacing: 1.8,
  },
  heroBottomRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroMetaLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
    color: withOpacity('#FFFFFF', 0.72),
  },
  heroBalance: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  heroExpiryBlock: {
    alignItems: 'flex-start',
  },
  heroExpiry: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  detailList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 44,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  detailValue: {
    flexShrink: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    textAlign: 'right',
  },
  statusPill: {
    minWidth: 58,
    height: 26,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  actionButton: {
    marginTop: 20,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
