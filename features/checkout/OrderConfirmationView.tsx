import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useWallet } from '../../framework/context/WalletContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Order } from '../../framework/firebase/ordersService';
import { buildReferralShareMessage } from '../../framework/services/referralService';

interface OrderConfirmationViewProps {
  order: Order;
  walletCreditsApplied?: number;
  payableAmount?: number;
  deliveryInstructions?: string;
  onContinueShopping?: () => void;
  onViewOrders?: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  walletCreditsApplied = 0,
  payableAmount = 0,
  deliveryInstructions,
  onContinueShopping,
  onViewOrders,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { referralCode } = useWallet();

  const activeCode = referralCode || 'RASOI' + (order.userId ? order.userId.slice(-4).toUpperCase() : 'VIP');

  const handleShareWhatsApp = async () => {
    const shareInfo = buildReferralShareMessage(activeCode, 200);
    const encoded = encodeURIComponent(shareInfo.message);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ title: shareInfo.title, message: shareInfo.message });
      }
    } catch {
      await Share.share({ title: shareInfo.title, message: shareInfo.message });
    }
  };

  const handleTrackOrder = () => {
    if (onViewOrders) {
      onViewOrders();
    } else {
      router.push('/(tabs)/orders' as any);
    }
  };

  const handleExploreMore = () => {
    if (onContinueShopping) {
      onContinueShopping();
    } else {
      router.push('/' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Celebration Hero */}
        <View style={styles.celebrationWrap}>
          <View style={[styles.successCircle, { backgroundColor: '#10B981' }]}>
            <Icon name="checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            Order Placed Successfully!
          </Text>
          <Text style={[styles.orderNumber, { color: colors.primary }]}>
            Order #{order.id?.slice(-8) || 'CONFIRMED'}
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Our chefs are preparing your gourmet pre-portioned meal kits with authentic whole masalas.
          </Text>
        </View>

        {/* Estimated Delivery Slot */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
              borderColor: colors.primary,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="time" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>
                DELIVERY SCHEDULE
              </Text>
              <Text style={[styles.infoCardValue, { color: colors.textPrimary }]}>
                {order.deliverySlot || 'Today 6:00 PM - 8:00 PM (Dinner)'}
              </Text>
            </View>
            <Badge label="Scheduled" variant="success" />
          </View>
        </View>

        {/* Delivery Address Snapshot */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon name="location" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Delivery Destination
            </Text>
          </View>
          <Text style={[styles.addressName, { color: colors.textPrimary }]}>
            {order.customerName} • {order.customerPhone}
          </Text>
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>
            {order.deliveryAddress}
          </Text>
          {deliveryInstructions && (
            <View style={[styles.instructionsBox, { backgroundColor: colors.bgPrimary }]}>
              <Text style={[styles.instructionsLabel, { color: colors.textMuted }]}>
                Instructions:
              </Text>
              <Text style={[styles.instructionsText, { color: colors.textPrimary }]}>
                {deliveryInstructions}
              </Text>
            </View>
          )}
        </View>

        {/* Financial & Payment Summary */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon name="card" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Payment Breakdown</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
              ₹{Math.round(order.subtotal || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#10B981' }]}>
                Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}
              </Text>
              <Text style={[styles.summaryVal, { color: '#10B981' }]}>
                -₹{Math.round(order.discount).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Delivery Fee
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
              {order.deliveryFee === 0 ? 'FREE' : `₹${Math.round(order.deliveryFee || 0)}`}
            </Text>
          </View>

          {walletCreditsApplied > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.primary, fontWeight: '700' }]}>
                Rasoi Credits Applied
              </Text>
              <Text style={[styles.summaryVal, { color: colors.primary, fontWeight: '700' }]}>
                -₹{Math.round(walletCreditsApplied).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Final Paid</Text>
            <Text style={[styles.totalVal, { color: colors.textPrimary }]}>
              ₹{Math.round(order.totalAmount || payableAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <Badge
              label={`Paid via ${order.paymentMethod || 'Online'}`}
              variant="accent"
            />
            <Badge
              label={order.paymentStatus || 'Paid'}
              variant={order.paymentStatus === 'Paid' ? 'success' : 'warning'}
            />
          </View>
        </View>

        {/* Ordered Meal Kits */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon name="basket" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Ordered Kits ({order.items.length})
            </Text>
          </View>

          {order.items.map((item, idx) => (
            <View key={idx} style={styles.kitItemRow}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.kitThumb} />
              ) : (
                <View style={[styles.kitThumbPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                  <Icon name="restaurant" size={20} color={colors.primary} />
                </View>
              )}
              <View style={styles.kitInfo}>
                <Text style={[styles.kitName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.kitMeta, { color: colors.textSecondary }]}>
                  Qty: {item.quantity} • {item.servings || 2} Servings
                  {item.spiceLevel ? ` • ${item.spiceLevel}` : ''}
                </Text>
              </View>
              <Text style={[styles.kitPrice, { color: colors.textPrimary }]}>
                ₹{Math.round((item.price || 0) * item.quantity).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>

        {/* Viral Referral Banner */}
        <View
          style={[
            styles.referralCard,
            {
              backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
              borderColor: '#10B981',
            },
          ]}
        >
          <View style={styles.referralTop}>
            <View style={[styles.giftCircle, { backgroundColor: '#10B981' }]}>
              <Icon name="gift" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.referralHeading, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
                Earn ₹300 on your next meal!
              </Text>
              <Text style={[styles.referralSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                Give your friends ₹200 credits with code <Text style={{ fontWeight: '800' }}>{activeCode}</Text>. When they cook, you get ₹300!
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.whatsAppBtn, { backgroundColor: '#25D366' }]}
            onPress={handleShareWhatsApp}
            activeOpacity={0.8}
          >
            <Icon name="logo-whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.whatsAppBtnText}>Share Code on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Button
            title="Track Order Status"
            variant="primary"
            size="lg"
            onPress={handleTrackOrder}
          />
          <Button
            title="Explore More Chef Recipes"
            variant="outline"
            size="md"
            onPress={handleExploreMore}
            style={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  celebrationWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  infoCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  instructionsBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  kitThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  kitThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitInfo: {
    flex: 1,
  },
  kitName: {
    fontSize: 13,
    fontWeight: '600',
  },
  kitMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  kitPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  referralCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  referralTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  giftCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  referralSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtons: {
    gap: 8,
  },
});
