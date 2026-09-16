import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  textStyle,
  icon,
  ...props
}) => {
  const { colors, radii, shadows } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.bgSubtle,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'accent':
        return {
          backgroundColor: colors.accent,
          ...shadows.soft,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default: // primary
        return {
          backgroundColor: colors.primary,
          ...shadows.soft,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return { color: colors.textPrimary };
      case 'accent':
        return { color: colors.textInverse };
      case 'danger':
        return { color: colors.textInverse };
      case 'outline':
        return { color: colors.primary };
      case 'ghost':
        return { color: colors.textSecondary };
      default:
        return { color: colors.textInverse };
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            minHeight: 36,
            borderRadius: radii.md,
          },
          text: { fontSize: 13, fontWeight: '700' },
        };
      case 'lg':
        return {
          container: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            minHeight: 54,
            borderRadius: radii.lg,
          },
          text: { fontSize: 17, fontWeight: '800' },
        };
      default:
        return {
          container: {
            paddingVertical: 12,
            paddingHorizontal: 18,
            minHeight: 46,
            borderRadius: radii.lg,
          },
          text: { fontSize: 15, fontWeight: '700' },
        };
    }
  };

  const { container: sizeContainer, text: sizeText } = getSizeStyle();

  return (
    <TouchableOpacity
      style={[
        styles.baseContainer,
        sizeContainer,
        getContainerStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.82}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[styles.baseText, sizeText, getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
