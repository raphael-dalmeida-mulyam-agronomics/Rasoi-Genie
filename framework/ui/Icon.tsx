import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

const SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// Semantic convenience mapping to Ionicons
const SEMANTIC_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Navigation & Actions
  search: 'search-outline',
  cart: 'cart-outline',
  'cart-filled': 'cart',
  heart: 'heart',
  'heart-outline': 'heart-outline',
  close: 'close',
  'close-circle': 'close-circle-outline',
  trash: 'trash-outline',
  refresh: 'refresh-outline',
  check: 'checkmark',
  'check-circle': 'checkmark-circle',
  options: 'options-outline',
  filter: 'funnel-outline',

  // Chevrons & Arrows
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'arrow-forward': 'arrow-forward',
  'arrow-back': 'arrow-back',

  // Ratings & Feedback
  star: 'star',
  'star-half': 'star-half',
  'star-outline': 'star-outline',
  flame: 'flame-outline',
  'flame-filled': 'flame',
  sparkles: 'sparkles-outline',
  bulb: 'bulb-outline',

  // Food & Kitchen
  restaurant: 'restaurant-outline',
  'restaurant-filled': 'restaurant',
  leaf: 'leaf-outline',
  'leaf-filled': 'leaf',
  nutrition: 'fitness-outline',
  basket: 'basket-outline',
  time: 'time-outline',
  timer: 'stopwatch-outline',
  people: 'people-outline',
  chef: 'restaurant-outline',

  // Actions (add/create)
  add: 'add',
  'add-circle': 'add-circle-outline',

  // Commerce & Delivery
  delivery: 'bicycle-outline',
  location: 'location-outline',
  'location-filled': 'location',
  document: 'document-text-outline',
  tag: 'pricetag-outline',
  'tag-filled': 'pricetag',
  card: 'card-outline',
  cash: 'cash-outline',
  flash: 'flash-outline',
  bank: 'business-outline',
  package: 'cube-outline',
  'package-filled': 'cube',

  // Status & System
  alert: 'alert-circle-outline',
  info: 'information-circle-outline',
  lock: 'lock-closed-outline',
  'lock-open': 'lock-open-outline',
  phone: 'call-outline',
  'phone-device': 'phone-portrait-outline',
  mail: 'mail-outline',
  globe: 'globe-outline',
  google: 'logo-google',
  sun: 'sunny-outline',
  'sun-filled': 'sunny',
  moon: 'moon-outline',
  'moon-filled': 'moon',
  settings: 'settings-outline',
  bell: 'notifications-outline',
  gift: 'gift-outline',
  chat: 'chatbubble-ellipses-outline',
  play: 'play-outline',
  pause: 'pause-outline',
  ticket: 'receipt-outline',
  stats: 'bar-chart-outline',
};

export type SemanticIconName = keyof typeof SEMANTIC_ICON_MAP;
export type AppIconName = SemanticIconName | keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: AppIconName;
  size?: IconSize;
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Reusable, minimalist icon component.
 * Uses `@expo/vector-icons` (Ionicons) with support for semantic names,
 * theme color fallbacks, and standard sizing tokens.
 */
export const Icon: React.FC<IconProps> = ({ name, size = 'md', color, style, testID }) => {
  const { colors } = useTheme();

  const resolvedSize = typeof size === 'number' ? size : SIZE_MAP[size] || 20;
  const resolvedColor = color || colors.textPrimary;
  const resolvedGlyph: keyof typeof Ionicons.glyphMap =
    SEMANTIC_ICON_MAP[name as string] || (name as keyof typeof Ionicons.glyphMap);

  return (
    <Ionicons
      name={resolvedGlyph}
      size={resolvedSize}
      color={resolvedColor}
      style={style as any}
      testID={testID}
    />
  );
};

export default Icon;
