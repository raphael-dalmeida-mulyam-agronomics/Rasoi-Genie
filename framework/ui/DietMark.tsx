import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface DietMarkProps {
  diet: 'veg' | 'non-veg' | 'vegan' | 'jain' | string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard Indian FSSAI-compliant dietary indicator mark:
 * - Veg: Square border with filled green circle inside
 * - Non-Veg: Square border with filled red/brown triangle inside
 * - Vegan: Square border with green dot + leaf accent
 */
export const DietMark: React.FC<DietMarkProps> = ({ diet, size = 16, style }) => {
  const { colors } = useTheme();
  const normalized = (diet || 'veg').toLowerCase();
  const isVeg =
    normalized.includes('veg') && !normalized.includes('non-veg') && !normalized.includes('nonveg');

  const strokeColor = isVeg ? colors.veg : colors.nonVeg;
  const innerSize = Math.round(size * 0.45);

  return (
    <View
      accessibilityLabel={isVeg ? 'Vegetarian dish mark' : 'Non-vegetarian dish mark'}
      accessibilityRole="image"
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderColor: strokeColor,
          borderRadius: 3,
        },
        style,
      ]}
    >
      {isVeg ? (
        <View
          style={[
            styles.dot,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: strokeColor,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.triangle,
            {
              borderLeftWidth: innerSize / 2,
              borderRightWidth: innerSize / 2,
              borderBottomWidth: innerSize,
              borderBottomColor: strokeColor,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dot: {},
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
