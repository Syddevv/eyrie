import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
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

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];

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
      agreementCircle: {
        borderColor: withOpacity(colors.mutedForeground, 0.55),
      },
      noteCard: {
        backgroundColor:
          colorScheme === 'light'
            ? 'rgba(202, 234, 228, 0.82)'
            : withOpacity(colors.success, 0.2),
        borderColor:
          colorScheme === 'light'
            ? 'rgba(156, 211, 202, 0.92)'
            : withOpacity(colors.success, 0.34),
      },
      noteIcon: {
        backgroundColor: withOpacity(colors.card, 0.92),
        borderColor: withOpacity(colors.card, 0.98),
      },
      mutedText: { color: colorScheme === 'light' ? '#5B6980' : colors.mutedForeground },
      linkText: { color: colorScheme === 'light' ? '#0E67F7' : colors.primary },
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
              Join Eyrie and take control of your finances
            </Text>
          </View>

          <View style={styles.form}>
            <FormField label="Full Name" placeholder="Enter your full name" icon="user" />
            <FormField label="Email" placeholder="Enter your email" icon="mail" />
            <FormField label="Password" placeholder="Create a password" icon="lock" secureTextEntry />
            <FormField
              label="Confirm Password"
              placeholder="Confirm your password"
              icon="lock"
              secureTextEntry
            />
          </View>

          <View style={styles.agreementRow}>
            <View style={[styles.agreementCircle, pageStyles.agreementCircle]} />
            <Text style={[styles.agreementText, pageStyles.mutedText]}>
              I agree to the <Text style={pageStyles.linkText}>Terms of Service</Text> and{' '}
              <Text style={pageStyles.linkText}>Privacy Policy</Text>
            </Text>
          </View>

          <Pressable accessibilityRole="button" style={[styles.primaryButton, pageStyles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
          </Pressable>

          <View style={[styles.noteCard, pageStyles.noteCard]}>
            <View style={[styles.noteIconWrap, pageStyles.noteIcon]}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Logo.png')}
                style={styles.noteIcon}
              />
            </View>
            <Text style={[styles.noteText, pageStyles.mutedText]}>
              {"By joining Eyrie, you're taking the first step toward financial freedom. Let's soar together!"}
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
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginTop: 26,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 24,
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
    paddingHorizontal: 18,
  },
  form: {
    marginTop: 34,
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
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 20,
    paddingRight: 12,
  },
  agreementCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    flexShrink: 0,
  },
  agreementText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.glow,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  noteCard: {
    marginTop: 22,
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
  noteText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
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
