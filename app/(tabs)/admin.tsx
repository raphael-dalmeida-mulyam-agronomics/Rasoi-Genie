import React from 'react';
import { router } from 'expo-router';
import { AdminDashboardView } from '../../features/admin/AdminDashboardView';

export default function AdminScreen() {
  return (
    <AdminDashboardView
      onNavigateToLogin={() => {
        router.push('/login' as any);
      }}
    />
  );
}
