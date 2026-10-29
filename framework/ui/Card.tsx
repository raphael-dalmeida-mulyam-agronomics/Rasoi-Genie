import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat' | 'warm';
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  onPress,
  activeOpacity = 0.8,
  ...props
}) => {
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

  const combinedStyle = [styles.base, { borderRadius: radii.xl }, getVariantStyle(), style];

  if (onPress) {
    const { onBlur, onFocus, ...touchableProps } = props as any;
    return (
      <TouchableOpacity
        style={combinedStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={combinedStyle} {...props}>
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
