import type { TextStyle } from 'react-native';

export const fontFamilies = {
  sans: 'Inter',
  mono: 'GeistMono',
} as const;

export const fontStacks = {
  sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
  mono: ['"Geist Mono"', '"Geist Mono Fallback"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const lineHeights = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 30,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
  '5xl': 56,
} as const;

export const letterSpacings = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.2,
  wider: 0.4,
} as const;

type TypographyPreset = Readonly<TextStyle>;

export const typography = {
  display: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights['5xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tighter,
  },
  hero: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  heading: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  subheading: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.normal,
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wider,
  },
  button: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.normal,
  },
  currency: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TypographyPreset>;

export type TypographyPresetName = keyof typeof typography;
