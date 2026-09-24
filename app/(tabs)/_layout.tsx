import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '../../framework/ui/Icon';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { OnboardingWizardView } from '../../features/onboarding/OnboardingWizardView';
import { AuthGuard } from '../../features/auth/AuthGuard';
import { subscribeToPendingApprovalCount } from '../../framework/services/notificationService';
import { refreshPendingApprovalCount } from '../../framework/services/supabaseOrdersService';

export default function TabLayout() {
  const { user, isAdmin } = useAuth();
  const { preferences, isLoadingProfile } = usePreferences();
  const { colors } = useTheme();
  const { totalCount } = useCart();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  useEffect(() => {
    refreshPendingApprovalCount();
    const unsubscribe = subscribeToPendingApprovalCount((count) => {
      setPendingApprovalCount(count);
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <AuthGuard isRootGate>
          <></>
        </AuthGuard>
      </View>
    );
  }

  // First-time user onboarding gate
  if (!isLoadingProfile && !preferences.isOnboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <OnboardingWizardView />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderLight,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Icon name="restaurant" size={22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Icon name="search" size={22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Basket',
          tabBarBadge: totalCount > 0 ? totalCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color }) => <Icon name="cart" size={22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color }) => <Icon name="time" size={22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="login"
        options={{
          title: user ? 'Account' : 'Sign In',
          tabBarIcon: ({ color }) => <Icon name="people" size={22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin Dash',
          href: isAdmin ? '/admin' : null,
          tabBarBadge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color }) => <Icon name="stats" size={22} color={color as string} />,
        }}
      />

      {/* Hide legacy tab */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
