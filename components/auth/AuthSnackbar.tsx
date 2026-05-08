import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DISPLAY_DURATION_MS = 2800;

export function AuthSnackbar() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const { snackbar, hideSnackbar } = useAuth();
  const offsetY = useSharedValue(48);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!snackbar?.visible) {
      opacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
      offsetY.value = withTiming(48, { duration: 220, easing: Easing.out(Easing.ease) });
      return;
    }

    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    offsetY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => hideSnackbar(), DISPLAY_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [hideSnackbar, offsetY, opacity, snackbar?.visible]);

  const toneStyles = useMemo(() => {
    if (!snackbar) {
      return {
        backgroundColor: colors.card,
        borderColor: colors.border,
        accentColor: colors.primary,
      };
    }

    if (snackbar.tone === 'success') {
      return {
        backgroundColor: colorScheme === 'dark' ? 'rgba(22, 163, 74, 0.18)' : '#ECFDF3',
        borderColor: colorScheme === 'dark' ? 'rgba(34, 197, 94, 0.32)' : '#BBF7D0',
        accentColor: '#16A34A',
      };
    }

    if (snackbar.tone === 'error') {
      return {
        backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2',
        borderColor: colorScheme === 'dark' ? 'rgba(248, 113, 113, 0.3)' : '#FECACA',
        accentColor: '#EF4444',
      };
    }

    return {
      backgroundColor: colorScheme === 'dark' ? 'rgba(79, 140, 255, 0.16)' : '#EFF6FF',
      borderColor: colorScheme === 'dark' ? 'rgba(96, 165, 250, 0.28)' : '#BFDBFE',
      accentColor: colors.primary,
    };
  }, [colorScheme, colors.border, colors.card, colors.primary, snackbar]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  if (!snackbar) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.wrapper, animatedStyle]}>
      <View
        style={[
          styles.container,
          shadows.card,
          {
            backgroundColor: toneStyles.backgroundColor,
            borderColor: toneStyles.borderColor,
          },
        ]}>
        <View style={[styles.accent, { backgroundColor: toneStyles.accentColor }]} />
        <Text style={[styles.message, { color: colors.foreground }]}>{snackbar.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 50,
  },
  container: {
    minHeight: 56,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accent: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: radius.full,
  },
  message: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
