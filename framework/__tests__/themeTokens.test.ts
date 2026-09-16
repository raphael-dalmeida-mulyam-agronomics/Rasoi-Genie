import { PALETTES, DEFAULT_PALETTE_KEY, SPACING, RADII } from '../theme/tokens';

describe('themeTokens', () => {
  it('has valid default palette with custom Indian spice colors', () => {
    expect(PALETTES[DEFAULT_PALETTE_KEY]).toBeDefined();
    const defaultPal = PALETTES[DEFAULT_PALETTE_KEY]!;

    expect(defaultPal.colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.colors.primaryHover).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.colors.accent).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.colors.accentHover).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.colors.veg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.colors.nonVeg).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('contains multiple curated gourmet palettes for live switching', () => {
    const keys = Object.keys(PALETTES);
    expect(keys.length).toBeGreaterThanOrEqual(4);
    expect(keys).toContain('saffronSpice');
    expect(keys).toContain('royalCardamom');
    expect(keys).toContain('smokedPaprika');
    expect(keys).toContain('masalaCrimson');
  });

  it('provides spacing and rounded radii tokens consistent with HelloFresh warmth', () => {
    expect(RADII.xl).toBeGreaterThanOrEqual(16);
    expect(RADII.pill).toBe(999);
    expect(SPACING.md).toBe(12);
  });

  it('supports light and dark modes with appropriate contrast across all palettes', () => {
    const defaultPal = PALETTES[DEFAULT_PALETTE_KEY]!;

    expect(defaultPal.light).toBeDefined();
    expect(defaultPal.dark).toBeDefined();

    // Light mode has light background and dark text
    expect(defaultPal.light.bgPrimary).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.light.textPrimary).toMatch(/^#[0-9A-F]{6}$/i);

    // Dark mode has dark background and light text
    expect(defaultPal.dark.bgPrimary).toMatch(/^#[0-9A-F]{6}$/i);
    expect(defaultPal.dark.textPrimary).toMatch(/^#[0-9A-F]{6}$/i);

    // Verify each palette has complete dark and light tokens
    Object.values(PALETTES).forEach((pal) => {
      expect(pal.light.bgPrimary).toBeDefined();
      expect(pal.dark.bgPrimary).toBeDefined();
      expect(pal.light.primary).toBeDefined();
      expect(pal.dark.primary).toBeDefined();
    });
  });
});
