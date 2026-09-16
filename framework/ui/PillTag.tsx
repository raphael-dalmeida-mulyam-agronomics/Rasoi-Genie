import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface PillTagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  count?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

export const PillTag: React.FC<PillTagProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  count,
  style,
  textStyle,
  size = 'md',
}) => {
  const { colors, radii } = useTheme();
  const isSm = size === 'sm';

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          borderRadius: radii.pill,
          backgroundColor: selected ? colors.primary : colors.bgSurface,
          borderColor: selected ? colors.primary : colors.border,
          paddingVertical: isSm ? 5 : 8,
          paddingHorizontal: isSm ? 10 : 14,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={!onPress}
    >
      {icon && <>{icon}</>}
      <Text
        style={[
          styles.text,
          {
            color: selected ? colors.textInverse : colors.textPrimary,
            fontSize: isSm ? 12 : 13,
            fontWeight: selected ? '700' : '600',
            marginLeft: icon ? 5 : 0,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          style={[
            styles.countText,
            {
              backgroundColor: selected ? 'rgba(255,255,255,0.25)' : colors.bgSubtle,
              color: selected ? colors.textInverse : colors.textSecondary,
            },
          ]}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    letterSpacing: 0.2,
  },
  countText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
});
