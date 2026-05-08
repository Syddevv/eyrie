import { Feather, Ionicons, Octicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type NavVariant = 'light' | 'dark';
type ActiveTab = 'home' | 'budget' | 'goals' | 'assistant' | 'none';

interface AppBottomNavProps {
  activeTab: ActiveTab;
  variant?: NavVariant;
}

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function AppBottomNav({ activeTab, variant = 'light' }: AppBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];

  const isDark = variant === 'dark';
  const backgroundColor = isDark ? '#111722' : colors.card;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : withOpacity(colors.border, 0.86);
  const mutedColor = isDark ? '#7E8796' : colors.mutedForeground;
  const activeColor = '#1495FF';
  const plusShadow = isDark ? shadows.glow : shadows.glow;

  const navigate = (href: '/' | '/explore' | '/goals' | '/assistant') => {
    if (pathname !== href) {
      router.replace(href);
    }
  };

  const openAddTransaction = () => {
    if (pathname !== '/modal') {
      router.push('/modal');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.navBar, { backgroundColor, borderColor }, shadows.floating]}>
        <Pressable style={styles.navItem} onPress={() => navigate('/')}>
          <Ionicons name="home" size={22} color={activeTab === 'home' ? activeColor : mutedColor} />
          <Text style={[styles.navLabel, { color: activeTab === 'home' ? activeColor : mutedColor }]}>
            Home
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => navigate('/explore')}>
          <Ionicons
            name="wallet-outline"
            size={22}
            color={activeTab === 'budget' ? activeColor : mutedColor}
          />
          <Text style={[styles.navLabel, { color: activeTab === 'budget' ? activeColor : mutedColor }]}>
            Budget
          </Text>
        </Pressable>

        <Pressable
          style={[styles.plusButton, { backgroundColor: activeColor }, plusShadow]}
          onPress={openAddTransaction}>
          <Feather name="plus" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => navigate('/goals')}>
          <Octicons name="goal" size={20} color={activeTab === 'goals' ? activeColor : mutedColor} />
          <Text style={[styles.navLabel, { color: activeTab === 'goals' ? activeColor : mutedColor }]}>
            Goals
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => navigate('/assistant')}>
          <Image
            contentFit="cover"
            source={require('@/assets/images/Eyrie_Mascot_3.png')}
            style={styles.assistantIcon}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === 'assistant' ? activeColor : mutedColor },
            ]}>
            Assistant
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
  },
  navBar: {
    height: 80,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    gap: 4,
  },
  navLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  assistantIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
  },
});
