import React, { useState, useEffect } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { Icon } from '../../framework/ui/Icon';
import { RoleBadge } from '../../framework/ui/RoleBadge';
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
import { useFamily } from '../../framework/context/FamilyContext';

export default function TabLayout() {
  const { user, isAdmin, isChef } = useAuth();
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const { totalCount } = useCart();
  const {
    family,
    isDependent,
    dependentType,
    canApproveItems,
    cartState: familyCartState,
  } = useFamily();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  const pathname = usePathname();
  const router = useRouter();

  // Route guard: Dependent accounts cannot access search, login/account, admin, or chef
  useEffect(() => {
    if (isDependent && pathname) {
      if (
        pathname.includes('/search') ||
        pathname.includes('/login') ||
        pathname.includes('/wallet') ||
        pathname.includes('/referral') ||
        pathname.includes('/admin') ||
        pathname.includes('/chef')
      ) {
        router.replace('/');
      }
    }
  }, [isDependent, pathname, router]);

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
  if (!isDependent && !hasSeenWelcome && !userLocation && !user) {
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

  // 2. Location is the only onboarding step: require location before entering main app (skipped for dependents)
  if (!isDependent && !userLocation && !preferences.city && !preferences.currentCity) {
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
      {isDependent && family && (
        <View
          testID="dependent-shell-header"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.bgSurface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="people" size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              {family.name}
            </Text>
          </View>
          <RoleBadge role="dependent" dependentType={dependentType} size="sm" />
        </View>
      )}

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
            href: isDependent ? null : undefined,
            tabBarIcon: ({ color }) => <Icon name="search" size={22} color={color as string} />,
          }}
        />

        <Tabs.Screen
          name="cart"
          options={{
            title: isDependent ? 'Family Basket' : 'Basket',
            tabBarBadge: isDependent
              ? familyCartState.approvedCount > 0
                ? familyCartState.approvedCount
                : undefined
              : canApproveItems && familyCartState.pendingCount > 0
                ? familyCartState.pendingCount
                : totalCount > 0
                  ? totalCount
                  : undefined,
            tabBarBadgeStyle:
              canApproveItems && familyCartState.pendingCount > 0 && !isDependent
                ? {
                    backgroundColor: '#D97706',
                    fontSize: 10,
                    fontWeight: '800',
                  }
                : {
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
            title: isDependent ? 'Family Orders' : 'My Orders',
            tabBarIcon: ({ color }) => <Icon name="time" size={22} color={color as string} />,
          }}
        />

        <Tabs.Screen
          name="login"
          options={{
            title: user ? 'Account' : 'Sign In',
            href: isDependent ? null : undefined,
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
