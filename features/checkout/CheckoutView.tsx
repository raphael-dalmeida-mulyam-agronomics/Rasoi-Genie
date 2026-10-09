import React, { useState, useMemo, useEffect } from 'react';
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
  Modal,
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
import { createDeliveryAddressSnapshot } from '../../framework/services/addressService';
import { processCheckoutPayment } from '../../framework/services/paymentGatewayService';
import { MockPaymentGatewayModal } from './MockPaymentGatewayModal';
import { qualifyReferralOrder } from '../../framework/services/referralService';
import { getOrCreateGuestId, saveGuestOrder } from '../../framework/services/guestService';
import { canonicalCityName } from '../admin/cityKitsSeederService';
import {
  getVerifiedContactInfo,
  saveVerifiedContactInfo,
  VerifiedContactInfo,
} from '../../framework/services/verifiedContactService';

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
  const { user, requestPhoneOTP, confirmPhoneOTP, updateUserContact } = useAuth();
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

  const { preferences, addresses, defaultAddress, addAddress } = usePreferences();
  const { availableBalance, debitCredits, refreshAll: refreshWallet } = useWallet();

  // Prefill Contact & Address Details
  const initialCity = canonicalCityName(preferences.city || preferences.currentCity || 'Bengaluru');
  const initialAddress = defaultAddress || addresses[0];

  const initialUserPhone = user?.phoneNumber
    ? user.phoneNumber.replace(/\D/g, '').slice(-10)
    : initialAddress?.phone
      ? initialAddress.phone.replace(/\D/g, '').slice(-10)
      : '';
  const initialUserName = user?.displayName || initialAddress?.name || '';
  const initialUserEmail = user?.email || '';

  const initialHasVerified = Boolean(
    initialUserName.trim() &&
    initialUserPhone.length === 10 &&
    Boolean(
      (user?.phoneNumber && user.phoneNumber.replace(/\D/g, '').endsWith(initialUserPhone)) ||
      (user &&
        initialAddress?.phone &&
        initialAddress.phone.replace(/\D/g, '').endsWith(initialUserPhone)),
    ),
  );

  const [name, setName] = useState(initialUserName);
  const [phone, setPhone] = useState(initialUserPhone);
  const [email, setEmail] = useState(initialUserEmail);
  const [flatAndStreet, setFlatAndStreet] = useState(initialAddress?.flatAndStreet || '');
  const [areaAndLandmark, setAreaAndLandmark] = useState(initialAddress?.areaAndLandmark || '');
  const [city] = useState(initialCity);
  const [pincode, setPincode] = useState(initialAddress?.pincode || '560001');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);

  // Address Saved States
  const initialHasSavedAddress = Boolean(
    initialAddress?.flatAndStreet?.trim() && initialAddress?.areaAndLandmark?.trim(),
  );
  const [hasSavedAddress, setHasSavedAddress] = useState<boolean>(initialHasSavedAddress);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(!initialHasSavedAddress);

  // Phone OTP Verification & Persistent Contact States
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(initialHasVerified);
  const [hasVerifiedContact, setHasVerifiedContact] = useState<boolean>(initialHasVerified);
  const [isEditingContact, setIsEditingContact] = useState<boolean>(!initialHasVerified);
  const [verifiedContactRecord, setVerifiedContactRecord] = useState<VerifiedContactInfo | null>(
    initialHasVerified
      ? {
          name: initialUserName,
          phone: initialUserPhone,
          email: initialUserEmail || undefined,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        }
      : null,
  );
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Load verified contact details and saved delivery address from database/cache on mount
  useEffect(() => {
    let isMounted = true;
    getVerifiedContactInfo(user?.uid).then((contact) => {
      if (!isMounted) return;
      if (contact && contact.name.trim() && contact.phone.length === 10) {
        setName(contact.name.trim());
        setPhone(contact.phone);
        if (contact.email) setEmail(contact.email);
        setIsPhoneVerified(true);
        setHasVerifiedContact(true);
        setIsEditingContact(false);
        setVerifiedContactRecord(contact);

        // Auto-load saved delivery address from database if present
        if (contact.address && contact.address.flatAndStreet && contact.address.areaAndLandmark) {
          setFlatAndStreet(contact.address.flatAndStreet);
          setAreaAndLandmark(contact.address.areaAndLandmark);
          if (contact.address.pincode) setPincode(contact.address.pincode);
          if (contact.address.deliveryInstructions) {
            setDeliveryInstructions(contact.address.deliveryInstructions);
          }
          setHasSavedAddress(true);
          setIsEditingAddress(false);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Resend countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (showOtpModal && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, resendTimer]);

  // UPI and Wallet States
  const [upiId, setUpiId] = useState('');
  const [useWalletCredits, setUseWalletCredits] = useState<boolean>(
    Boolean(user && availableBalance > 0),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showGatewayModal, setShowGatewayModal] = useState<boolean>(false);
  const [pendingGatewayOrderId, setPendingGatewayOrderId] = useState<string>('');

  // Calculate Payable Amount
  const { creditsApplied, payableAmount } = useMemo(() => {
    if (!user || !useWalletCredits || availableBalance <= 0) {
      return { creditsApplied: 0, payableAmount: total };
    }
    const applied = Math.min(availableBalance, total);
    const remaining = Math.max(0, total - applied);
    return { creditsApplied: applied, payableAmount: remaining };
  }, [user, useWalletCredits, availableBalance, total]);

  const isFullyWalletPaid = payableAmount === 0 && creditsApplied > 0;

  // Trigger Phone OTP flow
  const handleRequestPhoneOTP = async () => {
    const cleanPhone = phone.replace(/\D/g, '').trim();
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    try {
      const res = await requestPhoneOTP(cleanPhone);
      if (res.success) {
        setShowOtpModal(true);
        setResendTimer(30);
        setOtpCode('');
      } else {
        setOtpError(res.error || 'Failed to send OTP. Please try again.');
        Alert.alert('OTP Request Failed', res.error || 'Failed to send OTP');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOTP = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await confirmPhoneOTP(otpCode.trim());
      if (res.success) {
        setIsPhoneVerified(true);
        setShowOtpModal(false);

        const cleanPhone = phone.replace(/\D/g, '').trim();
        if (name.trim() && cleanPhone.length === 10) {
          const updatedRecord: VerifiedContactInfo = {
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim() || undefined,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
          };
          setHasVerifiedContact(true);
          setIsEditingContact(false);
          setVerifiedContactRecord(updatedRecord);

          const cleanFlat = flatAndStreet.trim();
          const cleanArea = areaAndLandmark.trim();
          const savedAddr =
            cleanFlat && cleanArea
              ? {
                  flatAndStreet: cleanFlat,
                  areaAndLandmark: cleanArea,
                  city,
                  pincode,
                  deliveryInstructions: deliveryInstructions.trim() || undefined,
                  tag: 'Home' as const,
                }
              : undefined;

          // Persist verified contact and address to database so future orders don't ask again
          saveVerifiedContactInfo({
            userId: user?.uid,
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim() || undefined,
            isGuest: !user,
            address: savedAddr,
          }).catch(() => {});

          if (user && updateUserContact) {
            updateUserContact({
              displayName: name.trim(),
              phoneNumber: `+91${cleanPhone}`,
              email: email.trim() || undefined,
            }).catch(() => {});
          }
        }
      } else {
        setOtpError(res.error || 'Invalid OTP code. Please check and try again.');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Validate form details
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your full name for order delivery.');
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, '').trim();
    if (cleanPhone.length !== 10) {
      Alert.alert('Phone Required', 'Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!flatAndStreet.trim()) {
      Alert.alert('Address Incomplete', 'Please provide flat/house number and street name.');
      return false;
    }
    if (!areaAndLandmark.trim()) {
      Alert.alert('Area Required', 'Please provide area or nearest landmark.');
      return false;
    }
    if (!isPhoneVerified) {
      handleRequestPhoneOTP();
      return false;
    }
    return true;
  };

  // Finalize Order Placement (after validation, payment authorization, or COD)
  const executeOrderPlacement = async (paymentDetails?: {
    paymentId?: string;
    signature?: string;
    gatewayOrderId?: string;
  }) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const cleanPhone = phone.replace(/\D/g, '').trim();
      const stableGuestId = user?.uid || (await getOrCreateGuestId());
      const deliveryAddressFormatted = `${flatAndStreet.trim()}, ${areaAndLandmark.trim()}, ${city} - ${pincode}`;
      const addressItem: AddressItem = {
        id: `addr-${Date.now()}`,
        name: name.trim(),
        phone: cleanPhone,
        flatAndStreet: flatAndStreet.trim(),
        areaAndLandmark: areaAndLandmark.trim(),
        city,
        pincode,
        tag: 'Home',
        isDefault: false,
      };

      const addressSnapshot = createDeliveryAddressSnapshot(addressItem, deliveryInstructions);
      const sharedTxnId =
        paymentDetails?.paymentId ||
        `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // 1. Debit wallet credits if applicable (signed-in users only)
      if (user && creditsApplied > 0) {
        const debitRes = await debitCredits({
          amount: creditsApplied,
          description: `Used for Meal Kit Order`,
        });

        if (!debitRes.success) {
          Alert.alert('Wallet Error', debitRes.error || 'Failed to debit wallet credits');
          setIsProcessing(false);
          return;
        }
      }

      const paymentMethod = isFullyWalletPaid ? 'Wallet' : selectedPaymentMethod;

      // 2. Prepare order payload
      const orderPayload = {
        userId: stableGuestId,
        customerPhone: cleanPhone,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
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
        totalAmount: payableAmount,
        paymentMethod,
        transactionId: sharedTxnId,
        walletCreditsApplied: creditsApplied,
        externalPaymentAmount: payableAmount,
        deliveryAddressSnapshot: addressSnapshot,
      };

      // 3. Create in Supabase (with full RLS guest support & regional admin scoping)
      const sbResult = await createOrderInSupabase(orderPayload as any);
      const sharedOrderId = sbResult?.orderId || `ORD-${Date.now().toString().slice(-6)}`;

      // 4. Create in local order store
      const order = await createOrder({
        ...orderPayload,
        id: sharedOrderId,
        orderId: sharedOrderId,
        addressTag: 'Home',
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

      // 5. Guest Local Order Persistence (Orders stay on this device)
      if (!user) {
        await saveGuestOrder(order);
      }

      // 6. Save verified contact information and delivery address to database for all future orders
      await saveVerifiedContactInfo({
        userId: user?.uid || stableGuestId,
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        isGuest: !user,
        address: {
          flatAndStreet: flatAndStreet.trim(),
          areaAndLandmark: areaAndLandmark.trim(),
          city,
          pincode,
          deliveryInstructions: deliveryInstructions.trim() || undefined,
          tag: 'Home',
        },
      });

      if (user && updateUserContact) {
        updateUserContact({
          displayName: name.trim(),
          phoneNumber: `+91${cleanPhone}`,
          email: email.trim() || undefined,
        }).catch(() => {});
      }

      // 7. Always save address in preferences for immediate cross-app accessibility
      addAddress({
        name: name.trim(),
        phone: cleanPhone,
        flatAndStreet: flatAndStreet.trim(),
        areaAndLandmark: areaAndLandmark.trim(),
        city,
        pincode,
        tag: 'Home',
        isDefault: true,
      }).catch(() => {});

      // 8. Referral qualification if signed-in user
      if (user?.uid) {
        qualifyReferralOrder(user.uid, sharedOrderId).catch(() => {});
      }

      // 9. Refresh wallet and clear cart
      if (user) {
        await refreshWallet();
      }
      clearCart();
      setPendingGatewayOrderId('');

      // 10. Transition to confirmation view
      onOrderPlaced(order, creditsApplied, payableAmount, deliveryInstructions);
    } catch (err: any) {
      console.warn('[CheckoutView] Order placement exception:', err);
      Alert.alert(
        'Order Placement Error',
        err?.message || 'Could not place order. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Place Order Handler with Mock Gateway Modal
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Basket', 'Your cooking basket is empty.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const paymentMethod = isFullyWalletPaid ? 'Wallet' : selectedPaymentMethod;

    // For online digital payments (UPI, Cards), open the Mock Payment Gateway Modal
    if (payableAmount > 0 && paymentMethod !== 'Cash on Delivery') {
      const nextOrderId = pendingGatewayOrderId || `ORD_${Date.now()}`;
      setPendingGatewayOrderId(nextOrderId);
      setShowGatewayModal(true);
      return;
    }

    // Direct checkout for Cash on Delivery or 100% wallet coverage
    await executeOrderPlacement();
  };

  return (
    <View testID="checkout-view" style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity testID="checkout-back-btn" onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Contact & Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Payment Error Banner if retryable */}
        {paymentError ? (
          <View
            style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
          >
            <Icon name="alert-circle" size={18} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Payment Pending / Failed</Text>
              <Text style={styles.errorBannerText}>{paymentError}</Text>
            </View>
            <TouchableOpacity
              testID="retry-payment-btn"
              onPress={handlePlaceOrder}
              style={[styles.retryBtn, { backgroundColor: '#EF4444' }]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* SECTION 1: Contact Details */}
        {hasVerifiedContact && !isEditingContact ? (
          <View
            testID="checkout-verified-contact-card"
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.verifiedHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Icon name="people" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  1. Contact Information
                </Text>
              </View>
              <View style={[styles.verifiedBadgePill, { backgroundColor: '#D1FAE5' }]}>
                <Icon name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.verifiedPillText}>Verified</Text>
              </View>
            </View>

            <View
              style={[
                styles.verifiedContactContent,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.verifiedContactRow}>
                <View style={[styles.verifiedIconWrap, { backgroundColor: colors.bgSurface }]}>
                  <Icon name="person" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verifiedLabel, { color: colors.textSecondary }]}>
                    Full Name
                  </Text>
                  <Text
                    testID="checkout-verified-name"
                    style={[styles.verifiedValue, { color: colors.textPrimary }]}
                  >
                    {name}
                  </Text>
                </View>
              </View>

              <View style={styles.verifiedContactRow}>
                <View style={[styles.verifiedIconWrap, { backgroundColor: colors.bgSurface }]}>
                  <Icon name="call" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verifiedLabel, { color: colors.textSecondary }]}>
                    Mobile Number
                  </Text>
                  <View style={styles.verifiedPhoneWithTag}>
                    <Text
                      testID="checkout-verified-phone"
                      style={[styles.verifiedValue, { color: colors.textPrimary }]}
                    >
                      +91 {phone}
                    </Text>
                    <View style={styles.phoneVerifiedTag}>
                      <Icon name="shield-checkmark" size={12} color="#10B981" />
                      <Text style={styles.phoneVerifiedTagText}>Verified for delivery</Text>
                    </View>
                  </View>
                </View>
              </View>

              {email ? (
                <View style={styles.verifiedContactRow}>
                  <View style={[styles.verifiedIconWrap, { backgroundColor: colors.bgSurface }]}>
                    <Icon name="mail" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.verifiedLabel, { color: colors.textSecondary }]}>
                      Email Address
                    </Text>
                    <Text
                      testID="checkout-verified-email"
                      style={[styles.verifiedValue, { color: colors.textPrimary }]}
                    >
                      {email}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={[styles.verifiedActionsRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.verifiedHelperNote, { color: colors.textMuted }]}>
                  Saved for hassle-free checkout. Not asked again on future orders.
                </Text>
                <TouchableOpacity
                  testID="checkout-edit-contact-btn"
                  onPress={() => setIsEditingContact(true)}
                  style={[styles.editContactBtn, { borderColor: colors.primary }]}
                >
                  <Icon name="create-outline" size={14} color={colors.primary} />
                  <Text style={[styles.editContactBtnText, { color: colors.primary }]}>
                    Change Details
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
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
            <View style={styles.headerBetweenRow}>
              <View style={styles.titleWithIcon}>
                <Icon name="people" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  1. Contact Information
                </Text>
              </View>
              {hasVerifiedContact ? (
                <TouchableOpacity
                  testID="checkout-cancel-edit-btn"
                  onPress={() => setIsEditingContact(false)}
                  style={styles.cancelEditBtn}
                >
                  <Text style={[styles.cancelEditText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                testID="checkout-name-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bgPrimary,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                  },
                ]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Mobile Number *
                </Text>
                {isPhoneVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Icon name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.verifiedText}>Phone Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleRequestPhoneOTP} disabled={isSendingOtp}>
                    <Text style={[styles.verifyLink, { color: colors.primary }]}>
                      {isSendingOtp ? 'Sending...' : 'Verify with OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.phoneInputRow}>
                <View
                  style={[
                    styles.phonePrefix,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+91</Text>
                </View>
                <TextInput
                  testID="checkout-phone-input"
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: colors.bgPrimary,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    const clean = val.replace(/\D/g, '').trim();
                    if (verifiedContactRecord && clean === verifiedContactRecord.phone) {
                      setIsPhoneVerified(true);
                    } else {
                      setIsPhoneVerified(false);
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Email Address (Optional)
              </Text>
              <TextInput
                testID="checkout-email-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bgPrimary,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                  },
                ]}
                placeholder="For digital recipe card & invoice"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {hasVerifiedContact ? (
              <TouchableOpacity
                testID="checkout-save-contact-btn"
                onPress={() => {
                  if (!name.trim()) {
                    Alert.alert('Name Required', 'Please enter your name.');
                    return;
                  }
                  const cleanPhone = phone.replace(/\D/g, '').trim();
                  if (cleanPhone.length !== 10) {
                    Alert.alert('Phone Required', 'Please enter a valid 10-digit mobile number.');
                    return;
                  }
                  if (!isPhoneVerified) {
                    handleRequestPhoneOTP();
                    return;
                  }
                  setIsEditingContact(false);
                  saveVerifiedContactInfo({
                    userId: user?.uid,
                    name: name.trim(),
                    phone: cleanPhone,
                    email: email.trim() || undefined,
                    isGuest: !user,
                  }).catch(() => {});
                  if (user && updateUserContact) {
                    updateUserContact({
                      displayName: name.trim(),
                      phoneNumber: `+91${cleanPhone}`,
                      email: email.trim() || undefined,
                    }).catch(() => {});
                  }
                }}
                style={[styles.saveContactBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.saveContactBtnText}>Save & Use These Details</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* SECTION 2: Delivery Address (Saved Card or Edit Form) */}
        {hasSavedAddress && !isEditingAddress ? (
          <View
            testID="checkout-saved-address-card"
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.verifiedHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Icon name="location" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  2. Delivery Address
                </Text>
              </View>
              <View style={[styles.verifiedBadgePill, { backgroundColor: '#D1FAE5' }]}>
                <Icon name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.verifiedPillText}>Saved Address</Text>
              </View>
            </View>

            <View
              style={[
                styles.verifiedContactContent,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.verifiedContactRow}>
                <View style={[styles.verifiedIconWrap, { backgroundColor: colors.bgSurface }]}>
                  <Icon name="home" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.addressTagRow}>
                    <Text style={[styles.verifiedLabel, { color: colors.textSecondary }]}>
                      Delivery Location
                    </Text>
                    <View style={styles.addressTagPill}>
                      <Text style={styles.addressTagPillText}>DEFAULT ADDRESS</Text>
                    </View>
                  </View>
                  <Text
                    testID="checkout-saved-flat"
                    style={[styles.verifiedValue, { color: colors.textPrimary }]}
                  >
                    {flatAndStreet}
                  </Text>
                  <Text
                    testID="checkout-saved-area"
                    style={[styles.addressSubValue, { color: colors.textSecondary }]}
                  >
                    {areaAndLandmark}
                  </Text>
                  <Text
                    testID="checkout-saved-city-pincode"
                    style={[styles.addressCityPincode, { color: colors.textPrimary }]}
                  >
                    {city} - {pincode}
                  </Text>
                </View>
              </View>

              {deliveryInstructions ? (
                <View style={styles.savedInstructionsRow}>
                  <Icon name="chatbubble-ellipses-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.savedInstructionsText, { color: colors.textSecondary }]}>
                    Note: {deliveryInstructions}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.verifiedActionsRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.verifiedHelperNote, { color: colors.textMuted }]}>
                  Saved in database. Reused automatically for future orders.
                </Text>
                <TouchableOpacity
                  testID="checkout-edit-address-btn"
                  onPress={() => setIsEditingAddress(true)}
                  style={[styles.editContactBtn, { borderColor: colors.primary }]}
                >
                  <Icon name="create-outline" size={14} color={colors.primary} />
                  <Text style={[styles.editContactBtnText, { color: colors.primary }]}>
                    Change Address
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
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
            <View style={styles.headerBetweenRow}>
              <View style={styles.titleWithIcon}>
                <Icon name="location" size={18} color={colors.primary} />
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  2. Delivery Address
                </Text>
              </View>
              {hasSavedAddress ? (
                <TouchableOpacity
                  testID="checkout-cancel-edit-address-btn"
                  onPress={() => setIsEditingAddress(false)}
                  style={styles.cancelEditBtn}
                >
                  <Text style={[styles.cancelEditText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Flat / House No / Building *
              </Text>
              <TextInput
                testID="checkout-flat-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bgPrimary,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                  },
                ]}
                placeholder="e.g. Flat 302, Green Valley Apartments"
                placeholderTextColor={colors.textMuted}
                value={flatAndStreet}
                onChangeText={setFlatAndStreet}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Area, Street & Landmark *
              </Text>
              <TextInput
                testID="checkout-area-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bgPrimary,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                  },
                ]}
                placeholder="e.g. Near Indiranagar Metro Station"
                placeholderTextColor={colors.textMuted}
                value={areaAndLandmark}
                onChangeText={setAreaAndLandmark}
              />
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  City (From Location)
                </Text>
                <TextInput
                  testID="checkout-city-input"
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bgSubtle,
                      color: colors.textSecondary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  value={city}
                  editable={false}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pincode</Text>
                <TextInput
                  testID="checkout-pincode-input"
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bgPrimary,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Delivery Instructions (Optional)
              </Text>
              <TextInput
                testID="checkout-instructions-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bgPrimary,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                  },
                ]}
                placeholder="e.g. Ring bell twice / leave with security"
                placeholderTextColor={colors.textMuted}
                value={deliveryInstructions}
                onChangeText={setDeliveryInstructions}
              />
            </View>

            {hasSavedAddress ? (
              <TouchableOpacity
                testID="checkout-save-address-btn"
                onPress={() => {
                  if (!flatAndStreet.trim()) {
                    Alert.alert(
                      'Address Incomplete',
                      'Please provide flat/house number and building.',
                    );
                    return;
                  }
                  if (!areaAndLandmark.trim()) {
                    Alert.alert('Area Required', 'Please provide area or landmark.');
                    return;
                  }
                  setIsEditingAddress(false);
                  saveVerifiedContactInfo({
                    userId: user?.uid,
                    name: name.trim() || 'Customer',
                    phone: phone.replace(/\D/g, '') || '9999999999',
                    email: email.trim() || undefined,
                    isGuest: !user,
                    address: {
                      flatAndStreet: flatAndStreet.trim(),
                      areaAndLandmark: areaAndLandmark.trim(),
                      city,
                      pincode,
                      deliveryInstructions: deliveryInstructions.trim() || undefined,
                      tag: 'Home',
                    },
                  }).catch(() => {});
                  addAddress({
                    name: name.trim() || 'Customer',
                    phone: phone.replace(/\D/g, '') || '9999999999',
                    flatAndStreet: flatAndStreet.trim(),
                    areaAndLandmark: areaAndLandmark.trim(),
                    city,
                    pincode,
                    tag: 'Home',
                    isDefault: true,
                  }).catch(() => {});
                }}
                style={[styles.saveContactBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.saveContactBtnText}>Save & Use This Address</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* SECTION 3: Delivery Slot */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card },
          ]}
        >
          <View style={styles.titleWithIcon}>
            <Icon name="time" size={18} color={colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              3. Delivery Slot
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
                    {isSelected && (
                      <Icon name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>
                    {slot.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 4: Wallet Credits (Signed in only) or Guest Note */}
        {user ? (
          <View
            style={[
              styles.walletCard,
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
                  <Icon name="wallet" size={20} color={colors.primary} />
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
              />
            </View>

            {useWalletCredits && availableBalance > 0 && (
              <View style={styles.walletDeductionInfo}>
                <Text style={[styles.deductionText, { color: colors.primary }]}>
                  -₹{Math.round(creditsApplied).toLocaleString('en-IN')} deducted from wallet
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.guestHintCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Icon name="information-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.guestHintText, { color: colors.textSecondary }]}>
              Have wallet credits or referral bonuses?{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>Sign in</Text> in the
              Account tab to redeem.
            </Text>
          </View>
        )}

        {/* SECTION 5: Payment Method Selection */}
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
                4. Payment Method
              </Text>
            </View>

            <View style={styles.methodsList}>
              {(['UPI', 'Card', 'Cash on Delivery'] as PaymentMethod[]).map((method) => {
                const isSelected = selectedPaymentMethod === method;
                const iconName =
                  method === 'UPI' ? 'phone-portrait' : method === 'Card' ? 'card' : 'cash';
                const sub =
                  method === 'UPI'
                    ? 'Google Pay, PhonePe, Paytm, BHIM'
                    : method === 'Card'
                      ? 'Credit / Debit Card (Visa, MasterCard, RuPay)'
                      : 'Pay cash or UPI upon kit delivery';

                return (
                  <TouchableOpacity
                    key={method}
                    testID={`payment-method-${method.replace(/\s+/g, '-').toLowerCase()}`}
                    style={[
                      styles.paymentOption,
                      {
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        backgroundColor: isSelected ? colors.primaryLight + '25' : colors.bgSubtle,
                      },
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <View style={styles.paymentOptionLeft}>
                      <View
                        style={[
                          styles.methodIconCircle,
                          { backgroundColor: isSelected ? colors.primary : colors.bgSurface },
                        ]}
                      >
                        <Icon
                          name={iconName}
                          size={18}
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.paymentMethodTitle,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {method}
                        </Text>
                        <Text style={[styles.paymentMethodSub, { color: colors.textMuted }]}>
                          {sub}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? colors.primary : colors.borderLight },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedPaymentMethod === 'UPI' && (
              <View style={styles.upiInputWrap}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  UPI ID (Optional)
                </Text>
                <TextInput
                  testID="checkout-upi-id-input"
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bgPrimary,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  placeholder="e.g. name@okaxis or name@upi"
                  placeholderTextColor={colors.textMuted}
                  value={upiId}
                  onChangeText={setUpiId}
                />
              </View>
            )}
          </View>
        )}

        {/* SECTION 6: Bill Summary */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 12 }]}>
            Bill Summary
          </Text>

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Items Subtotal</Text>
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
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>
              Cold-Chain Delivery
            </Text>
            <Text style={[styles.billValue, { color: colors.textPrimary }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${Math.round(deliveryFee)}`}
            </Text>
          </View>

          {creditsApplied > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.primary, fontWeight: '700' }]}>
                Wallet Credits Applied
              </Text>
              <Text style={[styles.billValue, { color: colors.primary, fontWeight: '700' }]}>
                -₹{Math.round(creditsApplied).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.billRow}>
            <Text style={[styles.billTotalLabel, { color: colors.textPrimary }]}>Grand Total</Text>
            <Text style={[styles.billTotalValue, { color: colors.primary }]}>
              ₹
              {Math.round(isFullyWalletPaid ? creditsApplied : payableAmount).toLocaleString(
                'en-IN',
              )}
            </Text>
          </View>
        </View>

        {/* Place Order CTA Button */}
        <View style={styles.ctaWrap}>
          <Button
            testID="checkout-place-order-btn"
            title={
              isProcessing
                ? 'Securing Order...'
                : !isPhoneVerified
                  ? 'Verify Phone & Place Order'
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
        </View>
      </ScrollView>

      {/* PHONE OTP MODAL */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.otpModalCard, { backgroundColor: colors.bgSurface, ...shadows.card }]}
          >
            <View style={styles.otpHeader}>
              <View style={[styles.otpIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Icon name="phone-portrait" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>
                Verify Phone Number
              </Text>
              <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
                We sent a 6-digit verification code to +91 {phone}
              </Text>
            </View>

            {otpError ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            <TextInput
              testID="checkout-otp-input"
              style={[
                styles.otpInput,
                {
                  backgroundColor: colors.bgPrimary,
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                },
              ]}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />

            <View style={styles.otpActions}>
              <Button
                testID="checkout-confirm-otp-btn"
                title={isVerifyingOtp ? 'Verifying...' : 'Confirm OTP'}
                variant="primary"
                size="md"
                loading={isVerifyingOtp}
                disabled={isVerifyingOtp}
                onPress={handleVerifyPhoneOTP}
                style={{ width: '100%', marginBottom: 12 }}
              />

              <View style={styles.otpFooterRow}>
                {resendTimer > 0 ? (
                  <Text style={[styles.resendTimerText, { color: colors.textMuted }]}>
                    Resend in {resendTimer}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    testID="checkout-resend-otp-btn"
                    onPress={handleRequestPhoneOTP}
                    disabled={isSendingOtp}
                  >
                    <Text style={[styles.resendLink, { color: colors.primary }]}>
                      Resend OTP Code
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  testID="checkout-change-phone-btn"
                  onPress={() => setShowOtpModal(false)}
                >
                  <Text style={[styles.changeNumberText, { color: colors.textSecondary }]}>
                    Change Number
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MOCK PAYMENT GATEWAY MODAL */}
      <MockPaymentGatewayModal
        visible={showGatewayModal}
        orderId={pendingGatewayOrderId || `ORD_${Date.now()}`}
        payableAmount={payableAmount}
        initialMethod={selectedPaymentMethod as any}
        customer={{
          name: name.trim(),
          email: email.trim() || 'guest@rasoigenie.in',
          phone: phone.replace(/\D/g, '').trim(),
        }}
        onSuccess={(result) => {
          setShowGatewayModal(false);
          executeOrderPlacement({
            paymentId: result.paymentId,
            signature: result.signature,
            gatewayOrderId: result.gatewayOrderId,
          });
        }}
        onFailure={(errorMessage) => {
          setShowGatewayModal(false);
          setPaymentError(errorMessage);
          Alert.alert(
            'Payment Failed',
            `${errorMessage}\n\nYour order is retained in pending state. Tap "Retry Payment" to try again.`,
            [{ text: 'OK' }],
          );
        }}
        onClose={() => {
          setShowGatewayModal(false);
        }}
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
    paddingTop: 45,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  verifyLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  saveAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  saveAddressText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  slotsGrid: {
    gap: 8,
  },
  slotCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  walletSub: {
    fontSize: 12,
  },
  walletDeductionInfo: {
    paddingTop: 6,
  },
  deductionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guestHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  guestHintText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  methodsList: {
    gap: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentMethodSub: {
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
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  upiInputWrap: {
    marginTop: 10,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  billLabel: {
    fontSize: 14,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  ctaWrap: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    gap: 16,
  },
  otpHeader: {
    alignItems: 'center',
    gap: 8,
  },
  otpIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  otpSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  otpActions: {
    alignItems: 'center',
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  resendTimerText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  changeNumberText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  verifiedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerBetweenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  verifiedContactContent: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  verifiedContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 1,
  },
  verifiedValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedPhoneWithTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  phoneVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phoneVerifiedTagText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  verifiedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 2,
    gap: 8,
  },
  verifiedHelperNote: {
    fontSize: 11,
    flex: 1,
  },
  editContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  editContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelEditText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  saveContactBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addressTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  addressTagPill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addressTagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  addressSubValue: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  addressCityPincode: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  savedInstructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  savedInstructionsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
