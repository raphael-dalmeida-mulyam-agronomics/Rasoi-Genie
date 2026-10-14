import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CookModeView } from '../../features/cook/CookModeView';

export default function CookModeScreen() {
  const { orderId, kitId } = useLocalSearchParams<{ orderId: string; kitId?: string }>();

  return <CookModeView orderId={orderId || ''} initialKitId={kitId} />;
}
