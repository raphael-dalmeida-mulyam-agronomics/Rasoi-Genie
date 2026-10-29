import React from 'react';
import { router } from 'expo-router';
import { FamilySubscriptionView } from '../../../features/family/FamilySubscriptionView';

export default function FamilySubscriptionScreen() {
  return <FamilySubscriptionView onBack={() => router.back()} />;
}
