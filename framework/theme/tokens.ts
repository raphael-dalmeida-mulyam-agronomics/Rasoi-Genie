import { Platform } from 'react-native';

export type ColorMode = 'light' | 'dark';

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;

  // Accent colors
  accent: string;
  accentHover: string;
  accentLight: string;
  accentDark: string;

  // Backgrounds & Surfaces (HelloFresh clean, warm, food-forward aesthetic)
  bgPrimary: string;
  bgSurface: string;
  bgSubtle: string;
  bgCard: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderLight: string;

  // Feedback & Indicators
  veg: string;
  vegLight: string;
  nonVeg: string;
  nonVegLight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  star: string;

  // Semantic subtle feedback tokens (dark mode safe)
  bgDangerSubtle: string;
  textDanger: string;
  borderDangerSubtle: string;
  bgSuccessSubtle: string;
  textSuccess: string;
  borderSuccessSubtle: string;
  bgWarningSubtle: string;
  textWarning: string;
  borderWarningSubtle: string;
  bgInfoSubtle: string;
  textInfo: string;
  borderInfoSubtle: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors; // for backwards compatibility
  light: ThemeColors;
  dark: ThemeColors;
}

const LIGHT_SUBTLE_TOKENS = {
  bgDangerSubtle: '#FEF2F2',
  textDanger: '#B91C1C',
  borderDangerSubtle: '#FECACA',
  bgSuccessSubtle: '#F0FDF4',
  textSuccess: '#15803D',
  borderSuccessSubtle: '#BBF7D0',
  bgWarningSubtle: '#FFFBEB',
  textWarning: '#B45309',
  borderWarningSubtle: '#FDE68A',
  bgInfoSubtle: '#F0F9FF',
  textInfo: '#0369A1',
  borderInfoSubtle: '#BAE6FD',
};

const DARK_SUBTLE_TOKENS = {
  bgDangerSubtle: '#450A0A',
  textDanger: '#FCA5A5',
  borderDangerSubtle: '#7F1D1D',
  bgSuccessSubtle: '#052E16',
  textSuccess: '#86EFAC',
  borderSuccessSubtle: '#14532D',
  bgWarningSubtle: '#451A03',
  textWarning: '#FCD34D',
  borderWarningSubtle: '#78350F',
  bgInfoSubtle: '#082F49',
  textInfo: '#7DD3FC',
  borderInfoSubtle: '#0C4A6E',
};

const SAFFRON_LIGHT: ThemeColors = {
  ...LIGHT_SUBTLE_TOKENS,
  primary: '#E05626',
  primaryHover: '#C8461B',
  primaryLight: '#FFF1EB',
  primaryDark: '#9C320E',

  accent: '#0E7490',
  accentHover: '#085B72',
  accentLight: '#E0F2FE',
  accentDark: '#164E63',

  bgPrimary: '#FCFAF6',
  bgSurface: '#FFFFFF',
  bgSubtle: '#F6F2EB',
  bgCard: '#FFFFFF',

  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textInverse: '#FFFFFF',

  border: '#E8E3DC',
  borderLight: '#F3EFE9',

  veg: '#15803D',
  vegLight: '#DCFCE7',
  nonVeg: '#B91C1C',
  nonVegLight: '#FEE2E2',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0284C7',
  star: '#F59E0B',
};

const SAFFRON_DARK: ThemeColors = {
  ...DARK_SUBTLE_TOKENS,
  primary: '#F97316',
  primaryHover: '#FB923C',
  primaryLight: '#3D1C12',
  primaryDark: '#C2410C',

  accent: '#22D3EE',
  accentHover: '#67E8F9',
  accentLight: '#0E3B43',
  accentDark: '#0891B2',

  bgPrimary: '#0F0E0D',
  bgSurface: '#1A1816',
  bgSubtle: '#262320',
  bgCard: '#1A1816',

  textPrimary: '#F5F5F4',
  textSecondary: '#D6D3D1',
  textMuted: '#78716C',
  textInverse: '#1C1917',

  border: '#2E2A27',
  borderLight: '#23201D',

  veg: '#22C55E',
  vegLight: '#052E16',
  nonVeg: '#EF4444',
  nonVegLight: '#450A0A',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#38BDF8',
  star: '#FBBF24',
};

const CARDAMOM_LIGHT: ThemeColors = {
  ...LIGHT_SUBTLE_TOKENS,
  primary: '#0F766E',
  primaryHover: '#115E59',
  primaryLight: '#F0FDFA',
  primaryDark: '#134E4A',

  accent: '#D97706',
  accentHover: '#B45309',
  accentLight: '#FEF3C7',
  accentDark: '#92400E',

  bgPrimary: '#F8FAF9',
  bgSurface: '#FFFFFF',
  bgSubtle: '#EEF4F2',
  bgCard: '#FFFFFF',

  textPrimary: '#132A26',
  textSecondary: '#4A6560',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#CBD5E1',
  borderLight: '#F1F5F9',

  veg: '#15803D',
  vegLight: '#DCFCE7',
  nonVeg: '#B91C1C',
  nonVegLight: '#FEE2E2',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0284C7',
  star: '#F59E0B',
};

