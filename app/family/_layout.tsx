import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';

export default function FamilyLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bgSurface,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.bgPrimary,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Family Hub',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="links"
        options={{
          title: 'Join Links',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="approvals"
        options={{
          title: 'Pending Approvals',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="invites"
        options={{
          title: 'Family Invitations',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
