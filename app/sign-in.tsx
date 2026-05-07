import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from '@/constants/typography';
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

function FormField({
  label,
  placeholder,
  icon,
  secureTextEntry = false,
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  secureTextEntry?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.cardForeground }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: withOpacity(colors.secondary, colorScheme === 'light' ? 0.72 : 0.95),
            borderColor: withOpacity(colors.border, colorScheme === 'light' ? 0.85 : 1),
          },
        ]}>
        <Feather name={icon} size={20} color={colors.mutedForeground} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={withOpacity(colors.mutedForeground, 0.9)}
          secureTextEntry={hidden}
          style={[styles.input, { color: colors.foreground }]}
          selectionColor={colors.primary}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      heroBadge: {
        borderColor: withOpacity(colors.card, 0.96),
        backgroundColor: withOpacity(colors.primary, colorScheme === 'light' ? 0.12 : 0.18),
      },
      primaryButton: {
        backgroundColor: colorScheme === 'light' ? '#75B1E8' : colors.primary,
      },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      linkText: { color: colorScheme === 'light' ? '#0E67F7' : colors.primary },
      socialButton: {
        backgroundColor: withOpacity(colors.secondary, colorScheme === 'light' ? 0.72 : 0.95),
        borderColor: withOpacity(colors.border, colorScheme === 'light' ? 0.85 : 1),
      },
      divider: {
        backgroundColor: withOpacity(colors.border, 0.9),
      },
      infoCard: {
        backgroundColor:
          colorScheme === 'light' ? 'rgba(213, 231, 249, 0.86)' : withOpacity(colors.primary, 0.18),
        borderColor:
          colorScheme === 'light' ? 'rgba(186, 214, 243, 0.98)' : withOpacity(colors.primary, 0.32),
      },
      noteIcon: {
        backgroundColor: withOpacity(colors.card, 0.92),
        borderColor: withOpacity(colors.card, 0.98),
      },
    }),
    [colorScheme, colors]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topContent}>
            <View style={[styles.logoFrame, pageStyles.heroBadge, shadows.soft]}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Logo.png')}
                style={styles.logo}
              />
            </View>

            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, pageStyles.mutedText]}>
                Sign in to continue to Eyrie
              </Text>
            </View>

            <View style={styles.form}>
              <FormField label="Email" placeholder="Enter your email" icon="mail" />
              <FormField label="Password" placeholder="Enter your password" icon="lock" secureTextEntry />
            </View>

            <Pressable accessibilityRole="button" style={styles.forgotWrap}>
              <Text style={[styles.forgotText, pageStyles.linkText]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, pageStyles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, pageStyles.divider]} />
              <Text style={[styles.dividerText, pageStyles.mutedText]}>or continue with</Text>
              <View style={[styles.dividerLine, pageStyles.divider]} />
            </View>

            <View style={styles.socialRow}>
              <Pressable accessibilityRole="button" style={[styles.socialButton, pageStyles.socialButton]}>
                <Ionicons name="logo-google" size={20} color={colors.foreground} />
                <Text style={[styles.socialText, { color: colors.foreground }]}>Google</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={[styles.socialButton, pageStyles.socialButton]}>
                <Ionicons name="logo-github" size={20} color={colors.foreground} />
                <Text style={[styles.socialText, { color: colors.foreground }]}>GitHub</Text>
              </Pressable>
            </View>

            <View style={[styles.infoCard, pageStyles.infoCard]}>
              <View style={[styles.noteIconWrap, pageStyles.noteIcon]}>
                <Image
                  contentFit="cover"
                  source={require('@/assets/images/Eyrie_Logo.png')}
                  style={styles.noteIcon}
                />
              </View>
              <Text style={[styles.infoText, pageStyles.mutedText]}>
                Your financial data is encrypted and secure. Eyrie never shares your information with third parties.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, pageStyles.mutedText]}>Don&apos;t have an account? </Text>
            <Link href="/" style={[styles.footerLink, pageStyles.linkText]}>
              Sign up
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
  },
  topContent: {
    gap: 0,
  },
  logoFrame: {
    width: 108,
    height: 108,
    borderRadius: radius.full,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginTop: 12,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    textAlign: 'center',
  },
  form: {
    marginTop: 36,
    gap: 18,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 16,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  forgotText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    ...shadows.glow,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  socialButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  socialText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  infoCard: {
    marginTop: 26,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 42,
  },
  footerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  footerLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.semibold,
  },
});
