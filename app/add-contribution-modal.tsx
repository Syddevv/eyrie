import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { themeColors } from '@/constants/colors';
import { savingsGoals } from '@/constants/goals';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

const quickAmounts = [1000, 2500, 5000, 10000] as const;

function renderHeaderIcon(symbol: string, color: string) {
  switch (symbol) {
    case 'shield':
      return <Ionicons name="shield-checkmark-outline" size={22} color={color} />;
    case 'monitor':
      return <Feather name="monitor" size={20} color={color} />;
    case 'travel':
      return <Ionicons name="airplane-outline" size={20} color={color} />;
    case 'car':
      return <MaterialCommunityIcons name="car-outline" size={20} color={color} />;
    default:
      return <Feather name="target" size={20} color={color} />;
  }
}

function sanitizeAmountInput(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export default function AddContributionModal() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const goal = savingsGoals.find((item) => item.id === goalId) ?? savingsGoals[0];
  const [amount, setAmount] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAddEnabled = Number(amount) > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const ui = useMemo(
    () => ({
      overlay: { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.64)' : 'rgba(15, 23, 42, 0.34)' },
      sheet: {
        backgroundColor: colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.04)',
      },
      handle: { backgroundColor: isDark ? '#64748B' : '#CBD5E1' },
      title: { color: colors.foreground },
      muted: { color: colors.mutedForeground },
      closeButton: { backgroundColor: colors.secondary },
      amountField: {
        backgroundColor: colors.secondary,
        borderColor: isDark ? 'rgba(79, 163, 255, 0.6)' : '#9FD0FF',
      },
      quickChip: { backgroundColor: colors.secondary },
      coachCard: {
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.12)',
        borderColor: isDark ? 'rgba(16,185,129,0.28)' : 'rgba(16,185,129,0.24)',
      },
      coachText: { color: '#10B981' },
      primaryButton: { backgroundColor: colors.primary },
      secondaryButton: { backgroundColor: colors.secondary },
      primaryButtonDisabled: { backgroundColor: '#7CB8EE' },
      primaryText: { color: '#FFFFFF' },
      secondaryText: { color: colors.foreground },
    }),
    [colors, isDark]
  );

  const returnToGoalDetails = () => {
    router.replace({ pathname: '/goal-details-modal', params: { goalId: goal.id } });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={returnToGoalDetails} />
        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <View style={styles.headerIdentity}>
              <View style={[styles.headerIconWrap, { backgroundColor: goal.iconBackground }]}>
                {renderHeaderIcon(goal.iconSymbol, '#FFFFFF')}
              </View>
              <View>
                <Text style={[styles.headerTitle, ui.title]}>{goal.title}</Text>
                <View style={styles.targetRow}>
                  <Feather name="calendar" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.targetText, ui.muted]}>{`Target: ${goal.targetDateLabel}`}</Text>
                </View>
              </View>
            </View>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={returnToGoalDetails}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, ui.title]}>Contribution Amount</Text>
            <View style={[styles.amountField, ui.amountField]}>
              <Text style={[styles.currencyMark, ui.muted]}>₱</Text>
              <TextInput
                value={amount}
                onChangeText={(value) => setAmount(sanitizeAmountInput(value))}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                selectionColor={colors.primary}
                style={[styles.amountInput, ui.title]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.quickLabel, ui.muted]}>Quick add</Text>
            <View style={styles.quickRow}>
              {quickAmounts.map((quickAmount) => (
                <Pressable
                  key={quickAmount}
                  style={[styles.quickChip, ui.quickChip]}
                  onPress={() => setAmount(String(quickAmount))}>
                  <Text style={[styles.quickChipText, ui.title]}>{`₱${quickAmount.toLocaleString('en-PH')}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.coachCard, ui.coachCard]}>
            <View style={styles.coachAvatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_1.png')}
                style={styles.coachAvatar}
              />
            </View>
            <Text style={[styles.coachText, ui.coachText]}>
              Every contribution brings you closer to your dream!
            </Text>
          </View>

          <View style={styles.footerActions}>
            <Pressable style={[styles.footerButton, ui.secondaryButton]} onPress={returnToGoalDetails}>
              <Text style={[styles.footerButtonText, ui.secondaryText]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.footerButton,
                ui.primaryButton,
                !isAddEnabled && ui.primaryButtonDisabled,
              ]}
              disabled={!isAddEnabled}
              onPress={returnToGoalDetails}>
              <Text style={[styles.footerButtonText, ui.primaryText]}>
                {`Add ₱${amount || '0'}`}
              </Text>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderWidth: 1,
    maxHeight: '72%',
  },
  handle: {
    alignSelf: 'center',
    width: 50,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  targetRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  targetText: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 18 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 18 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  amountField: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyMark: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: fontWeights.medium,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    paddingVertical: 0,
  },
  quickLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  quickRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  coachCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coachAvatarFrame: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
  },
  coachText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  footerActions: { marginTop: 24, flexDirection: 'row', gap: 12 },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
