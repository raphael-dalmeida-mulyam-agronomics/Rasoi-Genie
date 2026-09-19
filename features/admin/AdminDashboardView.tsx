import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import {
  Order,
  OrderStatus,
  subscribeToOrders,
  updateOrderStatus,
  issueRefund,
  generateInvoiceText,
  MOCK_ORDER_IDS,
  isOrderApproved,
} from '../../framework/firebase/ordersService';
import { validateAdminEmail } from '../../framework/firebase/authService';
import {
  getMealKits,
  MealKit,
  addMealKit,
  updateMealKit,
  deleteMealKit,
  updateMealKitStock,
  RegionHub,
  DietTag,
} from '../../framework/services/mealKitsService';
import {
  INDIAN_STATES_ANALYTICS,
  MONTHLY_TRENDS,
  getCrossTabAnalytics,
  generateRegionalCSV,
} from '../../framework/services/regionalAnalyticsService';
import {
  getCoupons,
  addCoupon,
  toggleCouponActive,
  deleteCoupon,
  Coupon,
} from '../../framework/services/couponsService';
import {
  getAllReviewsForModeration,
  moderateReview,
  ExtendedReview,
} from '../../framework/services/reviewsService';
import {
  getManagedUsers,
  toggleUserStatus,
  toggleUserAdminRole,
  ManagedUser,
} from '../../framework/services/userManagementService';
import { Card } from '../../framework/ui/Card';
import { Badge, BadgeVariant, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AddMealKitWizardModal } from './AddMealKitWizardModal';
import {
  fetchAllOrdersFromSupabase,
  approveOrderInSupabase,
  subscribeToOrdersRealtime,
  refreshPendingApprovalCount,
  updateOrderStatusInSupabase,
  clearAllOrdersFromSupabase,
} from '../../framework/services/supabaseOrdersService';
import { saveMealKitToSupabase } from '../../framework/services/supabaseMealKitsService';
import { seedSupabaseDatabase } from '../../framework/services/supabaseSeedService';
import {
  subscribeToPendingApprovalCount,
  playOrderAlertSound,
} from '../../framework/services/notificationService';
import { AdminNavigationMenu, AdminTab } from './AdminNavigationMenu';

const STATUS_FILTERS: (OrderStatus | 'All')[] = [
  'All',
  'Pending',
  'Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded',
];

