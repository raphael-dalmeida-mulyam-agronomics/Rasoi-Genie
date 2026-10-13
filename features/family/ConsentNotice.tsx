import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';

export interface ConsentNoticeProps {
  title?: string;
  items?: string[];
  note?: string;
  style?: ViewStyle;
}

export const ConsentNotice: React.FC<ConsentNoticeProps> = ({
  title = 'What is shared with your family:',
  items = [
    'Your first name with household members',
    'Meal kits and portions you add to the family basket',
  ],
  note = 'No passwords, phone verification, or payment details are required.',
  style,
}) => {
  const { colors, radii, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.bgSubtle,
          borderColor: colors.borderLight,
          borderRadius: radii.lg,
        },
        style,
      ]}
      accessibilityRole="text"
    >
      <View style={styles.headerRow}>
        <Icon name="shield" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>

      <View style={styles.itemsWrap}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.itemText, { color: colors.textSecondary }]}>{item}</Text>
          </View>
        ))}
      </View>

      {note ? <Text style={[styles.noteText, { color: colors.textMuted }]}>{note}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemsWrap: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  itemText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  noteText: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
