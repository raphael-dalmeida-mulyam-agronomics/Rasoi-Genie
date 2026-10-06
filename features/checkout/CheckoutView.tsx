import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useCart, PaymentMethod } from '../../framework/context/CartContext';
import { usePreferences, AddressItem } from '../../framework/context/PreferencesContext';
import { useWallet } from '../../framework/context/WalletContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Order, createOrder } from '../../framework/firebase/ordersService';
import { createOrderInSupabase } from '../../framework/services/supabaseOrdersService';
import {
  createDeliveryAddressSnapshot,
  formatAddressSingleLine,
} from '../../framework/services/addressService';
import { processCheckoutPayment } from '../../framework/services/paymentGatewayService';
import { qualifyReferralOrder } from '../../framework/services/referralService';
import { AddressSelectionModal } from './AddressSelectionModal';

interface CheckoutViewProps {
  onBack: () => void;
  onOrderPlaced: (
    order: Order,
    walletCreditsApplied: number,
    payableAmount: number,
    deliveryInstructions: string,
  ) => void;
}

const DELIVERY_SLOTS = [
  { id: 'slot-1', title: 'Today 6:00 PM - 8:00 PM (Dinner)', tag: 'Fastest' },
  { id: 'slot-2', title: 'Today 8:00 PM - 10:00 PM (Late Dinner)', tag: 'Popular' },
  { id: 'slot-3', title: 'Tomorrow 11:00 AM - 1:00 PM (Lunch)', tag: 'Lunch' },
  { id: 'slot-4', title: 'Tomorrow 6:00 PM - 8:00 PM (Dinner)', tag: 'Dinner' },
];

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onBack, onOrderPlaced }) => {
  const { user } = useAuth();
  const { colors, radii, shadows, isDark } = useTheme();
  const {
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    appliedCoupon,
    clearCart,
    selectedSlot,
    setSelectedSlot,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = useCart();

  const { addresses, defaultAddress } = usePreferences();
  const { availableBalance, debitCredits, refreshAll: refreshWallet } = useWallet();

  // Address states
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressItem>(
    defaultAddress || addresses[0] || {
      id: 'default_addr',
      name: user?.displayName || 'Customer',
      phone: user?.phoneNumber || '+91 9876543210',
      flatAndStreet: 'Flat 101, Green Meadows',
      areaAndLandmark: 'Near Metro Station, Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      tag: 'Home',
      isDefault: true,
    },
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Wallet deduction toggle
  const [useWalletCredits, setUseWalletCredits] = useState<boolean>(availableBalance > 0);

  // UPI input
  const [upiId, setUpiId] = useState('');

  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Financial calculations with Wallet
  const { creditsApplied, payableAmount } = useMemo(() => {
    if (!useWalletCredits || availableBalance <= 0) {
      return { creditsApplied: 0, payableAmount: total };
    }
    const applied = Math.min(availableBalance, total);
    const remaining = Math.max(0, total - applied);
    return { creditsApplied: applied, payableAmount: remaining };
  }, [useWalletCredits, availableBalance, total]);

  const isFullyWalletPaid = payableAmount === 0 && creditsApplied > 0;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cooking basket is empty.');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }

    setIsProcessing(true);

    try {
      const sharedTxnId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const addressSnapshot = createDeliveryAddressSnapshot(selectedAddress, deliveryInstructions);
      const deliveryAddressFormatted = formatAddressSingleLine(selectedAddress);

      // 1. Debit wallet credits if applicable
      let walletTxnId: string | undefined;
      if (creditsApplied > 0) {
        const debitRes = await debitCredits({
          amount: creditsApplied,
          description: `Used for Meal Kit Order`,
        });

        if (!debitRes.success) {
          Alert.alert('Wallet Error', debitRes.error || 'Failed to debit wallet credits');
          setIsProcessing(false);
          return;
        }
        walletTxnId = debitRes.transactionId;
      }

      // 2. Process external payment if payableAmount > 0
      const paymentMethod = isFullyWalletPaid ? 'Wallet' : selectedPaymentMethod;
      if (payableAmount > 0 && paymentMethod !== 'Cash on Delivery') {
        const paymentRes = await processCheckoutPayment({
          orderId: `ORD_${Date.now()}`,
          payableAmount,
          paymentMethod,
          customer: {
            name: selectedAddress.name || user?.displayName || 'Customer',
            email: user?.email || 'customer@rasoigenie.in',
            phone: selectedAddress.phone || user?.phoneNumber || '+91 9876543210',
          },
          upiId: paymentMethod === 'UPI' ? upiId : undefined,
        });

        if (!paymentRes.success) {
          Alert.alert('Payment Failed', paymentRes.error || 'Payment gateway could not complete payment.');
          setIsProcessing(false);
          return;
        }
      }

      // 3. Prepare order payload
      const orderPayload = {
        userId: user?.uid || 'guest_' + Date.now(),
        customerPhone: selectedAddress.phone || user?.phoneNumber || '+91 9876543210',
        customerName: selectedAddress.name || user?.displayName || 'Valued Chef',
        customerEmail: user?.email || undefined,
        deliveryAddress: deliveryAddressFormatted,
        deliverySlot: selectedSlot || DELIVERY_SLOTS[0]!.title,
        items: items.map((i) => ({
          kitId: i.kit.id,
          name: i.kit.name,
          quantity: i.quantity,
          price: i.unitPrice ?? i.kit.price,
          servings: i.servings,
          spiceLevel: i.spiceLevel,
          masalaSachets: i.kit.masalaSachets,
          imageUrl: i.kit.heroImage,
        })),
        subtotal,
        discount,
        couponCode: appliedCoupon?.code,
        deliveryFee,
        totalAmount: payableAmount, // Amount charged to external gateway/COD
        paymentMethod,
        transactionId: sharedTxnId,
        walletCreditsApplied: creditsApplied,
        externalPaymentAmount: payableAmount,
        deliveryAddressSnapshot: addressSnapshot,
      };

      // 4. Create in Supabase (with full wallet & address audit columns)
      const sbResult = await createOrderInSupabase(orderPayload as any);
      const sharedOrderId = sbResult?.orderId || `ORD_${Date.now()}`;

      // 5. Create in local order store
      const order = await createOrder({
        ...orderPayload,
        id: sharedOrderId,
        orderId: sharedOrderId,
        addressTag: selectedAddress.tag,
        items: orderPayload.items.map((it) => ({
          id: it.kitId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          servings: it.servings,
          spiceLevel: it.spiceLevel,
          masalaSachets: it.masalaSachets || [],
          imageUrl: it.imageUrl,
        })),
      });

      // 6. Check for referral reward qualification if referee
      if (user?.uid) {
        qualifyReferralOrder(user.uid, sharedOrderId).catch(() => {});
      }

      // 7. Refresh wallet balance and clear basket
      await refreshWallet();
      clearCart();

      // 8. Transition to order confirmation
      onOrderPlaced(order, creditsApplied, payableAmount, deliveryInstructions);
    } catch (err: any) {
      console.warn('[CheckoutView] Error placing order:', err);
      Alert.alert('Order Failed', err?.message || 'Could not complete order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Checkout & Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Delivery Address */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Icon name="location" size={18} color={colors.primary} />
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Delivery Address
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAddressModalVisible(true)}
              style={styles.changeLink}
            >
              <Text style={[styles.changeLinkText, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressBox}>
            <View style={styles.badgeRow}>
              <Badge
                label={selectedAddress.tag || 'Home'}
                variant={selectedAddress.tag === 'Home' ? 'accent' : 'neutral'}
              />
              <Text style={[styles.addressName, { color: colors.textPrimary }]}>
                {selectedAddress.name} ({selectedAddress.phone})
              </Text>
            </View>
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {selectedAddress.flatAndStreet}, {selectedAddress.areaAndLandmark}
            </Text>
            <Text style={[styles.addressCityPin, { color: colors.textMuted }]}>
              {selectedAddress.city} - {selectedAddress.pincode}
            </Text>

            {deliveryInstructions ? (
              <View style={[styles.instructionBadge, { backgroundColor: colors.bgPrimary }]}>
                <Icon name="information-circle" size={14} color={colors.primary} />
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {deliveryInstructions}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Step 2: Delivery Slot */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.titleWithIcon}>
            <Icon name="time" size={18} color={colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Delivery Schedule
            </Text>
          </View>

          <View style={styles.slotsGrid}>
            {DELIVERY_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot.title;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#292524'
                          : '#FFF7ED'
                        : colors.bgPrimary,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                    },
                  ]}
                  onPress={() => setSelectedSlot(slot.title)}
                >
                  <View style={styles.slotHeader}>
                    <Badge label={slot.tag} variant={isSelected ? 'accent' : 'outline'} />
                    {isSelected && <Icon name="checkmark-circle" size={16} color={colors.primary} />}
                  </View>
                  <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>
                    {slot.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Rasoi Credits Wallet Toggle */}
        <View
          style={[
            styles.walletSectionCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
              borderColor: colors.primary,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletLeft}>
              <View style={[styles.walletIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="wallet" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.walletTitle, { color: colors.textPrimary }]}>
                  Rasoi Credits
                </Text>
                <Text style={[styles.walletSub, { color: colors.textSecondary }]}>
                  Available: ₹{Math.round(availableBalance).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <Switch
              testID="checkout-wallet-toggle"
              value={useWalletCredits && availableBalance > 0}
              onValueChange={setUseWalletCredits}
              disabled={availableBalance <= 0}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {useWalletCredits && availableBalance > 0 && (
            <View style={[styles.walletDeductionInfo, { borderTopColor: colors.borderLight }]}>
              <View style={styles.deductionRow}>
                <Text style={[styles.deductionLabel, { color: colors.textSecondary }]}>
                  Credits being applied:
                </Text>
                <Text style={[styles.deductionAmount, { color: colors.primary }]}>
                  -₹{Math.round(creditsApplied).toLocaleString('en-IN')}
                </Text>
              </View>
              {isFullyWalletPaid ? (
                <View style={[styles.fullyCoveredBadge, { backgroundColor: '#DEF7EC' }]}>
                  <Icon name="checkmark-circle" size={16} color="#0E9F6E" />
                  <Text style={[styles.fullyCoveredText, { color: '#03543F' }]}>
                    Order 100% covered by credits! No external payment needed.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.remainingHint, { color: colors.textMuted }]}>
                  Remaining ₹{Math.round(payableAmount).toLocaleString('en-IN')} to pay via chosen payment method.
                </Text>
              )}
            </View>
          )}

          {availableBalance <= 0 && (
            <Text style={[styles.noCreditsHint, { color: colors.textMuted }]}>
              You have ₹0 credits. Refer friends to earn ₹300 credits per referral!
            </Text>
          )}
        </View>

        {/* Step 4: Payment Methods (Only if payableAmount > 0) */}
        {!isFullyWalletPaid && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.titleWithIcon}>
              <Icon name="card" size={18} color={colors.primary} />
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Payment Method
              </Text>
            </View>

            <View style={styles.methodsList}>
              {(['UPI', 'Card', 'Cash on Delivery'] as PaymentMethod[]).map((method) => {
                const isSelected = selectedPaymentMethod === method;
                const iconName =
                  method === 'UPI' ? 'phone-portrait' : method === 'Card' ? 'card' : 'cash';
                const subtitle =
                  method === 'UPI'
                    ? 'Google Pay, PhonePe, Paytm'
                    : method === 'Card'
                    ? 'Visa, Mastercard, RuPay'
                    : 'Pay cash or UPI upon delivery';

                return (
                  <TouchableOpacity
                    key={method}
                    testID={`checkout-payment-method-${method}`}
                    style={[
                      styles.methodRow,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#292524'
                            : '#FFF7ED'
                          : colors.bgPrimary,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                      },
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <View style={styles.methodLeft}>
                      <Icon
                        name={iconName as any}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <View>
                        <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                          {method}
                        </Text>
                        <Text style={[styles.methodSub, { color: colors.textSecondary }]}>
                          {subtitle}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* UPI ID input if UPI is selected */}
            {selectedPaymentMethod === 'UPI' && (
              <View style={styles.upiInputWrap}>
                <Text style={[styles.upiLabel, { color: colors.textPrimary }]}>
                  UPI ID (Optional for fast intent)
                </Text>
                <TextInput
                  style={[
                    styles.upiInput,
                    {
                      borderColor: colors.borderLight,
                      backgroundColor: colors.bgPrimary,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. yourname@okhdfcbank"
                  placeholderTextColor={colors.textMuted}
                  value={upiId}
                  onChangeText={setUpiId}
                />
              </View>
            )}
          </View>
        )}

        {/* Step 5: Price Breakdown */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 12 }]}>
            Bill Details
          </Text>

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Item Total</Text>
            <Text style={[styles.billValue, { color: colors.textPrimary }]}>
              ₹{Math.round(subtotal).toLocaleString('en-IN')}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#10B981' }]}>
                Coupon Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}
              </Text>
              <Text style={[styles.billValue, { color: '#10B981' }]}>
                -₹{Math.round(discount).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
            <Text style={[styles.billValue, { color: colors.textPrimary }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${Math.round(deliveryFee)}`}
            </Text>
          </View>

          {creditsApplied > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.primary, fontWeight: '700' }]}>
                Rasoi Credits Applied
              </Text>
              <Text style={[styles.billValue, { color: colors.primary, fontWeight: '700' }]}>
                -₹{Math.round(creditsApplied).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.billRow}>
            <Text style={[styles.billTotalLabel, { color: colors.textPrimary }]}>
              {isFullyWalletPaid ? 'Total Deducted' : 'To Pay'}
            </Text>
            <Text style={[styles.billTotalValue, { color: colors.primary }]}>
              ₹{Math.round(isFullyWalletPaid ? creditsApplied : payableAmount).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Place Order CTA */}
        <View style={styles.ctaWrap}>
          <Button
            testID="checkout-place-order-btn"
            title={
              isProcessing
                ? 'Securing Order...'
                : isFullyWalletPaid
                ? `Confirm with ₹${Math.round(creditsApplied)} Credits`
                : `Pay ₹${Math.round(payableAmount).toLocaleString('en-IN')} & Place Order`
            }
            variant="primary"
            size="lg"
            loading={isProcessing}
            disabled={isProcessing}
            onPress={handlePlaceOrder}
          />
          <Text style={[styles.securityNote, { color: colors.textMuted }]}>
            🔒 256-bit encrypted checkout • 100% freshness guarantee
          </Text>
        </View>
      </ScrollView>

      {/* Address Selection Modal */}
      <AddressSelectionModal
        visible={addressModalVisible}
        selectedAddressId={selectedAddress.id}
        onSelectAddress={setSelectedAddress}
        onClose={() => setAddressModalVisible(false)}
        deliveryInstructions={deliveryInstructions}
        onChangeDeliveryInstructions={setDeliveryInstructions}
      />
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  changeLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addressBox: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressCityPin: {
    fontSize: 12,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  instructionText: {
    fontSize: 12,
    flex: 1,
  },
  slotsGrid: {
    gap: 8,
  },
  slotCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletSectionCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  walletSub: {
    fontSize: 12,
    marginTop: 2,
  },
  walletDeductionInfo: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 6,
  },
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  deductionAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  fullyCoveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  fullyCoveredText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  remainingHint: {
    fontSize: 11,
  },
  noCreditsHint: {
    fontSize: 11,
    marginTop: 8,
  },
  methodsList: {
    gap: 8,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodSub: {
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiInputWrap: {
    marginTop: 12,
  },
  upiLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  upiInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  billTotalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  ctaWrap: {
    marginTop: 10,
    gap: 8,
  },
  securityNote: {
    fontSize: 11,
    textAlign: 'center',
  },
});
