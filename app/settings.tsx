import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signOut } from '@/services/auth';

type AccountItem = {
  title: string;
  value?: string;
  icon: 'user' | 'lock' | 'credit-card';
};

type SupportItem = {
  title: string;
  icon: 'help-circle' | 'shield' | 'star';
  badge?: string;
};

const accountItems: readonly AccountItem[] = [
  {
    title: 'Personal Details',
    value: 'Juan dela Cruz',
    icon: 'user',
  },
  {
    title: 'Security & Password',
    icon: 'lock',
  },
  {
    title: 'Cards & Wallets',
    value: '4 methods',
    icon: 'credit-card',
  },
] as const;

const supportItems: readonly SupportItem[] = [
  {
    title: 'Help Center',
    icon: 'help-circle',
  },
  {
    title: 'Privacy Policy',
    icon: 'shield',
  },
  {
    title: 'Rate Eyrie',
    icon: 'star',
    badge: 'New',
  },
] as const;

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const { isSigningOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const isDark = colorScheme === 'dark';

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? '#060B15' : colors.background },
      title: { color: isDark ? '#FFFFFF' : colors.foreground },
      subtitle: { color: isDark ? '#9EA6B5' : '#6B7485' },
      sectionLabel: { color: isDark ? '#9EA6B5' : '#7C8798' },
      streakChip: {
        backgroundColor: isDark ? 'rgba(255, 124, 39, 0.14)' : 'rgba(255, 147, 76, 0.14)',
        borderColor: isDark ? 'rgba(255, 124, 39, 0.4)' : 'rgba(255, 147, 76, 0.42)',
      },
      streakText: { color: '#FF8A1F' },
      statCard: {
        backgroundColor: isDark ? '#101722' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.92),
      },
      sectionCard: {
        backgroundColor: isDark ? '#101722' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.92),
      },
      rowDivider: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.84),
      },
      rowIconWrap: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.9),
      },
      trailingText: { color: isDark ? '#9EA6B5' : '#6B7485' },
      signOutButton: {
        borderColor: isDark ? 'rgba(255, 34, 63, 0.6)' : 'rgba(235, 58, 87, 0.52)',
        backgroundColor: 'transparent',
      },
      footerText: { color: isDark ? '#A1ABBA' : '#778294' },
      switchTrackOff: isDark ? '#1B2330' : '#D5DAE2',
      switchThumbOff: '#FFFFFF',
      switchTrackOn: '#1495FF',
      badgeBackground: isDark ? 'rgba(20,149,255,0.18)' : 'rgba(20,149,255,0.14)',
      badgeText: '#1495FF',
    }),
    [colors, isDark]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileBlock}>
            <View style={styles.profileBadgeWrap}>
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>JD</Text>
              </View>
              <View style={styles.mascotBadge}>
                <Image
                  contentFit="cover"
                  source={require('@/assets/images/Eyrie_Mascot_3.png')}
                  style={styles.mascotImage}
                />
              </View>
            </View>

            <Text style={[styles.profileName, pageStyles.title]}>Juan dela Cruz</Text>
            <Text style={[styles.profileEmail, pageStyles.subtitle]}>juan.delacruz@email.com</Text>

            <View style={[styles.streakChip, pageStyles.streakChip]}>
              <Ionicons name="flame" size={16} color="#FF8A1F" />
              <Text style={[styles.streakText, pageStyles.streakText]}>127 Day Streak</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, pageStyles.statCard, shadows.soft]}>
              <Text style={[styles.statValue, pageStyles.title]}>127</Text>
              <Text style={[styles.statLabel, pageStyles.subtitle]}>Transactions</Text>
            </View>
            <View style={[styles.statCard, pageStyles.statCard, shadows.soft]}>
              <Text style={[styles.statValue, pageStyles.title]}>85</Text>
              <Text style={[styles.statLabel, pageStyles.subtitle]}>Health Score</Text>
            </View>
            <View style={[styles.statCard, pageStyles.statCard, shadows.soft]}>
              <Text style={[styles.statValue, pageStyles.title]}>4</Text>
              <Text style={[styles.statLabel, pageStyles.subtitle]}>Goals Active</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, pageStyles.sectionLabel]}>Account</Text>
          <View style={[styles.sectionCard, pageStyles.sectionCard, shadows.soft]}>
            {accountItems.map((item, index) => (
              <View key={item.title}>
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    if (item.title === 'Personal Details') {
                      router.push('/personal-details-modal');
                    } else if (item.title === 'Security & Password') {
                      router.push('/security-password-modal');
                    } else if (item.title === 'Cards & Wallets') {
                      router.push('/payment-methods-modal');
                    }
                  }}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIconWrap, pageStyles.rowIconWrap]}>
                      <Feather name={item.icon as 'user' | 'lock' | 'credit-card'} size={18} color={colors.foreground} />
                    </View>
                    <Text style={[styles.rowTitle, pageStyles.title]}>{item.title}</Text>
                  </View>

                  <View style={styles.rowRight}>
                    {item.value ? <Text style={[styles.rowValue, pageStyles.trailingText]}>{item.value}</Text> : null}
                    <Feather name="chevron-right" size={18} color={pageStyles.trailingText.color} />
                  </View>
                </Pressable>
                {index < accountItems.length - 1 ? <View style={[styles.rowDivider, pageStyles.rowDivider]} /> : null}
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, pageStyles.sectionLabel]}>App Settings</Text>
          <View style={[styles.sectionCard, pageStyles.sectionCard, shadows.soft]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconWrap, pageStyles.rowIconWrap]}>
                  <Feather name="sun" size={18} color={colors.foreground} />
                </View>
                <Text style={[styles.rowTitle, pageStyles.title]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                disabled
                trackColor={{ false: pageStyles.switchTrackOff, true: pageStyles.switchTrackOn }}
                thumbColor={pageStyles.switchThumbOff}
                ios_backgroundColor={pageStyles.switchTrackOff}
              />
            </View>

            <View style={[styles.rowDivider, pageStyles.rowDivider]} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconWrap, pageStyles.rowIconWrap]}>
                  <Feather name="bell" size={18} color={colors.foreground} />
                </View>
                <Text style={[styles.rowTitle, pageStyles.title]}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: pageStyles.switchTrackOff, true: pageStyles.switchTrackOn }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={pageStyles.switchTrackOff}
              />
            </View>

            <View style={[styles.rowDivider, pageStyles.rowDivider]} />

            <Pressable style={styles.row} onPress={() => router.push('/currency-modal')}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconWrap, pageStyles.rowIconWrap]}>
                  <MaterialCommunityIcons name="earth" size={18} color={colors.foreground} />
                </View>
                <Text style={[styles.rowTitle, pageStyles.title]}>Currency</Text>
              </View>

              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, pageStyles.trailingText]}>PHP (₱)</Text>
                <Feather name="chevron-right" size={18} color={pageStyles.trailingText.color} />
              </View>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, pageStyles.sectionLabel]}>Support</Text>
          <View style={[styles.sectionCard, pageStyles.sectionCard, shadows.soft]}>
            {supportItems.map((item, index) => (
              <View key={item.title}>
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    if (item.title === 'Help Center') {
                      router.push('/help-center-modal');
                    } else if (item.title === 'Privacy Policy') {
                      router.push('/privacy-policy-modal');
                    }
                  }}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIconWrap, pageStyles.rowIconWrap]}>
                      <Feather
                        name={item.icon as 'help-circle' | 'shield' | 'star'}
                        size={18}
                        color={colors.foreground}
                      />
                    </View>
                    <Text style={[styles.rowTitle, pageStyles.title]}>{item.title}</Text>
                  </View>

                  <View style={styles.rowRight}>
                    {item.badge ? (
                      <View style={[styles.badge, { backgroundColor: pageStyles.badgeBackground }]}>
                        <Text style={[styles.badgeText, { color: pageStyles.badgeText }]}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <Feather name="chevron-right" size={18} color={pageStyles.trailingText.color} />
                  </View>
                </Pressable>
                {index < supportItems.length - 1 ? <View style={[styles.rowDivider, pageStyles.rowDivider]} /> : null}
              </View>
            ))}
          </View>

          <Pressable
            disabled={isSigningOut}
            onPress={() => {
              signOut().catch(() => {
                // Global feedback is handled by the auth service/store.
              });
            }}
            style={[styles.signOutButton, pageStyles.signOutButton, isSigningOut && { opacity: 0.7 }]}>
            <Feather name="log-out" size={18} color="#FF2440" />
            <Text style={styles.signOutText}>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</Text>
          </Pressable>

          <View style={styles.footerBrand}>
            <View style={styles.footerAvatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_3.png')}
                style={styles.footerAvatar}
              />
            </View>
            <Text style={[styles.footerBrandName, pageStyles.title]}>Eyrie</Text>
            <Text style={[styles.footerVersion, pageStyles.footerText]}>Version 1.0.0</Text>
            <Text style={[styles.footerNote, pageStyles.footerText]}>Made with care in the Philippines</Text>
          </View>
        </ScrollView>

        <AppBottomNav activeTab="none" variant={isDark ? 'dark' : 'light'} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 150,
  },
  profileBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  profileBadgeWrap: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: '#1495FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
    color: '#08121D',
  },
  mascotBadge: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  profileName: {
    marginTop: 14,
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  profileEmail: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  streakChip: {
    marginTop: 18,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  statsRow: {
    marginTop: 30,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  sectionCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: 68,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowValue: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  rowDivider: {
    marginLeft: 64,
    height: 1,
  },
  badge: {
    minWidth: 38,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  signOutButton: {
    marginTop: 28,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  signOutText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    color: '#FF2440',
  },
  footerBrand: {
    marginTop: 38,
    alignItems: 'center',
  },
  footerAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footerAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  footerBrandName: {
    marginTop: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  footerVersion: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  footerNote: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
});
