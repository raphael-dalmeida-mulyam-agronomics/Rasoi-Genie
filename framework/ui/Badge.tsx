import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type BadgeVariant =
  | 'primary'
  | 'accent'
  | 'veg'
  | 'nonveg'
  | 'warning'
  | 'info'
  | 'success'
  | 'danger'
  | 'neutral'
  | 'outline';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
  textStyle,
}) => {
  const { colors, radii } = useTheme();

  const getBadgeStyle = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryLight, text: colors.primary, border: colors.primary + '30' };
      case 'accent':
        return { bg: colors.accentLight, text: colors.accent, border: colors.accent + '30' };
      case 'veg':
        return { bg: colors.vegLight, text: colors.veg, border: colors.veg + '40' };
      case 'nonveg':
        return { bg: colors.nonVegLight, text: colors.nonVeg, border: colors.nonVeg + '40' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'info':
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' };
      case 'success':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'danger':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
      case 'outline':
        return { bg: 'transparent', text: colors.textSecondary, border: colors.border };
      default:
        return { bg: colors.bgSubtle, text: colors.textSecondary, border: colors.borderLight };
    }
  };

  const badgeColor = getBadgeStyle();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor.bg,
          borderColor: badgeColor.border || 'transparent',
          borderWidth: badgeColor.border ? 1 : 0,
          borderRadius: radii.pill,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 4 }}>{icon}</View> : null}
      <Text
        style={[
          styles.badgeText,
          {
            color: badgeColor.text,
            fontSize: isSmall ? 10 : 11,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
