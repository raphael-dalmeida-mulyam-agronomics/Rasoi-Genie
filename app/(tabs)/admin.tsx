import React from 'react';
import { router } from 'expo-router';
import { AdminDashboardView } from '../../features/admin/AdminDashboardView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function AdminScreen() {
  return (
    <AuthGuard
      pageTitle="Admin Dashboard"
      pageSubtitle="Sign in to access admin capabilities, catalog management, and kitchen fulfillment."
    >
      <AdminDashboardView
        onNavigateToLogin={() => {
          router.push('/login' as any);
        }}
      />
    </AuthGuard>
  );
}
