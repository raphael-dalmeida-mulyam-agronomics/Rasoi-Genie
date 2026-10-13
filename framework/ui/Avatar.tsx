import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface AvatarProps {
  name: string;
  id?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  subBadge?: React.ReactNode;
  testID?: string;
}

const SIZE_MAP: Record<string, { size: number; fontSize: number }> = {
  xs: { size: 22, fontSize: 10 },
  sm: { size: 30, fontSize: 12 },
  md: { size: 40, fontSize: 16 },
  lg: { size: 52, fontSize: 20 },
  xl: { size: 68, fontSize: 26 },
};

// Curated Indian culinary / spice palette for stable, delightful member avatars
const AVATAR_PALETTE = [
  '#E11D48', // Kashmiri Rose
  '#D97706', // Turmeric Amber
  '#059669', // Fresh Mint
  '#2563EB', // Royal Indigo
  '#7C3AED', // Lavender Berry
  '#DB2777', // Gulab Jamun Pink
  '#0D9488', // Malabar Teal
  '#EA580C', // Tandoori Orange
];

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0] ? parts[0].slice(0, 2) : '?').toUpperCase();
  }
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

function getAvatarColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index] || '#D97706';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  id,
  size = 'md',
  style,
  subBadge,
  testID,
}) => {
  const { radii } = useTheme();

  const resolved =
    typeof size === 'number'
      ? { size, fontSize: Math.max(10, Math.floor(size * 0.4)) }
      : SIZE_MAP[size] || SIZE_MAP.md!;

  const bgColor = getAvatarColor(id || name || 'default');
  const initials = getInitials(name);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: resolved.size,
          height: resolved.size,
          borderRadius: resolved.size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: resolved.fontSize,
            lineHeight: resolved.fontSize * 1.2,
          },
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>

      {subBadge ? <View style={styles.subBadgeWrap}>{subBadge}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subBadgeWrap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
});
