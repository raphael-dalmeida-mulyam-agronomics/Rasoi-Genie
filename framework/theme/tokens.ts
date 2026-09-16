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
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors; // for backwards compatibility
  light: ThemeColors;
  dark: ThemeColors;
}

const SAFFRON_LIGHT: ThemeColors = {
  primary: '#E05626',
  primaryHover: '#C8461B',
  primaryLight: '#FFF1EB',
  primaryDark: '#9C320E',

  accent: '#0E7490',
  accentHover: '#085B72',
  accentLight: '#E0F2FE',
  accentDark: '#164E63',

  bgPrimary: '#FFFDF9',
  bgSurface: '#FFFFFF',
  bgSubtle: '#F8F5F0',
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
  star: '#F59E0B',
};

const SAFFRON_DARK: ThemeColors = {
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

export const PALETTES: Record<string, ColorPalette> = {
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
    name: 'Smoked Paprika & Honey',
    description: 'Rich Kashmiri chili paprika paired with amber honey accents',
    colors: PAPRIKA_LIGHT,
    light: PAPRIKA_LIGHT,
    dark: PAPRIKA_DARK,
  },
  masalaCrimson: {
    id: 'masalaCrimson',
    name: 'Masala Crimson & Mint',
    description: 'Deep royal crimson ruby paired with refreshing mint leaves',
    colors: CRIMSON_LIGHT,
    light: CRIMSON_LIGHT,
    dark: CRIMSON_DARK,
  },
};

export const DEFAULT_PALETTE_KEY = 'saffronSpice';

export function getPaletteColors(paletteKey: string, mode: ColorMode = 'light'): ThemeColors {
  const pal = PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE_KEY]!;
  return mode === 'dark' ? pal.dark : pal.light;
}

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
  xl: 20,
  pill: 999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  hover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const DARK_SHADOWS = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  hover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
};
