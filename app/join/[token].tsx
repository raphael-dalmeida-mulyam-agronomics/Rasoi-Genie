import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { JoinLandingView } from '../../features/family/JoinLandingView';

export default function JoinFamilyScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  return <JoinLandingView token={params.token || ''} />;
}
