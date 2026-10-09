import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CookModeView } from '../../features/cook/CookModeView';

export default function CookModeScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return <CookModeView orderId={orderId || ''} />;
}
