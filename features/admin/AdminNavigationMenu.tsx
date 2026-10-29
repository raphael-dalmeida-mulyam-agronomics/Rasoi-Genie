import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon, AppIconName } from '../../framework/ui/Icon';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'subscriptions'
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

export interface NavSection {
  title: string;
  tabs: AdminNavTabItem[];
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
  adminEmail?: string;
  adminRoleLabel?: string;
  isSuperAdmin?: boolean;
  realtimeStatus?: 'live' | 'connecting' | 'reconnecting' | 'offline';
  onLogout?: () => void;
  onResync?: () => void;
  isResyncing?: boolean;
  isDesktop?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  style?: ViewStyle;
}

/**
 * Modern Desktop-First Admin Sidebar Navigation Component
 * Replaces old mobile horizontal pill tabs with a dedicated, professional ERP sidebar
 * tailored for PC / desktop screens with grouped operations, live status, and responsive drawer support.
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
  adminEmail = 'admin@mulyam.in',
  adminRoleLabel,
  isSuperAdmin = true,
  realtimeStatus = 'live',
  onLogout,
  onResync,
  isResyncing = false,
  isDesktop = true,
  mobileOpen = false,
  onCloseMobile,
  style,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();

  const sections: NavSection[] = [
    {
      title: 'OPERATIONS',
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          icon: 'home',
        },
        {
          id: 'orders',
          label: 'Orders & Kitchen',
          icon: 'cube',
          count: ordersCount,
          alertBadge: pendingApprovalCount > 0 ? `${pendingApprovalCount} Awaiting` : undefined,
          highlightAlert: pendingApprovalCount > 0,
        },
        {
          id: 'subscriptions',
          label: 'Subscriptions',
          icon: 'time',
        },
        {
          id: 'kits',
          label: 'Meal Kit Catalog',
          icon: 'restaurant',
          count: kitsCount,
        },
        {
          id: 'inventory',
          label: 'Inventory Hub',
          icon: 'business',
        },
      ],
    },
    {
      title: 'LOGISTICS & GROWTH',
      tabs: [
        {
          id: 'analytics',
          label: 'Regional Analytics',
          icon: 'bar-chart',
        },
        {
          id: 'revenue',
          label: 'Revenue & Finance',
          icon: 'trending-up',
        },
        {
          id: 'coupons',
          label: 'Coupons & Promos',
          icon: 'tag',
          count: couponsCount,
        },
        {
          id: 'referrals',
          label: 'Referral Programme',
          icon: 'gift',
        },
      ],
    },
    {
      title: 'COMMUNITY & ACCESS',
      tabs: [
        {
          id: 'customers',
          label: 'Customers',
          icon: 'people',
          count: customersCount ?? usersCount,
        },
        {
          id: 'admins',
          label: 'Staff Admins (RBAC)',
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
          id: 'wallets',
          label: 'Customer Wallets',
          icon: 'wallet',
        },
        {
          id: 'reviews',
          label: 'Reviews Moderation',
          icon: 'star',
          count: reviewsCount,
        },
      ],
    },
  ];

  const renderSidebarContent = () => (
    <View
      style={[
        styles.sidebarWrapper,
        {
          backgroundColor: colors.bgSurface,
          borderRightColor: colors.borderLight,
        },
      ]}
    >
      {/* Brand Header */}
      <View
        style={[
          styles.brandHeader,
          {
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.brandLogoRow}>
          <View style={[styles.brandIconBox, { backgroundColor: colors.primary }]}>
            <Icon name="restaurant" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.brandInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>RasoiGenie</Text>
              <View
                style={[
                  styles.adminTag,
                  {
                    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFF7ED',
                    borderColor: isDark ? colors.primary : '#FDBA74',
                  },
                ]}
              >
                <Text style={[styles.adminTagText, { color: colors.primary }]}>ADMIN</Text>
              </View>
            </View>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              Operations Control Center
            </Text>
          </View>
        </View>

        {!isDesktop && onCloseMobile && (
          <TouchableOpacity
            onPress={onCloseMobile}
            style={[styles.closeMobileBtn, { backgroundColor: colors.bgSubtle }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Links Scrollable List */}
      <ScrollView
        style={styles.navScrollView}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sectionIdx) => (
          <View key={section.title} style={sectionIdx > 0 ? styles.sectionGroup : undefined}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
              {section.title}
            </Text>

            <View style={styles.sectionTabs}>
              {section.tabs.map((tab) => {
                const isSelected =
                  activeTab === tab.id || (activeTab === 'users' && tab.id === 'customers');
                const hasAlert = tab.highlightAlert && !isSelected;

                return (
                  <TouchableOpacity
                    key={tab.id}
                    testID={`admin-tab-${tab.id}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.sidebarItem,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(234, 88, 12, 0.18)'
                            : colors.primaryLight
                          : 'transparent',
                        borderColor: isSelected
                          ? isDark
                            ? 'rgba(234, 88, 12, 0.35)'
                            : '#FED7AA'
                          : 'transparent',
                        borderRadius: radii.md,
                      },
                      isSelected ? shadows.soft : null,
                    ]}
                    onPress={() => onTabChange(tab.id)}
                    activeOpacity={0.7}
                  >
                    {/* Active accent strip indicator */}
                    {isSelected && (
                      <View
                        style={[
                          styles.activeIndicator,
                          {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    )}

                    {/* Icon container */}
                    <View
                      style={[
                        styles.itemIconBox,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : colors.bgSubtle,
                        },
                      ]}
                    >
                      <Icon
                        name={tab.icon}
                        size={15}
                        color={
                          isSelected ? '#FFFFFF' : hasAlert ? colors.danger : colors.textSecondary
                        }
                      />
                    </View>

                    {/* Label */}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.itemLabel,
                        {
                          color: isSelected
                            ? colors.primary
                            : hasAlert
                              ? colors.danger
                              : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>

                    {/* Badge on Right */}
                    {tab.alertBadge ? (
                      <View
                        testID={`admin-tab-${tab.id}-badge`}
                        style={[
                          styles.sidebarAlertBadge,
                          {
                            backgroundColor: '#DC2626',
                          },
                        ]}
                      >
                        <Text style={styles.sidebarAlertBadgeText}>{tab.alertBadge}</Text>
                      </View>
                    ) : tab.count !== undefined ? (
                      <View
                        testID={`admin-tab-${tab.id}-badge`}
                        style={[
                          styles.sidebarCountBadge,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(234, 88, 12, 0.3)'
                                : '#FDBA74'
                              : isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sidebarCountBadgeText,
                            {
                              color: isSelected
                                ? isDark
                                  ? '#FFAA64'
                                  : '#9A3412'
                                : colors.textSecondary,
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
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Sidebar Footer: Current Admin Account */}
      <View
        style={[
          styles.sidebarFooter,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : colors.bgSubtle,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        {/* User Card */}
        <View style={styles.adminAccountCard}>
          <View
            style={[
              styles.adminAvatar,
              {
                backgroundColor: isSuperAdmin ? '#FEF3C7' : colors.primaryLight,
                borderColor: isSuperAdmin ? '#F59E0B' : colors.primary,
              },
            ]}
          >
            <Text
              style={[styles.adminAvatarText, { color: isSuperAdmin ? '#B45309' : colors.primary }]}
            >
              {adminEmail.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.adminDetailsCol}>
            <Text numberOfLines={1} style={[styles.adminEmailText, { color: colors.textPrimary }]}>
              {adminEmail}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.adminRoleText,
                { color: isSuperAdmin ? '#D97706' : colors.textSecondary },
              ]}
            >
              {adminRoleLabel || (isSuperAdmin ? 'Super Admin' : 'Regional Admin')}
            </Text>
          </View>

          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              style={[styles.logoutIconBtn, { borderColor: colors.borderLight }]}
              accessibilityLabel="Sign out"
              accessibilityRole="button"
            >
              <Icon name="exit" size={14} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Desktop view: return sidebar inline
  if (isDesktop) {
    return <View style={[styles.desktopSidebarContainer, style]}>{renderSidebarContent()}</View>;
  }

  // Mobile view: Modal Drawer
  return (
    <Modal visible={mobileOpen} transparent animationType="fade" onRequestClose={onCloseMobile}>
      <View style={styles.mobileModalBackdrop}>
        <Pressable style={styles.mobileBackdropPressable} onPress={onCloseMobile} />
        <View style={styles.mobileDrawerContainer}>{renderSidebarContent()}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  desktopSidebarContainer: {
    width: 270,
    height: '100%',
    flexShrink: 0,
  },
  sidebarWrapper: {
    width: '100%',
    height: '100%',
    borderRightWidth: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  brandHeader: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInfo: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  adminTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  adminTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  closeMobileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navScrollView: {
    flex: 1,
  },
  navScrollContent: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sectionGroup: {
    marginTop: 18,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTabs: {
    gap: 3,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  itemIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
  },
  sidebarCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  sidebarCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sidebarAlertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  sidebarAlertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sidebarFooter: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  adminAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  adminDetailsCol: {
    flex: 1,
  },
  adminEmailText: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminRoleText: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  logoutIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileModalBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mobileBackdropPressable: {
    flex: 1,
  },
  mobileDrawerContainer: {
    width: 290,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});