const CARDAMOM_DARK: ThemeColors = {
  ...DARK_SUBTLE_TOKENS,
  primary: '#2DD4BF',
  primaryHover: '#5EEAD4',
  primaryLight: '#0B2F2B',
  primaryDark: '#115E59',

  accent: '#FBBF24',
  accentHover: '#FCD34D',
  accentLight: '#3B2805',
  accentDark: '#B45309',

  bgPrimary: '#0B1312',
  bgSurface: '#142220',
  bgSubtle: '#1C2E2B',
  bgCard: '#142220',

  textPrimary: '#F0FDFA',
  textSecondary: '#99F6E4',
  textMuted: '#5E817C',
  textInverse: '#0B1312',

  border: '#1F3834',
  borderLight: '#172A27',

  veg: '#22C55E',
  vegLight: '#052E16',
  nonVeg: '#EF4444',
  nonVegLight: '#450A0A',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#38BDF8',
  star: '#FBBF24',
};

const PAPRIKA_LIGHT: ThemeColors = {
  ...LIGHT_SUBTLE_TOKENS,
  primary: '#C2410C',
  primaryHover: '#9A3412',
  primaryLight: '#FFF7ED',
  primaryDark: '#7C2D12',

  accent: '#EAB308',
  accentHover: '#CA8A04',
  accentLight: '#FEF9C3',
  accentDark: '#854D0E',

  bgPrimary: '#FAFAF9',
  bgSurface: '#FFFFFF',
  bgSubtle: '#F5F5F4',
  bgCard: '#FFFFFF',

  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textInverse: '#FFFFFF',

  border: '#E7E5E4',
  borderLight: '#F5F5F4',

  veg: '#15803D',
  vegLight: '#DCFCE7',
  nonVeg: '#B91C1C',
  nonVegLight: '#FEE2E2',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0284C7',
  star: '#EAB308',
};

const PAPRIKA_DARK: ThemeColors = {
  ...DARK_SUBTLE_TOKENS,
  primary: '#FB923C',
  primaryHover: '#FDBA74',
  primaryLight: '#3E1807',
  primaryDark: '#9A3412',

  accent: '#FACC15',
  accentHover: '#FDE047',
  accentLight: '#3D2E04',
  accentDark: '#CA8A04',

  bgPrimary: '#120E0B',
  bgSurface: '#1D1714',
  bgSubtle: '#2B231F',
  bgCard: '#1D1714',

  textPrimary: '#FAF5F0',
  textSecondary: '#E7DDD4',
  textMuted: '#8C7D73',
  textInverse: '#120E0B',

  border: '#332924',
  borderLight: '#261E1A',

  veg: '#22C55E',
  vegLight: '#052E16',
  nonVeg: '#EF4444',
  nonVegLight: '#450A0A',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#38BDF8',
  star: '#FACC15',
};

const CRIMSON_LIGHT: ThemeColors = {
  ...LIGHT_SUBTLE_TOKENS,
  primary: '#BE123C',
  primaryHover: '#9F1239',
  primaryLight: '#FFF1F2',
  primaryDark: '#881337',

  accent: '#059669',
  accentHover: '#047857',
  accentLight: '#ECFDF5',
  accentDark: '#065F46',

  bgPrimary: '#FFFDFD',
  bgSurface: '#FFFFFF',
  bgSubtle: '#FDF2F4',
  bgCard: '#FFFFFF',

  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  veg: '#15803D',
  vegLight: '#DCFCE7',
  nonVeg: '#BE123C',
  nonVegLight: '#FFE4E6',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0284C7',
  star: '#F59E0B',
};

const CRIMSON_DARK: ThemeColors = {
  ...DARK_SUBTLE_TOKENS,
  primary: '#FB7185',
  primaryHover: '#FDA4AF',
  primaryLight: '#430816',
  primaryDark: '#9F1239',

  accent: '#34D399',
  accentHover: '#6EE7B7',
  accentLight: '#063726',
  accentDark: '#047857',

  bgPrimary: '#130D10',
  bgSurface: '#20141A',
  bgSubtle: '#2E1E26',
  bgCard: '#20141A',

  textPrimary: '#FFF1F2',
  textSecondary: '#FECDD3',
  textMuted: '#886973',
  textInverse: '#130D10',

  border: '#3D2431',
  borderLight: '#291821',

  veg: '#22C55E',
  vegLight: '#052E16',
  nonVeg: '#FB7185',
  nonVegLight: '#430816',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#38BDF8',
  star: '#FBBF24',
};

const TURMERIC_LIGHT: ThemeColors = {
  ...LIGHT_SUBTLE_TOKENS,
  primary: '#D97706',
  primaryHover: '#B45309',
  primaryLight: '#FEF3C7',
  primaryDark: '#92400E',

  accent: '#0D9488',
  accentHover: '#0F766E',
  accentLight: '#CCFBF1',
  accentDark: '#115E59',

  bgPrimary: '#FFFDF7',
  bgSurface: '#FFFFFF',
  bgSubtle: '#FEFCE8',
  bgCard: '#FFFFFF',

  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textInverse: '#FFFFFF',

  border: '#FDE68A',
  borderLight: '#FEF3C7',

  veg: '#15803D',
  vegLight: '#DCFCE7',
  nonVeg: '#B91C1C',
  nonVegLight: '#FEE2E2',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0284C7',
  star: '#F59E0B',
};

