import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'kits'
  | 'inventory'
  | 'analytics'
  | 'users'
  | 'coupons'
  | 'revenue'
  | 'reviews';

export interface AdminNavTabItem {
  id: AdminTab;
  label: string;
  icon: string;
  count?: number;
  alertBadge?: string;
  highlightAlert?: boolean;
}

export interface AdminNavigationMenuProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  ordersCount?: number;
  pendingApprovalCount?: number;
  kitsCount?: number;
  usersCount?: number;
  couponsCount?: number;
  reviewsCount?: number;
  style?: ViewStyle;
}

/**
 * Reusable Admin Navigation Menu Component
 * Provides a consistent, responsive, horizontally scrollable tab menu
 * across the RasoiGenie Admin Control Center.
 */
export const AdminNavigationMenu: React.FC<AdminNavigationMenuProps> = ({
  activeTab,
  onTabChange,
  ordersCount = 0,
  pendingApprovalCount = 0,
  kitsCount = 0,
  usersCount = 0,
  couponsCount = 0,
  reviewsCount = 0,
  style,
}) => {
  const { colors, radii, shadows } = useTheme();

  const tabs: AdminNavTabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '🏠',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: '📦',
      count: ordersCount,
      alertBadge:
        pendingApprovalCount > 0
          ? `🚨 ${pendingApprovalCount} Awaiting Approval`
          : undefined,
      highlightAlert: pendingApprovalCount > 0,
    },
    {
      id: 'kits',
      label: 'Meal Kits',
      icon: '🍲',
      count: kitsCount,
    },
    {
      id: 'inventory',
      label: 'Inventory Hub',
      icon: '🏭',
    },
    {
      id: 'analytics',
      label: 'Regional Analytics 🇮🇳',
      icon: '📊',
    },
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      count: usersCount,
    },
    {
      id: 'coupons',
      label: 'Coupons',
      icon: '🏷️',
      count: couponsCount,
    },
    {
      id: 'revenue',
      label: 'Revenue Dash',
      icon: '📈',
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: '⭐',
      count: reviewsCount,
    },
  ];

  return (
    <View
      style={[
        styles.menuContainer,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderLight,
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const hasAlert = tab.highlightAlert && !isSelected;

          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : hasAlert
                      ? '#FEF2F2'
                      : colors.bgSubtle,
                  borderColor: isSelected
                    ? colors.primary
                    : hasAlert
                      ? '#F87171'
                      : colors.borderLight,
                  borderRadius: radii.pill,
                },
                isSelected ? shadows.soft : null,
              ]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              {/* Icon & Label */}
              <Text style={{ fontSize: 13, marginRight: 6 }}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : hasAlert
                        ? '#991B1B'
                        : colors.textPrimary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>

              {/* Alert or Count Badge */}
              {tab.alertBadge ? (
                <View
                  style={[
                    styles.alertBadgeContainer,
                    {
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#DC2626',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertBadgeText,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    {tab.alertBadge}
                  </Text>
                </View>
              ) : tab.count !== undefined ? (
                <View
                  style={[
                    styles.countBadgeContainer,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.22)'
                        : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    height: 54,
    borderBottomWidth: 1,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 12.5,
  },
  countBadgeContainer: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertBadgeContainer: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  alertBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
