import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';

export interface CheckoutHoldBannerProps {
  holderName?: string | null;
  expiresAt: string;
  isHeldByMe?: boolean;
}

export const CheckoutHoldBanner: React.FC<CheckoutHoldBannerProps> = ({
  holderName,
  expiresAt,
  isHeldByMe = false,
}) => {
  const { colors, radii, isDark } = useTheme();

  const [remainingSec, setRemainingSec] = useState(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (remainingSec <= 0) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isHeldByMe
            ? isDark
              ? 'rgba(37, 99, 235, 0.2)'
              : '#EFF6FF'
            : isDark
              ? 'rgba(217, 119, 6, 0.2)'
              : '#FFFBEB',
          borderColor: isHeldByMe ? '#2563EB' : '#D97706',
          borderRadius: radii.lg,
        },
      ]}
      testID="checkout-hold-banner"
    >
      <Icon
        name={isHeldByMe ? 'card' : 'lock-closed'}
        size={18}
        color={isHeldByMe ? '#2563EB' : '#D97706'}
        style={{ marginRight: 8 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerText, { color: isHeldByMe ? '#1E40AF' : '#92400E' }]}>
          {isHeldByMe
            ? `Your checkout reservation is active (${timeFormatted} remaining).`
            : `${holderName || 'Another family payer'} is checking out (${timeFormatted} remaining).`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
