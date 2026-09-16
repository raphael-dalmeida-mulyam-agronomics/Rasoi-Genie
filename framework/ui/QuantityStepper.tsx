import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 20,
  size = 'md',
  style,
}) => {
  const { colors, radii } = useTheme();
  const isSm = size === 'sm';

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const btnSize = isSm ? 28 : 34;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSubtle,
          borderRadius: radii.md,
          borderColor: colors.borderLight,
          padding: 3,
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.btn,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: radii.sm,
            backgroundColor: value <= min ? 'transparent' : colors.bgSurface,
          },
        ]}
        onPress={handleDecrement}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.btnText,
            {
              color: value <= min ? colors.textMuted : colors.textPrimary,
              fontSize: isSm ? 14 : 16,
            },
          ]}
        >
          −
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.valueText,
          {
            color: colors.textPrimary,
            fontSize: isSm ? 13 : 15,
            minWidth: isSm ? 22 : 30,
          },
        ]}
      >
        {value}
      </Text>

      <TouchableOpacity
        style={[
          styles.btn,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: radii.sm,
            backgroundColor: value >= max ? 'transparent' : colors.bgSurface,
          },
        ]}
        onPress={handleIncrement}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.btnText,
            {
              color: value >= max ? colors.textMuted : colors.textPrimary,
              fontSize: isSm ? 14 : 16,
            },
          ]}
        >
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '800',
  },
  valueText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});
