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
import { router, useLocalSearchParams } from 'expo-router';
import { useCart, PaymentMethod } from '../../framework/context/CartContext';
import { usePreferences, AddressItem } from '../../framework/context/PreferencesContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { MealKit } from '../../framework/services/mealKitsService';
import { createOrder, Order } from '../../framework/firebase/ordersService';
import { createOrderInSupabase } from '../../framework/services/supabaseOrdersService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { QuantityStepper } from '../../framework/ui/QuantityStepper';
import { Icon } from '../../framework/ui/Icon';
import { useHeaderTopPadding } from '../../framework/ui/ScreenHeader';
import { CheckoutView } from '../checkout/CheckoutView';
import { OrderConfirmationView } from '../checkout/OrderConfirmationView';
import { SegmentedControl } from '../../framework/ui/SegmentedControl';
import { useFamily } from '../../framework/context/FamilyContext';
import { getOrCreateGuestId } from '../../framework/services/guestService';
import { FamilyCartView } from '../family/FamilyCartView';
import { FamilyManagementView } from '../family/FamilyManagementView';
import { useCookMode } from '../../framework/context/CookModeContext';

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

  // Checkout flow states (delegated to CheckoutView)
  const [flowStep, setFlowStep] = useState<'cart' | 'checkout' | 'confirmation'>('cart');
  const [walletCreditsApplied, setWalletCreditsApplied] = useState(0);
  const [payableAmount, setPayableAmount] = useState(0);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const {
    family,
    activeCartType,
    setActiveCartType,
    isDependent,
    isOwner,
    isCartLocked,
    addFamilyItem,
    cartState: familyCartState,
  } = useFamily();
  const [familyHubVisible, setFamilyHubVisible] = useState(false);
  const { activeOrders } = useCookMode();
  const headerPaddingTop = useHeaderTopPadding(6);

  const handleMoveToFamilyBasket = async (item: {
    kit: MealKit;
    quantity: number;
    servings: number;
    spiceLevel?: string;
  }) => {
    const res = await addFamilyItem(item.kit, item.quantity, item.servings, item.spiceLevel);
    if (res && !res.success) {
      Alert.alert('Cannot Move Item', res.error || 'Failed to move item to family basket.');
      return;
    }
    removeItem(item.kit.id, item.servings, item.spiceLevel);
  };

  const params = useLocalSearchParams<{ step?: string; type?: string }>();
  React.useEffect(() => {
    if (params?.step === 'checkout') {
      if (params?.type === 'family') {
        setActiveCartType('family');
      }
      setFlowStep('checkout');
    }
  }, [params?.step, params?.type, setActiveCartType]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = applyCouponCode(couponInput);
    if (!res.success) {
      Alert.alert('Coupon Alert', res.message);
    }
  };

  // Order confirmation step
  if (flowStep === 'confirmation' && confirmedOrder) {
    return (
      <OrderConfirmationView
        order={confirmedOrder}
        walletCreditsApplied={walletCreditsApplied}
        payableAmount={payableAmount}
        deliveryInstructions={deliveryInstructions}
        onContinueShopping={() => {
          setConfirmedOrder(null);
          setFlowStep('cart');
        }}
        onViewOrders={() => {
          setConfirmedOrder(null);
          setFlowStep('cart');
          router.push('/(tabs)/orders' as any);
        }}
      />
    );
  }

  // Dedicated checkout step (supports both personal and family cart checkout)
  if (flowStep === 'checkout') {
    return (
      <CheckoutView
        onBack={() => setFlowStep('cart')}
        onOrderPlaced={(order, credits, payable, instructions) => {
          setConfirmedOrder(order);
          setWalletCreditsApplied(credits);
          setPayableAmount(payable);
          setDeliveryInstructions(instructions);
          setFlowStep('confirmation');
        }}
      />
    );
  }

  // Dependents only see Family Cart; members with activeCartType === 'family' see FamilyCartView
  if (isDependent || (family && activeCartType === 'family')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {!isDependent && (
          <View
            style={{ paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.bgSurface }}
          >
            <SegmentedControl
              options={[
                { label: `Personal (${items.length})`, value: 'personal' },
                { label: `Family (${familyCartState.approvedCount})`, value: 'family' },
              ]}
              selectedValue={activeCartType}
              onSelect={(val) => setActiveCartType(val as 'personal' | 'family')}
            />
          </View>
        )}
        <FamilyCartView onProceedToCheckout={() => setFlowStep('checkout')} />
      </View>
    );
  }

  // Empty personal cart screen
  if (items.length === 0 && !confirmedOrder) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={{
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {family && !isDependent && (
            <View style={{ width: '100%', maxWidth: 440, marginBottom: 16 }}>
              <SegmentedControl
                options={[
                  { label: `Personal (0)`, value: 'personal' },
                  { label: `Family (${familyCartState.approvedCount})`, value: 'family' },
                ]}
                selectedValue={activeCartType}
                onSelect={(val) => setActiveCartType(val as 'personal' | 'family')}
              />
            </View>
          )}

          {/* If there is an active placed order, show meal kits ready to cook */}
          {activeOrders && activeOrders.length > 0 && (
            <View
              testID="cart-active-order-section"
              style={[
                styles.activeOrderCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.primary,
                  borderRadius: radii.xl,
                  ...shadows.card,
                },
              ]}
            >
              <View style={styles.activeOrderHeader}>
                <View
                  style={[styles.activeOrderIconCircle, { backgroundColor: colors.primary + '20' }]}
                >
                  <Icon name="restaurant" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeOrderTitle, { color: colors.textPrimary }]}>
                    Recent Placed Order • Ready to Cook!
                  </Text>
                  <Text style={[styles.activeOrderSubtitle, { color: colors.textSecondary }]}>
                    Tap any meal kit below to open its recipe:
                  </Text>
                </View>
                <Badge label={activeOrders[0]?.status || 'Placed'} variant="success" size="sm" />
              </View>

              {activeOrders[0]?.items?.map((kitItem: any, kIdx: number) => {
                const kId = kitItem.kitId || kitItem.id || `placed-kit-${kIdx}`;
                return (
                  <TouchableOpacity
                    key={kIdx}
                    testID={`cart-placed-mealkit-${kId}`}
                    style={[
                      styles.activeOrderKitRow,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderRadius: radii.md,
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      if (!activeOrders[0]) return;
                      router.push({
                        pathname: '/cook/[orderId]' as any,
                        params: {
                          orderId: activeOrders[0].id,
                          kitId: kitItem.kitId || kitItem.id,
                        },
                      });
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Open recipe for ${kitItem.name || kitItem.title}`}
                  >
                    {kitItem.heroImage || kitItem.imageUrl ? (
                      <Image
                        source={{ uri: kitItem.heroImage || kitItem.imageUrl }}
                        style={styles.activeKitThumb}
                      />
                    ) : (
                      <View
                        style={[
                          styles.activeKitThumb,
                          {
                            backgroundColor: colors.primary + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                      >
                        <Icon name="restaurant" size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={[styles.activeKitName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {kitItem.name || kitItem.title || 'Gourmet Meal Kit'}
                      </Text>
                      <Text style={[styles.activeKitMeta, { color: colors.textSecondary }]}>
                        Qty: {kitItem.quantity} • Tap to view recipe
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                        Open Recipe
                      </Text>
                      <Icon name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ marginBottom: 16, marginTop: activeOrders.length > 0 ? 16 : 30 }}>
            <Icon name="basket" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.emptyBasketTitle, { color: colors.textPrimary }]}>
            Your Cooking Basket is Empty
          </Text>
          <Text style={[styles.emptyBasketSubtitle, { color: colors.textSecondary }]}>
            Discover restaurant-grade meal kits with authentic pre-portioned masalas!
          </Text>
          <Button
            title="Explore Gourmet Meal Kits"
            icon={<Icon name="restaurant" size={18} color="#FFFFFF" />}
            style={{ marginTop: 20 }}
            onPress={() => router.push('/' as any)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* App Bar */}
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderLight,
            paddingTop: headerPaddingTop,
          },
        ]}
      >
        {family && !isDependent ? (
          <View style={{ flex: 1, marginRight: 12 }}>
            <SegmentedControl
              options={[
                { label: `Personal (${items.length})`, value: 'personal' },
                { label: `Family (${familyCartState.approvedCount})`, value: 'family' },
              ]}
              selectedValue={activeCartType}
              onSelect={(val) => setActiveCartType(val as 'personal' | 'family')}
            />
          </View>
        ) : (
          <Text style={[styles.appBarTitle, { color: colors.textPrimary, flex: 1 }]}>
            Your Meal-Kit Basket ({items.length})
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setFamilyHubVisible(true)}
            style={{ padding: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Icon name="people" size={20} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Family</Text>
          </TouchableOpacity>

          {activeCartType === 'personal' && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={[styles.clearCartText, { color: colors.danger }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeCartType === 'family' ? (
          <FamilyCartView />
        ) : (
          <>
            {/* FREE COLD-CHAIN DELIVERY PROGRESS TRACKER */}
            <View
              testID="cart-free-delivery-tracker"
              style={[
                styles.deliveryTrackerCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  ...shadows.soft,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor:
                        subtotal >= 499 ? colors.bgSuccessSubtle : colors.primaryLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      name="car"
                      size={15}
                      color={subtotal >= 499 ? colors.textSuccess : colors.primary}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: colors.textPrimary,
                      flex: 1,
                    }}
                    numberOfLines={2}
                  >
                    {subtotal >= 499
                      ? 'Free Delivery Unlocked!'
                      : `Add ₹${499 - subtotal} more for FREE delivery`}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: subtotal >= 499 ? colors.bgSuccessSubtle : colors.bgSubtle,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: radii.sm,
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: subtotal >= 499 ? colors.textSuccess : colors.textSecondary,
                    }}
                  >
                    {subtotal >= 499 ? 'FREE' : '₹49 fee'}
                  </Text>
                </View>
              </View>
              {/* Progress Track */}
              <View
                style={[
                  styles.deliveryTrackBg,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
                ]}
              >
                <View
                  style={[
                    styles.deliveryTrackFill,
                    {
                      width: `${Math.min(100, Math.round((subtotal / 499) * 100))}%`,
                      backgroundColor: subtotal >= 499 ? colors.success : colors.primary,
                      borderRadius: radii.pill,
                    },
                  ]}
                />
              </View>
            </View>

            {/* LINE ITEMS LIST */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                1. Recipe Items
              </Text>
              {items.map(({ kit, quantity, servings, spiceLevel, unitPrice }, index) => (
                <View
                  key={`${kit.id}-${servings}-${spiceLevel}-${index}`}
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      borderWidth: 1,
                      ...shadows.card,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: kit.heroImage }}
                    style={[styles.itemThumb, { borderRadius: radii.lg }]}
                  />
                  <View style={styles.itemInfo}>
                    <View style={styles.itemHeader}>
                      <Text
                        style={[styles.itemName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {kit.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeItem(kit.id, servings, spiceLevel)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${kit.name} from basket`}
                      >
                        <Icon name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Serving & Spice Badges */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginVertical: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: colors.bgSubtle,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.borderLight,
                        }}
                      >
                        <Icon name="people" size={12} color={colors.textSecondary} />
                        <Text
                          style={{ fontSize: 11, fontWeight: '700', color: colors.textPrimary }}
                        >
                          {servings} Servings
                        </Text>
                      </View>
                      {spiceLevel ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: colors.primaryLight,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: colors.primary + '30',
                          }}
                        >
                          <Icon name="flame" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                            {spiceLevel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.itemBottomRow}>
                      <Text style={[styles.itemPrice, { color: colors.primary }]}>
                        ₹{(unitPrice ?? kit.price) * quantity}
                      </Text>
                      <QuantityStepper
                        value={quantity}
                        onChange={(q) => updateQuantity(kit.id, q, servings, spiceLevel)}
                        size="sm"
                      />
                    </View>

                    {/* Move to Family Basket Action */}
                    {family && !isDependent && (
                      <View style={[styles.moveRow, { borderTopColor: colors.borderLight }]}>
                        <TouchableOpacity
                          style={[
                            styles.moveBasketBtn,
                            {
                              backgroundColor:
                                isCartLocked && !isOwner ? colors.bgSubtle : colors.primaryLight,
                              borderColor:
                                isCartLocked && !isOwner
                                  ? colors.borderLight
                                  : colors.primary + '30',
                              borderRadius: radii.pill,
                            },
                          ]}
                          onPress={() =>
                            handleMoveToFamilyBasket({ kit, quantity, servings, spiceLevel })
                          }
                          disabled={isCartLocked && !isOwner}
                          activeOpacity={0.7}
                          testID={`move-to-family-basket-btn-${kit.id}`}
                        >
                          <Icon
                            name="swap-horizontal"
                            size={13}
                            color={isCartLocked && !isOwner ? colors.textMuted : colors.primary}
                          />
                          <Text
                            style={[
                              styles.moveBasketBtnText,
                              {
                                color: isCartLocked && !isOwner ? colors.textMuted : colors.primary,
                              },
                            ]}
                          >
                            {isCartLocked && !isOwner
                              ? 'Family Basket (Locked)'
                              : 'Move to Family Basket'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* PROMO COUPON CODE */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                2. Offers & Discount Coupons
              </Text>

              {appliedCoupon ? (
                <View
                  style={[styles.appliedCouponBanner, { backgroundColor: colors.primaryLight }]}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <Icon name="tag" size={16} color={colors.primary} />
                      <Text
                        testID="cart-applied-coupon-text"
                        style={[styles.couponCodeText, { color: colors.primary, marginBottom: 0 }]}
                      >
                        {appliedCoupon.code} Applied
                      </Text>
                    </View>
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
                    testID="cart-coupon-input"
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
                    testID="cart-apply-coupon-btn"
                    title="Apply"
                    size="sm"
                    onPress={handleApplyCoupon}
                    style={{ marginLeft: 8, paddingHorizontal: 16 }}
                  />
                </View>
              )}

              <View style={styles.popularCoupons}>
                <Text
                  style={[styles.popularCouponsLabel, { color: colors.textMuted, marginBottom: 8 }]}
                >
                  Available Coupons:
                </Text>

                {/* Coupon 1: RASOI100 */}
                <TouchableOpacity
                  style={[
                    styles.couponCard,
                    {
                      backgroundColor:
                        appliedCoupon?.code === 'RASOI100' ? colors.primaryLight : colors.bgSubtle,
                      borderColor:
                        appliedCoupon?.code === 'RASOI100' ? colors.primary : colors.borderLight,
                      borderRadius: radii.lg,
                    },
                  ]}
                  onPress={() => applyCouponCode('RASOI100')}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        testID="cart-coupon-rasoi100"
                        style={[styles.couponCardCode, { color: colors.primary }]}
                      >
                        RASOI100
                      </Text>
                      {subtotal < 499 ? (
                        <Badge
                          label={`Add ₹${499 - subtotal} to unlock`}
                          variant="neutral"
                          size="sm"
                        />
                      ) : (
                        <Badge label="Eligible" variant="success" size="sm" />
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      ₹100 flat discount on chef boxes above ₹499
                    </Text>
                  </View>
                  <Text style={[styles.couponApplyAction, { color: colors.primary }]}>
                    {appliedCoupon?.code === 'RASOI100' ? 'APPLIED ✓' : 'APPLY'}
                  </Text>
                </TouchableOpacity>

                {/* Coupon 2: FREEDEL */}
                <TouchableOpacity
                  style={[
                    styles.couponCard,
                    {
                      backgroundColor:
                        appliedCoupon?.code === 'FREEDEL' ? colors.accentLight : colors.bgSubtle,
                      borderColor:
                        appliedCoupon?.code === 'FREEDEL' ? colors.accent : colors.borderLight,
                      borderRadius: radii.lg,
                    },
                  ]}
                  onPress={() => applyCouponCode('FREEDEL')}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        testID="cart-coupon-freedel"
                        style={[styles.couponCardCode, { color: colors.accent }]}
                      >
                        FREEDEL
                      </Text>
                      {subtotal < 299 ? (
                        <Badge
                          label={`Add ₹${299 - subtotal} to unlock`}
                          variant="neutral"
                          size="sm"
                        />
                      ) : (
                        <Badge label="Eligible" variant="success" size="sm" />
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      Free delivery on chef boxes above ₹299
                    </Text>
                  </View>
                  <Text style={[styles.couponApplyAction, { color: colors.accent }]}>
                    {appliedCoupon?.code === 'FREEDEL' ? 'APPLIED ✓' : 'APPLY'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SEPARATE SECTION: RASOI CREDITS WALLET */}
            <View
              testID="cart-guest-wallet-notice"
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  ...shadows.card,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="wallet" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 2 }]}
                  >
                    Rasoi Cooking Credits
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {user
                      ? 'Apply available wallet credits directly on the Checkout screen.'
                      : 'Sign in to redeem cashback, cooking credits, and referral rewards.'}
                  </Text>
                </View>
                {!user && (
                  <TouchableOpacity
                    onPress={() => router.push('/login' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in to use wallet credits"
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: radii.pill,
                      backgroundColor: colors.primaryLight,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* PREFERRED DELIVERY SLOT */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                3. Delivery Slot
              </Text>

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
                    accessibilityRole="button"
                    accessibilityLabel={`Select delivery slot ${slot.title}`}
                  >
                    <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <Text
                        style={[
                          styles.slotTitle,
                          { color: isSelected ? colors.primary : colors.textPrimary },
                        ]}
                        numberOfLines={2}
                      >
                        {slot.title}
                      </Text>
                    </View>
                    <Badge
                      label={slot.tag}
                      variant={isSelected ? 'primary' : 'neutral'}
                      size="sm"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ORDER SUMMARY */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Order Summary
              </Text>

              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Items Subtotal
                </Text>
                <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>₹{subtotal}</Text>
              </View>

              {discount > 0 && (
                <View style={styles.summaryLine}>
                  <Text style={[styles.summaryLabel, { color: colors.primary }]}>
                    Coupon Discount
                  </Text>
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
                <Text
                  testID="cart-grand-total"
                  style={[styles.totalAmount, { color: colors.primary }]}
                >
                  ₹{total}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* BOTTOM CHECKOUT BAR (PERSONAL BASKET ONLY) */}
      {activeCartType === 'personal' && (
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
            testID="cart-proceed-checkout-btn"
            title="Proceed to Checkout"
            icon={<Icon name="arrow-forward" size={18} color="#FFFFFF" />}
            size="lg"
            style={{ flex: 1, marginLeft: 16 }}
            onPress={() => setFlowStep('checkout')}
          />
        </View>
      )}

      {/* FAMILY HUB MODAL */}
      <Modal visible={familyHubVisible} animationType="slide">
        <FamilyManagementView onClose={() => setFamilyHubVisible(false)} />
      </Modal>
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
    paddingTop: 12,
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
  deliveryTrackerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
  },
  deliveryTrackBg: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  deliveryTrackFill: {
    height: '100%',
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    width: '100%',
  },
  couponCardCode: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  couponApplyAction: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 10,
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
  familySwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tabSwitchButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeOrderCard: {
    width: '100%',
    maxWidth: 440,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  activeOrderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOrderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeOrderSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  activeOrderKitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  activeKitThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  activeKitName: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeKitMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  moveRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  moveBasketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  moveBasketBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
