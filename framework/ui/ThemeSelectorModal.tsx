import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ visible, onClose }) => {
  const {
    paletteKey,
    setPaletteKey,
    colorMode,
    setColorMode,
    isDark,
    availablePalettes,
    colors,
    shadows,
    radii,
  } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Icon name="adjust" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Appearance & Theme
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Customize light/dark mode and culinary palettes
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgSubtle }]}
              accessibilityLabel="Close theme settings"
              testID="theme-selector-header-close-btn"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Color Mode Switcher */}
          <View
            style={[
              styles.modeToggleRow,
              { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  backgroundColor: !isDark ? colors.bgSurface : 'transparent',
                  borderColor: !isDark ? colors.primary : 'transparent',
                  borderWidth: !isDark ? 1.5 : 0,
                  borderRadius: radii.md,
                },
              ]}
              onPress={() => setColorMode('light')}
              activeOpacity={0.8}
              testID="theme-mode-light-btn"
            >
              <Icon name="sun" size={18} color={!isDark ? colors.primary : colors.textMuted} />
              <View style={styles.modeTextCol}>
                <Text
                  style={[
                    styles.modeTitle,
                    {
                      color: !isDark ? colors.textPrimary : colors.textSecondary,
                      fontWeight: !isDark ? '700' : '500',
                    },
                  ]}
                >
                  Light Mode
                </Text>
                <Text style={[styles.modeCaption, { color: colors.textMuted }]}>
                  Warm & Food-Forward
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  backgroundColor: isDark ? colors.bgSurface : 'transparent',
                  borderColor: isDark ? colors.primary : 'transparent',
                  borderWidth: isDark ? 1.5 : 0,
                  borderRadius: radii.md,
                },
              ]}
              onPress={() => setColorMode('dark')}
              activeOpacity={0.8}
              testID="theme-mode-dark-btn"
            >
              <Icon name="moon" size={18} color={isDark ? colors.primary : colors.textMuted} />
              <View style={styles.modeTextCol}>
                <Text
                  style={[
                    styles.modeTitle,
                    {
                      color: isDark ? colors.textPrimary : colors.textSecondary,
                      fontWeight: isDark ? '700' : '500',
                    },
                  ]}
                >
                  Dark Mode
                </Text>
                <Text style={[styles.modeCaption, { color: colors.textMuted }]}>
                  Obsidian & Low-Light
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section: Palettes */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
              CULINARY COLOR PALETTES
            </Text>
            <Text style={[styles.sectionSubBadge, { color: colors.primary }]}>Instant Preview</Text>
          </View>

          <ScrollView
            style={styles.paletteList}
            contentContainerStyle={styles.paletteListContent}
            showsVerticalScrollIndicator={false}
          >
            {availablePalettes.map((pal) => {
              const isSelected = pal.key === paletteKey;
              return (
                <TouchableOpacity
                  key={pal.key}
                  testID={`theme-palette-${pal.key}`}
                  style={[
                    styles.paletteCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected
                        ? isDark
                          ? `${colors.primary}18`
                          : colors.primaryLight
                        : colors.bgSubtle,
                      borderRadius: radii.lg,
                    },
                  ]}
                  onPress={() => setPaletteKey(pal.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paletteLeft}>
                    <View style={styles.swatchWrap}>
                      <View
                        style={[
                          styles.swatchDot,
                          {
                            backgroundColor: pal.previewColor,
                            borderColor: colors.bgSurface,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatchDot,
                          styles.swatchDotOverlap,
                          {
                            backgroundColor: pal.accentColor,
                            borderColor: colors.bgSurface,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.paletteMeta}>
                      <Text
                        style={[
                          styles.paletteName,
                          {
                            color: colors.textPrimary,
                            fontWeight: isSelected ? '800' : '700',
                          },
                        ]}
                      >
                        {pal.name}
                      </Text>
                      <Text
                        style={[styles.paletteDescription, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {pal.description}
                      </Text>
                    </View>
                  </View>

                  {isSelected ? (
                    <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={13} color="#FFFFFF" />
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: colors.borderLight, backgroundColor: colors.bgSurface },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action button */}
          <TouchableOpacity
            testID="theme-selector-close-btn"
            style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    padding: 22,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleRow: {
    flexDirection: 'row',
    padding: 6,
    gap: 8,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  modeTextCol: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 13,
  },
  modeCaption: {
    fontSize: 11,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionSubBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  paletteList: {
    maxHeight: 290,
  },
  paletteListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  paletteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  swatchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 42,
  },
  swatchDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  swatchDotOverlap: {
    marginLeft: -8,
  },
  paletteMeta: {
    flex: 1,
  },
  paletteName: {
    fontSize: 14,
  },
  paletteDescription: {
    fontSize: 11.5,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  doneBtn: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
