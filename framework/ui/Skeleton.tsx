import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius,
  style,
}) => {
  const { colors, radii, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const baseColor = isDark ? '#2D2825' : '#E8E3DD';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radii.sm,
          backgroundColor: baseColor,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonRecipeCard: React.FC<SkeletonCardProps> = ({ style }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <View
      style={[
        styles.recipeCard,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radii.xl,
          borderColor: colors.borderLight,
          ...shadows.card,
        },
        style,
      ]}
    >
      {/* Hero Image Skeleton */}
      <Skeleton height={150} borderRadius={radii.lg} style={{ marginBottom: 12 }} />

      {/* Title & Tagline */}
      <Skeleton width="80%" height={18} style={{ marginBottom: 6 }} />
      <Skeleton width="55%" height={13} style={{ marginBottom: 12 }} />

      {/* Meta Line (Rating, Cook Time, Diet) */}
      <View style={styles.row}>
        <Skeleton width={50} height={14} borderRadius={radii.pill} />
        <Skeleton width={60} height={14} borderRadius={radii.pill} />
        <Skeleton width={70} height={14} borderRadius={radii.pill} />
      </View>

      {/* Price & Action Row */}
      <View style={[styles.row, { marginTop: 14, justifyContent: 'space-between' }]}>
        <Skeleton width={70} height={22} />
        <Skeleton width={80} height={34} borderRadius={radii.pill} />
      </View>
    </View>
  );
};

export const SkeletonRowItem: React.FC<SkeletonCardProps> = ({ style }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <View
      style={[
        styles.rowItem,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radii.lg,
          borderColor: colors.borderLight,
          ...shadows.soft,
        },
        style,
      ]}
    >
      <Skeleton width={44} height={44} borderRadius={radii.pill} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={60} height={20} borderRadius={radii.sm} />
    </View>
  );
};

const styles = StyleSheet.create({
  recipeCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