export const AdminDashboardView: React.FC<{ onNavigateToLogin?: () => void }> = ({
  onNavigateToLogin,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const { colors, radii, shadows } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState(
    'Customer reported issue with fresh ingredients',
  );

  // Cancel Order Modal State
  const [cancelOrderModalVisible, setCancelOrderModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by Admin');

  // Order Details Inspection Modal State
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [inspectModalVisible, setInspectModalVisible] = useState(false);

  // Meal Kits Management State
  const [kits, setKits] = useState<MealKit[]>(getMealKits());
  const [kitModalVisible, setKitModalVisible] = useState(false);
  const [editingKit, setEditingKit] = useState<MealKit | null>(null);

  // Regional Analytics State
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [crossTabDiet, setCrossTabDiet] = useState<'all' | DietTag>('all');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>(getCoupons());
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('100');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState('499');

  // Users State
  const [users, setUsers] = useState<ManagedUser[]>(getManagedUsers());

  // Reviews State
  const [moderationReviews, setModerationReviews] = useState<ExtendedReview[]>(
    getAllReviewsForModeration(),
  );

  // Strict domain check check
  const isMulyamAdmin =
    user && user.role === 'admin' && user.email && validateAdminEmail(user.email);

  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [isSeedingSupabase, setIsSeedingSupabase] = useState<boolean>(false);

  const reloadSupabaseOrders = async () => {
    try {
      const sbOrders = await fetchAllOrdersFromSupabase();
      if (sbOrders) {
        setOrders(sbOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
      }
    } catch (err) {
      console.warn('[AdminDashboard] Error loading Supabase orders:', err);
    }
  };

  useEffect(() => {
    if (!isMulyamAdmin) return;

    reloadSupabaseOrders();
    refreshPendingApprovalCount();

    const unsubscribeRealtime = subscribeToOrdersRealtime(() => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
    });

    const unsubscribeCount = subscribeToPendingApprovalCount((cnt) => {
      setPendingApprovalCount(cnt);
    });

    const unsubscribeFb = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
    });

    const handleStorageChange = () => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', handleStorageChange);
    }

    const interval = setInterval(() => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
    }, 2500);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', handleStorageChange);
      }
      unsubscribeRealtime();
      unsubscribeCount();
      unsubscribeFb();
    };
  }, [isMulyamAdmin]);

  const handleApproveOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'Confirmed', isApproved: true } : o,
      ),
    );
    try {
      await approveOrderInSupabase(orderId, user?.displayName || user?.email || 'Admin');
      await updateOrderStatus(orderId, 'Confirmed');
      await reloadSupabaseOrders();
      await refreshPendingApprovalCount();
      Alert.alert(
        'Order Approved! ✅',
        `Order ${orderId} has been confirmed. Chef packing team has been notified.`,
      );
    } catch (err: any) {
      Alert.alert('Approval Error', err?.message || 'Could not approve order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelReason('Cancelled by Admin');
    setCancelOrderModalVisible(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const targetId = orderToCancel;
    setUpdatingOrderId(targetId);
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === targetId
          ? {
              ...o,
              status: 'Cancelled',
              isApproved: false,
              cancellationReason: cancelReason,
              adminNotes: cancelReason,
            }
          : o,
      ),
    );
    try {
      await updateOrderStatusInSupabase(targetId, 'Cancelled', cancelReason);
      await updateOrderStatus(targetId, 'Cancelled', cancelReason);
      await reloadSupabaseOrders();
      await refreshPendingApprovalCount();
      setCancelOrderModalVisible(false);
      setOrderToCancel(null);
      if (Platform.OS === 'web') {
        window.alert(`Order ${targetId} has been successfully cancelled.`);
      } else {
        Alert.alert('Order Cancelled 🚫', `Order ${targetId} has been successfully cancelled.`);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err?.message || 'Could not cancel order.');
      } else {
        Alert.alert('Error', err?.message || 'Could not cancel order.');
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSeedSupabase = async () => {
    setIsSeedingSupabase(true);
    try {
      const result = await seedSupabaseDatabase(true);
      if (result.success) {
        Alert.alert('Supabase Synced! ☁️', result.message);
        await reloadSupabaseOrders();
      } else {
        Alert.alert('Sync Incomplete', result.error || result.message);
      }
    } finally {
      setIsSeedingSupabase(false);
    }
  };

  const [isClearingOrders, setIsClearingOrders] = useState(false);

  const handleClearAllOrders = async () => {
    const confirmMessage =
      'Are you sure you want to delete ALL customer orders? This will permanently wipe orders from the system, admin dashboard, and user accounts.';
    let confirmed = false;
    if (Platform.OS === 'web') {
      confirmed = window.confirm(confirmMessage);
    } else {
      confirmed = true;
    }
    if (!confirmed) return;

    setIsClearingOrders(true);
    try {
      await clearAllOrdersFromSupabase();
      setOrders([]);
      setPendingApprovalCount(0);
      if (Platform.OS === 'web') {
        window.alert('All orders have been successfully deleted.');
      } else {
        Alert.alert('Orders Deleted', 'All customer orders have been deleted.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not delete orders.');
    } finally {
      setIsClearingOrders(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'Cancelled') {
      handleCancelOrder(orderId);
      return;
    }
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatusInSupabase(orderId, newStatus);
      await updateOrderStatus(orderId, newStatus);
      await reloadSupabaseOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleOpenRefund = (order: Order) => {
    setRefundOrder(order);
    setRefundAmount(order.totalAmount.toString());
    setRefundModalVisible(true);
  };

  const handleExecuteRefund = async () => {
    if (!refundOrder) return;
    const amt = parseFloat(refundAmount) || refundOrder.totalAmount;
    await issueRefund(refundOrder.id, amt, refundReason);
    setRefundModalVisible(false);
    Alert.alert('Refund Issued 💳', `₹${amt} refunded for Order ${refundOrder.id}.`);
  };

  const handleStockAdjust = (kitId: string, region: RegionHub, delta: number) => {
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;
    const current = kit.stockByRegion[region] || 0;
    const next = Math.max(0, current + delta);
    updateMealKitStock(kitId, region, next);
    setKits(getMealKits());
  };

  const handleExportCSV = () => {
    const csv = generateRegionalCSV(selectedState);
    Alert.alert(
      'Regional Analytics Exported 📊',
      `CSV Report Generated:\n\n${csv.substring(0, 300)}...`,
    );
  };

  const getBadgeVariant = (status: OrderStatus): BadgeVariant => {
    switch (status) {
      case 'Pending':
      case 'Placed':
        return 'warning';
      case 'Preparing':
      case 'Confirmed':
      case 'Out for Delivery':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
      case 'Refunded':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // If user is not logged in as @mulyam.in admin
  if (!isMulyamAdmin) {
    return (
      <View style={[styles.accessDeniedContainer, { backgroundColor: colors.bgPrimary }]}>
        <Card style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={[styles.accessDeniedTitle, { color: colors.textPrimary }]}>
            Admin Access Restricted
          </Text>
          <Text style={[styles.accessDeniedText, { color: colors.textSecondary }]}>
            This control center is strictly reserved for authorized company personnel with a valid{' '}
            <Text style={{ fontWeight: '800', color: colors.primary }}>@mulyam.in</Text> email
            address.
          </Text>
          <Button
            title="Sign in with @mulyam.in Email"
            onPress={onNavigateToLogin}
            style={{ width: '100%', marginTop: 14 }}
          />
        </Card>
      </View>
    );
  }

  const filteredOrders = useMemo(() => {
    const cleanOrders = orders
      .filter((o) => !MOCK_ORDER_IDS.has(o.id) && o.id.startsWith('ORD-'))
      .map((o) => {
        if ((isOrderApproved(o.id) || o.isApproved) && o.status === 'Placed') {
          return { ...o, isApproved: true, status: 'Confirmed' as OrderStatus };
        }
        return o;
      });

    // Deduplicate by ID and transactionId
    const seenIds = new Set<string>();
    const seenTxns = new Set<string>();
    const deduped: Order[] = [];
    for (const ord of cleanOrders) {
      if (seenIds.has(ord.id)) continue;
      if (ord.transactionId && seenTxns.has(ord.transactionId)) continue;
      seenIds.add(ord.id);
      if (ord.transactionId) seenTxns.add(ord.transactionId);
      deduped.push(ord);
    }

    if (selectedStatusFilter === 'All') return deduped;
    return deduped.filter((o) => o.status === selectedStatusFilter);
  }, [orders, selectedStatusFilter]);

  const crossTabResult = useMemo(() => {
    return getCrossTabAnalytics({
      stateName: selectedState,
      dietType: crossTabDiet,
      cuisine: 'all',
    });
  }, [selectedState, crossTabDiet]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Admin Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              RasoiGenie Admin
            </Text>
            <Badge label="SECURE • @mulyam.in" variant="primary" size="sm" />
          </View>
          <Text style={[styles.adminUserEmail, { color: colors.textSecondary }]}>
            Logged in as {user?.email}
          </Text>
        </View>
        <Button title="Logout" variant="outline" size="sm" onPress={logout} />
      </View>

      {/* Admin Module Navigation Menu Component */}
      <AdminNavigationMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ordersCount={orders.length}
        pendingApprovalCount={pendingApprovalCount}
        kitsCount={kits.length}
        usersCount={users.length}
        couponsCount={coupons.length}
        reviewsCount={moderationReviews.length}
      />

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* MODULE 0: CONTROL CENTER OVERVIEW / HOME */}
        {activeTab === 'overview' && (
          <View>
            {/* Realtime Pending Approval Alert Banner */}
            {pendingApprovalCount > 0 && (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#F87171',
                  borderWidth: 1.5,
                  borderRadius: radii.lg,
                  padding: 16,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...shadows.card,
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#991B1B',
                      marginBottom: 2,
                    }}
                  >
                    🚨 {pendingApprovalCount} New Order(s) Awaiting Approval!
                  </Text>
                  <Text style={{ fontSize: 12, color: '#B91C1C' }}>
                    Customer orders are currently in 'Placed' status. Click to approve and confirm.
                  </Text>
                </View>
                <Button
                  title="Review Orders ➔"
                  size="sm"
                  onPress={() => setActiveTab('orders')}
                  style={{ backgroundColor: '#DC2626' }}
                />
              </View>
            )}

            {/* Quick Metrics KPI Cards */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.metricVal,
                    { color: pendingApprovalCount > 0 ? '#DC2626' : colors.primary },
                  ]}
                >
                  {orders.length}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  {pendingApprovalCount > 0
                    ? `ORDERS (${pendingApprovalCount} PENDING)`
                    : 'TOTAL ORDERS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('kits')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>{kits.length}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>MEAL KITS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('users')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                  {users.length}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>USERS</Text>
              </TouchableOpacity>
            </View>

            {/* All Modules Hub Grid */}
            <Text
              style={[
                styles.moduleSectionTitle,
                { color: colors.textPrimary, marginTop: 14, marginBottom: 12 },
              ]}
            >
              Control Center Modules
            </Text>

            <View style={styles.modulesGrid}>
              {[
                {
                  id: 'orders' as AdminTab,
                  title: 'Orders & Live Approvals',
                  desc: 'Real-time order feed, approval workflow, status changes & customer refunds',
                  icon: '📦',
                  badge:
                    pendingApprovalCount > 0
                      ? `${pendingApprovalCount} Awaiting Approval`
                      : `${orders.length} Orders`,
                  badgeVariant:
                    pendingApprovalCount > 0
                      ? ('danger' as BadgeVariant)
                      : ('primary' as BadgeVariant),
                },
                {
                  id: 'kits' as AdminTab,
                  title: 'Meal Kits & Recipes',
                  desc: 'Publish chef-crafted recipes, modify spice levels, servings, ingredients & prices',
                  icon: '🍲',
                  badge: `${kits.length} Kits Active`,
                  badgeVariant: 'success' as BadgeVariant,
                },
                {
                  id: 'inventory' as AdminTab,
                  title: 'Regional Inventory Hub',
                  desc: 'Monitor cold-chain safety buffer stocks across South, West, North & East Hubs',
                  icon: '🏭',
                  badge: '4 Hubs',
                  badgeVariant: 'neutral' as BadgeVariant,
                },
                {
                  id: 'analytics' as AdminTab,
                  title: 'Regional Analytics 🇮🇳',
                  desc: 'State-by-state consumption trends, dietary split, and downloadable CSV exports',
                  icon: '📊',
                  badge: 'India Live',
                  badgeVariant: 'accent' as BadgeVariant,
                },
                {
                  id: 'users' as AdminTab,
                  title: 'User Management',
                  desc: 'View real customer accounts, manage staff permissions and platform roles',
                  icon: '👥',
                  badge: `${users.length} Users`,
                  badgeVariant: 'info' as BadgeVariant,
                },
                {
                  id: 'coupons' as AdminTab,
                  title: 'Promotions & Coupons',
                  desc: 'Create discount codes, flat reductions, and minimum cart value requirements',
                  icon: '🏷️',
                  badge: `${coupons.length} Coupons`,
                  badgeVariant: 'warning' as BadgeVariant,
                },
                {
                  id: 'revenue' as AdminTab,
                  title: 'Revenue & Financials',
                  desc: 'Monthly sales metrics, Average Order Value (AOV), and customer repeat rates',
                  icon: '📈',
                  badge: 'Financials',
                  badgeVariant: 'success' as BadgeVariant,
                },
                {
                  id: 'reviews' as AdminTab,
                  title: 'Review Moderation',
                  desc: 'Inspect customer meal kit reviews, verify feedback, and moderate flagged entries',
                  icon: '⭐',
                  badge: `${moderationReviews.length} Reviews`,
                  badgeVariant: 'neutral' as BadgeVariant,
                },
              ].map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                      borderRadius: radii.xl,
                      ...shadows.card,
                    },
                  ]}
                  onPress={() => setActiveTab(mod.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleCardTop}>
                    <Text style={{ fontSize: 26, marginRight: 12 }}>{mod.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moduleCardTitle, { color: colors.textPrimary }]}>
                        {mod.title}
                      </Text>
                      <Text
                        style={[styles.moduleCardDesc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {mod.desc}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.moduleCardBottom}>
                    <Badge label={mod.badge} variant={mod.badgeVariant} size="sm" />
                    <Text style={[styles.moduleCardArrow, { color: colors.primary }]}>
                      Open Module ➔
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODULE 1: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <View>
            {/* Orders Header Row with Clear All Orders Button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Customer Orders ({orders.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Live kitchen order flow & fulfillment
                </Text>
              </View>
              {orders.length > 0 && (
                <Button
                  title={isClearingOrders ? 'Clearing...' : 'Clear All Orders 🗑️'}
                  variant="outline"
                  size="sm"
                  loading={isClearingOrders}
                  style={{ borderColor: '#DC2626' }}
                  textStyle={{ color: '#DC2626', fontSize: 11 }}
                  onPress={handleClearAllOrders}
                />
              )}
            </View>

            {/* Realtime Pending Approval Alert Banner */}
            {pendingApprovalCount > 0 && (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#F87171',
                  borderWidth: 1.5,
                  borderRadius: radii.lg,
                  padding: 12,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13 }}>
                    🚨 {pendingApprovalCount} New Order(s) Awaiting Approval!
                  </Text>
                  <Text style={{ color: '#B91C1C', fontSize: 11, marginTop: 2 }}>
                    Review customer recipe orders and approve them to start kitchen prep.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#DC2626',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.sm,
                  }}
                  onPress={() => setSelectedStatusFilter('Placed')}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    View Placed
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.statusFilterRow}
            >
              {STATUS_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusFilterChip,
                    {
                      backgroundColor:
                        selectedStatusFilter === s ? colors.primary : colors.bgSurface,
                      borderColor: selectedStatusFilter === s ? colors.primary : colors.borderLight,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setSelectedStatusFilter(s)}
                >
                  <Text
                    style={{
                      color: selectedStatusFilter === s ? '#FFFFFF' : colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredOrders.length === 0 ? (
              <View
                style={[
                  styles.adminKitCard,
                  {
                    backgroundColor: colors.bgSurface,
                    padding: 32,
                    alignItems: 'center',
                    borderRadius: radii.xl,
                  },
                ]}
              >
                <Text style={{ fontSize: 36, marginBottom: 10 }}>📦</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  No Orders Found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  There are currently no orders under "{selectedStatusFilter}".
                </Text>
              </View>
            ) : (
              filteredOrders.map((order) => (
                <View
                  key={order.id}
                  style={[
                    styles.adminOrderCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      ...shadows.card,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setInspectOrder(order);
                      setInspectModalVisible(true);
                    }}
                    style={{ marginBottom: 4 }}
                  >
                    <View style={styles.orderTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.adminOrderId, { color: colors.textPrimary }]}>
                            {order.id}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                            View Details ➔
                          </Text>
                        </View>
                        <Text style={[styles.adminOrderCustomer, { color: colors.textSecondary }]}>
                          {order.customerName} ({order.customerPhone})
                        </Text>
                      </View>
                      <Badge label={order.status} variant={getBadgeVariant(order.status)} />
                    </View>

                    <Text style={[styles.adminOrderAddress, { color: colors.textSecondary }]}>
                      📍 {order.deliveryAddress}
                    </Text>
                    <Text style={[styles.adminOrderSlot, { color: colors.textMuted }]}>
                      Slot: {order.deliverySlot} • Paid: ₹{order.totalAmount} via{' '}
                      {order.paymentMethod}
                    </Text>

                    {/* Summary Preview of Ordered Dishes & Customizations */}
                    {order.items && order.items.length > 0 && (
                      <View
                        style={{
                          backgroundColor: colors.bgSubtle,
                          borderRadius: radii.md,
                          padding: 10,
                          marginTop: 8,
                          borderWidth: 1,
                          borderColor: colors.borderLight,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                          >
                            🍲 Ordered Dishes ({order.items.length}):
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                            Inspect Details 🔍
                          </Text>
                        </View>
                        {order.items.map((it, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 4,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}
                              numberOfLines={1}
                            >
                              • {it.quantity}x {it.name}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                👥 {it.servings || 2}p
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: (it.spiceLevel || '').toLowerCase().includes('spicy')
                                    ? '#DC2626'
                                    : colors.primary,
                                }}
                              >
                                🌶️ {it.spiceLevel || 'Medium'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Cancelled Order Notice */}
                  {order.status === 'Cancelled' && (
                    <View
                      style={{
                        marginVertical: 10,
                        padding: 12,
                        backgroundColor: '#FEF2F2',
                        borderRadius: radii.md,
                        borderWidth: 1.5,
                        borderColor: '#F87171',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>🚫</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                            Order Cancelled
                          </Text>
                          <Text style={{ color: '#B91C1C', fontSize: 11 }}>
                            Reason:{' '}
                            {order.cancellationReason ||
                              order.adminNotes ||
                              'Cancelled by Kitchen Management.'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Direct Action Required Approval Section */}
                  {order.status === 'Placed' && !order.isApproved && !isOrderApproved(order.id) && (
                    <View
                      style={{
                        marginVertical: 10,
                        padding: 12,
                        backgroundColor: '#FEF2F2',
                        borderRadius: radii.md,
                        borderWidth: 1.5,
                        borderColor: '#F87171',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, marginRight: 6 }}>⏳</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                            Awaiting Admin Approval
                          </Text>
                          <Text style={{ color: '#B91C1C', fontSize: 11 }}>
                            Customer placed this order. Approve to confirm and begin fresh
                            ingredient packaging.
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Button
                          title={updatingOrderId === order.id ? 'Approving...' : 'Approve Order ✅'}
                          variant="primary"
                          size="sm"
                          loading={updatingOrderId === order.id}
                          style={{ backgroundColor: '#16A34A', flex: 1 }}
                          onPress={() => handleApproveOrder(order.id)}
                        />
                        <Button
                          title="Reject / Cancel ✕"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', flex: 1 }}
                          textStyle={{ color: '#DC2626' }}
                          onPress={() => handleCancelOrder(order.id)}
                        />
                      </View>
                    </View>
                  )}

                  {/* Status transition buttons (only for active orders) */}
                  {order.status !== 'Cancelled' &&
                    order.status !== 'Delivered' &&
                    order.status !== 'Refunded' && (
                      <View style={styles.orderActionsRow}>
                        <Text style={[styles.actionLabel, { color: colors.textMuted }]}>
                          Update Status:
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={{ marginVertical: 6 }}
                        >
                          {(
                            [
                              'Placed',
                              'Confirmed',
                              'Preparing',
                              'Out for Delivery',
                              'Delivered',
                              'Cancelled',
                            ] as OrderStatus[]
                          ).map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={[
                                styles.statusBtn,
                                {
                                  backgroundColor:
                                    order.status === st ? colors.primary : colors.bgSubtle,
                                  borderColor: colors.borderLight,
                                  borderRadius: radii.sm,
                                },
                              ]}
                              onPress={() => handleStatusChange(order.id, st)}
                            >
                              <Text
                                style={{
                                  color: order.status === st ? '#FFFFFF' : colors.textPrimary,
                                  fontSize: 11,
                                  fontWeight: '700',
                                }}
                              >
                                {st}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                  <View style={styles.orderBottomBar}>
                    <Button
                      title={`Inspect Items (${order.items?.length || 0}) 🔍`}
                      variant="outline"
                      size="sm"
                      style={{ borderColor: colors.primary, marginRight: 8 }}
                      textStyle={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}
                      onPress={() => {
                        setInspectOrder(order);
                        setInspectModalVisible(true);
                      }}
                    />

                    <TouchableOpacity
                      onPress={() => Alert.alert('Invoice', generateInvoiceText(order))}
                      style={styles.actionLink}
                    >
                      <Text style={[styles.actionLinkText, { color: colors.primary }]}>
                        View Invoice
                      </Text>
                    </TouchableOpacity>

                    {order.status !== 'Cancelled' &&
                      order.status !== 'Delivered' &&
                      order.status !== 'Refunded' && (
                        <Button
                          title="Cancel Order 🚫"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', marginRight: 8 }}
                          textStyle={{ color: '#DC2626', fontSize: 11 }}
                          onPress={() => handleCancelOrder(order.id)}
                        />
                      )}

                    {order.status !== 'Refunded' && (
                      <Button
                        title="Issue Refund 💳"
                        variant="outline"
                        size="sm"
                        textStyle={{ fontSize: 11 }}
                        onPress={() => handleOpenRefund(order)}
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* MODULE 2: MEAL KITS CATALOG MANAGEMENT */}
        {activeTab === 'kits' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Meal Prep Kits ({kits.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Manage recipes, ingredients, sachets & prices
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Button
                  title={isSeedingSupabase ? 'Syncing...' : 'Seed to Supabase ☁️'}
                  variant="outline"
                  size="sm"
                  loading={isSeedingSupabase}
                  onPress={handleSeedSupabase}
                />
                <Button
                  title="+ Add Meal Kit"
                  size="sm"
                  onPress={() => {
                    setEditingKit(null);
                    setKitModalVisible(true);
                  }}
                />
              </View>
            </View>

            {kits.map((kit) => (
              <View
                key={kit.id}
                style={[
                  styles.adminKitCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={styles.kitCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.kitCardName, { color: colors.textPrimary }]}>
                      {kit.name}
                    </Text>
                    <Text style={[styles.kitCardTag, { color: colors.textSecondary }]}>
                      {kit.tagline}
                    </Text>
                    <Text style={[styles.kitCardMeta, { color: colors.textMuted }]}>
                      {kit.cuisine} • {kit.diet.toUpperCase()} • {kit.spiceLevel} • ₹{kit.price}
                    </Text>
                  </View>
                  {(() => {
                    const badge = getDietBadgeInfo(kit.diet);
                    return <Badge label={badge.label} variant={badge.variant} />;
                  })()}
                </View>

                <View style={styles.kitActionsRow}>
                  <Button
                    title="Edit Recipe & Price"
                    variant="outline"
                    size="sm"
                    style={{ marginRight: 8 }}
                    onPress={() => {
                      setEditingKit(kit);
                      setKitModalVisible(true);
                    }}
                  />
                  <Button
                    title="Archive / Delete"
                    variant="danger"
                    size="sm"
                    onPress={() => {
                      deleteMealKit(kit.id);
                      setKits(getMealKits());
                      Alert.alert('Kit Archived', `${kit.name} removed from catalog.`);
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MODULE 3: INVENTORY & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Regional Hub Inventory
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Stock levels per fulfillment center (Low-stock warning &lt; 20)
                </Text>
              </View>
            </View>

            {kits.map((kit) => (
              <View
                key={kit.id}
                style={[
                  styles.stockCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
              >
                <Text style={[styles.stockKitName, { color: colors.textPrimary }]}>{kit.name}</Text>

                <View style={styles.hubsStockGrid}>
                  {(['North', 'South', 'West', 'East'] as RegionHub[]).map((hub) => {
                    const count = kit.stockByRegion[hub] || 0;
                    const isLow = count < 20;

                    return (
                      <View
                        key={hub}
                        style={[
                          styles.hubStockItem,
                          { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                        ]}
                      >
                        <Text style={[styles.hubLabel, { color: colors.textMuted }]}>
                          {hub} Hub
                        </Text>
                        <Text
                          style={[
                            styles.hubCount,
                            { color: isLow ? colors.danger : colors.textPrimary },
                          ]}
                        >
                          {count} kits
                        </Text>
                        {isLow && <Badge label="LOW STOCK" variant="danger" size="sm" />}

                        <View style={styles.stockAdjButtons}>
                          <TouchableOpacity
                            onPress={() => handleStockAdjust(kit.id, hub, -5)}
                            style={styles.stockAdjBtn}
                          >
                            <Text style={styles.stockAdjBtnText}>-5</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStockAdjust(kit.id, hub, +10)}
                            style={styles.stockAdjBtn}
                          >
                            <Text style={styles.stockAdjBtnText}>+10</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MODULE 4: REGIONAL ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  India Regional Analytics 🇮🇳
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  State & city performance, dietary cross-tabs & export
                </Text>
              </View>
              <Button title="Export CSV 📄" size="sm" onPress={handleExportCSV} />
            </View>

            {/* Indian State Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {INDIAN_STATES_ANALYTICS.map((st) => (
                <TouchableOpacity
                  key={st.stateCode}
                  style={[
                    styles.statePill,
                    {
                      backgroundColor:
                        selectedState === st.stateName ? colors.primary : colors.bgSurface,
                      borderColor:
                        selectedState === st.stateName ? colors.primary : colors.borderLight,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setSelectedState(st.stateName)}
                >
                  <Text
                    style={{
                      color: selectedState === st.stateName ? '#fff' : colors.textPrimary,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {st.stateName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* State Deep-Dive Card */}
            {(() => {
              const stateData =
                INDIAN_STATES_ANALYTICS.find((s) => s.stateName === selectedState) ||
                INDIAN_STATES_ANALYTICS[0]!;
              if (!stateData) return null;
              return (
                <View
                  style={[
                    styles.stateDetailCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.stateDetailTop}>
                    <View>
                      <Text style={[styles.stateName, { color: colors.textPrimary }]}>
                        {stateData.stateName} ({stateData.capitalCity})
                      </Text>
                      <Text style={[styles.stateHub, { color: colors.textSecondary }]}>
                        Fulfillment: {stateData.hubName}
                      </Text>
                    </View>
                    <Badge label={`+${stateData.growthRate}% MoM`} variant="success" />
                  </View>

                  <View style={styles.metricsGrid}>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.primary }]}>
                        {stateData.totalOrders}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        TOTAL ORDERS
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                        ₹{(stateData.totalRevenue / 100000).toFixed(1)}L
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>REVENUE</Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.veg }]}>
                        {stateData.vegOrderPercentage}%
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        VEG SHARE
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.topSellingCallout,
                      { color: colors.primaryDark, backgroundColor: colors.primaryLight },
                    ]}
                  >
                    🏆 Top Selling: {stateData.topMealKitName}
                  </Text>
                </View>
              );
            })()}

            {/* Cross-Tab View: E.g., Top Meals among Vegetarians in Maharashtra */}
            <View
              style={[
                styles.crossTabCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[styles.crossTabTitle, { color: colors.textPrimary }]}>
                Cross-Tab: Top Meals Among {crossTabDiet.toUpperCase()} in {selectedState}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {(
                  [
                    { id: 'all', label: 'ALL DIETS' },
                    { id: 'veg', label: 'VEG' },
                    { id: 'nonveg', label: 'NON-VEG' },
                    { id: 'vegan', label: 'VEGAN' },
                    { id: 'keto', label: 'KETO' },
                    { id: 'jain', label: 'JAIN' },
                    { id: 'gluten-free', label: 'GLUTEN-FREE' },
                  ] as { id: 'all' | DietTag; label: string }[]
                ).map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.crossTabBtn,
                      {
                        backgroundColor: crossTabDiet === d.id ? colors.primary : colors.bgSubtle,
                        borderRadius: radii.pill,
                        paddingHorizontal: 12,
                      },
                    ]}
                    onPress={() => setCrossTabDiet(d.id)}
                  >
                    <Text
                      style={{
                        color: crossTabDiet === d.id ? '#fff' : colors.textPrimary,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {crossTabResult.topItems.slice(0, 4).map((item, idx) => (
                <View
                  key={item.mealKitId}
                  style={[styles.crossTabItem, { borderBottomColor: colors.borderLight }]}
                >
                  <Text style={[styles.crossTabRank, { color: colors.primary }]}>#{idx + 1}</Text>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={[styles.crossTabName, { color: colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.crossTabCuisine, { color: colors.textMuted }]}>
                      {item.cuisine} • ₹{item.price}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.crossTabUnits, { color: colors.textPrimary }]}>
                      {item.unitsSold} boxes
                    </Text>
                    <Text style={[styles.crossTabShare, { color: colors.primary }]}>
                      {item.shareInRegion}% share
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MODULE 5: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  User Directory ({users.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Manage roles, activity, and ban/suspend permissions
                </Text>
              </View>
            </View>

            {users.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.xl,
                  },
                ]}
              >
                <Text style={styles.emptyStateIcon}>👥</Text>
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No Users Registered
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                  Mock users have been removed. Real registered customer accounts will appear here
                  once authenticated.
                </Text>
              </View>
            ) : (
              users.map((u) => (
                <View
                  key={u.id}
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.userTopRow}>
                    <View>
                      <Text style={[styles.userNameText, { color: colors.textPrimary }]}>
                        {u.name}
                      </Text>
                      <Text style={[styles.userEmailText, { color: colors.textSecondary }]}>
                        {u.email}
                      </Text>
                    </View>
                    <Badge
                      label={u.role.toUpperCase()}
                      variant={u.role === 'admin' ? 'info' : 'neutral'}
                    />
                  </View>

                  <Text style={[styles.userStats, { color: colors.textMuted }]}>
                    City: {u.city} • Orders: {u.ordersCount} • Total Spend: ₹{u.totalSpend} •
                    Joined: {u.joinedDate}
                  </Text>

                  <View style={styles.userActionRow}>
                    <Button
                      title={
                        u.role === 'admin' ? 'Demote to Customer' : 'Promote to Admin (@mulyam.in)'
                      }
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        toggleUserAdminRole(u.id);
                        setUsers(getManagedUsers());
                      }}
                      style={{ marginRight: 8 }}
                    />
                    <Button
                      title={u.status === 'suspended' ? 'Activate' : 'Suspend'}
                      variant={u.status === 'suspended' ? 'primary' : 'danger'}
                      size="sm"
                      onPress={() => {
                        toggleUserStatus(u.id);
                        setUsers(getManagedUsers());
                      }}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* MODULE 6: COUPONS & DISCOUNTS */}
        {activeTab === 'coupons' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Promotions & Coupons
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Create, toggle, and manage campaign discount codes
                </Text>
              </View>
              <Button title="+ Add Coupon" size="sm" onPress={() => setCouponModalVisible(true)} />
            </View>

            {coupons.map((c) => (
              <View
                key={c.code}
                style={[
                  styles.couponCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={styles.couponTop}>
                  <Text style={[styles.couponCodeHeading, { color: colors.primary }]}>
                    {c.code}
                  </Text>
                  <Badge
                    label={c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    variant={c.isActive ? 'success' : 'neutral'}
                  />
                </View>

                <Text style={[styles.couponDesc, { color: colors.textSecondary }]}>
                  {c.description}
                </Text>
                <Text style={[styles.couponTerms, { color: colors.textMuted }]}>
                  Min Order: ₹{c.minOrderValue} • Expiry: {c.expiryDate}
                </Text>

                <View style={styles.couponActionRow}>
                  <Button
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      toggleCouponActive(c.code);
                      setCoupons(getCoupons());
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <Button
                    title="Delete"
                    variant="danger"
                    size="sm"
                    onPress={() => {
                      deleteCoupon(c.code);
                      setCoupons(getCoupons());
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MODULE 7: REVENUE DASHBOARD */}
        {activeTab === 'revenue' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Revenue & Sales Dashboard
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Financial metrics, Average Order Value (AOV) & trends
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.primary }]}>₹17.9L</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  THIS MONTH SALES
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>₹614</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  AVERAGE ORDER (AOV)
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.success }]}>68%</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>REPEAT RATE</Text>
              </View>
            </View>

            {/* Monthly Trend Bars */}
            <View
              style={[
                styles.trendCard,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
              ]}
            >
              <Text style={[styles.trendCardTitle, { color: colors.textPrimary }]}>
                Sales Growth Over Past 6 Months
              </Text>
              {MONTHLY_TRENDS.map((t) => (
                <View key={t.month} style={styles.trendRow}>
                  <Text style={[styles.trendMonth, { color: colors.textPrimary }]}>{t.month}</Text>
                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${(t.revenue / 2000000) * 100}%`,
                          borderRadius: radii.pill,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.trendRevenue, { color: colors.primary }]}>
                    ₹{(t.revenue / 100000).toFixed(1)}L
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MODULE 8: REVIEW MODERATION */}
        {activeTab === 'reviews' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Customer Review Moderation
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Inspect flagged/reported reviews, approve, or hide
                </Text>
              </View>
            </View>

            {moderationReviews.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.xl,
                  },
                ]}
              >
                <Text style={styles.emptyStateIcon}>⭐</Text>
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No Reviews to Moderate
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                  Mock reviews have been removed. Verified customer feedback will appear here as
                  orders are delivered and reviewed.
                </Text>
              </View>
            ) : (
              moderationReviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[
                    styles.reviewModCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: rev.status === 'flagged' ? colors.warning : colors.borderLight,
                      borderWidth: rev.status === 'flagged' ? 2 : 1,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.reviewModTop}>
                    <View>
                      <Text style={[styles.reviewKitName, { color: colors.textPrimary }]}>
                        {rev.mealKitName}
                      </Text>
                      <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]}>
                        {rev.userName} ({rev.userCity}) • Rating: {rev.rating}★
                      </Text>
                    </View>
                    <Badge
                      label={rev.status.toUpperCase()}
                      variant={
                        rev.status === 'approved'
                          ? 'success'
                          : rev.status === 'flagged'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </View>

                  <Text style={[styles.reviewCommentText, { color: colors.textPrimary }]}>
                    "{rev.comment}"
                  </Text>

                  {rev.reportReason && (
                    <Text style={[styles.flaggedReason, { color: colors.danger }]}>
                      Flag reason: {rev.reportReason}
                    </Text>
                  )}

                  <View style={styles.reviewActionRow}>
                    <Button
                      title="Approve Review"
                      variant="outline"
                      size="sm"
                      style={{ marginRight: 8 }}
                      onPress={() => {
                        moderateReview(rev.id, 'approved');
                        setModerationReviews(getAllReviewsForModeration());
                      }}
                    />
                    <Button
                      title="Hide Review"
                      variant="danger"
                      size="sm"
                      onPress={() => {
                        moderateReview(rev.id, 'hidden');
                        setModerationReviews(getAllReviewsForModeration());
                      }}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* REFUND MODAL */}
      <Modal visible={refundModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>
              Issue Order Refund
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Order {refundOrder?.id} • Original Total: ₹{refundOrder?.totalAmount}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Refund Amount (₹)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={refundAmount}
              onChangeText={setRefundAmount}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Reason for Refund
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setRefundModalVisible(false)}
              />
              <Button
                title="Confirm Refund"
                variant="danger"
                style={{ flex: 1 }}
                onPress={handleExecuteRefund}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      <Modal
        visible={cancelOrderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCancelOrderModalVisible(false);
          setOrderToCancel(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: '#DC2626' }]}>Cancel Order 🚫</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {orderToCancel ? `Order ID: ${orderToCancel}` : ''}
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 18,
                marginTop: 8,
                marginBottom: 14,
              }}
            >
              Are you sure you want to cancel this order? This will mark the order as Cancelled and
              remove it from active kitchen prep.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Cancellation Reason
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason (e.g. Cancelled by Admin, Out of Stock)"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button
                title="Keep Order"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setCancelOrderModalVisible(false);
                  setOrderToCancel(null);
                }}
              />
              <Button
                title={updatingOrderId ? 'Cancelling...' : 'Yes, Cancel Order'}
                variant="danger"
                style={{ flex: 1, backgroundColor: '#DC2626' }}
                loading={updatingOrderId !== null}
                onPress={handleConfirmCancelOrder}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ORDER ITEMS & CUSTOMIZATION DETAILS INSPECTOR MODAL */}
      <Modal
        visible={inspectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInspectModalVisible(false);
          setInspectOrder(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.orderDetailModalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={[styles.modalHeading, { color: colors.textPrimary, marginBottom: 0 }]}
                  >
                    Order {inspectOrder?.id}
                  </Text>
                  {inspectOrder && (
                    <Badge
                      label={inspectOrder.status}
                      variant={getBadgeVariant(inspectOrder.status)}
                      size="sm"
                    />
                  )}
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Placed:{' '}
                  {inspectOrder?.createdAt
                    ? new Date(inspectOrder.createdAt).toLocaleString()
                    : 'Recent'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setInspectModalVisible(false);
                  setInspectOrder(null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bgSubtle,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '700' }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={true}>
              {inspectOrder && (
                <View>
                  {/* Customer & Delivery Section */}
                  <View
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                      padding: 12,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        marginBottom: 8,
                      }}
                    >
                      👤 Customer & Delivery Details
                    </Text>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Customer:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.customerName}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Phone:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.customerPhone}
                        </Text>
                        {inspectOrder.customerEmail ? (
                          <Text style={{ fontWeight: '400', color: colors.textMuted }}>
                            {' '}
                            • {inspectOrder.customerEmail}
                          </Text>
                        ) : null}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Delivery Address:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          📍 {inspectOrder.deliveryAddress}{' '}
                          {inspectOrder.addressTag ? `[${inspectOrder.addressTag}]` : ''}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Slot:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          🕒 {inspectOrder.deliveryDate || 'Today'} • {inspectOrder.deliverySlot}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Payment:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          💳 {inspectOrder.paymentMethod} • Status:{' '}
                          {inspectOrder.paymentStatus || 'Paid'} (Txn:{' '}
                          {inspectOrder.transactionId || inspectOrder.id})
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* Dishes & Meal Kits Section */}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: colors.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    🍲 Dishes & Customizations ({inspectOrder.items?.length || 0})
                  </Text>

                  {!inspectOrder.items || inspectOrder.items.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        fontStyle: 'italic',
                        marginBottom: 12,
                      }}
                    >
                      No items recorded for this order.
                    </Text>
                  ) : (
                    inspectOrder.items.map((item, index) => (
                      <View
                        key={item.id || index}
                        style={{
                          backgroundColor: colors.bgSurface,
                          borderRadius: radii.lg,
                          padding: 14,
                          marginBottom: 10,
                          borderWidth: 1.5,
                          borderColor: colors.borderLight,
                          ...shadows.card,
                        }}
                      >
                        {/* Item Name & Quantity & Price */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}
                            >
                              {item.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                              ₹{item.price} each × {item.quantity} kit{item.quantity > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>
                            ₹{item.price * item.quantity}
                          </Text>
                        </View>

                        {/* Customization Details Grid */}
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: colors.borderLight,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          {/* Serving Size Badge */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.bgSubtle,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: colors.borderLight,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                            >
                              👥 Serving Size:
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.primary,
                                marginLeft: 4,
                              }}
                            >
                              {item.servings || 2} Persons
                            </Text>
                          </View>

                          {/* Spice Level Badge */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: (item.spiceLevel || '')
                                .toLowerCase()
                                .includes('mild')
                                ? '#ECFDF5'
                                : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                  ? '#FEF2F2'
                                  : '#FFFBEB',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: (item.spiceLevel || '').toLowerCase().includes('mild')
                                ? '#A7F3D0'
                                : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                  ? '#FCA5A5'
                                  : '#FDE68A',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: (item.spiceLevel || '').toLowerCase().includes('mild')
                                  ? '#065F46'
                                  : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                    ? '#991B1B'
                                    : '#92400E',
                              }}
                            >
                              🌶️ Spice Level: {item.spiceLevel || 'Medium'}
                            </Text>
                          </View>
                        </View>

                        {/* Masala Sachets Included */}
                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: colors.textMuted,
                              textTransform: 'uppercase',
                              marginBottom: 4,
                            }}
                          >
                            🧂 Masala Sachets & Prep Packs:
                          </Text>
                          {item.masalaSachets && item.masalaSachets.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {item.masalaSachets.map((sachet, sIdx) => (
                                <View
                                  key={sIdx}
                                  style={{
                                    backgroundColor: colors.bgSubtle,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: radii.sm,
                                    borderWidth: 1,
                                    borderColor: colors.borderLight,
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    ✨ {sachet}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textSecondary,
                                fontStyle: 'italic',
                              }}
                            >
                              Standard Chef Spice Pack
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}

                  {/* Financial Bill Breakdown */}
                  <View
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                      padding: 12,
                      marginTop: 6,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      💰 Bill Summary
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Subtotal</Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                        ₹{inspectOrder.subtotal}
                      </Text>
                    </View>
                    {inspectOrder.discount ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#16A34A' }}>
                          Discount {inspectOrder.couponCode ? `(${inspectOrder.couponCode})` : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '700' }}>
                          -₹{inspectOrder.discount}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        Delivery Fee
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                        {inspectOrder.deliveryFee === 0 ? 'FREE' : `₹${inspectOrder.deliveryFee}`}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: colors.borderLight,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                        Total Amount
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.primary }}>
                        ₹{inspectOrder.totalAmount}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions Footer */}
            {inspectOrder && (
              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderLight,
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {inspectOrder.status === 'Placed' &&
                !inspectOrder.isApproved &&
                !isOrderApproved(inspectOrder.id) ? (
                  <>
                    <Button
                      title="Approve Order ✅"
                      variant="primary"
                      size="sm"
                      style={{ flex: 1, backgroundColor: '#16A34A' }}
                      onPress={async () => {
                        await handleApproveOrder(inspectOrder.id);
                        setInspectOrder((prev) =>
                          prev ? { ...prev, status: 'Confirmed', isApproved: true } : null,
                        );
                      }}
                    />
                    <Button
                      title="Reject / Cancel ✕"
                      variant="outline"
                      size="sm"
                      style={{ borderColor: '#DC2626', flex: 1 }}
                      textStyle={{ color: '#DC2626' }}
                      onPress={() => {
                        setInspectModalVisible(false);
                        handleCancelOrder(inspectOrder.id);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      title="View Invoice 📄"
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => Alert.alert('Invoice', generateInvoiceText(inspectOrder))}
                    />
                    {inspectOrder.status !== 'Cancelled' &&
                      inspectOrder.status !== 'Delivered' &&
                      inspectOrder.status !== 'Refunded' && (
                        <Button
                          title="Cancel Order 🚫"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', flex: 1 }}
                          textStyle={{ color: '#DC2626' }}
                          onPress={() => {
                            setInspectModalVisible(false);
                            handleCancelOrder(inspectOrder.id);
                          }}
                        />
                      )}
                    <Button
                      title="Close"
                      variant="secondary"
                      size="sm"
                      style={{ minWidth: 70 }}
                      onPress={() => {
                        setInspectModalVisible(false);
                        setInspectOrder(null);
                      }}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* CHEF FRIENDLY ADD / EDIT MEAL KIT WIZARD */}
      <AddMealKitWizardModal
        visible={kitModalVisible}
        onClose={() => {
          setKitModalVisible(false);
          setEditingKit(null);
        }}
        initialKit={editingKit}
        onSaveKit={async (savedKit) => {
          if (editingKit) {
            updateMealKit(editingKit.id, savedKit);
          } else {
            addMealKit(savedKit);
          }
          await saveMealKitToSupabase(savedKit, true);
          setKits(getMealKits());
          setKitModalVisible(false);
          setEditingKit(null);
        }}
      />

      {/* ADD COUPON MODAL */}
      <Modal visible={couponModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Create Coupon</Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Coupon Code (e.g. DIWALI100)"
              autoCapitalize="characters"
              value={newCouponCode}
              onChangeText={setNewCouponCode}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Flat Discount Amount (₹)"
              value={newCouponDiscount}
              onChangeText={setNewCouponDiscount}
              keyboardType="numeric"
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Minimum Order Value (₹)"
              value={newCouponMinOrder}
              onChangeText={setNewCouponMinOrder}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setCouponModalVisible(false)}
              />
              <Button
                title="Create Promo Code"
                style={{ flex: 1.4 }}
                onPress={() => {
                  if (!newCouponCode.trim()) return;
                  addCoupon({
                    code: newCouponCode.trim().toUpperCase(),
                    type: 'flat',
                    discountValue: parseInt(newCouponDiscount) || 100,
                    minOrderValue: parseInt(newCouponMinOrder) || 499,
                    description: `Flat ₹${newCouponDiscount} off on orders above ₹${newCouponMinOrder}`,
                    expiryDate: '2026-12-31',
                    isActive: true,
                  });
                  setCoupons(getCoupons());
                  setCouponModalVisible(false);
                  Alert.alert('Coupon Created', `${newCouponCode} is now live.`);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  adminUserEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  statusFilterRow: {
    marginBottom: 12,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  adminOrderCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  adminOrderId: {
    fontSize: 15,
    fontWeight: '800',
  },
  adminOrderCustomer: {
    fontSize: 13,
    marginTop: 2,
  },
  adminOrderAddress: {
    fontSize: 13,
    marginVertical: 4,
  },
  adminOrderSlot: {
    fontSize: 12,
    marginBottom: 10,
  },
  orderActionsRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    marginRight: 6,
  },
  orderBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  actionLink: {
    padding: 4,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '800',
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  moduleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  adminKitCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  kitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kitCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  kitCardTag: {
    fontSize: 12,
    marginTop: 2,
  },
  kitCardMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  kitActionsRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stockCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  stockKitName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  hubsStockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubStockItem: {
    width: '48%',
    padding: 10,
    alignItems: 'center',
  },
  hubLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  hubCount: {
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 4,
  },
  stockAdjButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  stockAdjBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockAdjBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  stateDetailCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  stateDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '800',
  },
  stateHub: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  topSellingCallout: {
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  crossTabCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  crossTabTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  crossTabToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  crossTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  crossTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  crossTabRank: {
    fontSize: 15,
    fontWeight: '900',
    width: 24,
  },
  crossTabName: {
    fontSize: 13,
    fontWeight: '700',
  },
  crossTabCuisine: {
    fontSize: 11,
  },
  crossTabUnits: {
    fontSize: 13,
    fontWeight: '800',
  },
  crossTabShare: {
    fontSize: 11,
    fontWeight: '700',
  },
  userCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  userTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 12,
  },
  userStats: {
    fontSize: 12,
    marginBottom: 10,
  },
  userActionRow: {
    flexDirection: 'row',
  },
  couponCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  couponTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  couponCodeHeading: {
    fontSize: 16,
    fontWeight: '900',
  },
  couponDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  couponTerms: {
    fontSize: 11,
    marginBottom: 10,
  },
  couponActionRow: {
    flexDirection: 'row',
  },
  trendCard: {
    padding: 16,
    marginTop: 14,
  },
  trendCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trendMonth: {
    width: 38,
    fontSize: 13,
    fontWeight: '700',
  },
  trendBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
  },
  trendRevenue: {
    width: 50,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  reviewModCard: {
    padding: 14,
    marginBottom: 10,
  },
  reviewModTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewKitName: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewCommentText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  flaggedReason: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewActionRow: {
    flexDirection: 'row',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
  },
  accessDeniedIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  orderDetailModalBox: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 13,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  moduleSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modulesGrid: {
    gap: 12,
  },
  moduleCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  moduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  moduleCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  moduleCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  moduleCardArrow: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
});
