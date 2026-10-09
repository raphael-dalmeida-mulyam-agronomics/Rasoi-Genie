import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Icon } from '../../framework/ui/Icon';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { CoverScreenView } from '../../features/auth/CoverScreenView';
import { LocationOnboardingView } from '../../features/onboarding/LocationOnboardingView';
import { getStoredUserLocation, StoredLocation } from '../../framework/services/locationService';
import { hasSeenWelcomeScreen, markWelcomeScreenSeen } from '../../framework/services/guestService';
import { subscribeToPendingApprovalCount } from '../../framework/services/notificationService';
import { refreshPendingApprovalCount } from '../../framework/services/supabaseOrdersService';

import { CookModeMiniBar } from '../../framework/ui/CookModeMiniBar';

export default function TabLayout() {
  const { user, isAdmin, isChef } = useAuth();
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const { totalCount } = useCart();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  // First launch welcome & location onboarding state
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [userLocation, setUserLocation] = useState<StoredLocation | null>(null);

  useEffect(() => {
    refreshPendingApprovalCount();
    const unsubscribe = subscribeToPendingApprovalCount((count) => {
      setPendingApprovalCount(count);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([hasSeenWelcomeScreen(), getStoredUserLocation()])
      .then(([seen, loc]) => {
        if (mounted) {
          setHasSeenWelcome(seen);
          setUserLocation(loc);
        }
      })
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgPrimary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 1. Optional first-launch welcome cover screen: "Get Started" proceeds to location step
  if (!hasSeenWelcome && !userLocation && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <CoverScreenView
          onGetStarted={async () => {
            await markWelcomeScreenSeen();
            setHasSeenWelcome(true);
          }}
        />
      </View>
    );
  }

  // 2. Location is the only onboarding step: require location before entering main app
  if (!userLocation && !preferences.city && !preferences.currentCity) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <LocationOnboardingView
          onLocationSelected={(loc) => {
            setUserLocation({
              city: loc.city,
              pincode: loc.pincode,
              hub: loc.hub,
            });
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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

        <Tabs.Screen
          name="chef"
          options={{
            title: 'Chef Studio',
            href: isChef && !isAdmin ? '/chef' : null,
            tabBarIcon: ({ color }) => <Icon name="chef" size={22} color={color as string} />,
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
      <CookModeMiniBar />
    </View>
  );
}
