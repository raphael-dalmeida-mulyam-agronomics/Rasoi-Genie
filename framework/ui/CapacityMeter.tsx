import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MAX_FAMILY_MEMBERS } from '../services/familyService';
import { Icon } from './Icon';

export interface CapacityMeterProps {
  current: number;
  max?: number;
  showFullNote?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const CapacityMeter: React.FC<CapacityMeterProps> = ({
  current,
  max = MAX_FAMILY_MEMBERS,
  showFullNote = true,
  style,
  testID = 'capacity-meter',
}) => {
  const { colors, radii, isDark } = useTheme();

  const clamped = Math.min(Math.max(0, current), max);
  const fraction = clamped / max;
  const isFull = clamped >= max;

  const barColor = isFull ? '#EF4444' : fraction >= 0.8 ? '#F59E0B' : colors.primary;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.lg,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: clamped }}
      accessibilityLabel={`Family capacity: ${clamped} of ${max} seats filled`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Icon name="users" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.title, { color: colors.textSecondary }]}>Family Capacity</Text>
        </View>
        <Text style={[styles.countText, { color: isFull ? '#EF4444' : colors.textPrimary }]}>
          {clamped} of {max}
        </Text>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.bgSubtle,
            borderRadius: radii.pill,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(fraction * 100)}%`,
              backgroundColor: barColor,
              borderRadius: radii.pill,
            },
          ]}
        />
      </View>

      {isFull && showFullNote ? (
        <View style={styles.fullNoteRow}>
          <Icon name="warning" size={12} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.fullNoteText}>
            Family is full (all {max} seats filled or pending)
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    minWidth: 4,
  },
  fullNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  fullNoteText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
});
