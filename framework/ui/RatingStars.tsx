import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface RatingStarsProps {
  rating: number; // 0 to 5
  reviewCount?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 14,
  interactive = false,
  onRatingChange,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = rating >= star;
          const isHalf = !isFilled && rating >= star - 0.5;

          const starContent = (
            <View key={star} style={{ marginRight: 2 }}>
              <Icon
                name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                size={size}
                color={isFilled || isHalf ? colors.star : colors.border}
              />
            </View>
          );

          if (interactive) {
            return (
              <TouchableOpacity
                key={star}
                onPress={() => onRatingChange?.(star)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {starContent}
              </TouchableOpacity>
            );
          }

          return starContent;
        })}
      </View>

      {rating > 0 && !interactive && (
        <Text style={[styles.ratingNumber, { color: colors.textPrimary, fontSize: size }]}>
          {rating.toFixed(1)}
        </Text>
      )}

      {reviewCount !== undefined && (
        <Text style={[styles.reviewCount, { color: colors.textMuted, fontSize: size - 2 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    fontWeight: '800',
    marginLeft: 5,
  },
  reviewCount: {
    marginLeft: 3,
  },
});
