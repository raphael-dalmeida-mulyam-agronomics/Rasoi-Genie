import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { Order, subscribeToOrders, OrderStatus } from '../../framework/firebase/ordersService';
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { LiveTrackingModal } from './LiveTrackingModal';
import { WishlistView } from '../wishlist/WishlistView';

export const OrderHistoryView: React.FC = () => {
  const { user } = useAuth();
  const { colors, radii, shadows } = useTheme();
  const { reorderItems } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((allOrders) => {
      setOrders(allOrders);
    });
    return () => unsubscribe();
  }, []);

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
        return 'success';
      case 'Out for Delivery':
        return 'info';
      case 'Preparing':
      case 'Confirmed':
      case 'Placed':
        return 'warning';
      case 'Cancelled':
      case 'Refunded':
        return 'danger';
      default:
        return 'neutral';
    }
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          My Orders & Favorites
        </Text>

        {/* Tab switch between Orders and Wishlist */}
        <View
          style={[styles.tabToggle, { backgroundColor: colors.bgSubtle, borderRadius: radii.pill }]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === 'orders' ? colors.bgSurface : 'transparent',
                borderRadius: radii.pill,
                ...(activeTab === 'orders' ? shadows.soft : {}),
              },
            ]}
            onPress={() => setActiveTab('orders')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'orders' ? colors.primary : colors.textSecondary },
              ]}
            >
              Orders ({orders.length})
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
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {orders.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Orders Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Order your first authentic Indian meal kit with pre-measured spices!
              </Text>
              <Button
                title="Browse Meal Kits 🥘"
                style={{ marginTop: 14 }}
                onPress={() => router.push('/' as any)}
              />
            </View>
          ) : (
            orders.map((order) => {
              const isActive =
                order.status === 'Placed' ||
                order.status === 'Confirmed' ||
                order.status === 'Preparing' ||
                order.status === 'Out for Delivery';

              return (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: isActive ? colors.primary + '50' : colors.borderLight,
                      borderWidth: isActive ? 2 : 1,
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
                      <Text style={[styles.orderId, { color: colors.textPrimary }]}>
                        {order.id}
                      </Text>
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

                  {isActive && (
                    <View
                      style={[styles.livePulseBanner, { backgroundColor: colors.primaryLight }]}
                    >
                      <Text style={[styles.pulseText, { color: colors.primary }]}>
                        ⚡ Active Delivery in Progress • {order.deliverySlot}
                      </Text>
                    </View>
                  )}

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
                      <Text style={[styles.totalPaidLabel, { color: colors.textMuted }]}>
                        TOTAL
                      </Text>
                      <Text style={[styles.totalPaidVal, { color: colors.primary }]}>
                        ₹{order.totalAmount}
                      </Text>
                    </View>

                    <View style={styles.cardBtnRow}>
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
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
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
    fontSize: 13,
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
});
