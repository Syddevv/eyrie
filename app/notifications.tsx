import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

const notifications = [
  {
    title: 'Budget Warning',
    body: "You've used 80% of your Food & Dining budget for this month.",
    time: '2 hours ago',
    accent: '#1495FF',
    unread: true,
    iconBackgroundLight: '#FFF0C7',
    iconBackgroundDark: '#FFF0C7',
    icon: <Ionicons name="warning-outline" size={22} color="#FF8A00" />,
  },
  {
    title: 'Goal Reached!',
    body: "Congratulations! You've saved enough for your Emergency Fund goal.",
    time: '5 hours ago',
    accent: '#1495FF',
    unread: true,
    iconBackgroundLight: '#D7F6E8',
    iconBackgroundDark: '#D7F6E8',
    icon: <Ionicons name="checkmark-circle-outline" size={22} color="#0CBB5A" />,
  },
  {
    title: 'Weekly Spending Report',
    body: "You spent 18% less this week compared to last week. Great job!",
    time: '1 day ago',
    accent: '#FFFFFF',
    unread: false,
    iconBackgroundLight: '#E4EEFF',
    iconBackgroundDark: '#E4EEFF',
    icon: <Feather name="trending-up" size={20} color="#2563EB" />,
  },
  {
    title: 'Money Saving Tip',
    body: 'Try meal prepping on weekends to reduce your dining expenses.',
    time: '2 days ago',
    accent: '#FFFFFF',
    unread: false,
    iconBackgroundLight: '#FFE1F0',
    iconBackgroundDark: '#FFE1F0',
    icon: <MaterialCommunityIcons name="lightbulb-on-outline" size={21} color="#F72585" />,
  },
  {
    title: 'Goal Progress',
    body: "You're 75% toward your New Laptop savings goal!",
    time: '3 days ago',
    accent: '#FFFFFF',
    unread: false,
    iconBackgroundLight: '#EFE3FF',
    iconBackgroundDark: '#EFE3FF',
    icon: <MaterialCommunityIcons name="target" size={20} color="#8A2BE2" />,
  },
  {
    title: 'Unusual Activity',
    body: 'Multiple transactions detected at a new location. Please verify.',
    time: '4 days ago',
    accent: '#FFFFFF',
    unread: false,
    iconBackgroundLight: '#FFF0C7',
    iconBackgroundDark: '#FFF0C7',
    icon: <Ionicons name="warning-outline" size={22} color="#FF8A00" />,
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

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? '#060B15' : colors.background },
      title: { color: isDark ? '#FFFFFF' : colors.foreground },
      subtitle: { color: isDark ? '#9EA6B5' : '#6B7485' },
      iconButton: {
        backgroundColor: isDark ? '#161D29' : withOpacity(colors.secondary, 0.9),
      },
      infoCard: {
        backgroundColor: isDark ? '#071B35' : '#EAF5FF',
        borderColor: isDark ? 'rgba(20,149,255,0.2)' : 'rgba(20,149,255,0.16)',
      },
      infoTitle: { color: isDark ? '#FFFFFF' : '#0D1B2A' },
      infoText: { color: isDark ? '#A5B2C2' : '#5C7694' },
      card: {
        backgroundColor: isDark ? '#101722' : colors.card,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : withOpacity(colors.border, 0.92),
      },
      cardTitleDefault: { color: isDark ? '#FFFFFF' : colors.foreground },
      cardText: { color: isDark ? '#9EA6B5' : '#6B7485' },
      dot: { backgroundColor: '#1495FF' },
    }),
    [colors, isDark]
  );

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <Pressable style={[styles.iconButton, pageStyles.iconButton]} onPress={() => router.back()}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, pageStyles.title]}>Notifications</Text>
              <Text style={[styles.subtitle, pageStyles.subtitle]}>2 unread</Text>
            </View>

            <Pressable style={[styles.iconButton, pageStyles.iconButton]}>
              <Feather name="check" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoCard, pageStyles.infoCard]}>
            <View style={styles.infoAvatarFrame}>
              <Image
                contentFit="cover"
                source={require('@/assets/images/Eyrie_Mascot_1.png')}
                style={styles.infoAvatar}
              />
            </View>
            <View style={styles.infoBody}>
              <Text style={[styles.infoTitle, pageStyles.infoTitle]}>Stay Informed</Text>
              <Text style={[styles.infoText, pageStyles.infoText]}>
                Eyrie will notify you about spending alerts, goal progress, and helpful insights to keep you on track.
              </Text>
            </View>
          </View>

          <View style={styles.cardsList}>
            {notifications.map((item) => (
              <View key={item.title} style={[styles.notificationCard, pageStyles.card, shadows.soft]}>
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.notificationIconWrap,
                      {
                        backgroundColor: isDark ? item.iconBackgroundDark : item.iconBackgroundLight,
                      },
                    ]}>
                    {item.icon}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          item.unread ? { color: '#1495FF' } : pageStyles.cardTitleDefault,
                        ]}>
                        {item.title}
                      </Text>
                      {item.unread ? <View style={[styles.unreadDot, pageStyles.dot]} /> : null}
                    </View>

                    <Text style={[styles.cardText, pageStyles.cardText]}>{item.body}</Text>
                    <Text style={[styles.cardTime, pageStyles.cardText]}>{item.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
  headerBlock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
  },
  infoAvatarFrame: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: '#D8F7EC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  infoAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
  },
  infoBody: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  infoText: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 28,
  },
  cardsList: {
    marginTop: 24,
    gap: 14,
  },
  notificationCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  notificationIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginTop: 2,
  },
  cardText: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 28,
  },
  cardTime: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
});
