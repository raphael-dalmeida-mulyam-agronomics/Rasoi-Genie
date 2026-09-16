import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useCart, PaymentMethod } from '../../framework/context/CartContext';
import { usePreferences, AddressItem } from '../../framework/context/PreferencesContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { createOrder, Order } from '../../framework/firebase/ordersService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { QuantityStepper } from '../../framework/ui/QuantityStepper';

const DELIVERY_SLOTS = [
  { id: 'slot-1', title: '6:00 PM - 8:00 PM (Dinner)', tag: 'Fastest' },
  { id: 'slot-2', title: '8:00 PM - 10:00 PM (Late Dinner)', tag: 'Popular' },
  { id: 'slot-3', title: 'Tomorrow 11:00 AM - 1:00 PM (Lunch)', tag: 'Next Day' },
  { id: 'slot-4', title: 'Tomorrow 6:00 PM - 8:00 PM (Dinner)', tag: 'Next Day' },
];

export const CartView: React.FC = () => {
  const { user } = useAuth();
  const { colors, radii, shadows } = useTheme();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    discount,
    total,
    appliedCoupon,
    couponMessage,
    applyCouponCode,
    removeCoupon,
    selectedSlot,
    setSelectedSlot,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = useCart();

  const { addresses, addAddress, defaultAddress } = usePreferences();

  const [couponInput, setCouponInput] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress?.id || addresses[0]?.id || '',
  );
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [newFlat, setNewFlat] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newPincode, setNewPincode] = useState('560103');
  const [newTag, setNewTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // UPI Input
  const [upiId, setUpiId] = useState('priya@okhdfcbank');

  // Checkout flow states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const activeAddress =
    addresses.find((a) => a.id === selectedAddressId) || defaultAddress || addresses[0];

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = applyCouponCode(couponInput);
    if (!res.success) {
      Alert.alert('Coupon Alert', res.message);
    }
  };

  const handleAddNewAddress = () => {
    if (!newFlat.trim() || !newArea.trim()) {
      Alert.alert('Address Incomplete', 'Please provide flat/house no and area.');
      return;
    }

    addAddress({
      name: user?.displayName || 'Customer',
      phone: user?.phoneNumber || '+91 98765 43210',
      flatAndStreet: newFlat.trim(),
      areaAndLandmark: newArea.trim(),
      city: newCity.trim(),
      pincode: newPincode.trim(),
      tag: newTag,
      isDefault: true,
    });

    setAddressModalVisible(false);
    setNewFlat('');
    setNewArea('');
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (!activeAddress) {
      Alert.alert('Address Required', 'Please select or add a delivery address.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const order = await createOrder({
        userId: user?.uid || 'guest_user_' + Date.now(),
        customerPhone: user?.phoneNumber || activeAddress.phone || '+91 9876543210',
        customerName: user?.displayName || activeAddress.name || 'Valued Chef',
        customerEmail: user?.email || undefined,
        deliveryAddress: `${activeAddress.flatAndStreet}, ${activeAddress.areaAndLandmark}, ${activeAddress.city} - ${activeAddress.pincode}`,
        addressTag: activeAddress.tag,
        deliverySlot: selectedSlot,
        items: items.map((i) => ({
          id: i.kit.id,
          name: i.kit.name,
          quantity: i.quantity,
          price: i.kit.price,
          masalaSachets: i.kit.masalaSachets,
          imageUrl: i.kit.heroImage,
        })),
        subtotal,
        discount,
        couponCode: appliedCoupon?.code,
        deliveryFee,
        totalAmount: total,
        paymentMethod: selectedPaymentMethod,
      });

      setConfirmedOrder(order);
      clearCart();
    } catch (err) {
      Alert.alert('Order Placement Failed', 'Could not complete order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Empty cart screen
  if (items.length === 0 && !confirmedOrder) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]}>
        <Text style={styles.emptyBasketEmoji}>🧺</Text>
        <Text style={[styles.emptyBasketTitle, { color: colors.textPrimary }]}>
          Your Cooking Basket is Empty
        </Text>
        <Text style={[styles.emptyBasketSubtitle, { color: colors.textSecondary }]}>
          Discover restaurant-grade meal kits with authentic pre-portioned masalas!
        </Text>
        <Button
          title="Explore Gourmet Meal Kits 🍳"
          style={{ marginTop: 20 }}
          onPress={() => router.push('/' as any)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* App Bar */}
      <View
        style={[
          styles.appBar,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>
          Your Meal-Kit Basket ({items.length})
        </Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={[styles.clearCartText, { color: colors.danger }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* LINE ITEMS LIST */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Recipe Items</Text>
          {items.map(({ kit, quantity, servings }) => (
            <View
              key={kit.id}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.lg,
                  borderColor: colors.borderLight,
                  ...shadows.card,
                },
              ]}
            >
              <Image source={{ uri: kit.heroImage }} style={styles.itemThumb} />
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {kit.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(kit.id)}>
                    <Text style={[styles.deleteBtn, { color: colors.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                  {kit.cuisine} • {servings} Servings Box
                </Text>

                <View style={styles.itemBottomRow}>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>
                    ₹{kit.price * quantity}
                  </Text>
                  <QuantityStepper
                    value={quantity}
                    onChange={(q) => updateQuantity(kit.id, q)}
                    size="sm"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* PROMO COUPON CODE */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            2. Offers & Discount Coupons
          </Text>

          {appliedCoupon ? (
            <View style={[styles.appliedCouponBanner, { backgroundColor: colors.primaryLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.couponCodeText, { color: colors.primary }]}>
                  🎉 {appliedCoupon.code} Applied
                </Text>
                <Text style={[styles.couponSavingsText, { color: colors.primaryDark }]}>
                  {couponMessage || `You saved ₹${discount} on this box!`}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponBtn}>
                <Text style={[styles.removeCouponText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <TextInput
                style={[
                  styles.couponInput,
                  {
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Enter coupon (e.g. RASOI100, FREEDEL)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={couponInput}
                onChangeText={setCouponInput}
              />
              <Button
                title="Apply"
                size="sm"
                onPress={handleApplyCoupon}
                style={{ marginLeft: 8, paddingHorizontal: 16 }}
              />
            </View>
          )}

          <View style={styles.popularCoupons}>
            <Text style={[styles.popularCouponsLabel, { color: colors.textMuted }]}>
              Available:
            </Text>
            <TouchableOpacity onPress={() => applyCouponCode('RASOI100')}>
              <Text
                style={[
                  styles.couponPill,
                  { color: colors.primary, borderColor: colors.primary + '40' },
                ]}
              >
                RASOI100 (₹100 OFF)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyCouponCode('FREEDEL')}>
              <Text
                style={[
                  styles.couponPill,
                  { color: colors.accent, borderColor: colors.accent + '40' },
                ]}
              >
                FREEDEL (Free Delivery)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DELIVERY ADDRESS SELECTION */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              3. Delivery Address
            </Text>
            <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
              <Text style={[styles.addAddressLink, { color: colors.primary }]}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.map((addr) => {
            const isSelected = addr.id === (activeAddress?.id || selectedAddressId);
            return (
              <TouchableOpacity
                key={addr.id}
                style={[
                  styles.addressCard,
                  {
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    backgroundColor: isSelected ? colors.primaryLight + '35' : colors.bgSubtle,
                    borderRadius: radii.lg,
                  },
                ]}
                onPress={() => setSelectedAddressId(addr.id)}
              >
                <View style={styles.addressTop}>
                  <Badge label={addr.tag} variant="accent" size="sm" />
                  {addr.isDefault && <Badge label="Default" variant="neutral" size="sm" />}
                </View>
                <Text style={[styles.addressText, { color: colors.textPrimary }]}>
                  {addr.flatAndStreet}, {addr.areaAndLandmark}
                </Text>
                <Text style={[styles.addressCity, { color: colors.textSecondary }]}>
                  {addr.city} - {addr.pincode} • {addr.phone}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* DELIVERY SLOT PICKER */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. Delivery Slot</Text>

          {DELIVERY_SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.title;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotRow,
                  {
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    backgroundColor: isSelected ? colors.primaryLight + '35' : colors.bgSubtle,
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setSelectedSlot(slot.title)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.slotTitle,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {slot.title}
                  </Text>
                </View>
                <Badge label={slot.tag} variant={isSelected ? 'primary' : 'neutral'} size="sm" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PAYMENT METHOD SELECTION */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            5. Payment Method
          </Text>

          {(['UPI', 'Card', 'Cash on Delivery'] as PaymentMethod[]).map((method) => {
            const isSelected = selectedPaymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  {
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    backgroundColor: isSelected ? colors.primaryLight + '30' : colors.bgSubtle,
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setSelectedPaymentMethod(method)}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>
                  {method === 'UPI' ? '⚡' : method === 'Card' ? '💳' : '💵'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.paymentTitle,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {method === 'UPI'
                      ? 'Instant UPI (Google Pay / PhonePe / Paytm / Amazon Pay)'
                      : method === 'Card'
                        ? 'Credit / Debit Card (Visa, MasterCard, RuPay)'
                        : 'Cash on Delivery (Pay upon doorstep handover)'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioDot,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}

          {selectedPaymentMethod === 'UPI' && (
            <View style={styles.upiSubBox}>
              <Text style={[styles.upiLabel, { color: colors.textSecondary }]}>UPI VPA ID:</Text>
              <TextInput
                style={[
                  styles.upiInput,
                  {
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    color: colors.textPrimary,
                  },
                ]}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="name@okaxis or name@upi"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* ORDER SUMMARY */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Order Summary</Text>

          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Items Subtotal
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>₹{subtotal}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryLine}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>Coupon Discount</Text>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>-₹{discount}</Text>
            </View>
          )}

          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Cold-Chain Delivery Fee
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>

          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              GST (5% Food Preparation)
            </Text>
            <Text style={[styles.summaryVal, { color: colors.textMuted }]}>Included</Text>
          </View>

          <View style={[styles.totalDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.summaryLineTotal}>
            <Text style={[styles.totalText, { color: colors.textPrimary }]}>Grand Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM CHECKOUT BAR */}
      <View
        style={[
          styles.checkoutBar,
          {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.borderLight,
            ...shadows.medium,
          },
        ]}
      >
        <View>
          <Text style={[styles.payableLabel, { color: colors.textMuted }]}>TO PAY</Text>
          <Text style={[styles.payableAmount, { color: colors.primary }]}>₹{total}</Text>
        </View>

        <Button
          title={isCheckingOut ? 'Authorizing Payment...' : `Place Order (₹${total}) 🚀`}
          size="lg"
          style={{ flex: 1, marginLeft: 16 }}
          loading={isCheckingOut}
          onPress={handlePlaceOrder}
        />
      </View>

      {/* NEW ADDRESS MODAL */}
      <Modal visible={addressModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.addressModalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Add New Address
              </Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Flat / House No., Apartment Name"
              value={newFlat}
              onChangeText={setNewFlat}
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
              placeholder="Street, Landmark, Area"
              value={newArea}
              onChangeText={setNewArea}
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
                placeholder="City"
                value={newCity}
                onChangeText={setNewCity}
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
                placeholder="Pincode"
                value={newPincode}
                onChangeText={setNewPincode}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
              {(['Home', 'Work', 'Other'] as const).map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChoice,
                    {
                      backgroundColor: newTag === tag ? colors.primary : colors.bgSubtle,
                      borderColor: newTag === tag ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setNewTag(tag)}
                >
                  <Text
                    style={{
                      color: newTag === tag ? '#fff' : colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Save Address" onPress={handleAddNewAddress} />
          </View>
        </View>
      </Modal>

      {/* ORDER CONFIRMATION MODAL */}
      {confirmedOrder && (
        <Modal visible={!!confirmedOrder} animationType="slide">
          <View style={[styles.successContainer, { backgroundColor: colors.bgPrimary }]}>
            <View style={styles.successContent}>
              <Text style={styles.successCelebration}>🎉</Text>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                Order Successfully Placed!
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Your fresh ingredient kit is now being portioned and packed in our cold-chain
                kitchen.
              </Text>

              <View
                style={[
                  styles.successCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textMuted }]}>ORDER ID</Text>
                  <Text style={[styles.successVal, { color: colors.textPrimary }]}>
                    {confirmedOrder.id}
                  </Text>
                </View>

                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textMuted }]}>TOTAL PAID</Text>
                  <Text style={[styles.successVal, { color: colors.primary }]}>
                    ₹{confirmedOrder.totalAmount}
                  </Text>
                </View>

                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textMuted }]}>SLOT</Text>
                  <Text style={[styles.successVal, { color: colors.textPrimary }]}>
                    {confirmedOrder.deliverySlot}
                  </Text>
                </View>

                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textMuted }]}>ADDRESS</Text>
                  <Text
                    style={[styles.successVal, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {confirmedOrder.deliveryAddress}
                  </Text>
                </View>
              </View>

              <View style={styles.successBtnCol}>
                <Button
                  title="Track Live Delivery 🚚"
                  size="lg"
                  onPress={() => {
                    setConfirmedOrder(null);
                    router.push('/(tabs)/orders' as any);
                  }}
                  style={{ marginBottom: 12 }}
                />
                <Button
                  title="Return to Home Catalog"
                  variant="outline"
                  onPress={() => {
                    setConfirmedOrder(null);
                    router.push('/' as any);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  appBarTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  clearCartText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 16,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemThumb: {
    width: 75,
    height: 75,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  deleteBtn: {
    fontSize: 16,
    fontWeight: '700',
    padding: 2,
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  appliedCouponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  couponCodeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  couponSavingsText: {
    fontSize: 12,
    marginTop: 2,
  },
  removeCouponBtn: {
    padding: 6,
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: '700',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  popularCoupons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularCouponsLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  couponPill: {
    fontSize: 11,
    fontWeight: '800',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  addAddressLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  addressCard: {
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  addressTop: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addressCity: {
    fontSize: 12,
    marginTop: 2,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  upiSubBox: {
    paddingTop: 8,
  },
  upiLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  upiInput: {
    height: 42,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalDivider: {
    height: 1,
    marginVertical: 10,
  },
  summaryLineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '900',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  payableLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  payableAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyBasketEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyBasketTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyBasketSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  addressModalBox: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalInput: {
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tagChoice: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  successCelebration: {
    fontSize: 60,
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successCard: {
    width: '100%',
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  successLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  successVal: {
    fontSize: 13,
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  successBtnCol: {
    width: '100%',
  },
});
