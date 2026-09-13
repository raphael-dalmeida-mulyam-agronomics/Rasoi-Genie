import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import {
  Order,
  OrderStatus,
  subscribeToOrders,
  updateOrderStatus,
} from '../../framework/firebase/ordersService';
import { validateAdminEmail } from '../../framework/firebase/authService';
import { Card } from '../../framework/ui/Card';
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

const STATUS_FILTERS: (OrderStatus | 'All')[] = [
  'All',
  'Pending',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const AdminDashboardView: React.FC<{ onNavigateToLogin?: () => void }> = ({
  onNavigateToLogin,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'All'>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Strict domain check check
  const isMulyamAdmin =
    user && user.role === 'admin' && user.email && validateAdminEmail(user.email);

  useEffect(() => {
    if (!isMulyamAdmin) return;

    const unsubscribe = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isMulyamAdmin]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const getBadgeVariant = (status: OrderStatus): BadgeVariant => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Preparing':
        return 'info';
      case 'Out for Delivery':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // If user is not logged in as @mulyam.in admin
  if (!isMulyamAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Card style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>Admin Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            This dashboard is strictly reserved for authorized company personnel with a valid{' '}
            <Text style={{ fontWeight: '800', color: '#1D4ED8' }}>@mulyam.in</Text> email address.
          </Text>

          {user ? (
            <View style={styles.loggedUserBox}>
              <Text style={styles.loggedUserText}>
                Currently logged in as: {user.email || user.phoneNumber || 'User'} ({user.role})
              </Text>
            </View>
          ) : null}

          <Button
            title="Log In as Admin (@mulyam.in)"
            variant="secondary"
            onPress={onNavigateToLogin}
            style={{ marginTop: 16 }}
          />
        </Card>
      </View>
    );
  }

  // Filter orders
  const filteredOrders =
    selectedFilter === 'All' ? orders : orders.filter((o) => o.status === selectedFilter);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Admin Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.adminTag}>
            <Text style={styles.adminTagText}>MULYAM ADMIN PORTAL</Text>
          </View>
          <Text style={styles.headerTitle}>Order Management</Text>
          <Text style={styles.headerSubtitle}>
            Logged in as: <Text style={{ fontWeight: '700' }}>{user?.email}</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Orders</Text>
          <Text style={styles.metricValue}>{orders.length}</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Revenue</Text>
          <Text style={[styles.metricValue, { color: '#059669' }]}>₹{totalRevenue}</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending / Prep</Text>
          <Text style={[styles.metricValue, { color: '#D97706' }]}>
            {pendingCount + preparingCount}
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>Delivered</Text>
          <Text style={[styles.metricValue, { color: '#2563EB' }]}>{deliveredCount}</Text>
        </Card>
      </View>

      {/* Status Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterPill, selectedFilter === status && styles.filterPillActive]}
            onPress={() => setSelectedFilter(status)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === status && styles.filterPillTextActive,
              ]}
            >
              {status} {status === 'All' ? `(${orders.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <View style={styles.listSection}>
        <Text style={styles.listHeading}>
          User Orders {selectedFilter !== 'All' ? `- ${selectedFilter}` : ''} (
          {filteredOrders.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 20 }} />
        ) : filteredOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No orders match the selected status filter.</Text>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} style={styles.orderCard}>
              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>

                <Badge label={order.status} variant={getBadgeVariant(order.status)} />
              </View>

              {/* Customer Details */}
              <View style={styles.customerBox}>
                <Text style={styles.customerPhone}>📱 Customer: {order.customerPhone}</Text>
                <Text style={styles.customerAddress}>📍 Address: {order.deliveryAddress}</Text>
              </View>

              {/* Order Items Breakdown */}
              <View style={styles.itemsBox}>
                <Text style={styles.itemsHeading}>Ordered Meal Kits:</Text>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        {item.quantity}x {item.name}
                      </Text>
                      {item.masalaSachets && item.masalaSachets.length > 0 ? (
                        <Text style={styles.itemSachets}>
                          Sachets: {item.masalaSachets.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Order Value:</Text>
                  <Text style={styles.totalVal}>₹{order.totalAmount}</Text>
                </View>
              </View>

              {/* Update Order Status Action */}
              <View style={styles.statusUpdateBox}>
                <Text style={styles.statusUpdateLabel}>Update Order Status:</Text>
                <View style={styles.statusButtonsRow}>
                  {(
                    [
                      'Pending',
                      'Preparing',
                      'Out for Delivery',
                      'Delivered',
                      'Cancelled',
                    ] as OrderStatus[]
                  ).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.statusBtn, order.status === st && styles.statusBtnActive]}
                      disabled={updatingId === order.id}
                      onPress={() => handleStatusChange(order.id, st)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          order.status === st && styles.statusBtnTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  accessDeniedContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  accessDeniedCard: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  loggedUserBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    width: '100%',
  },
  loggedUserText: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    gap: 8,
    paddingRight: 10,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    gap: 14,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  orderCard: {
    gap: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  customerBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  customerPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  customerAddress: {
    fontSize: 13,
    color: '#475569',
  },
  itemsBox: {
    gap: 6,
  },
  itemsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  itemSachets: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B00',
  },
  statusUpdateBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  statusUpdateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusBtnActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
  },
});
