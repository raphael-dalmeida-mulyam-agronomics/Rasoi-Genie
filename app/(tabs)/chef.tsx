import React from 'react';
import { View } from 'react-native';
import { ChefStudioView } from '../../features/chef/ChefStudioView';
import { AuthGuard } from '../../features/auth/AuthGuard';
import { useTheme } from '../../framework/theme/ThemeContext';

export default function ChefScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <AuthGuard
        pageTitle="Chef Studio"
        pageSubtitle="Sign in to create recipes, submit dishes for admin approval, and manage chef meal kits."
      >
        <ChefStudioView />
      </AuthGuard>
    </View>
  );
}
