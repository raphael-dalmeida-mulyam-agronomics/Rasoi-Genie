import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  PALETTES,
  DEFAULT_PALETTE_KEY,
  ColorPalette,
  ColorMode,
  ThemeColors,
  getPaletteColors,
  SPACING,
  RADII,
  SHADOWS,
  DARK_SHADOWS,
} from './tokens';

export interface ThemeContextValue {
  paletteKey: string;
  palette: ColorPalette;
  colorMode: ColorMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof SPACING;
  radii: typeof RADII;
  shadows: typeof SHADOWS;
  setPaletteKey: (key: string) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  availablePalettes: {
    key: string;
    name: string;
    description: string;
    previewColor: string;
    accentColor: string;
  }[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paletteKey, setPaletteKey] = useState<string>(DEFAULT_PALETTE_KEY);
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  const palette: ColorPalette = useMemo(() => {
    return PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE_KEY]!;
  }, [paletteKey]);

  const colors: ThemeColors = useMemo(() => {
    return getPaletteColors(paletteKey, colorMode);
  }, [paletteKey, colorMode]);

  const isDark = colorMode === 'dark';

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const currentShadows = isDark ? DARK_SHADOWS : SHADOWS;

  // Inject standard CSS Custom Properties on Web for :root styling & dark theme class
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;

      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-primary-hover', colors.primaryHover);
      root.style.setProperty('--color-primary-light', colors.primaryLight);
      root.style.setProperty('--color-primary-dark', colors.primaryDark);

      root.style.setProperty('--color-accent', colors.accent);
      root.style.setProperty('--color-accent-hover', colors.accentHover);
      root.style.setProperty('--color-accent-light', colors.accentLight);
      root.style.setProperty('--color-accent-dark', colors.accentDark);

      root.style.setProperty('--color-bg-primary', colors.bgPrimary);
      root.style.setProperty('--color-bg-surface', colors.bgSurface);
      root.style.setProperty('--color-bg-subtle', colors.bgSubtle);
      root.style.setProperty('--color-bg-card', colors.bgCard);

      root.style.setProperty('--color-text-primary', colors.textPrimary);
      root.style.setProperty('--color-text-secondary', colors.textSecondary);
      root.style.setProperty('--color-text-muted', colors.textMuted);
      root.style.setProperty('--color-text-inverse', colors.textInverse);

      root.style.setProperty('--color-border', colors.border);
      root.style.setProperty('--color-border-light', colors.borderLight);

      root.style.setProperty('--color-veg', colors.veg);
      root.style.setProperty('--color-nonveg', colors.nonVeg);
      root.style.setProperty('--color-success', colors.success);
      root.style.setProperty('--color-warning', colors.warning);
      root.style.setProperty('--color-danger', colors.danger);

      // Set attribute and class on <html>
      root.setAttribute('data-theme', colorMode);
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }

      if (document.body) {
        document.body.style.backgroundColor = colors.bgPrimary;
        document.body.style.color = colors.textPrimary;
      }
    }
  }, [colors, colorMode, isDark]);

  const availablePalettes = useMemo(() => {
    return Object.entries(PALETTES).map(([key, pal]) => ({
      key,
      name: pal.name,
      description: pal.description,
      previewColor: pal.light.primary,
      accentColor: pal.light.accent,
    }));
  }, []);

  const value = useMemo(
    () => ({
      paletteKey,
      palette,
      colorMode,
      isDark,
      colors,
      spacing: SPACING,
      radii: RADII,
      shadows: currentShadows,
      setPaletteKey,
      setColorMode,
      toggleColorMode,
      availablePalettes,
    }),
    [paletteKey, palette, colorMode, isDark, colors, currentShadows, availablePalettes],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
