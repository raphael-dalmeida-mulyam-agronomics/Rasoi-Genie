import React, { useState, useEffect } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
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
    leaveCurrentFamily,
  } = useFamily();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  let bottomInset = 0;
  if (SafeAreaInsetsContext) {
    try {
      const insets = React.useContext(SafeAreaInsetsContext);
      bottomInset = insets?.bottom ?? 0;
    } catch {
      bottomInset = 0;
    }
  } else if (typeof useSafeAreaInsets === 'function') {
    try {
      bottomInset = useSafeAreaInsets()?.bottom ?? 0;
    } catch {
      bottomInset = 0;
    }
  }
  const safeBottomPadding = bottomInset > 0 ? bottomInset : Platform.OS === 'ios' ? 16 : 2;
  const computedTabHeight = Platform.select({
    ios: 52 + (bottomInset > 0 ? bottomInset : 20),
    android: 58 + bottomInset,
    web: 58 + (bottomInset > 0 ? bottomInset : 0),
    default: 58 + bottomInset,
  });

  // Route guard: Dependent accounts cannot access search, login/account, admin, or chef
  useEffect(() => {
    if (isDependent && family && pathname) {
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
  }, [isDependent, family, pathname, router]);

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

  // 2. Location is required only if no location has been selected yet (guest or authenticated user)
  const hasValidLocation = Boolean(
    preferences.city || preferences.currentCity || userLocation?.city,
  );
  const needsLocationOnboarding = !isDependent && !hasValidLocation;

  if (needsLocationOnboarding) {
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
      {/* Responsive Desktop Top Navigation Bar (shown on screens >= 768px) */}
      {isWide && (
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            paddingVertical: 12,
            paddingHorizontal: 24,
            zIndex: 100,
          }}
        >
          <View
            style={{
              maxWidth: 1200,
              width: '100%',
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Brand Logo & Title */}
            <TouchableOpacity
              onPress={() => router.push('/')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/images/icon.png')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
                resizeMode="cover"
              />
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '900',
                    color: colors.primary,
                    letterSpacing: -0.5,
                  }}
                >
                  Rasoi<Text style={{ color: colors.textPrimary }}>Genie</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Desktop Navigation Links */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {[
                { label: 'Explore', path: '/', icon: 'restaurant' as const },
                {
                  label: 'Search',
                  path: '/(tabs)/search',
                  icon: 'search' as const,
                  hidden: Boolean(isDependent && family),
                },
                {
                  label: isDependent ? 'Family Basket' : 'Basket',
                  path: '/(tabs)/cart',
                  icon: 'cart' as const,
                  badge: isDependent
                    ? familyCartState.approvedCount > 0
                      ? familyCartState.approvedCount
                      : undefined
                    : totalCount > 0
                      ? totalCount
                      : undefined,
                },
                {
                  label: isDependent && family ? 'Family Orders' : 'My Orders',
                  path: '/(tabs)/orders',
                  icon: 'time' as const,
                },
                {
                  label: 'Family Hub',
                  path: '/family',
                  icon: 'people' as const,
                  badge:
                    canApproveItems && familyCartState.pendingCount > 0
                      ? familyCartState.pendingCount
                      : undefined,
                },
                {
                  label: user ? 'Account' : 'Sign In',
                  path: '/(tabs)/login',
                  icon: 'user' as const,
                  hidden: Boolean(isDependent && family),
                },
              ]
                .filter((nav) => !nav.hidden)
                .map((nav) => {
                  const isActive =
                    nav.path === '/'
                      ? pathname === '/' || pathname === '/(tabs)' || pathname === ''
                      : pathname?.startsWith(nav.path) ||
                        (nav.path === '/family' && pathname?.includes('/family'));
                  return (
                    <TouchableOpacity
                      key={nav.path}
                      onPress={() => router.push(nav.path as any)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isActive ? colors.primaryLight : 'transparent',
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={nav.icon}
                        size={17}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? colors.primary : colors.textPrimary,
                        }}
                      >
                        {nav.label}
                      </Text>
                      {typeof nav.badge === 'number' && nav.badge > 0 && (
                        <View
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 10,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            marginLeft: 2,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                            {nav.badge}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              {/* Staff quick shortcuts on desktop if admin/chef */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/admin' as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: colors.bgSubtle,
                    marginLeft: 6,
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="stats" size={15} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                    Admin
                  </Text>
                  {pendingApprovalCount > 0 && (
                    <View
                      style={{
                        backgroundColor: '#DC2626',
                        borderRadius: 10,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                        {pendingApprovalCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {(isChef || pathname?.includes('/chef')) && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/chef' as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: pathname?.includes('/chef')
                      ? colors.primaryLight
                      : colors.bgSubtle,
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="chef"
                    size={15}
                    color={pathname?.includes('/chef') ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: pathname?.includes('/chef') ? colors.primary : colors.textSecondary,
                    }}
                  >
                    Chef Studio
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <RoleBadge role="dependent" dependentType={dependentType} size="sm" />
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Leave Family', 'Are you sure you want to exit family mode?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Exit', style: 'destructive', onPress: () => leaveCurrentFamily() },
                ]);
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                Exit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: isWide
            ? { display: 'none' }
            : {
                backgroundColor: colors.bgSurface,
                borderTopColor: colors.borderLight,
                height: computedTabHeight,
                paddingTop: 2,
                paddingBottom: safeBottomPadding,
              },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            lineHeight: 14,
            marginTop: 1,
            marginBottom: 0,
          },
          tabBarIconStyle: {
            height: 24,
            width: 26,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
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
            href: isDependent && family ? null : undefined,
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
          name="family"
          options={{
            title: 'Family Hub',
            tabBarBadge:
              canApproveItems && familyCartState.pendingCount > 0
                ? familyCartState.pendingCount
                : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#D97706',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ color }) => <Icon name="people" size={22} color={color as string} />,
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: isDependent && family ? 'Family Orders' : 'My Orders',
            tabBarIcon: ({ color }) => <Icon name="time" size={22} color={color as string} />,
          }}
        />

        <Tabs.Screen
          name="chef"
          options={{
            title: 'Chef',
            href:
              (isChef || pathname?.includes('/chef')) && !(isDependent && family)
                ? undefined
                : null,
            tabBarIcon: ({ color }) => <Icon name="chef" size={22} color={color as string} />,
          }}
        />

        <Tabs.Screen
          name="login"
          options={{
            title: user ? 'Account' : 'Sign In',
            href: isDependent && family ? null : undefined,
            tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color as string} />,
          }}
        />

        {/* Admin is reached from the Profile screen and desktop top bar */}
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <CookModeMiniBar />
    </View>
  );
}
