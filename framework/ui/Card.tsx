import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps extends ViewProps {
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat' | 'warm';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated', ...props }) => {
  const { colors, radii, shadows } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'flat':
        return {
          backgroundColor: colors.bgSubtle,
          borderWidth: 1,
          borderColor: colors.borderLight,
        };
      case 'warm':
        return {
          backgroundColor: colors.primaryLight,
          borderWidth: 1,
          borderColor: colors.primary + '25',
          ...shadows.soft,
        };
      default: // elevated
        return {
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...shadows.card,
        };
    }
  };

  return (
    <View style={[styles.base, { borderRadius: radii.xl }, getVariantStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: 16,
    overflow: 'hidden',
  },
});
