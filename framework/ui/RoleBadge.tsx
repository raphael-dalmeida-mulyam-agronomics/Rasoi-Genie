import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FamilyRole, DependentType } from '../services/familyService';
import { Icon } from './Icon';

export interface RoleBadgeProps {
  role: FamilyRole;
  dependentType?: DependentType | null;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  testID?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  dependentType,
  size = 'md',
  style,
  testID,
}) => {
  const { colors, radii, isDark } = useTheme();

  let label = 'Member';
  let iconName: any = 'user';
  let badgeColor = colors.primary;
  let bgTint = isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7';

  if (role === 'owner') {
    label = 'Owner';
    iconName = 'shield';
    badgeColor = '#D97706'; // Golden / saffron
    bgTint = isDark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7';
  } else if (role === 'co_owner') {
    label = 'Co-owner';
    iconName = 'card';
    badgeColor = '#2563EB'; // Royal indigo
    bgTint = isDark ? 'rgba(37, 99, 235, 0.25)' : '#DBEAFE';
  } else if (role === 'dependent') {
    if (dependentType === 'child') {
      label = 'Child';
      iconName = 'sparkles';
      badgeColor = '#10B981'; // Fresh mint
      bgTint = isDark ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5';
    } else if (dependentType === 'senior') {
      label = 'Senior';
      iconName = 'heart';
      badgeColor = '#7C3AED'; // Lavender
      bgTint = isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE';
    } else {
      label = 'Dependent';
      iconName = 'people';
      badgeColor = '#059669';
      bgTint = isDark ? 'rgba(5, 150, 105, 0.25)' : '#D1FAE5';
    }
  } else {
    label = 'Member';
    iconName = 'user';
    badgeColor = colors.textSecondary;
    bgTint = isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6';
  }

  const isSmall = size === 'sm';

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor: bgTint,
          borderColor: badgeColor,
          borderRadius: radii.pill,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 8,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Role: ${label}`}
    >
      <Icon
        name={iconName}
        size={isSmall ? 10 : 12}
        color={badgeColor}
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.text,
          {
            color: badgeColor,
            fontSize: isSmall ? 10 : 11,
            fontWeight: '600',
          },
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
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: 0.2,
  },
});
