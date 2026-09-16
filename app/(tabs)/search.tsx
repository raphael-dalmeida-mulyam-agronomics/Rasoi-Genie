import React from 'react';
import { SearchView } from '../../features/search/SearchView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function SearchScreen() {
  return (
    <AuthGuard
      pageTitle="Search Recipes & Ingredients"
      pageSubtitle="Sign in to discover dishes, search by whole spices, and view prep instructions."
    >
      <SearchView />
    </AuthGuard>
  );
}
