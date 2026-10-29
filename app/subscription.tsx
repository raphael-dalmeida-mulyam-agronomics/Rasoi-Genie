import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { SubscriptionPlanView } from '../features/subscription/SubscriptionPlanView';
import { useTheme } from '../framework/theme/ThemeContext';

export default function SubscriptionRoute() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <SubscriptionPlanView onBack={() => router.back()} />
    </View>
  );
}
