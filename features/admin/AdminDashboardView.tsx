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
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

type AdminTab =
  'orders' | 'kits' | 'inventory' | 'analytics' | 'users' | 'coupons' | 'revenue' | 'reviews';

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

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
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

  // Meal Kits Management State
  const [kits, setKits] = useState<MealKit[]>(getMealKits());
  const [kitModalVisible, setKitModalVisible] = useState(false);
  const [editingKit, setEditingKit] = useState<MealKit | null>(null);
  const [kitName, setKitName] = useState('');
  const [kitPrice, setKitPrice] = useState('');
  const [kitTagline, setKitTagline] = useState('');
  const [kitDiet, setKitDiet] = useState<'veg' | 'nonveg'>('veg');
  const [kitPrepMins, setKitPrepMins] = useState('20');
  const [kitSpice, setKitSpice] = useState<'Mild' | 'Medium' | 'Spicy' | 'Fiery'>('Medium');

  // Regional Analytics State
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [crossTabDiet, setCrossTabDiet] = useState<'all' | 'veg' | 'nonveg'>('veg');

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

  useEffect(() => {
    if (!isMulyamAdmin) return;
    const unsubscribe = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });
    return () => unsubscribe();
  }, [isMulyamAdmin]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
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

  const handleSaveKit = () => {
    if (!kitName.trim() || !kitPrice.trim()) {
      Alert.alert('Incomplete Form', 'Please provide kit name and price.');
      return;
    }

    if (editingKit) {
      updateMealKit(editingKit.id, {
        name: kitName.trim(),
        price: parseInt(kitPrice) || 299,
        tagline: kitTagline.trim(),
        diet: kitDiet,
        spiceLevel: kitSpice,
        prepTimeMinutes: parseInt(kitPrepMins) || 20,
      });
      Alert.alert('Meal Kit Updated', `${kitName} updated successfully.`);
    } else {
      const newKitId = 'kit-' + Math.floor(200 + Math.random() * 800);
      addMealKit({
        id: newKitId,
        name: kitName.trim(),
        slug: kitName.toLowerCase().replace(/\s+/g, '-'),
        tagline: kitTagline.trim() || 'Chef handcrafted gourmet pre-portioned meal kit',
        description:
          'Authentic Indian recipe prepared with farm-fresh produce and artisanal masala sachets.',
        heroImage:
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        galleryImages: [
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        ],
        price: parseInt(kitPrice) || 299,
        servings: 2,
        prepTimeMinutes: 5,
        cookTimeMinutes: parseInt(kitPrepMins) || 20,
        diet: kitDiet,
        cuisine: 'North Indian',
        spiceLevel: kitSpice,
        difficulty: 'Easy',
        dietaryTags: [kitDiet],
        availableRegions: ['North', 'South', 'West', 'East'],
        stockByRegion: { North: 50, South: 50, West: 50, East: 50 },
        rating: 5.0,
        reviewCount: 1,
        nutrition: { calories: 420, protein: 18, carbs: 32, fat: 20, fiber: 4 },
        allergens: ['Dairy'],
        ingredients: [
          { name: 'Fresh Pre-Portioned Produce', quantity: '300g' },
          { name: 'Sachet 1: Whole Khada Spices', quantity: '10g', isMasalaSachet: true },
          { name: 'Sachet 2: Chef Gravy Base', quantity: '20g', isMasalaSachet: true },
        ],
        masalaSachets: ['Whole Spices Pot', 'Signature Gravy Premix'],
        recipeSteps: [
          {
            stepNumber: 1,
            title: 'Temper Spices',
            instruction: 'Heat ghee and empty Sachet 1 until crackling.',
            timerSeconds: 60,
          },
          {
            stepNumber: 2,
            title: 'Simmer & Finish',
            instruction: 'Add ingredients, Sachet 2, and simmer.',
            timerSeconds: 600,
          },
        ],
        reviews: [],
        salesByRegion: { Maharashtra: 100, Karnataka: 120, 'Delhi NCR': 80 },
      });
      Alert.alert('Meal Kit Created! ✨', `${kitName} published to live catalog.`);
    }

    setKits(getMealKits());
    setKitModalVisible(false);
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
    if (selectedStatusFilter === 'All') return orders;
    return orders.filter((o) => o.status === selectedStatusFilter);
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

      {/* Admin Module Navigation Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.tabsBar,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
        contentContainerStyle={styles.tabsContent}
      >
        {(
          [
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'kits', label: `Meal Kits (${kits.length})` },
            { id: 'inventory', label: 'Inventory Hub' },
            { id: 'analytics', label: 'Regional Analytics 🇮🇳' },
            { id: 'users', label: `Users (${users.length})` },
            { id: 'coupons', label: `Coupons (${coupons.length})` },
            { id: 'revenue', label: 'Revenue Dash' },
            { id: 'reviews', label: `Reviews (${moderationReviews.length})` },
          ] as { id: AdminTab; label: string }[]
        ).map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textPrimary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* MODULE 1: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <View>
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

            {filteredOrders.map((order) => (
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
                <View style={styles.orderTopRow}>
                  <View>
                    <Text style={[styles.adminOrderId, { color: colors.textPrimary }]}>
                      {order.id}
                    </Text>
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
                  Slot: {order.deliverySlot} • Paid: ₹{order.totalAmount} via {order.paymentMethod}
                </Text>

                {/* Status transition buttons */}
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
                            backgroundColor: order.status === st ? colors.primary : colors.bgSubtle,
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

                <View style={styles.orderBottomBar}>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Invoice', generateInvoiceText(order))}
                    style={styles.actionLink}
                  >
                    <Text style={[styles.actionLinkText, { color: colors.primary }]}>
                      View Invoice
                    </Text>
                  </TouchableOpacity>

                  {order.status !== 'Refunded' && (
                    <Button
                      title="Issue Refund 💳"
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenRefund(order)}
                    />
                  )}
                </View>
              </View>
            ))}
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
              <Button
                title="+ Add Meal Kit"
                size="sm"
                onPress={() => {
                  setEditingKit(null);
                  setKitName('');
                  setKitPrice('299');
                  setKitTagline('');
                  setKitModalVisible(true);
                }}
              />
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
                  <Badge
                    label={kit.diet === 'veg' ? 'Veg' : 'Non-Veg'}
                    variant={kit.diet === 'veg' ? 'veg' : 'nonveg'}
                  />
                </View>

                <View style={styles.kitActionsRow}>
                  <Button
                    title="Edit Recipe & Price"
                    variant="outline"
                    size="sm"
                    style={{ marginRight: 8 }}
                    onPress={() => {
                      setEditingKit(kit);
                      setKitName(kit.name);
                      setKitPrice(kit.price.toString());
                      setKitTagline(kit.tagline);
                      setKitDiet(kit.diet === 'nonveg' ? 'nonveg' : 'veg');
                      setKitSpice(kit.spiceLevel);
                      setKitPrepMins(kit.cookTimeMinutes.toString());
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
              <View style={styles.crossTabToggleRow}>
                {(['all', 'veg', 'nonveg'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.crossTabBtn,
                      {
                        backgroundColor: crossTabDiet === d ? colors.primary : colors.bgSubtle,
                        borderRadius: radii.pill,
                      },
                    ]}
                    onPress={() => setCrossTabDiet(d)}
                  >
                    <Text
                      style={{
                        color: crossTabDiet === d ? '#fff' : colors.textPrimary,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {d.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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

            {users.map((u) => (
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
                  City: {u.city} • Orders: {u.ordersCount} • Total Spend: ₹{u.totalSpend} • Joined:{' '}
                  {u.joinedDate}
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
                    title={u.status === 'active' ? 'Suspend' : 'Activate'}
                    variant={u.status === 'active' ? 'danger' : 'secondary'}
                    size="sm"
                    onPress={() => {
                      toggleUserStatus(u.id);
                      setUsers(getManagedUsers());
                    }}
                  />
                </View>
              </View>
            ))}
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

            {moderationReviews.map((rev) => (
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
            ))}
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

      {/* ADD/EDIT MEAL KIT MODAL */}
      <Modal visible={kitModalVisible} transparent animationType="fade">
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
              {editingKit ? 'Edit Meal Kit' : 'Add New Meal Kit'}
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
              placeholder="Kit Name (e.g. Kashmiri Rogan Josh Kit)"
              value={kitName}
              onChangeText={setKitName}
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
              placeholder="Tagline (e.g. Slow cooked lamb with fennel sachet)"
              value={kitTagline}
              onChangeText={setKitTagline}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    flex: 1,
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                placeholder="Price (₹)"
                value={kitPrice}
                onChangeText={setKitPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    flex: 1,
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                placeholder="Prep Time (mins)"
                value={kitPrepMins}
                onChangeText={setKitPrepMins}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {(['veg', 'nonveg'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.tagOption,
                    {
                      backgroundColor: kitDiet === d ? colors.primary : colors.bgSubtle,
                      borderColor: kitDiet === d ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setKitDiet(d)}
                >
                  <Text
                    style={{
                      color: kitDiet === d ? '#fff' : colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    {d === 'veg' ? 'Pure Veg 🥬' : 'Non-Veg 🍗'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setKitModalVisible(false)}
              />
              <Button title="Save Meal Kit" style={{ flex: 1.2 }} onPress={handleSaveKit} />
            </View>
          </View>
        </View>
      </Modal>

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
  tabsBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
  },
  tabsContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabPillText: {
    fontSize: 12,
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
});
