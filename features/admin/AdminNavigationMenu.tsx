import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon, AppIconName } from '../../framework/ui/Icon';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'kits'
  | 'inventory'
  | 'analytics'
  | 'customers'
  | 'admins'
  | 'users'
  | 'chefs'
  | 'coupons'
  | 'revenue'
  | 'reviews'
  | 'wallets'
  | 'referrals';

export interface AdminNavTabItem {
  id: AdminTab;
  label: string;
  icon: AppIconName;
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
  customersCount?: number;
  adminsCount?: number;
  chefsCount?: number;
  pendingChefSubmissions?: number;
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
  customersCount,
  adminsCount = 0,
  chefsCount = 0,
  pendingChefSubmissions = 0,
  couponsCount = 0,
  reviewsCount = 0,
  style,
}) => {
  const { colors, radii, shadows } = useTheme();

  const tabs: AdminNavTabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'home',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'cube',
      count: ordersCount,
      alertBadge:
        pendingApprovalCount > 0 ? `${pendingApprovalCount} Awaiting Approval` : undefined,
      highlightAlert: pendingApprovalCount > 0,
    },
    {
      id: 'kits',
      label: 'Meal Kits',
      icon: 'restaurant',
      count: kitsCount,
    },
    {
      id: 'inventory',
      label: 'Inventory Hub',
      icon: 'business',
    },
    {
      id: 'analytics',
      label: 'Regional Analytics',
      icon: 'bar-chart',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'people',
      count: customersCount ?? usersCount,
    },
    {
      id: 'admins',
      label: 'Staff Admins',
      icon: 'lock',
      count: adminsCount,
    },
    {
      id: 'chefs',
      label: 'Chef Submissions',
      icon: 'chef',
      count: chefsCount,
      alertBadge: pendingChefSubmissions > 0 ? `${pendingChefSubmissions} Pending` : undefined,
      highlightAlert: pendingChefSubmissions > 0,
    },
    {
      id: 'coupons',
      label: 'Coupons',
      icon: 'tag',
      count: couponsCount,
    },
    {
      id: 'revenue',
      label: 'Revenue Dash',
      icon: 'trending-up',
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: 'star',
      count: reviewsCount,
    },
    {
      id: 'wallets',
      label: 'Customer Wallets',
      icon: 'wallet',
    },
    {
      id: 'referrals',
      label: 'Referral Programme',
      icon: 'gift',
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
          const isSelected = activeTab === tab.id || (activeTab === 'users' && tab.id === 'customers');
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
              <View style={{ marginRight: 6 }}>
                <Icon
                  name={tab.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : hasAlert ? '#991B1B' : colors.textPrimary}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isSelected ? '#FFFFFF' : hasAlert ? '#991B1B' : colors.textPrimary,
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
                  <Text style={[styles.alertBadgeText, { color: '#FFFFFF' }]}>
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
