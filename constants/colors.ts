export type HexColor = `#${string}`;
export type OklchColor = `oklch(${string})`;
export type RgbaColor = `rgba(${string})`;
export type ThemeMode = 'light' | 'dark';

export type GradientStops = readonly [HexColor, HexColor, ...HexColor[]];

export interface ChartColors {
  readonly 1: HexColor;
  readonly 2: HexColor;
  readonly 3: HexColor;
  readonly 4: HexColor;
  readonly 5: HexColor;
}

export interface ThemeGradients {
  readonly cardBlue: GradientStops;
  readonly cardTeal: GradientStops;
  readonly cardDark: GradientStops;
  readonly cardGold: GradientStops;
}

export interface GlassColors {
  readonly background: RgbaColor;
  readonly backgroundStrong: RgbaColor;
  readonly border: RgbaColor;
  readonly borderStrong: RgbaColor;
  readonly highlight: RgbaColor;
  readonly tint: RgbaColor;
  readonly shadow: RgbaColor;
}

export interface SemanticThemeColors {
  readonly background: HexColor;
  readonly foreground: HexColor;
  readonly card: HexColor;
  readonly cardForeground: HexColor;
  readonly primary: HexColor;
  readonly primaryForeground: HexColor;
  readonly secondary: HexColor;
  readonly secondaryForeground: HexColor;
  readonly muted: HexColor;
  readonly mutedForeground: HexColor;
  readonly destructive: HexColor;
  readonly destructiveForeground: HexColor;
  readonly success: HexColor;
  readonly successForeground: HexColor;
  readonly border: HexColor;
  readonly ring: HexColor;
  readonly chart: ChartColors;
  readonly gradients: ThemeGradients;
  readonly glass: GlassColors;
}

export interface ThemeColorReference {
  readonly background: OklchColor;
  readonly foreground: OklchColor;
  readonly card: OklchColor;
  readonly cardForeground: OklchColor;
  readonly primary: OklchColor;
  readonly primaryForeground: OklchColor;
  readonly secondary: OklchColor;
  readonly secondaryForeground: OklchColor;
  readonly muted: OklchColor;
  readonly mutedForeground: OklchColor;
  readonly destructive: OklchColor;
  readonly success: OklchColor;
  readonly border: OklchColor;
  readonly ring: OklchColor;
  readonly chart: {
    readonly 1: OklchColor;
    readonly 2: OklchColor;
    readonly 3: OklchColor;
    readonly 4: OklchColor;
    readonly 5: OklchColor;
  };
}

export const colorReferences = {
  light: {
    background: 'oklch(0.97 0.008 240)',
    foreground: 'oklch(0.18 0.02 260)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.13 0.02 260)',
    primary: 'oklch(0.58 0.18 250)',
    primaryForeground: 'oklch(1 0 0)',
    secondary: 'oklch(0.95 0.005 250)',
    secondaryForeground: 'oklch(0.2 0.02 260)',
    muted: 'oklch(0.93 0.005 250)',
    mutedForeground: 'oklch(0.5 0.02 260)',
    destructive: 'oklch(0.65 0.2 25)',
    success: 'oklch(0.65 0.18 155)',
    border: 'oklch(0.9 0.005 250)',
    ring: 'oklch(0.58 0.18 250)',
    chart: {
      1: 'oklch(0.58 0.18 250)',
      2: 'oklch(0.65 0.18 155)',
      3: 'oklch(0.65 0.2 25)',
      4: 'oklch(0.7 0.15 280)',
      5: 'oklch(0.75 0.12 60)',
    },
  },
  dark: {
    background: 'oklch(0.13 0.02 260)',
    foreground: 'oklch(0.97 0.005 250)',
    card: 'oklch(0.18 0.02 260)',
    cardForeground: 'oklch(0.97 0.005 250)',
    primary: 'oklch(0.65 0.2 250)',
    primaryForeground: 'oklch(0.13 0.02 260)',
    secondary: 'oklch(0.22 0.02 260)',
    secondaryForeground: 'oklch(0.97 0.005 250)',
    muted: 'oklch(0.25 0.02 260)',
    mutedForeground: 'oklch(0.65 0.01 260)',
    destructive: 'oklch(0.55 0.22 25)',
    success: 'oklch(0.6 0.2 155)',
    border: 'oklch(0.28 0.02 260)',
    ring: 'oklch(0.65 0.2 250)',
    chart: {
      1: 'oklch(0.65 0.2 250)',
      2: 'oklch(0.6 0.2 155)',
      3: 'oklch(0.55 0.22 25)',
      4: 'oklch(0.65 0.18 280)',
      5: 'oklch(0.7 0.15 60)',
    },
  },
} as const satisfies Record<ThemeMode, ThemeColorReference>;

