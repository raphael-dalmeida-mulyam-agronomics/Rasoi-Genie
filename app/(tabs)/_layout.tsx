import React, { useState, useEffect } from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { AuthGuard } from '../../features/auth/AuthGuard';
import { subscribeToPendingApprovalCount } from '../../framework/services/notificationService';
import { refreshPendingApprovalCount } from '../../framework/services/supabaseOrdersService';

export default function TabLayout() {
  const { user, isAdmin } = useAuth();
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
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'fork.knife',
                android: 'restaurant',
                web: 'restaurant',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
              tintColor={color}
              size={22}
            />
          ),
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
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'cart',
                android: 'shopping_cart',
                web: 'shopping_cart',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'clock.arrow.circlepath',
                android: 'history',
                web: 'history',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="login"
        options={{
          title: user ? 'Account' : 'Sign In',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.crop.circle',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={22}
            />
          ),
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
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chart.bar',
                android: 'bar_chart',
                web: 'bar_chart',
              }}
              tintColor={color}
              size={22}
            />
          ),
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