const TURMERIC_DARK: ThemeColors = {
  ...DARK_SUBTLE_TOKENS,
  primary: '#F59E0B',
  primaryHover: '#FBBF24',
  primaryLight: '#451A03',
  primaryDark: '#B45309',

  accent: '#2DD4BF',
  accentHover: '#5EEAD4',
  accentLight: '#042F2E',
  accentDark: '#0F766E',

  bgPrimary: '#141008',
  bgSurface: '#1F1A0F',
  bgSubtle: '#2C2417',
  bgCard: '#1F1A0F',

  textPrimary: '#FEF9C3',
  textSecondary: '#FDE68A',
  textMuted: '#8D7A58',
  textInverse: '#141008',

  border: '#3B311E',
  borderLight: '#2C2417',

  veg: '#22C55E',
  vegLight: '#052E16',
  nonVeg: '#EF4444',
  nonVegLight: '#450A0A',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#38BDF8',
  star: '#FBBF24',
};

export const PALETTES: Record<string, ColorPalette> = {
  // Canonical 5 Spec Spices
  saffronSpice: {
    id: 'saffronSpice',
    name: 'Warm Saffron Spice',
    description: 'Vibrant saffron terracotta with royal cardamom teal highlights',
    colors: SAFFRON_LIGHT,
    light: SAFFRON_LIGHT,
    dark: SAFFRON_DARK,
  },
  royalCardamom: {
    id: 'royalCardamom',
    name: 'Royal Cardamom & Gold',
    description: 'Deep cardamom botanical emerald with warm golden turmeric',
    colors: CARDAMOM_LIGHT,
    light: CARDAMOM_LIGHT,
    dark: CARDAMOM_DARK,
  },
  smokedPaprika: {
    id: 'smokedPaprika',
    name: 'Tangy Tamarind & Honey',
    description: 'Rich Kashmiri chili paprika paired with amber honey accents',
    colors: PAPRIKA_LIGHT,
    light: PAPRIKA_LIGHT,
    dark: PAPRIKA_DARK,
  },
  turmeric: {
    id: 'turmeric',
    name: 'Golden Turmeric & Coriander',
    description: 'Warm golden turmeric with cooling coriander teal accents',
    colors: TURMERIC_LIGHT,
    light: TURMERIC_LIGHT,
    dark: TURMERIC_DARK,
  },
  masalaCrimson: {
    id: 'masalaCrimson',
    name: 'Masala Clove & Mint',
    description: 'Deep royal crimson ruby paired with refreshing mint leaves',
    colors: CRIMSON_LIGHT,
    light: CRIMSON_LIGHT,
    dark: CRIMSON_DARK,
  },
};

// Spec aliases for exact 5 spec names (saffron, cardamom, tamarind, turmeric, clove)
PALETTES.saffron = PALETTES.saffronSpice!;
PALETTES.cardamom = PALETTES.royalCardamom!;
PALETTES.tamarind = PALETTES.smokedPaprika!;
PALETTES.clove = PALETTES.masalaCrimson!;

export const DEFAULT_PALETTE_KEY = 'saffronSpice';

export function getPaletteColors(paletteKey: string, mode: ColorMode = 'light'): ThemeColors {
  const pal = PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE_KEY]!;
  return mode === 'dark' ? pal.dark : pal.light;
}

export const TYPOGRAPHY = {
  display: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const SHADOWS = {
  soft: Platform.select({
    web: {
      boxShadow: '0px 2px 10px rgba(36, 22, 15, 0.05)',
    },
    default: {
      shadowColor: '#24160F',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  }) as any,
  medium: Platform.select({
    web: {
      boxShadow: '0px 4px 14px rgba(36, 22, 15, 0.08), 0px 1px 4px rgba(36, 22, 15, 0.04)',
    },
    default: {
      shadowColor: '#24160F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
  }) as any,
  card: Platform.select({
    web: {
      boxShadow: '0px 6px 20px rgba(36, 22, 15, 0.07), 0px 1px 4px rgba(36, 22, 15, 0.04)',
    },
    default: {
      shadowColor: '#24160F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 18,
      elevation: 3,
    },
  }) as any,
  hover: Platform.select({
    web: {
      boxShadow: '0px 10px 26px rgba(36, 22, 15, 0.12), 0px 2px 8px rgba(36, 22, 15, 0.06)',
    },
    default: {
      shadowColor: '#24160F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
  }) as any,
};

export const DARK_SHADOWS = {
  soft: Platform.select({
    web: {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.35)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 2,
    },
  }) as any,
  medium: Platform.select({
    web: {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.45)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 4,
    },
  }) as any,
  card: Platform.select({
    web: {
      boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.5)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 4,
    },
  }) as any,
  hover: Platform.select({
    web: {
      boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.6)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 8,
    },
  }) as any,
};
