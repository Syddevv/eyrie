import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SecurityPasswordModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const hasCompletePasswordForm =
    currentPassword.trim().length > 0 && newPassword.trim().length > 0 && confirmPassword.trim().length > 0;

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
      securityCard: {
        backgroundColor: isDark ? 'rgba(21, 168, 106, 0.14)' : '#D8F4E6',
        borderColor: isDark ? 'rgba(94, 234, 166, 0.3)' : '#9BE2BF',
      },
      securityCardIcon: {
        backgroundColor: isDark ? 'rgba(94, 234, 166, 0.18)' : '#B6ECCD',
      },
      securityTitle: { color: isDark ? '#F8FAFC' : '#1F2937' },
      securitySubtitle: { color: isDark ? '#A9B6C8' : '#6B7280' },
      divider: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#DCE4EE' },
      sectionTitle: { color: isDark ? '#F8FAFC' : '#1F2937' },
      fieldLabel: { color: isDark ? '#A9B6C8' : '#6B7280' },
      fieldSurface: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E9EEF5',
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(223, 230, 238, 0.96)',
      },
      fieldValue: { color: isDark ? '#F8FAFC' : '#202733' },
      placeholder: { color: isDark ? '#8F9CAF' : '#8A94A6' },
      eyeButton: { color: isDark ? '#A9B6C8' : '#6B7280' },
      updateButton: {
        backgroundColor: hasCompletePasswordForm
          ? '#0AB363'
          : isDark
            ? 'rgba(255,255,255,0.08)'
            : '#E6EBF2',
      },
      updateButtonText: { color: hasCompletePasswordForm ? '#FFFFFF' : isDark ? '#A9B6C8' : '#677385' },
      switchTrackOff: isDark ? '#4B5563' : '#D1D5DB',
      switchTrackOn: '#0AB363',
      switchThumb: '#FFFFFF',
    }),
    [hasCompletePasswordForm, isDark]
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
            <Text style={[styles.title, ui.title]}>Security & Password</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <View style={[styles.securityCard, ui.securityCard]}>
              <View style={styles.securityInfo}>
                <View style={[styles.securityIconWrap, ui.securityCardIcon]}>
                  <Feather name="shield" size={18} color="#0AB363" />
                </View>
                <View>
                  <Text style={[styles.securityCardTitle, ui.securityTitle]}>Security Alerts</Text>
                  <Text style={[styles.securityCardSubtitle, ui.securitySubtitle]}>
                    Get notified about password changes
                  </Text>
                </View>
              </View>

              <Switch
                value={securityAlertsEnabled}
                onValueChange={setSecurityAlertsEnabled}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackOn }}
                thumbColor={ui.switchThumb}
                ios_backgroundColor={ui.switchTrackOff}
              />
            </View>

            <View style={[styles.divider, ui.divider]} />

            <Text style={[styles.sectionTitle, ui.sectionTitle]}>Change Password</Text>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Current Password</Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor={colors.primary}
                  style={[styles.fieldInput, ui.fieldValue]}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowCurrentPassword((value) => !value)}>
                  <Feather name={showCurrentPassword ? 'eye-off' : 'eye'} size={18} color={ui.eyeButton.color} />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>New Password</Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor={colors.primary}
                  style={[styles.fieldInput, ui.fieldValue]}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowNewPassword((value) => !value)}>
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color={ui.eyeButton.color} />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Confirm New Password</Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor={colors.primary}
                  style={[styles.fieldInput, ui.fieldValue]}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPassword((value) => !value)}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={ui.eyeButton.color} />
                </Pressable>
              </View>
            </View>

            <Pressable style={[styles.updateButton, ui.updateButton]} onPress={() => router.back()}>
              <Text style={[styles.updateButtonText, ui.updateButtonText]}>Update Password</Text>
            </Pressable>
          </ScrollView>
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
  content: {
    paddingTop: 24,
  },
  securityCard: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  securityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  securityCardSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginTop: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  fieldBlock: {
    marginTop: 18,
  },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  fieldSurface: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
