import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
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
import { signInWithGoogle, signUpWithEmailPassword } from '@/services/auth';
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
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  secureTextEntry = false,
}: {
  label: string;
  placeholder: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words';
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
          autoCapitalize={autoCapitalize}
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

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const showSnackbar = useAuthStore((state) => state.showSnackbar);
  const { isSigningUp, isGoogleLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      backButton: {
        backgroundColor: withOpacity(colors.card, colorScheme === 'light' ? 0.62 : 0.16),
        borderColor: withOpacity(colors.border, colorScheme === 'light' ? 0.45 : 0.8),
      },
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
      agreementCircle: {
        borderColor: acceptedTerms ? colors.primary : withOpacity(colors.mutedForeground, 0.55),
        backgroundColor: acceptedTerms ? colors.primary : 'transparent',
      },
      noteCard: {
        backgroundColor:
          colorScheme === 'light'
            ? 'rgba(202, 234, 228, 0.8)'
            : withOpacity(colors.success, 0.18),
        borderColor:
          colorScheme === 'light'
            ? 'rgba(156, 211, 202, 0.9)'
            : withOpacity(colors.success, 0.3),
      },
      noteIcon: {
        backgroundColor: withOpacity(colors.card, 0.92),
        borderColor: withOpacity(colors.card, 0.98),
      },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      linkText: { color: colorScheme === 'light' ? '#0E67F7' : colors.primary },
      divider: {
        backgroundColor: withOpacity(colors.border, 0.9),
      },
    }),
    [acceptedTerms, colorScheme, colors]
  );

  const canSubmit =
    fullName.trim().length > 1 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    acceptedTerms;

  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      showSnackbar('Enter your full name to continue.', 'error');
      return;
    }

    if (!email.trim()) {
      showSnackbar('Enter your email to continue.', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showSnackbar('Enter a valid email address.', 'error');
      return;
    }

    if (!password) {
      showSnackbar('Create a password to continue.', 'error');
      return;
    }

    if (password.length < 8) {
      showSnackbar('Password must be at least 8 characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar('Passwords do not match.', 'error');
      return;
    }

    if (!acceptedTerms) {
      showSnackbar('Accept the Terms of Service and Privacy Policy to continue.', 'error');
      return;
    }

    try {
      await signUpWithEmailPassword({
        fullName,
        email,
        password,
      });
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => router.back()}
            style={[styles.backButton, pageStyles.backButton]}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </Pressable>

          <View style={[styles.logoFrame, pageStyles.heroBadge, shadows.soft]}>
            <Image
              contentFit="cover"
              source={require('@/assets/images/Eyrie_Logo.png')}
              style={styles.logo}
            />
          </View>

          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
            <Text style={[styles.subtitle, pageStyles.mutedText]}>
              Create your Eyrie account and verify it with the 6-digit code from your email
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              label="Full Name"
              placeholder="Enter your full name"
              icon="user"
              autoCapitalize="words"
              onChangeText={setFullName}
              value={fullName}
            />
            <FormField
              label="Email"
              placeholder="Enter your email"
              icon="mail"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              value={email}
            />
            <FormField
              label="Password"
              placeholder="Create a password"
              icon="lock"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
            <FormField
              label="Confirm Password"
              placeholder="Confirm your password"
              icon="shield"
              onChangeText={setConfirmPassword}
              secureTextEntry
              value={confirmPassword}
            />
          </View>

          <Pressable style={styles.agreementRow} onPress={() => setAcceptedTerms((value) => !value)}>
            <View style={[styles.agreementCircle, pageStyles.agreementCircle]}>
              {acceptedTerms ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={[styles.agreementText, pageStyles.mutedText]}>
              I agree to the <Text style={pageStyles.linkText}>Terms of Service</Text> and{' '}
              <Text style={pageStyles.linkText}>Privacy Policy</Text>
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleCreateAccount}
            style={[
              styles.primaryButton,
              canSubmit ? pageStyles.primaryButton : pageStyles.primaryButtonDisabled,
            ]}>
            {isSigningUp ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, pageStyles.divider]} />
            <Text style={[styles.dividerText, pageStyles.mutedText]}>or continue with</Text>
            <View style={[styles.dividerLine, pageStyles.divider]} />
          </View>

          <GoogleButton label="Continue with Google" loading={isGoogleLoading} onPress={handleGoogle} />

          <View style={[styles.noteCard, pageStyles.noteCard]}>
            <View style={[styles.noteIconWrap, pageStyles.noteIcon]}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Logo.png')}
                style={styles.noteIcon}
              />
            </View>
            <Text style={[styles.noteText, pageStyles.mutedText]}>
              After sign-up, Supabase sends a 6-digit verification code instead of a confirmation link.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, pageStyles.mutedText]}>Already have an account? </Text>
            <Link href="/sign-in" style={[styles.footerLink, pageStyles.linkText]}>
              Sign in
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
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoFrame: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginTop: 10,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 16,
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
    paddingHorizontal: 14,
  },
  form: {
    marginTop: 20,
    gap: 10,
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
    minHeight: 48,
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
    paddingVertical: 11,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
    paddingRight: 12,
  },
  agreementCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agreementText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
    marginTop: 16,
    marginBottom: 12,
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
  noteCard: {
    marginTop: 14,
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
  noteText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
