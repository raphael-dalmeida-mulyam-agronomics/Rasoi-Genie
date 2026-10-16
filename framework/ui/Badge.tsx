import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type BadgeVariant =
  | 'primary'
  | 'accent'
  | 'veg'
  | 'nonveg'
  | 'vegan'
  | 'keto'
  | 'jain'
  | 'gluten-free'
  | 'warning'
  | 'info'
  | 'success'
  | 'danger'
  | 'neutral'
  | 'outline';

export function getDietBadgeInfo(diet?: string): { label: string; variant: BadgeVariant } {
  const safeDiet = typeof diet === 'string' ? diet : 'veg';
  const d = safeDiet.toLowerCase();
  switch (d) {
    case 'veg':
      return { label: 'Pure Veg', variant: 'veg' };
    case 'nonveg':
      return { label: 'Non-Veg', variant: 'nonveg' };
    case 'vegan':
      return { label: 'Vegan', variant: 'vegan' };
    case 'keto':
      return { label: 'Keto', variant: 'keto' };
    case 'jain':
      return { label: 'Jain', variant: 'jain' };
    case 'gluten-free':
      return { label: 'Gluten-Free', variant: 'gluten-free' };
    default:
      return { label: safeDiet.toUpperCase(), variant: 'accent' };
  }
}

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
      case 'vegan':
        return {
          bg: colors.bgSuccessSubtle,
          text: colors.textSuccess,
          border: colors.borderSuccessSubtle,
        };
      case 'keto':
        return {
          bg: colors.bgWarningSubtle,
          text: colors.textWarning,
          border: colors.borderWarningSubtle,
        };
      case 'jain':
        return {
          bg: colors.bgSuccessSubtle,
          text: colors.textSuccess,
          border: colors.borderSuccessSubtle,
        };
      case 'gluten-free':
        return { bg: colors.bgInfoSubtle, text: colors.textInfo, border: colors.borderInfoSubtle };
      case 'warning':
        return {
          bg: colors.bgWarningSubtle,
          text: colors.textWarning,
          border: colors.borderWarningSubtle,
        };
      case 'info':
        return { bg: colors.bgInfoSubtle, text: colors.textInfo, border: colors.borderInfoSubtle };
      case 'success':
        return {
          bg: colors.bgSuccessSubtle,
          text: colors.textSuccess,
          border: colors.borderSuccessSubtle,
        };
      case 'danger':
        return {
          bg: colors.bgDangerSubtle,
          text: colors.textDanger,
          border: colors.borderDangerSubtle,
        };
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
