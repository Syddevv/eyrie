import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { GoogleButton } from '@/components/auth/GoogleButton';
import { themeColors } from '@/constants/colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signInWithEmailPassword, signInWithGoogle } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function FormField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address';
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
        <Feather name={icon} size={18} color={colors.mutedForeground} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={withOpacity(colors.mutedForeground, 0.9)}
          secureTextEntry={hidden}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.foreground }]}
          value={value}
        />
        {secureTextEntry ? (
          <Pressable hitSlop={8} onPress={() => setHidden((current) => !current)}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const showSnackbar = useAuthStore((state) => state.showSnackbar);
  const { isSigningIn, isGoogleLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
      primaryButtonDisabled: {
        backgroundColor: colorScheme === 'light' ? '#A9CDED' : '#31577D',
      },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      linkText: { color: colorScheme === 'light' ? '#0E67F7' : colors.primary },
      divider: {
        backgroundColor: withOpacity(colors.border, 0.9),
      },
      infoCard: {
        backgroundColor:
          colorScheme === 'light' ? 'rgba(213, 231, 249, 0.82)' : withOpacity(colors.primary, 0.15),
        borderColor:
          colorScheme === 'light' ? 'rgba(186, 214, 243, 0.94)' : withOpacity(colors.primary, 0.28),
      },
      noteIcon: {
        backgroundColor: withOpacity(colors.card, 0.92),
        borderColor: withOpacity(colors.card, 0.98),
      },
    }),
    [colorScheme, colors]
  );

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSignIn = async () => {
    if (!email.trim()) {
      showSnackbar('Enter your email to continue.', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showSnackbar('Enter a valid email address.', 'error');
      return;
    }

    if (!password) {
      showSnackbar('Enter your password to continue.', 'error');
      return;
    }

    try {
      await signInWithEmailPassword({ email, password });
    } catch {
      // Global feedback is handled by the auth service/store.
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Global feedback is handled by the auth service/store.
    }
  };

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
                Sign in securely with your email and password
              </Text>
            </View>

            <View style={styles.form}>
              <FormField
                label="Email"
                placeholder="Enter your email"
                icon="mail"
                keyboardType="email-address"
                onChangeText={setEmail}
                value={email}
              />
              <FormField
                label="Password"
                placeholder="Enter your password"
                icon="lock"
                onChangeText={setPassword}
                secureTextEntry
                value={password}
              />
            </View>

            <Pressable style={styles.forgotWrap}>
              <Text style={[styles.forgotText, pageStyles.linkText]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSignIn}
              style={[
                styles.primaryButton,
                canSubmit ? pageStyles.primaryButton : pageStyles.primaryButtonDisabled,
              ]}>
              {isSigningIn ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, pageStyles.divider]} />
              <Text style={[styles.dividerText, pageStyles.mutedText]}>or continue with</Text>
              <View style={[styles.dividerLine, pageStyles.divider]} />
            </View>

            <GoogleButton loading={isGoogleLoading} onPress={handleGoogle} />

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

            <View style={styles.footer}>
              <Text style={[styles.footerText, pageStyles.mutedText]}>Don&apos;t have an account? </Text>
              <Link href="/sign-up" style={[styles.footerLink, pageStyles.linkText]}>
                Sign up
              </Link>
            </View>
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
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[5],
    paddingBottom: spacing[5],
  },
  topContent: {
    gap: 0,
  },
  logoFrame: {
    width: 82,
    height: 82,
    borderRadius: radius.full,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginTop: 8,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  form: {
    marginTop: 22,
    gap: 12,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 12,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    ...shadows.glow,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  noteIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 18,
  },
  footerText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  footerLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.semibold,
  },
});
