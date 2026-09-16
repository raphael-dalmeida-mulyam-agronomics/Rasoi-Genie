import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from './ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const {
    paletteKey,
    setPaletteKey,
    colorMode,
    setColorMode,
    toggleColorMode,
    isDark,
    availablePalettes,
    colors,
    shadows,
    radii,
  } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      {/* Floating dev badge button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.border,
            ...shadows.medium,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
        testID="theme-switcher-trigger"
      >
        <Text style={styles.floatingButtonIcon}>{isDark ? '🌙' : '☀️'}</Text>
        <Text style={[styles.floatingButtonText, { color: colors.textInverse }]}>
          {isDark ? 'Dark' : 'Light'}
        </Text>
      </TouchableOpacity>

      {/* Theme selection modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Appearance & Theme
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Toggle light/dark mode & culinary palettes
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Light / Dark Mode Toggle Switch */}
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
                    backgroundColor: !isDark ? colors.primary : 'transparent',
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setColorMode('light')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>☀️</Text>
                <Text
                  style={[
                    styles.modeTabText,
                    { color: !isDark ? colors.textInverse : colors.textPrimary },
                  ]}
                >
                  Light Mode
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: isDark ? colors.primary : 'transparent',
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setColorMode('dark')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>🌙</Text>
                <Text
                  style={[
                    styles.modeTabText,
                    { color: isDark ? colors.textInverse : colors.textPrimary },
                  ]}
                >
                  Dark Mode
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Culinary Color Schemes
            </Text>

            <ScrollView style={styles.paletteList} showsVerticalScrollIndicator={false}>
              {availablePalettes.map((pal) => {
                const isSelected = pal.key === paletteKey;
                return (
                  <TouchableOpacity
                    key={pal.key}
                    style={[
                      styles.paletteItem,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() => {
                      setPaletteKey(pal.key);
                    }}
                  >
                    <View style={styles.paletteInfo}>
                      <View style={styles.swatchRow}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: pal.previewColor, borderColor: '#fff' },
                          ]}
                        />
                        <View
                          style={[
                            styles.colorDot,
                            {
                              backgroundColor: pal.accentColor,
                              marginLeft: -8,
                              borderColor: '#fff',
                            },
                          ]}
                        />
                        <Text style={[styles.paletteName, { color: colors.textPrimary }]}>
                          {pal.name}
                        </Text>
                      </View>
                      <Text style={[styles.paletteDescription, { color: colors.textSecondary }]}>
                        {pal.description}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.activeBadgeText, { color: colors.textInverse }]}>
                          Active
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: radii.lg }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.doneBtnText, { color: colors.textInverse }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 85,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: 9999,
  },
  floatingButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  floatingButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modeToggleRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  paletteList: {
    maxHeight: 280,
  },
  paletteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  paletteInfo: {
    flex: 1,
    marginRight: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  paletteName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  paletteDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  activeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