export const lightThemeColors = {
  background: '#F5F7FA',
  foreground: '#1E2433',
  card: '#FFFFFF',
  cardForeground: '#151B28',
  primary: '#4F8CFF',
  primaryForeground: '#FFFFFF',
  secondary: '#EBEEF3',
  secondaryForeground: '#232B3A',
  muted: '#E3E7EC',
  mutedForeground: '#6B7485',
  destructive: '#F56565',
  destructiveForeground: '#FFFFFF',
  success: '#48BB78',
  successForeground: '#FFFFFF',
  border: '#DFE3E8',
  ring: '#4F8CFF',
  chart: {
    1: '#4F8CFF',
    2: '#48BB78',
    3: '#F56565',
    4: '#8B7CF8',
    5: '#E8B24C',
  },
  gradients: {
    cardBlue: ['#4F8CFF', '#6E72FC'],
    cardTeal: ['#2EC8B8', '#4F8CFF'],
    cardDark: ['#1E2433', '#151B28'],
    cardGold: ['#F2C35B', '#E8B24C'],
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.8)',
    backgroundStrong: 'rgba(255, 255, 255, 0.9)',
    border: 'rgba(223, 227, 232, 0.72)',
    borderStrong: 'rgba(223, 227, 232, 0.9)',
    highlight: 'rgba(255, 255, 255, 0.65)',
    tint: 'rgba(79, 140, 255, 0.08)',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
} as const satisfies SemanticThemeColors;

export const darkThemeColors = {
  background: '#0F172A',
  foreground: '#F8FAFC',
  card: '#1E293B',
  cardForeground: '#F8FAFC',
  primary: '#60A5FA',
  primaryForeground: '#0F172A',
  secondary: '#2D3748',
  secondaryForeground: '#F8FAFC',
  muted: '#374151',
  mutedForeground: '#9CA3AF',
  destructive: '#E53E3E',
  destructiveForeground: '#F8FAFC',
  success: '#38A169',
  successForeground: '#F8FAFC',
  border: '#3F4A5A',
  ring: '#60A5FA',
  chart: {
    1: '#60A5FA',
    2: '#38A169',
    3: '#E53E3E',
    4: '#7C7BFA',
    5: '#D9A441',
  },
  gradients: {
    cardBlue: ['#60A5FA', '#7C7BFA'],
    cardTeal: ['#22C1B5', '#4F8CFF'],
    cardDark: ['#0F172A', '#1E293B'],
    cardGold: ['#E8B24C', '#D99829'],
  },
  glass: {
    background: 'rgba(30, 41, 59, 0.8)',
    backgroundStrong: 'rgba(30, 41, 59, 0.9)',
    border: 'rgba(63, 74, 90, 0.7)',
    borderStrong: 'rgba(96, 165, 250, 0.24)',
    highlight: 'rgba(248, 250, 252, 0.08)',
    tint: 'rgba(96, 165, 250, 0.14)',
    shadow: 'rgba(2, 6, 23, 0.32)',
  },
} as const satisfies SemanticThemeColors;

export const themeColors = {
  light: lightThemeColors,
  dark: darkThemeColors,
} as const satisfies Record<ThemeMode, SemanticThemeColors>;

export type ThemeColors = typeof themeColors;
export type SemanticColorKey = keyof typeof lightThemeColors;
