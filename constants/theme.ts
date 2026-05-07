import type { Theme } from '@react-navigation/native';
import type { ViewStyle } from 'react-native';

import { darkThemeColors, lightThemeColors, themeColors, type ThemeMode } from './colors';
import { fontFamilies } from './typography';

export const spacing = {
  0: 0,
  px: 1,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  full: 9999,
} as const;

export const blur = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  '2xl': 32,
} as const;

export const elevation = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: elevation.sm,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: elevation.md,
  },
  floating: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: elevation.lg,
  },
  glow: {
    shadowColor: lightThemeColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: elevation.md,
  },
} as const;

export const gradientPresets = {
  light: lightThemeColors.gradients,
  dark: darkThemeColors.gradients,
} as const;

export const glassmorphism = {
  light: {
    regular: {
      backgroundColor: lightThemeColors.glass.background,
      borderColor: lightThemeColors.glass.border,
      borderWidth: 1,
      overflow: 'hidden',
    },
    strong: {
      backgroundColor: lightThemeColors.glass.backgroundStrong,
      borderColor: lightThemeColors.glass.borderStrong,
      borderWidth: 1,
      overflow: 'hidden',
    },
  },
  dark: {
    regular: {
      backgroundColor: darkThemeColors.glass.background,
      borderColor: darkThemeColors.glass.border,
      borderWidth: 1,
      overflow: 'hidden',
    },
    strong: {
      backgroundColor: darkThemeColors.glass.backgroundStrong,
      borderColor: darkThemeColors.glass.borderStrong,
      borderWidth: 1,
      overflow: 'hidden',
    },
  },
} as const satisfies Record<ThemeMode, Record<'regular' | 'strong', ViewStyle>>;

export const cardStyles = {
  base: {
    borderRadius: radius['3xl'],
    padding: spacing[5],
  },
  surface: {
    borderRadius: radius['3xl'],
    padding: spacing[5],
    borderWidth: 1,
    ...shadows.soft,
  },
  elevated: {
    borderRadius: radius['3xl'],
    padding: spacing[6],
    borderWidth: 1,
    ...shadows.card,
  },
  floating: {
    borderRadius: radius['3xl'],
    padding: spacing[6],
    borderWidth: 1,
    ...shadows.floating,
  },
} as const satisfies Record<string, ViewStyle>;

export const navigationThemes = {
  light: {
    dark: false,
    colors: {
      primary: lightThemeColors.primary,
      background: lightThemeColors.background,
      card: lightThemeColors.card,
      text: lightThemeColors.foreground,
      border: lightThemeColors.border,
      notification: lightThemeColors.destructive,
    },
    fonts: {
      regular: {
        fontFamily: fontFamilies.sans,
        fontWeight: '400',
      },
      medium: {
        fontFamily: fontFamilies.sans,
        fontWeight: '500',
      },
      bold: {
        fontFamily: fontFamilies.sans,
        fontWeight: '700',
      },
      heavy: {
        fontFamily: fontFamilies.sans,
        fontWeight: '800',
      },
    },
  },
  dark: {
    dark: true,
    colors: {
      primary: darkThemeColors.primary,
      background: darkThemeColors.background,
      card: darkThemeColors.card,
      text: darkThemeColors.foreground,
      border: darkThemeColors.border,
      notification: darkThemeColors.destructive,
    },
    fonts: {
      regular: {
        fontFamily: fontFamilies.sans,
        fontWeight: '400',
      },
      medium: {
        fontFamily: fontFamilies.sans,
        fontWeight: '500',
      },
      bold: {
        fontFamily: fontFamilies.sans,
        fontWeight: '700',
      },
      heavy: {
        fontFamily: fontFamilies.sans,
        fontWeight: '800',
      },
    },
  },
} as const satisfies Record<ThemeMode, Theme>;

export function getTheme(mode: ThemeMode) {
  return themeColors[mode];
}

export function createGlassStyle(mode: ThemeMode, strength: 'regular' | 'strong' = 'regular') {
  return glassmorphism[mode][strength];
}

export function createCardStyle(
  mode: ThemeMode,
  variant: keyof typeof cardStyles = 'surface'
): ViewStyle {
  const colors = themeColors[mode];
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    ...cardStyles[variant],
  };
}

export const Colors = {
  light: {
    ...lightThemeColors,
    text: lightThemeColors.foreground,
    tint: lightThemeColors.primary,
    icon: lightThemeColors.mutedForeground,
    tabIconDefault: lightThemeColors.mutedForeground,
    tabIconSelected: lightThemeColors.primary,
  },
  dark: {
    ...darkThemeColors,
    text: darkThemeColors.foreground,
    tint: darkThemeColors.primary,
    icon: darkThemeColors.mutedForeground,
    tabIconDefault: darkThemeColors.mutedForeground,
    tabIconSelected: darkThemeColors.primary,
  },
} as const;

export type ThemeColorName = {
  [Key in keyof typeof Colors.light]: (typeof Colors.light)[Key] extends string ? Key : never;
}[keyof typeof Colors.light];

export const Fonts = {
  sans: fontFamilies.sans,
  mono: fontFamilies.mono,
} as const;
