import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useWallet } from '../../framework/context/WalletContext';
import { useSubscription } from '../../framework/context/SubscriptionContext';
import {
  STANDARD_SUBSCRIPTION_PLANS,
  STANDARD_PLANS_LIST,
  StandardPlanKey,
  PlanType,
  WEEKDAYS,
  DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK,
  calculateSubscriptionTotal,
  calculateNextDeliveryInfo,
} from '../../framework/services/subscriptionPlans';
import { getMealKits, getMealKitById, MealKit } from '../../framework/services/mealKitsService';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';
import { MockPaymentGatewayModal } from '../checkout/MockPaymentGatewayModal';
import { SubscriptionPauseCalendarModal } from './SubscriptionPauseCalendarModal';
import { SUBSCRIPTION_RENEWAL_CONFIG } from '../../framework/subscription/subscriptionConfig';

export const SubscriptionPlanView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { availableBalance, debitCredits } = useWallet();
  const {
    isSubscribed,
    activeSubscription,
    assignedMeals,
    pause,
    resume,
    cancel,
    subscribe,
    assignMeal,
    addPause,
    removePause,
    unpauseDate,
    fetchPauses,
    pauses,
    toggleAutoRenewState,
  } = useSubscription();

  const allKits = getMealKits();
  const t = subscriptionStrings;

  // Selected plan state
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('standard');
  const [selectedStandardKey, setSelectedStandardKey] = useState<StandardPlanKey>('high-protein');

  // Custom 7-day meal selections (0..6 -> meal_kit_id)
  const [customDays, setCustomDays] = useState<Record<number, string>>({
    0: 'kit-102',
    1: 'kit-101',
    2: 'kit-104',
    3: 'kit-204',
    4: 'kit-206',
    5: 'kit-304',
    6: 'kit-301',
  });

  // Meal kit picker modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [targetWeekday, setTargetWeekday] = useState<number>(0);

  // Payment state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [useWalletCredits, setUseWalletCredits] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [autoRenew, setAutoRenew] = useState<boolean>(
    SUBSCRIPTION_RENEWAL_CONFIG.DEFAULT_AUTO_RENEW,
  );
  const [pauseModalVisible, setPauseModalVisible] = useState(false);

  // Determine current active plan rate
  const activeStandardPlan = STANDARD_SUBSCRIPTION_PLANS[selectedStandardKey];
  const pricePerWeek =
    selectedPlanType === 'standard'
      ? activeStandardPlan.pricePerMemberPerWeek
      : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;

  const pricing = calculateSubscriptionTotal({
    pricePerMemberPerWeek: pricePerWeek,
    memberCount: 1,
  });

  // Calculate wallet credits applicable
  const walletCreditsToApply = useWalletCredits ? Math.min(availableBalance, pricing.total) : 0;
  const remainingPayable = Math.max(0, pricing.total - walletCreditsToApply);

  // Handler to open kit picker for a specific day
  const handleOpenKitPicker = (weekday: number) => {
    setTargetWeekday(weekday);
    setPickerModalVisible(true);
  };

  // Handler to select kit for a day
  const handleSelectKitForDay = async (kitId: string) => {
    setCustomDays((prev) => ({ ...prev, [targetWeekday]: kitId }));
    setPickerModalVisible(false);

    // If already active, assign directly
    if (isSubscribed && activeSubscription && activeSubscription.scope === 'individual') {
      await assignMeal(user?.uid || 'me', targetWeekday, kitId);
    }
  };

  // Start checkout / subscription flow
  const handleStartSubscribe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe to weekly meal deliveries.');
      return;
    }

    if (remainingPayable <= 0) {
      // Fully covered by wallet credits
      executeSubscriptionPayment('WALLET_CREDIT');
    } else {
      setPaymentModalVisible(true);
    }
  };

  const executeSubscriptionPayment = async (paymentRef: string) => {
    setIsSubscribing(true);
    try {
      if (walletCreditsToApply > 0) {
        await debitCredits({
          amount: walletCreditsToApply,
          description: `Weekly Meal Subscription (${selectedPlanType === 'standard' ? activeStandardPlan.name : 'Custom Plan'})`,
        });
      }

      const res = await subscribe({
        scope: 'individual',
        planType: selectedPlanType,
        standardPlanKey: selectedPlanType === 'standard' ? selectedStandardKey : null,
        pricePerMemberPerWeek: pricePerWeek,
        amountPaid: remainingPayable,
        walletCreditsApplied: walletCreditsToApply,
        paymentReference: paymentRef,
        members: [
          {
            id: user?.uid || 'me',
            name: user?.displayName || 'Me',
            isDependent: false,
            planType: selectedPlanType,
            standardPlanKey: selectedPlanType === 'standard' ? selectedStandardKey : null,
            meals: selectedPlanType === 'custom' ? customDays : undefined,
          },
        ],
      });

      if (res.success) {
        Alert.alert(t.checkout.activeSuccessTitle, t.checkout.activeSuccessMsg);
      } else {
        Alert.alert('Subscription Failed', res.error || 'Could not activate subscription.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete subscription');
    } finally {
      setIsSubscribing(false);
      setPaymentModalVisible(false);
    }
  };

  const handleTogglePause = () => {
    if (!activeSubscription) return;
    if (activeSubscription.status === 'paused') {
      resume();
      Alert.alert('Deliveries Resumed', 'Your weekly boxes will resume next Monday morning.');
    } else {
      Alert.alert(t.checkout.confirmPauseTitle, t.checkout.confirmPauseMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause', style: 'destructive', onPress: () => pause() },
      ]);
    }
  };

  const handleCancelSub = () => {
    Alert.alert(t.checkout.confirmCancelTitle, t.checkout.confirmCancelMsg, [
      { text: 'Keep Plan', style: 'cancel' },
      { text: 'Cancel Plan', style: 'destructive', onPress: () => cancel() },
    ]);
  };

  // Intelligent Next Delivery Info with carry-over evaluation
  const nextDeliveryInfo = useMemo(() => {
    return calculateNextDeliveryInfo({
      periodStart: activeSubscription?.period_start,
      periodEnd: activeSubscription?.period_end,
      nextRenewalAt: activeSubscription?.next_renewal_at,
      pauses,
    });
  }, [activeSubscription, pauses]);

  // Next Monday date formatted
  const getNextMondayFormatted = () => {
    return nextDeliveryInfo.formattedDate;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="sub-plan-back-btn"
          >
            <Icon name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            RasoiGenie Box Subscriptions
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Chef-Curated Dinners • Fresh Weekly Delivery
          </Text>
        </View>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Active Subscription Status Card */}
        {isSubscribed && activeSubscription && (
          <View
            style={[
              styles.activeSubCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor:
                  activeSubscription.status === 'paused' ? colors.warning : colors.success,
                ...shadows.card,
              },
            ]}
            testID="active-subscription-card"
          >
            <View style={styles.subStatusRow}>
              <View>
                <Text style={[styles.subPlanName, { color: colors.textPrimary }]}>
                  {activeSubscription.scope === 'family'
                    ? 'Family Subscription'
                    : activeSubscription.plan_type === 'standard' &&
                        activeSubscription.standard_plan_key
                      ? STANDARD_SUBSCRIPTION_PLANS[activeSubscription.standard_plan_key]?.name
                      : 'Custom Weekly Box'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  ₹{activeSubscription.price_per_member_per_week}/week •{' '}
                  {activeSubscription.member_count} member
                  {activeSubscription.member_count > 1 ? 's' : ''}
                </Text>
              </View>
              <Badge
                label={
                  activeSubscription.status === 'paused'
                    ? t.common.statusPaused
                    : t.common.statusActive
                }
                variant={activeSubscription.status === 'paused' ? 'warning' : 'success'}
              />
            </View>

            <Text
              style={[styles.nextDeliveryText, { color: colors.textPrimary, fontWeight: '700' }]}
            >
              {activeSubscription.status === 'paused'
                ? 'Weekly deliveries currently paused.'
                : nextDeliveryInfo.deliveryNote}
            </Text>

            {nextDeliveryInfo.resumesNote && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="refresh" size={13} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                  {nextDeliveryInfo.resumesNote}
                </Text>
              </View>
            )}

            {nextDeliveryInfo.periodSummaryNote && (
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                {nextDeliveryInfo.periodSummaryNote}
              </Text>
            )}

            <View style={[styles.subAutoRenewRow, { borderTopColor: colors.borderLight }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={[styles.autoRenewTitle, { color: colors.textPrimary }]}>
                    {t.autoRenew.title}
                  </Text>
                  <Badge
                    label={activeSubscription.auto_renew ? 'Active' : 'Off'}
                    variant={activeSubscription.auto_renew ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {activeSubscription.auto_renew
                    ? t.autoRenew.enabledDescription(
                        activeSubscription.amount_paid,
                        activeSubscription.next_renewal_at
                          ? new Date(activeSubscription.next_renewal_at).toLocaleDateString(
                              'en-IN',
                              { month: 'short', day: 'numeric' },
                            )
                          : getNextMondayFormatted(),
                      )
                    : t.autoRenew.disabledDescription(
                        new Date(activeSubscription.period_end).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      )}
                </Text>
              </View>
              <Button
                title={activeSubscription.auto_renew ? 'Turn Off' : 'Turn On'}
                variant="outline"
                size="sm"
                onPress={() => {
                  if (activeSubscription.auto_renew) {
                    Alert.alert(t.autoRenew.turnOffConfirmTitle, t.autoRenew.turnOffConfirmMsg, [
                      { text: 'Keep Auto-Renew', style: 'cancel' },
                      {
                        text: 'Turn Off',
                        style: 'destructive',
                        onPress: () => toggleAutoRenewState(false),
                      },
                    ]);
                  } else {
                    toggleAutoRenewState(true);
                  }
                }}
                testID="toggle-auto-renew-btn"
              />
            </View>

            <View style={styles.subActionsRow}>
              <Button
                title={
                  activeSubscription.status === 'paused'
                    ? t.checkout.resumeBtn
                    : t.pauseCalendar.modalTitle
                }
                icon={
                  <Icon
                    name={activeSubscription.status === 'paused' ? 'play' : 'pause'}
                    size={15}
                    color={colors.primary}
                  />
                }
                variant="outline"
                size="sm"
                onPress={() => {
                  if (activeSubscription.status === 'paused') {
                    handleTogglePause();
                  } else {
                    setPauseModalVisible(true);
                  }
                }}
                style={{ flex: 1, marginRight: 8 }}
                testID="toggle-pause-sub-btn"
              />
              <Button
                title={t.checkout.cancelBtn}
                variant="danger"
                size="sm"
                onPress={handleCancelSub}
                testID="cancel-sub-btn"
              />
            </View>
          </View>
        )}

        {/* Section 1: Plan Type Switcher */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          1. Choose Your Plan Style
        </Text>

        <View style={styles.planTypeTabs}>
          <TouchableOpacity
            style={[
              styles.typeTab,
              {
                backgroundColor:
                  selectedPlanType === 'standard' ? colors.primary : colors.bgSurface,
                borderColor: selectedPlanType === 'standard' ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setSelectedPlanType('standard')}
            testID="tab-standard-plans"
          >
            <Text
              style={[
                styles.typeTabText,
                { color: selectedPlanType === 'standard' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Standard Curated (7 Days)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTab,
              {
                backgroundColor: selectedPlanType === 'custom' ? colors.primary : colors.bgSurface,
                borderColor: selectedPlanType === 'custom' ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setSelectedPlanType('custom')}
            testID="tab-custom-plan"
          >
            <Text
              style={[
                styles.typeTabText,
                { color: selectedPlanType === 'custom' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              Custom Day-by-Day
            </Text>
          </TouchableOpacity>
        </View>

        {/* Standard Plans Cards */}
        {selectedPlanType === 'standard' && (
          <View style={{ marginTop: 12 }}>
            {STANDARD_PLANS_LIST.map((plan) => {
              const isSelected = selectedStandardKey === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      borderWidth: isSelected ? 2 : 1,
                      ...shadows.card,
                    },
                  ]}
                  onPress={() => setSelectedStandardKey(plan.key)}
                  activeOpacity={0.88}
                  testID={`standard-plan-${plan.key}`}
                >
                  <View style={styles.planTopRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.planTitle, { color: colors.textPrimary }]}>
                        {plan.name}
                      </Text>
                      <Text style={[styles.planSub, { color: colors.textSecondary }]}>
                        {plan.tagline}
                      </Text>
                    </View>
                    <Badge label={plan.badge} variant="primary" size="sm" />
                  </View>

                  <Text style={[styles.highlightNutrition, { color: colors.primary }]}>
                    {plan.highlightNutrition}
                  </Text>

                  <View style={styles.planPricingRow}>
                    <Text style={[styles.weeklyPrice, { color: colors.primary }]}>
                      ₹{plan.pricePerMemberPerWeek}
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>
                        {' '}
                        / member / week
                      </Text>
                    </Text>
                    <Text style={[styles.origWeeklyPrice, { color: colors.textMuted }]}>
                      ₹{plan.originalPricePerMemberPerWeek}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Section 2: 7-Day Meal Schedule Grid */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.mealPickerHeader}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              2. 7-Day Weekly Meal Schedule
            </Text>
            <Badge
              label={selectedPlanType === 'standard' ? activeStandardPlan.name : 'Custom Plan'}
              variant="neutral"
              size="sm"
            />
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {selectedPlanType === 'standard'
              ? 'Included in this curated weekly box. Tap any day to swap with another recipe.'
              : 'Pick your preferred meal kit for each day of the week.'}
          </Text>

          {WEEKDAYS.map((day) => {
            const kitId =
              selectedPlanType === 'standard'
                ? activeStandardPlan.weeklyMeals.find((m) => m.weekday === day.index)?.mealKitId ||
                  customDays[day.index]
                : customDays[day.index];
            const kit = kitId ? getMealKitById(kitId) : undefined;

            return (
              <TouchableOpacity
                key={`weekday-${day.index}`}
                style={[
                  styles.dayRow,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.lg,
                  },
                ]}
                onPress={() => handleOpenKitPicker(day.index)}
                activeOpacity={0.8}
                testID={`day-cell-${day.index}`}
              >
                <View style={[styles.dayBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.dayBadgeText, { color: colors.primaryDark }]}>
                    {day.short}
                  </Text>
                </View>

                {kit ? (
                  <View style={styles.dayKitInfo}>
                    {kit.heroImage ? (
                      <Image source={{ uri: kit.heroImage }} style={styles.kitThumbnail} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.kitName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {kit.name}
                      </Text>
                      <Text style={[styles.kitMeta, { color: colors.textSecondary }]}>
                        {kit.cuisine} • {kit.nutrition?.protein || 20}g Protein • {kit.spiceLevel}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyDayWrap}>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      + Tap to pick meal
                    </Text>
                  </View>
                )}

                <Icon name="swap" size={16} color={colors.primary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 3: Pricing & Upfront Checkout */}
        {!isSubscribed && (
          <View
            style={[
              styles.checkoutCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              {t.pricing.pricingTitle}
            </Text>

            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>{t.pricing.ratePerMember}</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                ₹{pricing.pricePerMemberPerWeek} / wk
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>{t.pricing.coveredMembers}</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>1 Member (You)</Text>
            </View>

            {availableBalance > 0 && (
              <TouchableOpacity
                style={styles.walletToggleRow}
                onPress={() => setUseWalletCredits(!useWalletCredits)}
              >
                <Icon
                  name={useWalletCredits ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary, marginLeft: 8 }}>
                  Apply Rasoi Credits (₹{Math.round(availableBalance)})
                </Text>
                <Text style={{ fontWeight: '700', color: colors.success }}>
                  -₹{Math.round(walletCreditsToApply)}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.checkoutAutoRenewRow, { borderColor: colors.borderLight }]}
              onPress={() => setAutoRenew(!autoRenew)}
              testID="sub-auto-renew-toggle"
            >
              <Icon
                name={autoRenew ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.checkoutAutoRenewText, { color: colors.textPrimary }]}>
                  {t.autoRenew.checkoutToggleLabel}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {t.autoRenew.enabledDescription(pricing.total, getNextMondayFormatted())}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
                {t.pricing.totalPayable}
              </Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                ₹{remainingPayable.toLocaleString('en-IN')}
              </Text>
            </View>

            <Button
              title={t.checkout.payUpfrontBtn(remainingPayable)}
              icon={<Icon name="arrow-forward" size={18} color={colors.textInverse} />}
              size="lg"
              style={{ marginTop: 16 }}
              onPress={handleStartSubscribe}
              testID="subscribe-upfront-btn"
            />
          </View>
        )}
      </ScrollView>

      {/* Meal Kit Selector Modal */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bgPrimary }]}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>
              Select Meal for {WEEKDAYS[targetWeekday]?.full}
            </Text>
            <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {allKits.map((kit) => (
              <TouchableOpacity
                key={kit.id}
                style={[
                  styles.pickerRow,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.lg,
                  },
                ]}
                onPress={() => handleSelectKitForDay(kit.id)}
                activeOpacity={0.8}
                testID={`picker-kit-${kit.id}`}
              >
                {kit.heroImage ? (
                  <Image source={{ uri: kit.heroImage }} style={styles.pickerImg} />
                ) : null}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text style={[styles.pickerKitName, { color: colors.textPrimary }]}>
                    {kit.name}
                  </Text>
                  <Text style={[styles.pickerKitMeta, { color: colors.textSecondary }]}>
                    {kit.cuisine} • {kit.diet.toUpperCase()} • {kit.spiceLevel}
                  </Text>
                </View>
                <Button
                  title="Select"
                  size="sm"
                  variant="outline"
                  onPress={() => handleSelectKitForDay(kit.id)}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Upfront Payment Gateway Modal */}
      {paymentModalVisible && (
        <MockPaymentGatewayModal
          visible={paymentModalVisible}
          orderId={`sub_${Date.now()}`}
          payableAmount={remainingPayable}
          customer={{
            name: user?.displayName || 'Gourmet Subscriber',
            email: user?.email || 'subscriber@rasoigenie.com',
            phone: user?.phoneNumber || '+919876543210',
          }}
          onSuccess={(result) => {
            executeSubscriptionPayment(result.paymentId || result.gatewayOrderId || 'PAY_SUCCESS');
          }}
          onFailure={(err) => {
            Alert.alert('Payment Declined', err);
            setPaymentModalVisible(false);
          }}
          onClose={() => setPaymentModalVisible(false)}
        />
      )}
      {/* Pause Calendar Modal */}
      {activeSubscription && (
        <SubscriptionPauseCalendarModal
          visible={pauseModalVisible}
          onClose={() => setPauseModalVisible(false)}
          subscription={activeSubscription}
          members={[
            {
              user_id: user?.uid || 'me',
              display_name: user?.displayName || 'Me',
              role: 'owner',
            } as any,
          ]}
          pauses={pauses}
          isOwner={true}
          onSavePause={async (input) => {
            return await addPause(input);
          }}
          onUnpauseDate={async (dateStr, memberId) => {
            return await unpauseDate(dateStr, memberId);
          }}
          onRemovePause={async (pauseId) => {
            return await removePause(pauseId);
          }}
        />
      )}
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
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 12,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  banner: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  activeSubCard: {
    padding: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  subStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subPlanName: {
    fontSize: 16,
    fontWeight: '800',
  },
  nextDeliveryText: {
    fontSize: 13,
    marginBottom: 14,
  },
  subAutoRenewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 14,
    marginBottom: 16,
    borderTopWidth: 1,
  },
  autoRenewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  checkoutAutoRenewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  checkoutAutoRenewText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subActionsRow: {
    flexDirection: 'row',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  planTypeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  planCard: {
    padding: 16,
    marginBottom: 12,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  planSub: {
    fontSize: 12,
    marginTop: 2,
  },
  highlightNutrition: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  planPricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 8,
  },
  weeklyPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  origWeeklyPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  mealPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dayBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayKitInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kitThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
  },
  kitName: {
    fontSize: 14,
    fontWeight: '700',
  },
  kitMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyDayWrap: {
    flex: 1,
  },
  checkoutCard: {
    padding: 16,
    borderWidth: 1,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  walletToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 45,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalScroll: {
    padding: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  pickerImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  pickerKitName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerKitMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
