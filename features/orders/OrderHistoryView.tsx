import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import {
  Order,
  subscribeToOrders,
  OrderStatus,
  loadPersistedOrders,
  MOCK_ORDER_IDS,
  dismissCancelledOrder,
  isOrderDismissed,
} from '../../framework/firebase/ordersService';
import {
  fetchAllOrdersFromSupabase,
  subscribeToOrdersRealtime,
} from '../../framework/services/supabaseOrdersService';
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { LiveTrackingModal } from './LiveTrackingModal';
import { WishlistView } from '../wishlist/WishlistView';

export const OrderHistoryView: React.FC = () => {
  const { user } = useAuth();
  const { colors, radii, shadows } = useTheme();
  const { reorderItems } = useCart();

  const [activeTab, setActiveTab] = useState<'active' | 'previous' | 'wishlist'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set());
  const [cancelledModalOrder, setCancelledModalOrder] = useState<Order | null>(null);
  const [cancellationModalVisible, setCancellationModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        const sbOrders = await fetchAllOrdersFromSupabase();
        if (isMounted && sbOrders) {
          setOrders(sbOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
        }
      } catch (err) {
        const local = await loadPersistedOrders();
        if (isMounted) {
          setOrders(local.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
        }
      }
    };

    loadOrders();

    const unsubRealtime = subscribeToOrdersRealtime(() => {
      loadOrders();
    });

    const unsubscribeFb = subscribeToOrders((allOrders) => {
      if (isMounted) {
        setOrders(allOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
      }
    });

    const handleStorageChange = () => {
      loadOrders();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', handleStorageChange);
    }

    // Short reactive sync interval (2s) to guarantee fast cross-tab and cross-view sync
    const interval = setInterval(loadOrders, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', handleStorageChange);
      }
      unsubRealtime();
      unsubscribeFb();
    };
  }, []);

  // Filter orders relevant to current user and exclude mock filler data & duplicates
  const userOrders = useMemo(() => {
    const clean = orders.filter((o) => !MOCK_ORDER_IDS.has(o.id) && o.id.startsWith('ORD-'));
    const filtered = !user
      ? clean
      : clean.filter(
          (o) =>
            o.userId === user.uid ||
            (user.phoneNumber &&
              o.customerPhone &&
              o.customerPhone
                .replace(/\D/g, '')
                .endsWith(user.phoneNumber.replace(/\D/g, '').slice(-10))) ||
            (user.email &&
              o.customerEmail &&
              o.customerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
            o.userId.startsWith('guest_user_'),
        );

    // Strict deduplication by order ID and transaction ID
    const seenIds = new Set<string>();
    const seenTxns = new Set<string>();
    const deduped: Order[] = [];
    for (const ord of filtered) {
      if (seenIds.has(ord.id)) continue;
      if (ord.transactionId && seenTxns.has(ord.transactionId)) continue;
      seenIds.add(ord.id);
      if (ord.transactionId) seenTxns.add(ord.transactionId);
      deduped.push(ord);
    }
    return deduped;
  }, [orders, user]);

  // Cancelled orders that the user has not dismissed yet
  const undismissedCancelledOrders = useMemo(() => {
    return userOrders.filter(
      (o) =>
        o.status === 'Cancelled' &&
        !o.isDismissed &&
        !dismissedOrderIds.has(o.id) &&
        !isOrderDismissed(o.id),
    );
  }, [userOrders, dismissedOrderIds]);

  // Active / Ongoing orders (Placed, Confirmed, Preparing, Out for Delivery, Pending)
  const ongoingOrders = useMemo(() => {
    return userOrders.filter(
      (o) =>
        o.status === 'Placed' ||
        o.status === 'Confirmed' ||
        o.status === 'Preparing' ||
        o.status === 'Out for Delivery' ||
        o.status === 'Pending',
    );
  }, [userOrders]);

  // Active tab displays ongoing orders strictly
  const activeTabOrders = useMemo(() => {
    return ongoingOrders;
  }, [ongoingOrders]);

  // Previous completed orders (Delivered, Cancelled, Refunded)
  const previousOrders = useMemo(() => {
    return userOrders.filter(
      (o) => o.status === 'Delivered' || o.status === 'Cancelled' || o.status === 'Refunded',
    );
  }, [userOrders]);

  const handleDismissOrder = async (orderId: string) => {
    setDismissedOrderIds((prev) => new Set([...prev, orderId]));
    await dismissCancelledOrder(orderId);
  };

  const handleReorder = (order: Order) => {
    reorderItems(order.items);
    Alert.alert(
      'Items Added to Cart! 🛒',
      `Re-added ${order.items.length} items from Order ${order.id} to your basket.`,
    );
    router.push('/(tabs)/cart' as any);
  };

  const getBadgeVariant = (status: OrderStatus): BadgeVariant => {
    switch (status) {
      case 'Delivered':
      case 'Confirmed':
        return 'success';
      case 'Out for Delivery':
      case 'Preparing':
        return 'info';
      case 'Placed':
        return 'warning';
      case 'Cancelled':
      case 'Refunded':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const renderOrderCard = (order: Order, isActive: boolean) => {
    const isCancelled = order.status === 'Cancelled';
    return (
      <TouchableOpacity
        key={order.id}
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.bgSurface,
            borderRadius: radii.xl,
            borderColor: isCancelled
              ? '#F87171'
              : isActive
                ? colors.primary + '60'
                : colors.borderLight,
            borderWidth: isCancelled || isActive ? 2 : 1,
            ...shadows.card,
          },
        ]}
        onPress={() => {
          setSelectedOrder(order);
          setTrackingModalVisible(true);
        }}
        activeOpacity={0.88}
      >
        <View style={styles.cardTopRow}>
          <View>
            <Text style={[styles.orderId, { color: colors.textPrimary }]}>{order.id}</Text>
            <Text style={[styles.orderDate, { color: colors.textMuted }]}>
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Badge label={order.status} variant={getBadgeVariant(order.status)} />
        </View>

        {isCancelled ? (
          <View
            style={[
              styles.cancelledAlertBanner,
              { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                  Order Cancelled
                </Text>
                <Text style={{ color: '#B91C1C', fontSize: 11 }} numberOfLines={1}>
                  {order.cancellationReason ||
                    order.adminNotes ||
                    'Cancelled by Kitchen Management.'}
                </Text>
              </View>
            </View>
          </View>
        ) : isActive ? (
          <View
            style={[
              styles.livePulseBanner,
              {
                backgroundColor:
                  order.status === 'Confirmed'
                    ? '#DCFCE7'
                    : order.status === 'Preparing'
                      ? '#DBEAFE'
                      : order.status === 'Out for Delivery'
                        ? '#D1FAE5'
                        : colors.primaryLight,
                borderColor:
                  order.status === 'Confirmed'
                    ? '#86EFAC'
                    : order.status === 'Preparing'
                      ? '#93C5FD'
                      : order.status === 'Out for Delivery'
                        ? '#6EE7B7'
                        : colors.primary + '30',
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.pulseText,
                {
                  color:
                    order.status === 'Confirmed'
                      ? '#15803D'
                      : order.status === 'Preparing'
                        ? '#1D4ED8'
                        : order.status === 'Out for Delivery'
                          ? '#047857'
                          : colors.primary,
                  fontWeight: '700',
                },
              ]}
            >
              {order.status === 'Confirmed'
                ? '✅ Order Confirmed by Kitchen • Chefs are packing fresh ingredients'
                : order.status === 'Preparing'
                  ? '👨‍🍳 Kitchen is Preparing Your Meal Kit'
                  : order.status === 'Out for Delivery'
                    ? '🛵 Out for Cold-Chain Delivery'
                    : `⏳ Order Placed • Awaiting Kitchen Confirmation (${order.deliverySlot})`}
            </Text>
          </View>
        ) : null}

        <View style={styles.itemsList}>
          {order.items.map((it, idx) => (
            <Text
              key={idx}
              style={[styles.itemLine, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              • {it.quantity}x {it.name}
            </Text>
          ))}
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.borderLight }]} />

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={[styles.totalPaidLabel, { color: colors.textMuted }]}>TOTAL</Text>
            <Text
              style={[styles.totalPaidVal, { color: isCancelled ? '#DC2626' : colors.primary }]}
            >
              ₹{order.totalAmount}
            </Text>
          </View>

          <View style={[styles.cardBtnRow, { flexWrap: 'wrap', gap: 6 }]}>
            {isCancelled ? (
              <>
                <Button
                  title="Why was this cancelled? ℹ️"
                  variant="outline"
                  size="sm"
                  style={{ borderColor: '#DC2626' }}
                  textStyle={{ color: '#DC2626', fontSize: 11 }}
                  onPress={() => {
                    setCancelledModalOrder(order);
                    setCancellationModalVisible(true);
                  }}
                />
                {isActive && (
                  <Button
                    title="Dismiss ✕"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleDismissOrder(order.id)}
                  />
                )}
                <Button
                  title="Reorder 🔁"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleReorder(order)}
                />
              </>
            ) : (
              <>
                <Button
                  title="Reorder 🔁"
                  variant="secondary"
                  size="sm"
                  style={{ marginRight: 8 }}
                  onPress={() => handleReorder(order)}
                />
                <Button
                  title={isActive ? 'Track Live 🛵' : 'View Details 📄'}
                  size="sm"
                  onPress={() => {
                    setSelectedOrder(order);
                    setTrackingModalVisible(true);
                  }}
                />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Orders & History</Text>

        {/* 3 Tabs: Active Orders | Previous Orders | Wishlist */}
        <View
          style={[styles.tabToggle, { backgroundColor: colors.bgSubtle, borderRadius: radii.pill }]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === 'active' ? colors.bgSurface : 'transparent',
                borderRadius: radii.pill,
                ...(activeTab === 'active' ? shadows.soft : {}),
              },
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'active' ? colors.primary : colors.textSecondary },
              ]}
            >
              Orders ({activeTabOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === 'previous' ? colors.bgSurface : 'transparent',
                borderRadius: radii.pill,
                ...(activeTab === 'previous' ? shadows.soft : {}),
              },
            ]}
            onPress={() => setActiveTab('previous')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'previous' ? colors.primary : colors.textSecondary },
              ]}
            >
              Previous ({previousOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === 'wishlist' ? colors.bgSurface : 'transparent',
                borderRadius: radii.pill,
                ...(activeTab === 'wishlist' ? shadows.soft : {}),
              },
            ]}
            onPress={() => setActiveTab('wishlist')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'wishlist' ? colors.primary : colors.textSecondary },
              ]}
            >
              Saved Kits ❤️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'wishlist' ? (
        <WishlistView />
      ) : activeTab === 'active' ? (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {undismissedCancelledOrders.length > 0 && (
            <TouchableOpacity
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#FEF2F2',
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: '#F87171',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setActiveTab('previous')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🚫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13 }}>
                    {undismissedCancelledOrders.length} Order(s) Cancelled
                  </Text>
                  <Text style={{ color: '#B91C1C', fontSize: 11 }} numberOfLines={1}>
                    Kitchen cancelled order. Moved to Previous Orders.
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 12 }}>
                View in History ➔
              </Text>
            </TouchableOpacity>
          )}

          {activeTabOrders.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={styles.emptyIcon}>🍳</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Active Orders
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                You don't have any ongoing meal kit deliveries in preparation right now.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button title="Browse Meal Kits 🥘" onPress={() => router.push('/' as any)} />
                {previousOrders.length > 0 && (
                  <Button
                    title="View Previous Orders ➔"
                    variant="outline"
                    onPress={() => setActiveTab('previous')}
                  />
                )}
              </View>
            </View>
          ) : (
            activeTabOrders.map((order) => renderOrderCard(order, true))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {previousOrders.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Previous Orders
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Your past completed, delivered, or cancelled orders will appear here for easy
                reordering.
              </Text>
              <Button
                title="Explore Gourmet Meal Kits 🥘"
                style={{ marginTop: 14 }}
                onPress={() => router.push('/' as any)}
              />
            </View>
          ) : (
            previousOrders.map((order) => renderOrderCard(order, false))
          )}
        </ScrollView>
      )}

      {/* Live Tracking Modal */}
      <LiveTrackingModal
        order={selectedOrder}
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        onReorder={handleReorder}
      />

      {/* Why Was This Order Cancelled Modal */}
      <Modal
        visible={cancellationModalVisible && !!cancelledModalOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Order Cancellation Details
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Order ID: {cancelledModalOrder?.id}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCancellationModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={{ fontSize: 16, color: colors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View
              style={[styles.reasonCallout, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
            >
              <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13, marginBottom: 4 }}>
                Kitchen Cancellation Reason:
              </Text>
              <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 18 }}>
                {cancelledModalOrder?.cancellationReason ||
                  cancelledModalOrder?.adminNotes ||
                  'The kitchen team had to cancel this order due to operational or fresh ingredient constraints.'}
              </Text>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                Refund & Payment Notice:
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                Total amount: ₹{cancelledModalOrder?.totalAmount}. If you made an online payment, a
                full refund is initiated automatically to your original payment method.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {cancelledModalOrder && !dismissedOrderIds.has(cancelledModalOrder.id) && (
                <Button
                  title="Dismiss from Active ✕"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => {
                    handleDismissOrder(cancelledModalOrder.id);
                    setCancellationModalVisible(false);
                  }}
                />
              )}
              <Button
                title="Got It"
                style={{ flex: 1 }}
                onPress={() => setCancellationModalVisible(false)}
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
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  tabToggle: {
    flexDirection: 'row',
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  orderCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  livePulseBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  pulseText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemsList: {
    marginVertical: 6,
  },
  itemLine: {
    fontSize: 13,
    lineHeight: 20,
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPaidLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  totalPaidVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardBtnRow: {
    flexDirection: 'row',
  },
  cancelledAlertBanner: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  reasonCallout: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 6,
  },
});
