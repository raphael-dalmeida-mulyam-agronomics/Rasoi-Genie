import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RADII } from '../theme/tokens';

export interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: React.ReactNode;
  sublabel?: string;
  disabled?: boolean;
  size?: number; // checkbox box size, default 24
  containerStyle?: StyleProp<ViewStyle>;
  boxStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  card?: boolean; // if true, wraps row in a card border & subtle background tint
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  sublabel,
  disabled = false,
  size = 24,
  containerStyle,
  boxStyle,
  labelStyle,
  testID,
  accessibilityLabel,
  card = false,
}) => {
  const { colors, isDark, radii } = useTheme();
  const themeRadii = radii || RADII;

  // High contrast borders:
  // Light: solid slate-600 #475569 unchecked, primary when checked (WCAG AAA compliant)
  // Dark: solid slate-400 #94A3B8 unchecked, primary when checked (WCAG AAA compliant)
  const uncheckedBorderColor = isDark ? '#94A3B8' : '#475569';
  const uncheckedBgColor = isDark ? '#1E293B' : '#FFFFFF';

  const borderColor = checked ? colors.primary : uncheckedBorderColor;
  const backgroundColor = checked ? colors.primary : uncheckedBgColor;

  const cardBorderColor = checked
    ? colors.primary
    : isDark
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(0, 0, 0, 0.14)';

  const cardBgColor = checked
    ? isDark
      ? 'rgba(234, 88, 12, 0.15)'
      : 'rgba(234, 88, 12, 0.06)'
    : isDark
      ? 'rgba(255, 255, 255, 0.04)'
      : colors.bgSurface || '#FFFFFF';

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      style={[
        styles.row,
        card && [
          styles.cardContainer,
          {
            borderColor: cardBorderColor,
            backgroundColor: cardBgColor,
          },
        ],
        disabled && styles.disabled,
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: themeRadii?.sm || 6,
            borderColor,
            backgroundColor,
          },
          boxStyle,
        ]}
      >
        {checked && <Ionicons name="checkmark" size={Math.round(size * 0.72)} color="#FFFFFF" />}
      </View>

      {(label || sublabel) && (
        <View style={styles.textContainer}>
          {typeof label === 'string' ? (
            <Text style={[styles.label, { color: colors.textPrimary }, labelStyle]}>{label}</Text>
          ) : (
            label
          )}
          {sublabel ? (
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{sublabel}</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  cardContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    // Subtle shadow for tactile elevation on light surfaces
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});
