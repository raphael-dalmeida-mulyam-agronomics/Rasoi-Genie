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
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useWallet } from '../../framework/context/WalletContext';
import { useSubscription } from '../../framework/context/SubscriptionContext';
import { can } from '../../framework/family/permissions';
import {
  WEEKDAYS,
  STANDARD_SUBSCRIPTION_PLANS,
  STANDARD_PLANS_LIST,
  StandardPlanKey,
  PlanType,
  DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK,
  calculateSubscriptionTotal,
  resolvePlanMealKits,
} from '../../framework/services/subscriptionPlans';
import { getMealKits, getMealKitById, MealKit } from '../../framework/services/mealKitsService';
import { checkDietaryConflict } from '../../framework/family/dietaryConflicts';
import { FamilyMember } from '../../framework/services/familyService';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';
import { MockPaymentGatewayModal } from '../checkout/MockPaymentGatewayModal';
import { SubscriptionPauseCalendarModal } from '../subscription/SubscriptionPauseCalendarModal';
import {
  calculatePerMemberSubscriptionTotal,
  copyPlanToAllMembers,
} from '../../framework/services/subscriptionPlans';
import { SUBSCRIPTION_RENEWAL_CONFIG } from '../../framework/subscription/subscriptionConfig';

export const FamilySubscriptionView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { family, members, role } = useFamily();
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
    clearMeal,
    setMemberPlan,
    updateCoveredMembersList,
    addPause,
    fetchPauses,
    pauses,
    toggleAutoRenewState,
    applySamePlanToAll,
    shareOwnerPlan,
    coveredMembers,
  } = useSubscription();

  const allKits = getMealKits();
  const t = subscriptionStrings;
  const isOwner = can(role, 'manage_family_subscription');
  const canView = isOwner || can(role, 'view_own_subscription_plan');
  const [autoRenew, setAutoRenew] = useState<boolean>(
    SUBSCRIPTION_RENEWAL_CONFIG.DEFAULT_AUTO_RENEW,
  );
  const [pauseModalVisible, setPauseModalVisible] = useState(false);

  // Covered member IDs (default: all members in family)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() =>
    members.map((m) => m.user_id),
  );

  // Per-member plan configuration (member_id -> { planType, standardPlanKey, planGroup })
  const [memberPlanConfigs, setMemberPlanConfigs] = useState<
    Record<
      string,
      { planType: PlanType; standardPlanKey?: StandardPlanKey | null; planGroup?: string | null }
    >
  >(() => {
    const initial: Record<
      string,
      { planType: PlanType; standardPlanKey?: StandardPlanKey | null; planGroup?: string | null }
    > = {};
    members.forEach((m) => {
      // Default child / veg to vegan or high-protein
      const defaultKey: StandardPlanKey = m.preferences?.dietTypes?.includes('vegan')
        ? 'vegan'
        : m.preferences?.dietTypes?.includes('keto')
          ? 'keto'
          : 'high-protein';
      initial[m.user_id] = { planType: 'standard', standardPlanKey: defaultKey, planGroup: null };
    });
    return initial;
  });

  // Local assigned meals matrix: `${member_id}_${weekday}` -> kitId
  const [localMeals, setLocalMeals] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      const template = resolvePlanMealKits('high-protein');
      template.forEach((item) => {
        if (item.mealKit) {
          map[`${m.user_id}_${item.weekday}`] = item.mealKit.id;
        }
      });
    });
    return map;
  });

  // Cell modal state for tapping a recipe on the calendar
  const [cellModalVisible, setCellModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    member: FamilyMember;
    weekday: number;
    currentKit?: MealKit;
  } | null>(null);

  // Meal kit picker modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [catalogFilterDiet, setCatalogFilterDiet] = useState<string>('all');

  // Payment state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [useWalletCredits, setUseWalletCredits] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync memberPlanConfigs from coveredMembers if active subscription present
  React.useEffect(() => {
    if (coveredMembers && coveredMembers.length > 0) {
      setMemberPlanConfigs((prev) => {
        const next = { ...prev };
        coveredMembers.forEach((cm) => {
          next[cm.member_id] = {
            planType: cm.plan_type,
            standardPlanKey: cm.standard_plan_key || undefined,
            planGroup: cm.plan_group,
          };
        });
        return next;
      });
    }
  }, [coveredMembers]);

  // Sync assigned meals from active subscription if present
  React.useEffect(() => {
    if (assignedMeals && assignedMeals.length > 0) {
      const map: Record<string, string> = {};
      assignedMeals.forEach((meal) => {
        map[`${meal.member_id}_${meal.weekday}`] = meal.meal_kit_id;
      });
      setLocalMeals((prev) => ({ ...prev, ...map }));
    }
  }, [assignedMeals]);

  // Pricing calculation via calculatePerMemberSubscriptionTotal
  const memberPlansList = useMemo(() => {
    return selectedMemberIds.map((id) => {
      const cfg = memberPlanConfigs[id] || {
        planType: 'standard' as PlanType,
        standardPlanKey: 'high-protein' as StandardPlanKey,
        planGroup: null,
      };
      const price =
        cfg.planType === 'standard' && cfg.standardPlanKey
          ? STANDARD_SUBSCRIPTION_PLANS[cfg.standardPlanKey]?.pricePerMemberPerWeek ||
            DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
          : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;
      return {
        memberId: id,
        planType: cfg.planType,
        standardPlanKey: cfg.standardPlanKey || null,
        planGroup: cfg.planGroup || null,
        pricePerWeek: price,
      };
    });
  }, [selectedMemberIds, memberPlanConfigs]);

  const pricing = useMemo(() => {
    return calculatePerMemberSubscriptionTotal({
      members: memberPlansList,
      weeks: 1,
    });
  }, [memberPlansList]);
  const coveredMembersCount = selectedMemberIds.length;
  const pricePerMember =
    memberPlansList.length > 0 ? Math.round(pricing.subtotal / memberPlansList.length) : 1299;

  const walletCreditsToApply = useWalletCredits ? Math.min(availableBalance, pricing.total) : 0;
  const remainingPayable = Math.max(0, pricing.total - walletCreditsToApply);

  // Check if cell has dietary conflict
  const getCellConflict = (member: FamilyMember, kitId?: string) => {
    if (!kitId) return { hasConflict: false, reasons: [] };
    const kit = getMealKitById(kitId);
    return checkDietaryConflict(member, kit);
  };

  // Toggle member coverage
  const handleToggleMember = async (memberId: string) => {
    let next: string[];
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length <= 1) {
        Alert.alert(
          'Coverage Limit',
          'At least 1 member must be covered by the weekly subscription.',
        );
        return;
      }
      next = selectedMemberIds.filter((id) => id !== memberId);
    } else {
      next = [...selectedMemberIds, memberId];
    }
    setSelectedMemberIds(next);

    // If already active, recalculate and update covered members
    if (isSubscribed && activeSubscription) {
      const coveredMems = members
        .filter((m) => next.includes(m.user_id))
        .map((m) => ({
          id: m.user_id,
          name: m.display_name,
          isDependent: m.role === 'dependent',
        }));
      const res = await updateCoveredMembersList(coveredMems);
      if (res.success && res.adjustment) {
        if (res.adjustment.immediatePayableAmount > 0) {
          Alert.alert(
            'Member Added',
            `Prorated charge of ₹${res.adjustment.immediatePayableAmount} will be billed for remaining days.`,
          );
        } else {
          Alert.alert('Member Removed', t.pricing.policyRemovalNote);
        }
      }
    }
  };

  // Apply one plan to all covered members
  const handleApplySamePlan = async (planType: PlanType, standardPlanKey?: StandardPlanKey) => {
    const updatedConfigs = copyPlanToAllMembers(
      { planType, standardPlanKey },
      selectedMemberIds,
      'shared_all',
    );
    setMemberPlanConfigs((prev) => ({ ...prev, ...updatedConfigs }));

    if (planType === 'standard' && standardPlanKey) {
      const template = resolvePlanMealKits(standardPlanKey);
      setLocalMeals((prev) => {
        const next = { ...prev };
        selectedMemberIds.forEach((mId) => {
          template.forEach((item) => {
            if (item.mealKit) {
              next[`${mId}_${item.weekday}`] = item.mealKit.id;
            }
          });
        });
        return next;
      });
    }

    if (isSubscribed && activeSubscription) {
      await applySamePlanToAll(planType, standardPlanKey);
    }
  };

  // Allow a member to share the owner's plan
  const handleShareOwnerPlan = async (memberId: string) => {
    const ownerMember = members.find((m) => m.role === 'owner') || members[0];
    const ownerUserId = ownerMember ? ownerMember.user_id : members[0]?.user_id || '';
    const ownerCfg = (ownerUserId && memberPlanConfigs[ownerUserId]) || {
      planType: 'standard' as PlanType,
      standardPlanKey: 'high-protein' as StandardPlanKey,
      planGroup: null,
    };

    setMemberPlanConfigs((prev) => ({
      ...prev,
      [memberId]: {
        planType: ownerCfg.planType,
        standardPlanKey: ownerCfg.standardPlanKey,
        planGroup: 'shared_with_owner',
      },
    }));

    if (ownerCfg.planType === 'standard' && ownerCfg.standardPlanKey) {
      const template = resolvePlanMealKits(ownerCfg.standardPlanKey);
      setLocalMeals((prev) => {
        const next = { ...prev };
        template.forEach((item) => {
          if (item.mealKit) {
            next[`${memberId}_${item.weekday}`] = item.mealKit.id;
          }
        });
        return next;
      });
    }

    if (isSubscribed && activeSubscription) {
      await shareOwnerPlan(memberId);
    }
  };

  // Switch a member's plan
  const handleSwitchMemberPlan = async (
    memberId: string,
    planType: PlanType,
    planKey?: StandardPlanKey,
  ) => {
    setMemberPlanConfigs((prev) => ({
      ...prev,
      [memberId]: { planType, standardPlanKey: planKey },
    }));

    // If standard plan selected, auto-fill member's 7 days with the template
    if (planType === 'standard' && planKey) {
      const template = resolvePlanMealKits(planKey);
      setLocalMeals((prev) => {
        const updated = { ...prev };
        template.forEach((item) => {
          if (item.mealKit) {
            updated[`${memberId}_${item.weekday}`] = item.mealKit.id;
          }
        });
        return updated;
      });
    }

    if (isSubscribed && activeSubscription) {
      await setMemberPlan(memberId, planType, planKey);
    }
  };

  // Cell tap: open cell detail sheet
  const handleTapCell = (member: FamilyMember, weekday: number) => {
    const key = `${member.user_id}_${weekday}`;
    const kitId = localMeals[key];
    const kit = kitId ? getMealKitById(kitId) : undefined;
    setSelectedCell({ member, weekday, currentKit: kit });
    setCellModalVisible(true);
  };

  // Clear meal from cell
  const handleClearCell = async () => {
    if (!selectedCell) return;
    const { member, weekday } = selectedCell;
    const key = `${member.user_id}_${weekday}`;
    setLocalMeals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCellModalVisible(false);

    if (isSubscribed && activeSubscription) {
      await clearMeal(member.user_id, weekday);
    }
  };

  // Select kit for cell
  const handleSelectKitForCell = async (kitId: string) => {
    if (!selectedCell) return;
    const { member, weekday } = selectedCell;
    const key = `${member.user_id}_${weekday}`;
    setLocalMeals((prev) => ({ ...prev, [key]: kitId }));
    setPickerModalVisible(false);
    setCellModalVisible(false);

    if (isSubscribed && activeSubscription) {
      await assignMeal(member.user_id, weekday, kitId);
    }
  };

  // Upfront Payment & Activation
  const handleStartSubscribe = () => {
    if (remainingPayable <= 0) {
      executeFamilySubscriptionPayment('WALLET_CREDIT');
    } else {
      setPaymentModalVisible(true);
    }
  };

  const executeFamilySubscriptionPayment = async (paymentRef: string) => {
    setIsSubmitting(true);
    try {
      if (walletCreditsToApply > 0) {
        await debitCredits({
          amount: walletCreditsToApply,
          description: `Family Weekly Meal Subscription (${family?.name || 'Family'})`,
        });
      }

      const coveredMemberList = members
        .filter((m) => selectedMemberIds.includes(m.user_id))
        .map((m) => {
          const cfg = memberPlanConfigs[m.user_id] || {
            planType: 'standard',
            standardPlanKey: 'high-protein',
            planGroup: null,
          };
          const memberDayMeals: Record<number, string> = {};
          WEEKDAYS.forEach((w) => {
            const kitId = localMeals[`${m.user_id}_${w.index}`];
            if (kitId) memberDayMeals[w.index] = kitId;
          });
          const price =
            cfg.planType === 'standard' && cfg.standardPlanKey
              ? STANDARD_SUBSCRIPTION_PLANS[cfg.standardPlanKey]?.pricePerMemberPerWeek ||
                DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
              : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;

          return {
            id: m.user_id,
            name: m.display_name,
            isDependent: m.role === 'dependent',
            planType: cfg.planType,
            standardPlanKey: cfg.standardPlanKey,
            planGroup: cfg.planGroup,
            pricePerWeek: price,
            meals: memberDayMeals,
          };
        });

      const res = await subscribe({
        scope: 'family',
        planType: 'custom', // Family uses per-member custom/standard matrix
        pricePerMemberPerWeek: pricePerMember,
        amountPaid: remainingPayable,
        walletCreditsApplied: walletCreditsToApply,
        paymentReference: paymentRef,
        autoRenew,
        members: coveredMemberList,
      });

      if (res.success) {
        Alert.alert(t.checkout.activeSuccessTitle, t.checkout.activeSuccessMsg);
      } else {
        Alert.alert('Subscription Failed', res.error || 'Could not activate subscription.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete subscription');
    } finally {
      setIsSubmitting(false);
      setPaymentModalVisible(false);
    }
  };

  const handleTogglePause = () => {
    if (!activeSubscription) return;
    if (activeSubscription.status === 'paused') {
      resume();
      Alert.alert(
        'Deliveries Resumed',
        'Your family weekly boxes will resume next Monday morning.',
      );
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

  // Next Monday helper
  const getNextMondayFormatted = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Non-owner restriction screen (allows view if user has view_own_subscription_plan)
  if (!canView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Icon name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t.familyCalendar.hubCardTitle}
          </Text>
        </View>
        <View style={styles.restrictedCenter}>
          <Icon name="lock-closed" size={48} color={colors.textMuted} />
          <Text style={[styles.restrictedTitle, { color: colors.textPrimary }]}>
            Owner Privileges Required
          </Text>
          <Text style={[styles.restrictedSub, { color: colors.textSecondary }]}>
            {t.familyCalendar.ownerOnlyNotice}
          </Text>
        </View>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web' && width > 768;

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
            testID="family-sub-back-btn"
          >
            <Icon name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            RasoiGenie Box Subscriptions
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {family?.name || 'Your Household'} Family Edition • Upfront Weekly Billing
          </Text>
        </View>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {!isOwner && (
          <View
            style={[
              styles.viewOnlyBanner,
              { backgroundColor: colors.bgInfoSubtle, borderColor: colors.borderInfoSubtle },
            ]}
          >
            <Icon name="information-circle" size={18} color={colors.textInfo} />
            <Text style={[styles.viewOnlyText, { color: colors.textInfo }]}>
              {t.perMember.viewOnlyNotice}
            </Text>
          </View>
        )}

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
            testID="family-active-sub-card"
          >
            <View style={styles.subStatusRow}>
              <View>
                <Text style={[styles.subPlanName, { color: colors.textPrimary }]}>
                  {family?.name || 'Family'} Weekly Subscription
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  ₹{activeSubscription.price_per_member_per_week}/member •{' '}
                  {activeSubscription.member_count} Covered Members
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

            <Text style={[styles.nextDeliveryText, { color: colors.textSecondary }]}>
              {activeSubscription.status === 'paused'
                ? 'Deliveries paused. Resume anytime.'
                : t.common.nextDeliveryNote(getNextMondayFormatted())}
            </Text>

            {/* Auto-renew Section */}
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
              {isOwner && (
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
                  testID="family-toggle-auto-renew-btn"
                />
              )}
            </View>

            <View style={styles.subActionsRow}>
              {isOwner ? (
                <>
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
                    testID="family-toggle-pause-btn"
                  />
                  <Button
                    title={t.checkout.cancelBtn}
                    variant="danger"
                    size="sm"
                    onPress={handleCancelSub}
                    testID="family-cancel-sub-btn"
                  />
                </>
              ) : (
                <Button
                  title="Pause My Deliveries"
                  icon={<Icon name="pause" size={15} color={colors.primary} />}
                  variant="outline"
                  size="sm"
                  onPress={() => setPauseModalVisible(true)}
                  style={{ flex: 1 }}
                  testID="family-member-pause-btn"
                />
              )}
            </View>
          </View>
        )}

        {/* Covered Members Selector */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            1. Covered Family Members ({selectedMemberIds.length} of {members.length})
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Select household members to include in this recurring weekly plan.
          </Text>
        </View>

        <View style={styles.membersChipRow}>
          {members.map((m) => {
            const isSelected = selectedMemberIds.includes(m.user_id);
            return (
              <TouchableOpacity
                key={`mem-chip-${m.user_id}`}
                style={[
                  styles.memberChip,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.bgSurface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => handleToggleMember(m.user_id)}
                testID={`member-toggle-${m.user_id}`}
              >
                <Icon
                  name={isSelected ? 'check-circle' : 'plus-circle'}
                  size={16}
                  color={isSelected ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.memberChipText,
                    { color: isSelected ? colors.primaryDark : colors.textPrimary },
                  ]}
                >
                  {m.display_name} ({m.dependent_type || m.role})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Apply the same plan to everyone (Owner only) */}
        {isOwner && (
          <View
            style={[
              styles.applySameCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.applySameTitle, { color: colors.textPrimary }]}>
                {t.perMember.applySamePlanToAll}
              </Text>
              <Text style={[styles.applySameSub, { color: colors.textSecondary }]}>
                {t.perMember.applySamePlanDesc}
              </Text>
            </View>
            <View style={styles.applySameButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.applySameBtn,
                  { backgroundColor: colors.bgPrimary, borderColor: colors.borderLight },
                ]}
                onPress={() => handleApplySamePlan('standard', 'high-protein')}
                testID="apply-all-protein-btn"
              >
                <Text style={[styles.applySameBtnText, { color: colors.textPrimary }]}>
                  High Protein (₹1,299)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.applySameBtn,
                  { backgroundColor: colors.bgPrimary, borderColor: colors.borderLight },
                ]}
                onPress={() => handleApplySamePlan('standard', 'keto')}
                testID="apply-all-keto-btn"
              >
                <Text style={[styles.applySameBtnText, { color: colors.textPrimary }]}>
                  Keto (₹1,499)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.applySameBtn,
                  { backgroundColor: colors.bgPrimary, borderColor: colors.borderLight },
                ]}
                onPress={() => handleApplySamePlan('standard', 'vegan')}
                testID="apply-all-vegan-btn"
              >
                <Text style={[styles.applySameBtnText, { color: colors.textPrimary }]}>
                  Vegan (₹1,199)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.applySameBtn,
                  { backgroundColor: colors.bgPrimary, borderColor: colors.borderLight },
                ]}
                onPress={() => handleApplySamePlan('custom')}
                testID="apply-all-custom-btn"
              >
                <Text style={[styles.applySameBtnText, { color: colors.textPrimary }]}>
                  Custom (₹1,399)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar Weekly Matrix */}
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              2. Weekly Meal Matrix (Google Calendar View)
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Assign recipes per member for Monday through Sunday. Tap any cell to view, swap or
              clear.
            </Text>
          </View>

          {/* Responsive Calendar View */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.calendarContainer}
          >
            <View>
              {/* Day Headers Row */}
              <View style={styles.calendarHeaderRow}>
                <View style={[styles.memberColHeader, { backgroundColor: colors.bgSurface }]}>
                  <Text style={[styles.colHeaderText, { color: colors.textSecondary }]}>
                    Family Member
                  </Text>
                </View>
                {WEEKDAYS.map((day) => (
                  <View
                    key={`header-day-${day.index}`}
                    style={[styles.dayColHeader, { backgroundColor: colors.bgSurface }]}
                  >
                    <Text style={[styles.dayHeaderShort, { color: colors.primary }]}>
                      {day.short}
                    </Text>
                    <Text style={[styles.dayHeaderFull, { color: colors.textSecondary }]}>
                      {day.full.slice(0, 3)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Members Rows */}
              {members
                .filter((m) => selectedMemberIds.includes(m.user_id))
                .map((member) => {
                  const memberCfg = memberPlanConfigs[member.user_id] || {
                    planType: 'standard',
                    standardPlanKey: 'high-protein',
                  };

                  return (
                    <View
                      key={`matrix-row-${member.user_id}`}
                      style={[
                        styles.calendarMemberRow,
                        { borderColor: colors.borderLight, backgroundColor: colors.bgSurface },
                      ]}
                      testID={`calendar-row-${member.user_id}`}
                    >
                      {/* Member Info & Plan Selector Column */}
                      <View style={styles.memberColCell}>
                        <Text style={[styles.memberNameText, { color: colors.textPrimary }]}>
                          {member.display_name}
                        </Text>
                        <Badge
                          label={
                            member.dependent_type
                              ? `Dependent (${member.dependent_type})`
                              : member.role
                          }
                          variant="neutral"
                          size="sm"
                        />

                        {/* Plan Quick Selector */}
                        <View style={styles.memberPlanPicker}>
                          <TouchableOpacity
                            style={[
                              styles.miniPlanBtn,
                              memberCfg.planType === 'standard' &&
                              memberCfg.standardPlanKey === 'high-protein'
                                ? { backgroundColor: colors.primary }
                                : { backgroundColor: colors.bgPrimary },
                            ]}
                            onPress={() =>
                              handleSwitchMemberPlan(member.user_id, 'standard', 'high-protein')
                            }
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color:
                                  memberCfg.planType === 'standard' &&
                                  memberCfg.standardPlanKey === 'high-protein'
                                    ? '#FFFFFF'
                                    : colors.textSecondary,
                              }}
                            >
                              Protein
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.miniPlanBtn,
                              memberCfg.planType === 'standard' &&
                              memberCfg.standardPlanKey === 'keto'
                                ? { backgroundColor: colors.primary }
                                : { backgroundColor: colors.bgPrimary },
                            ]}
                            onPress={() =>
                              handleSwitchMemberPlan(member.user_id, 'standard', 'keto')
                            }
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color:
                                  memberCfg.planType === 'standard' &&
                                  memberCfg.standardPlanKey === 'keto'
                                    ? '#FFFFFF'
                                    : colors.textSecondary,
                              }}
                            >
                              Keto
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.miniPlanBtn,
                              memberCfg.planType === 'standard' &&
                              memberCfg.standardPlanKey === 'vegan'
                                ? { backgroundColor: colors.primary }
                                : { backgroundColor: colors.bgPrimary },
                            ]}
                            onPress={() =>
                              handleSwitchMemberPlan(member.user_id, 'standard', 'vegan')
                            }
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color:
                                  memberCfg.planType === 'standard' &&
                                  memberCfg.standardPlanKey === 'vegan'
                                    ? '#FFFFFF'
                                    : colors.textSecondary,
                              }}
                            >
                              Vegan
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 7 Weekday Cells */}
                      {WEEKDAYS.map((day) => {
                        const cellKey = `${member.user_id}_${day.index}`;
                        const kitId = localMeals[cellKey];
                        const kit = kitId ? getMealKitById(kitId) : undefined;
                        const conflict = getCellConflict(member, kitId);

                        return (
                          <TouchableOpacity
                            key={`cell-${cellKey}`}
                            style={[
                              styles.calendarCell,
                              {
                                borderColor: conflict.hasConflict
                                  ? colors.warning
                                  : colors.borderLight,
                                backgroundColor: conflict.hasConflict
                                  ? colors.bgWarningSubtle
                                  : kit
                                    ? colors.bgSurface
                                    : colors.bgPrimary,
                              },
                            ]}
                            onPress={() => handleTapCell(member, day.index)}
                            activeOpacity={0.8}
                            testID={`matrix-cell-${member.user_id}-${day.index}`}
                          >
                            {kit ? (
                              <View style={styles.cellContent}>
                                {kit.heroImage ? (
                                  <Image source={{ uri: kit.heroImage }} style={styles.cellThumb} />
                                ) : null}
                                <Text
                                  style={[styles.cellKitName, { color: colors.textPrimary }]}
                                  numberOfLines={2}
                                >
                                  {kit.name}
                                </Text>
                                {conflict.hasConflict && (
                                  <View style={styles.conflictBadgeWrap}>
                                    <Badge label="⚠️ Conflict" variant="warning" size="sm" />
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={styles.cellEmpty}>
                                <Icon name="add" size={16} color={colors.textMuted} />
                                <Text style={styles.cellEmptyText}>Assign</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
            </View>
          </ScrollView>
        </View>

        {/* Pricing & Upfront Checkout Card */}
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
                ₹{pricePerMember} / member / week
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>{t.pricing.coveredMembers}</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {coveredMembersCount} Household Members
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>{t.pricing.subtotal}</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                ₹{pricing.subtotal.toLocaleString('en-IN')}
              </Text>
            </View>

            {availableBalance > 0 && (
              <TouchableOpacity
                style={styles.walletToggleRow}
                onPress={() => setUseWalletCredits(!useWalletCredits)}
              >
                <Icon
                  name={useWalletCredits ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary, marginLeft: 8 }}>
                  Apply Owner Rasoi Credits (₹{Math.round(availableBalance)})
                </Text>
                <Text style={{ fontWeight: '700', color: colors.success }}>
                  -₹{Math.round(walletCreditsToApply)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Per-member Breakdown */}
            <View style={{ marginVertical: 8 }}>
              {memberPlansList.map((m) => {
                const mem = members.find((x) => x.user_id === m.memberId);
                const planName =
                  m.planType === 'standard' && m.standardPlanKey
                    ? STANDARD_SUBSCRIPTION_PLANS[m.standardPlanKey]?.name
                    : 'Custom Plan';
                return (
                  <View key={`mem-rate-${m.memberId}`} style={styles.summaryRow}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {mem?.display_name || m.memberId} ({planName})
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      ₹{m.pricePerWeek} / wk
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Auto-renew Opt-out Toggle at Checkout */}
            <TouchableOpacity
              style={[styles.checkoutAutoRenewRow, { borderColor: colors.borderLight }]}
              onPress={() => setAutoRenew(!autoRenew)}
              testID="familyCheckoutAutoRenew"
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

            <Text style={[styles.policyNotice, { color: colors.textMuted }]}>
              Upfront billing for whole household. Adding members mid-period will calculate prorated
              charges; removing members takes effect at next weekly renewal.
            </Text>

            <Button
              title={t.checkout.payUpfrontBtn(remainingPayable)}
              icon={<Icon name="arrow-forward" size={18} color={colors.textInverse} />}
              size="lg"
              style={{ marginTop: 16 }}
              onPress={handleStartSubscribe}
              testID="family-subscribe-upfront-btn"
            />
          </View>
        )}
      </ScrollView>

      {/* Cell Detail / Action Modal */}
      {selectedCell && (
        <Modal
          visible={cellModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCellModalVisible(false)}
          testID="cell-detail-modal"
        >
          <View style={styles.backdrop}>
            <View
              style={[
                styles.cellModalCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.xl,
                  ...shadows.card,
                },
              ]}
            >
              <View style={styles.cellModalHeader}>
                <Text style={[styles.cellModalTitle, { color: colors.textPrimary }]}>
                  {WEEKDAYS[selectedCell.weekday]?.full} Meal for {selectedCell.member.display_name}
                </Text>
                <TouchableOpacity onPress={() => setCellModalVisible(false)}>
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Dietary Conflict Notice */}
              {selectedCell.currentKit &&
                (() => {
                  const conflict = checkDietaryConflict(
                    selectedCell.member,
                    selectedCell.currentKit,
                  );
                  if (!conflict.hasConflict) return null;
                  return (
                    <View
                      style={[
                        styles.conflictAlertBox,
                        { backgroundColor: colors.bgWarningSubtle, borderColor: colors.warning },
                      ]}
                    >
                      <Text style={[styles.conflictAlertTitle, { color: colors.textWarning }]}>
                        ⚠️ Dietary Preference Conflict
                      </Text>
                      {conflict.reasons.map((r, i) => (
                        <Text
                          key={i}
                          style={[styles.conflictAlertReason, { color: colors.textWarning }]}
                        >
                          • {r}
                        </Text>
                      ))}
                    </View>
                  );
                })()}

              {selectedCell.currentKit ? (
                <View style={styles.assignedKitDetail}>
                  {selectedCell.currentKit.heroImage ? (
                    <Image
                      source={{ uri: selectedCell.currentKit.heroImage }}
                      style={styles.modalKitImg}
                    />
                  ) : null}
                  <Text style={[styles.modalKitName, { color: colors.textPrimary }]}>
                    {selectedCell.currentKit.name}
                  </Text>
                  <Text style={[styles.modalKitSub, { color: colors.textSecondary }]}>
                    {selectedCell.currentKit.cuisine} • {selectedCell.currentKit.diet.toUpperCase()}{' '}
                    • {selectedCell.currentKit.nutrition?.protein || 20}g Protein
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.textSecondary, marginVertical: 16 }}>
                  No meal kit assigned for this day yet.
                </Text>
              )}

              <View style={styles.modalActionsRow}>
                <Button
                  title="Change Recipe"
                  variant="primary"
                  size="md"
                  onPress={() => {
                    setCellModalVisible(false);
                    setPickerModalVisible(true);
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                  testID="cell-change-recipe-btn"
                />
                {selectedCell.currentKit && (
                  <Button
                    title="Clear"
                    variant="outline"
                    size="md"
                    onPress={handleClearCell}
                    testID="cell-clear-recipe-btn"
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Recipe Catalog Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
        testID="recipe-picker-modal"
      >
        <View style={[styles.pickerContainer, { backgroundColor: colors.bgPrimary }]}>
          <View
            style={[
              styles.pickerHeader,
              { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
            ]}
          >
            <View>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                Pick Recipe for {selectedCell?.member.display_name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {WEEKDAYS[selectedCell?.weekday || 0]?.full} Dinner Box
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Diet Filter Chips */}
          <View style={styles.dietFilterRow}>
            {['all', 'veg', 'nonveg', 'vegan', 'keto'].map((diet) => (
              <TouchableOpacity
                key={`diet-${diet}`}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: catalogFilterDiet === diet ? colors.primary : colors.bgSurface,
                    borderColor: catalogFilterDiet === diet ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => setCatalogFilterDiet(diet)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: catalogFilterDiet === diet ? '#FFFFFF' : colors.textPrimary,
                  }}
                >
                  {diet.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.pickerScroll}>
            {allKits
              .filter((k) =>
                catalogFilterDiet === 'all'
                  ? true
                  : k.diet === catalogFilterDiet ||
                    k.dietaryTags?.includes(catalogFilterDiet as any),
              )
              .map((kit) => {
                const conflict = selectedCell
                  ? checkDietaryConflict(selectedCell.member, kit)
                  : { hasConflict: false, reasons: [] };

                return (
                  <TouchableOpacity
                    key={kit.id}
                    style={[
                      styles.catalogCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: conflict.hasConflict ? colors.warning : colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() => handleSelectKitForCell(kit.id)}
                    activeOpacity={0.8}
                    testID={`catalog-kit-${kit.id}`}
                  >
                    {kit.heroImage ? (
                      <Image source={{ uri: kit.heroImage }} style={styles.catalogImg} />
                    ) : null}
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={[styles.catalogKitName, { color: colors.textPrimary }]}>
                        {kit.name}
                      </Text>
                      <Text style={[styles.catalogKitMeta, { color: colors.textSecondary }]}>
                        {kit.cuisine} • {kit.diet.toUpperCase()} • {kit.spiceLevel}
                      </Text>
                      {conflict.hasConflict && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textWarning,
                            fontWeight: '700',
                            marginTop: 2,
                          }}
                        >
                          ⚠️ {conflict.reasons[0]}
                        </Text>
                      )}
                    </View>
                    <Button
                      title="Select"
                      size="sm"
                      variant={conflict.hasConflict ? 'secondary' : 'primary'}
                      onPress={() => handleSelectKitForCell(kit.id)}
                    />
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </Modal>

      {/* Upfront Payment Modal */}
      {paymentModalVisible && (
        <MockPaymentGatewayModal
          visible={paymentModalVisible}
          orderId={`family_sub_${Date.now()}`}
          payableAmount={remainingPayable}
          customer={{
            name: user?.displayName || 'Family Owner',
            email: user?.email || 'owner@rasoigenie.com',
            phone: user?.phoneNumber || '+919876543210',
          }}
          onSuccess={(result) => {
            executeFamilySubscriptionPayment(
              result.paymentId || result.gatewayOrderId || 'PAY_SUCCESS',
            );
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
          members={members.map((m) => ({
            id: m.user_id,
            name: m.display_name,
            isDependent: m.role === 'dependent',
          }))}
          isFamily={true}
          isOwner={isOwner}
          pauses={pauses}
          onSavePause={async ({ startDate, endDate, memberId }) => {
            return await addPause({ startDate, endDate, memberId });
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
  subActionsRow: {
    flexDirection: 'row',
  },
  sectionHeaderWrap: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  membersChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarContainer: {
    paddingVertical: 10,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  memberColHeader: {
    width: 130,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  colHeaderText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayColHeader: {
    width: 105,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#F97316',
    marginRight: 6,
  },
  dayHeaderShort: {
    fontSize: 14,
    fontWeight: '900',
  },
  dayHeaderFull: {
    fontSize: 11,
  },
  calendarMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  memberColCell: {
    width: 130,
    paddingRight: 8,
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  memberPlanPicker: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  miniPlanBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
  },
  calendarCell: {
    width: 105,
    height: 100,
    padding: 6,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 6,
    justifyContent: 'center',
  },
  cellContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellThumb: {
    width: 42,
    height: 42,
    borderRadius: 6,
    marginBottom: 4,
  },
  cellKitName: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  conflictBadgeWrap: {
    marginTop: 2,
  },
  cellEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmptyText: {
    fontSize: 10,
    /* color set in component */
    marginTop: 4,
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
  policyNotice: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  backdrop: {
    flex: 1,
    /* bg set in component */
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cellModalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderWidth: 1,
  },
  cellModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cellModalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  conflictAlertBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  conflictAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  conflictAlertReason: {
    fontSize: 12,
  },
  assignedKitDetail: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalKitImg: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalKitName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalKitSub: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  pickerContainer: {
    flex: 1,
    paddingTop: 45,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dietFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerScroll: {
    padding: 16,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  catalogImg: {
    width: 55,
    height: 55,
    borderRadius: 8,
  },
  catalogKitName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catalogKitMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  viewOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  viewOnlyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  applySameCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  applySameTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  applySameSub: {
    fontSize: 12,
  },
  applySameButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  applySameBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  applySameBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shareOwnerBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 6,
    alignItems: 'center',
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
  restrictedCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
