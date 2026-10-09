import React from 'react';
import { ChefStudioView } from '../../features/chef/ChefStudioView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function ChefScreen() {
  return (
    <AuthGuard
      pageTitle="Chef Studio"
      pageSubtitle="Sign in to create recipes, submit dishes for admin approval, and manage chef meal kits."
    >
      <ChefStudioView />
    </AuthGuard>
  );
}
