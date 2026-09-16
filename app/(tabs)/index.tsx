import React from 'react';
import { HomeScreenView } from '../../features/home/HomeScreenView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function HomeScreen() {
  return (
    <AuthGuard
      pageTitle="Explore Meal Kits"
      pageSubtitle="Sign in to browse curated recipes, authentic spices, and regional kits."
    >
      <HomeScreenView />
    </AuthGuard>
  );
}
