import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getTransactionRecord } from '@/constants/transactions';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TransactionDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const transactionId = Array.isArray(params.transactionId) ? params.transactionId[0] : params.transactionId;
  const transaction = getTransactionRecord(transactionId);

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
      amountCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EEF2F7',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
      },
      amountLabel: { color: isDark ? '#A9B6C8' : '#5B78A2' },
      amountValue: { color: isDark ? '#F8FAFC' : '#0F172A' },
      detailCard: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EEF2F7',
      },
      detailLabel: { color: isDark ? '#AAB7C9' : '#5B78A2' },
      detailValue: { color: isDark ? '#F8FAFC' : '#111827' },
      tipCard: {
        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : '#DCEEFE',
        borderColor: isDark ? 'rgba(96, 165, 250, 0.2)' : '#B7D7FB',
      },
      tipText: { color: isDark ? '#D6E8FF' : '#4D5E78' },
      editButton: { backgroundColor: '#1681DD' },
      editText: { color: '#FFFFFF' },
      deleteButton: {
        backgroundColor: isDark ? 'rgba(255, 95, 122, 0.16)' : '#FFE7EA',
      },
      deleteIcon: { color: '#FF5C73' },
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

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
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

        <View style={[styles.amountCard, ui.amountCard]}>
          <Text style={[styles.amountLabel, ui.amountLabel]}>Amount Spent</Text>
          <Text style={[styles.amountValue, ui.amountValue]}>{transaction.amount}</Text>
        </View>

        <View style={styles.detailList}>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Category</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction.category}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Type</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction.type}</Text>
          </View>
          <View style={[styles.detailCard, ui.detailCard]}>
            <Text style={[styles.detailLabel, ui.detailLabel]}>Date</Text>
            <Text style={[styles.detailValue, ui.detailValue]}>{transaction.dateLabel}</Text>
          </View>
        </View>

        <View style={[styles.tipCard, ui.tipCard]}>
          <View style={styles.tipAvatarFrame}>
            <Image
              contentFit="cover"
              source={require('@/assets/images/Eyrie_Mascot_3.png')}
              style={styles.tipAvatar}
            />
          </View>
          <Text style={[styles.tipText, ui.tipText]}>Track your spending to stay within budget!</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.editButton, ui.editButton]}
            onPress={() =>
              router.replace({
                pathname: '/edit-transaction-modal',
                params: { transactionId: transaction.id },
              })
            }>
            <Feather name="edit-2" size={16} color={ui.editText.color} />
            <Text style={[styles.editText, ui.editText]}>Edit Transaction</Text>
          </Pressable>
          <Pressable style={[styles.deleteButton, ui.deleteButton]}>
            <Feather name="trash-2" size={18} color={ui.deleteIcon.color} />
          </Pressable>
        </View>
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
  amountCard: {
    marginTop: 22,
    minHeight: 102,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  amountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  amountValue: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
  },
  detailList: {
    marginTop: 16,
    gap: 12,
  },
  detailCard: {
    minHeight: 46,
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
    textAlign: 'right',
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  tipCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipAvatarFrame: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tipAvatar: {
    width: 31,
    height: 31,
    borderRadius: radius.full,
  },
  tipText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  actionsRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  deleteButton: {
    width: 58,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
