import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { Order, generateInvoiceText } from '../../framework/firebase/ordersService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

export interface LiveTrackingModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onReorder?: (order: Order) => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  order,
  visible,
  onClose,
  onReorder,
}) => {
  const { colors, radii, shadows } = useTheme();

  if (!order) return null;

  const handleDownloadInvoice = () => {
    const text = generateInvoiceText(order);
    Alert.alert('Invoice Generated 📄', text);
  };

  const getStatusBadgeVariant = (status: Order['status']) => {
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* App Bar */}
        <View
          style={[
            styles.appBar,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Order Tracking</Text>
            <Text style={[styles.appBarSub, { color: colors.textSecondary }]}>{order.id}</Text>
          </View>
          <TouchableOpacity onPress={handleDownloadInvoice}>
            <Text style={[styles.invoiceLink, { color: colors.primary }]}>Invoice 📄</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Header Card */}
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.bannerTop}>
              <Text style={[styles.liveIndicator, { color: colors.primary }]}>● LIVE STATUS</Text>
              <Badge label={order.status} variant={getStatusBadgeVariant(order.status)} />
            </View>

            <Text style={[styles.statusMainHeading, { color: colors.textPrimary }]}>
              {order.status === 'Delivered'
                ? 'Kit Delivered to Your Doorstep! 🥘'
                : order.status === 'Out for Delivery'
                  ? 'Rider is on the way in cold-chain gear 🛵'
                  : order.status === 'Preparing'
                    ? 'Chefs are packing fresh masalas & ingredients 👨‍🍳'
                    : 'Order Confirmed by Fulfillment Kitchen ✨'}
            </Text>

            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              Estimated Delivery: {order.deliverySlot} ({order.deliveryDate || 'Today'})
            </Text>
          </View>

          {/* Timeline Milestones */}
          <View
            style={[
              styles.cardBlock,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
              Preparation & Delivery Progress
            </Text>

            <View style={styles.timelineContainer}>
              {order.trackingEvents.map((evt, idx) => {
                const isLast = idx === order.trackingEvents.length - 1;
                return (
                  <View key={idx} style={styles.timelineStep}>
                    <View style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          {
                            backgroundColor: evt.completed ? colors.primary : colors.bgSubtle,
                            borderColor: evt.completed ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        {evt.completed && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.stepConnector,
                            {
                              backgroundColor: evt.completed ? colors.primary : colors.borderLight,
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepContentCol}>
                      <View style={styles.stepTitleRow}>
                        <Text
                          style={[
                            styles.stepTitle,
                            {
                              color: evt.completed ? colors.textPrimary : colors.textMuted,
                              fontWeight: evt.completed ? '800' : '600',
                            },
                          ]}
                        >
                          {evt.title}
                        </Text>
                        <Text style={[styles.stepTime, { color: colors.textMuted }]}>
                          {evt.timestamp}
                        </Text>
                      </View>
                      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                        {evt.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Items In Order */}
          <View
            style={[
              styles.cardBlock,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
              Items in This Box ({order.items.length})
            </Text>

            {order.items.map((item, idx) => (
              <View
                key={idx}
                style={[styles.orderItemRow, { borderBottomColor: colors.borderLight }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderItemName, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.orderItemSachets, { color: colors.textSecondary }]}>
                    Masalas: {item.masalaSachets.join(', ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.orderItemQty, { color: colors.textMuted }]}>
                    Qty: {item.quantity}
                  </Text>
                  <Text style={[styles.orderItemPrice, { color: colors.primary }]}>
                    ₹{item.price * item.quantity}
                  </Text>
                </View>
              </View>
            ))}

            {/* Total breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.priceVal, { color: colors.textPrimary }]}>
                  ₹{order.subtotal}
                </Text>
              </View>
              {order.discount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.primary }]}>Discount</Text>
                  <Text style={[styles.priceVal, { color: colors.primary }]}>
                    -₹{order.discount}
                  </Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Delivery</Text>
                <Text style={[styles.priceVal, { color: colors.textPrimary }]}>
                  {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                </Text>
              </View>
              <View style={[styles.totalDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.priceRow}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Paid Amount</Text>
                <Text style={[styles.totalVal, { color: colors.primary }]}>
                  ₹{order.totalAmount}
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery & Payment Info */}
          <View
            style={[
              styles.cardBlock,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
              Delivery Details
            </Text>
            <Text style={[styles.addressText, { color: colors.textPrimary }]}>
              📍 {order.deliveryAddress}
            </Text>
            <Text style={[styles.metaText, { color: colors.textSecondary, marginTop: 4 }]}>
              Recipient: {order.customerName} ({order.customerPhone})
            </Text>
            <Text style={[styles.metaText, { color: colors.textSecondary, marginTop: 2 }]}>
              Payment: {order.paymentMethod} • Txn: {order.transactionId}
            </Text>
          </View>
        </ScrollView>

        {/* Reorder Button Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.bgSurface,
              borderTopColor: colors.borderLight,
              ...shadows.medium,
            },
          ]}
        >
          <Button
            title="Download Tax Invoice 📄"
            variant="outline"
            style={{ flex: 1, marginRight: 10 }}
            onPress={handleDownloadInvoice}
          />
          <Button
            title="Reorder Box 🔁"
            style={{ flex: 1.2 }}
            onPress={() => {
              onReorder?.(order);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  appBarSub: {
    fontSize: 12,
  },
  invoiceLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  statusBanner: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusMainHeading: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 13,
  },
  cardBlock: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  blockHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    marginRight: 14,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  stepConnector: {
    width: 2,
    height: 48,
    marginVertical: 2,
  },
  stepContentCol: {
    flex: 1,
    paddingBottom: 20,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  stepTitle: {
    fontSize: 14,
  },
  stepTime: {
    fontSize: 11,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderItemSachets: {
    fontSize: 11,
    marginTop: 2,
  },
  orderItemQty: {
    fontSize: 12,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  priceBreakdown: {
    marginTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalDivider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaText: {
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
});
