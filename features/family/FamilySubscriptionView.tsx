import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Platform,
  useWindowDimensions,
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
  StandardPlanKey,
  PlanType,
  DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK,
  calculatePerMemberSubscriptionTotal,
  copyPlanToAllMembers,
  resolvePlanMealKits,
  isDateLockedForPause,
  isDatePaused,
} from '../../framework/services/subscriptionPlans';
import { getMealKits, getMealKitById, MealKit } from '../../framework/services/mealKitsService';
import { checkDietaryConflict } from '../../framework/family/dietaryConflicts';
import { FamilyMember } from '../../framework/services/familyService';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Modal } from '../../framework/ui/Modal';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Card } from '../../framework/ui/Card';
import { Avatar } from '../../framework/ui/Avatar';
import { SegmentedControl } from '../../framework/ui/SegmentedControl';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';
import { MockPaymentGatewayModal } from '../checkout/MockPaymentGatewayModal';
import { SubscriptionPauseCalendarModal } from '../subscription/SubscriptionPauseCalendarModal';
import { SUBSCRIPTION_RENEWAL_CONFIG } from '../../framework/subscription/subscriptionConfig';
import {
  buildMonthCalendarGrid,
  mapMealsForDay,
  formatDayAccessibilityLabel,
  CalendarDayItem,
  formatDateKey,
} from '../../framework/services/familyMealPlanCalendarHelpers';

const PLAN_SEGMENTS = [
  { value: 'high-protein', label: 'High Protein' },
  { value: 'keto', label: 'Keto' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'custom', label: 'Custom' },
];

export const FamilySubscriptionView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors, radii, shadows } = useTheme();
  const { user } = useAuth();
  const { family, members, role } = useFamily();
  const { availableBalance, debitCredits } = useWallet();
  const { width } = useWindowDimensions();
  const isWebOrDesktop = Platform.OS === 'web' || width > 768;

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

  // Month navigation state
  const todayDate = useMemo(() => new Date(), []);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

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

  // Day detail popup state
  const [selectedDayItem, setSelectedDayItem] = useState<CalendarDayItem | null>(null);
  const [dayDetailVisible, setDayDetailVisible] = useState(false);

  // Meal kit picker modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    member: FamilyMember;
    weekday: number;
    currentKit?: MealKit;
  } | null>(null);
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

  const coveredMembersList = useMemo(() => {
    return members.filter((m) => selectedMemberIds.includes(m.user_id));
  }, [members, selectedMemberIds]);

  // Month grid computation
  const monthGrid = useMemo(() => {
    const periodStart =
      activeSubscription?.period_start ||
      formatDateKey(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1));
    const periodEnd =
      activeSubscription?.period_end ||
      formatDateKey(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 2, 0));

    return buildMonthCalendarGrid({
      year: currentMonthDate.getFullYear(),
      month: currentMonthDate.getMonth(),
      periodStart,
      periodEnd,
      today: todayDate,
      pauses: (pauses || []).map((p) => ({ startDate: p.start_date, endDate: p.end_date })),
    });
  }, [currentMonthDate, activeSubscription, todayDate, pauses]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentMonthDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
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

  const confirmApplySamePlan = (planType: PlanType, standardPlanKey?: StandardPlanKey) => {
    const planName =
      planType === 'standard' && standardPlanKey
        ? STANDARD_SUBSCRIPTION_PLANS[standardPlanKey]?.name
        : 'Custom Plan';

    Alert.alert(
      t.familyCalendar.applyPlanToAllConfirmTitle(planName),
      t.familyCalendar.applyPlanToAllConfirmMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply to Everyone',
          onPress: () => handleApplySamePlan(planType, standardPlanKey),
        },
      ],
    );
  };

  // Check if member already has custom picks that differ from standard template
  const memberHasCustomPicks = (
    memberId: string,
    currentPlanType: PlanType,
    currentStandardKey?: StandardPlanKey | null,
  ): boolean => {
    if (currentPlanType === 'custom') return true;
    if (!currentStandardKey) return false;
    const template = resolvePlanMealKits(currentStandardKey);
    for (const item of template) {
      const currentKitId = localMeals[`${memberId}_${item.weekday}`];
      if (currentKitId && item.mealKit && currentKitId !== item.mealKit.id) {
        return true;
      }
    }
    return false;
  };

  // Switch a member's plan
  const handleSwitchMemberPlan = async (
    memberId: string,
    planType: PlanType,
    planKey?: StandardPlanKey,
  ) => {
    setMemberPlanConfigs((prev) => ({
      ...prev,
      [memberId]: { planType, standardPlanKey: planKey, planGroup: null },
    }));

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

  const handleSelectMemberPlanSegment = (member: FamilyMember, value: string) => {
    const memberId = member.user_id;
    const currentCfg = memberPlanConfigs[memberId] || {
      planType: 'standard',
      standardPlanKey: 'high-protein',
    };
    const nextPlanType: PlanType = value === 'custom' ? 'custom' : 'standard';
    const nextStandardKey: StandardPlanKey | undefined =
      value === 'custom' ? undefined : (value as StandardPlanKey);

    const executeSwitch = () => {
      handleSwitchMemberPlan(memberId, nextPlanType, nextStandardKey);
    };

    if (memberHasCustomPicks(memberId, currentCfg.planType, currentCfg.standardPlanKey)) {
      Alert.alert(
        t.familyCalendar.overwriteCustomPicksTitle,
        t.familyCalendar.overwriteCustomPicksMsg(member.display_name),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change Plan', onPress: executeSwitch },
        ],
      );
    } else {
      executeSwitch();
    }
  };

  // Day cell tap
  const handleTapDayCell = (dayItem: CalendarDayItem) => {
    if (!dayItem.date || !dayItem.isInsidePeriod) return;
    setSelectedDayItem(dayItem);
    setDayDetailVisible(true);
  };

  // Clear meal for a member on a weekday
  const handleClearMealForMemberDay = async (memberId: string, weekday: number) => {
    const key = `${memberId}_${weekday}`;
    setLocalMeals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (isSubscribed && activeSubscription) {
      await clearMeal(memberId, weekday);
    }
  };

  // Select kit for cell from catalog modal
  const handleSelectKitForCell = async (kitId: string) => {
    if (!selectedCell) return;
    const { member, weekday } = selectedCell;
    const key = `${member.user_id}_${weekday}`;
    setLocalMeals((prev) => ({ ...prev, [key]: kitId }));
    setPickerModalVisible(false);

    if (isSubscribed && activeSubscription) {
      await assignMeal(member.user_id, weekday, kitId);
    }
  };

  // Pause single day
  const handlePauseSingleDay = async (dateStr: string) => {
    if (!activeSubscription) return;
    const res = await addPause({ startDate: dateStr, endDate: dateStr });
    if (res.success) {
      Alert.alert('Day Paused', `Deliveries on ${dateStr} have been paused.`);
      setDayDetailVisible(false);
      fetchPauses();
    } else {
      Alert.alert('Pause Limit', res.error || 'Could not pause deliveries for this day.');
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
    try {
      setIsSubmitting(true);

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
        planType: 'custom',
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

  const getNextMondayFormatted = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

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

  // Day detail popup content renderer
  const renderDayDetailContent = () => {
    if (!selectedDayItem) return null;
    const targetMembers = isOwner
      ? coveredMembersList
      : coveredMembersList.filter((m) => m.user_id === user?.uid);

    return (
      <View style={styles.dayDetailContent}>
        {targetMembers.map((member) => {
          const key = `${member.user_id}_${selectedDayItem.weekdayIndex}`;
          const kitId = localMeals[key];
          const kit = kitId ? getMealKitById(kitId) : undefined;
          const conflict = kit
            ? checkDietaryConflict(member, kit)
            : { hasConflict: false, reasons: [] };
          const memCfg = memberPlanConfigs[member.user_id] || {
            planType: 'standard',
            standardPlanKey: 'high-protein',
          };
          const planLabel =
            memCfg.planType === 'custom'
              ? 'Custom Plan'
              : STANDARD_SUBSCRIPTION_PLANS[memCfg.standardPlanKey || 'high-protein']?.name ||
                'Standard Plan';

          return (
            <View
              key={`day-detail-member-${member.user_id}`}
              style={[
                styles.memberSectionBox,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
              ]}
            >
              {/* Member Section Header */}
              <View style={styles.memberSectionHeader}>
                <Avatar name={member.display_name} id={member.user_id} size="sm" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.memberSectionName, { color: colors.textPrimary }]}>
                      {member.display_name}
                    </Text>
                    <Badge
                      label={
                        member.dependent_type
                          ? `Dependent (${member.dependent_type})`
                          : member.role === 'owner'
                            ? 'Owner'
                            : member.role
                      }
                      variant="neutral"
                      size="sm"
                    />
                  </View>
                  <Text style={[styles.memberSectionPlan, { color: colors.textSecondary }]}>
                    {planLabel}
                  </Text>
                </View>
              </View>

              {/* Dietary Clash Warning Banner (Inside member section only) */}
              {conflict.hasConflict && (
                <View
                  style={[
                    styles.conflictAlertBox,
                    { backgroundColor: colors.bgWarningSubtle, borderColor: colors.warning },
                  ]}
                  testID={`conflict-warning-${member.user_id}`}
                >
                  <Text style={[styles.conflictAlertTitle, { color: colors.warning }]}>
                    ⚠️ Dietary Preference Conflict
                  </Text>
                  {conflict.reasons.map((r, i) => (
                    <Text key={i} style={[styles.conflictAlertReason, { color: colors.warning }]}>
                      • {r}
                    </Text>
                  ))}
                </View>
              )}

              {/* Assigned Kit or Empty State */}
              {kit ? (
                <View
                  style={[
                    styles.dayKitCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  {kit.heroImage ? (
                    <Image source={{ uri: kit.heroImage }} style={styles.dayKitImg} />
                  ) : null}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.dayKitName, { color: colors.textPrimary }]}>
                      {kit.name}
                    </Text>
                    <Text style={[styles.dayKitMeta, { color: colors.textSecondary }]}>
                      {kit.cuisine} • {kit.diet.toUpperCase()} • {kit.nutrition?.protein || 20}g
                      Protein
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.dayKitEmpty,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Icon name="restaurant-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.dayKitEmptyText, { color: colors.textSecondary }]}>
                    No meal kit assigned for this day
                  </Text>
                </View>
              )}

              {/* Actions (Owner only) */}
              {isOwner && (
                <View style={styles.memberActionButtonsRow}>
                  <Button
                    title="Change Recipe"
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      setSelectedCell({
                        member,
                        weekday: selectedDayItem.weekdayIndex,
                        currentKit: kit,
                      });
                      setDayDetailVisible(false);
                      setPickerModalVisible(true);
                    }}
                    style={{ flex: 1, marginRight: 8 }}
                    testID="cell-change-recipe-btn"
                  />
                  {kit ? (
                    <Button
                      title="Clear"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        handleClearMealForMemberDay(member.user_id, selectedDayItem.weekdayIndex)
                      }
                      testID="cell-clear-recipe-btn"
                    />
                  ) : (
                    <Button
                      title="Add a meal"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setSelectedCell({
                          member,
                          weekday: selectedDayItem.weekdayIndex,
                        });
                        setDayDetailVisible(false);
                        setPickerModalVisible(true);
                      }}
                      testID="cell-add-meal-btn"
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Day Pause Toggle (Owner only) */}
        {isOwner && activeSubscription && (
          <View style={[styles.dayPauseBox, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.dayPauseTitle, { color: colors.textPrimary }]}>
              Pause Deliveries for This Date
            </Text>
            {selectedDayItem.isLocked ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                Locked (within 48 hours cutoff window or in the past).
              </Text>
            ) : selectedDayItem.isPaused ? (
              <View style={styles.dayPausedNotice}>
                <Icon name="pause-circle" size={16} color={colors.warning} />
                <Text
                  style={{ fontSize: 13, color: colors.warning, fontWeight: '700', marginLeft: 6 }}
                >
                  Deliveries are paused on this day.
                </Text>
              </View>
            ) : (
              <Button
                title="Pause Deliveries on This Day"
                variant="outline"
                size="sm"
                onPress={() => handlePauseSingleDay(selectedDayItem.dateStr)}
                style={{ marginTop: 8 }}
                testID="day-detail-pause-btn"
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const dayDetailTitle = selectedDayItem?.date
    ? selectedDayItem.date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header */}
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

        {/* 1. Covered Members Selector */}
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

        {/* 2. Member plans Section (Above the Calendar) */}
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeaderRowBetween}>
            <View>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                {t.familyCalendar.memberPlansHeading}
              </Text>
              <Text style={[styles.runningTotalText, { color: colors.primary }]}>
                {t.familyCalendar.totalPerWeekSummary(pricing.total, selectedMemberIds.length)}
              </Text>
            </View>
          </View>

          {/* Apply the same plan to everyone (Owner only) */}
          {isOwner && (
            <View
              style={[
                styles.applySameCard,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
              ]}
            >
              <View style={{ marginBottom: 8 }}>
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
                  onPress={() => confirmApplySamePlan('standard', 'high-protein')}
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
                  onPress={() => confirmApplySamePlan('standard', 'keto')}
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
                  onPress={() => confirmApplySamePlan('standard', 'vegan')}
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
                  onPress={() => confirmApplySamePlan('custom')}
                  testID="apply-all-custom-btn"
                >
                  <Text style={[styles.applySameBtnText, { color: colors.textPrimary }]}>
                    Custom (₹1,399)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Member Plan Cards (1 col mobile, 2-3 col web) */}
          <View style={styles.memberCardsContainer}>
            {coveredMembersList.map((member) => {
              const cfg = memberPlanConfigs[member.user_id] || {
                planType: 'standard',
                standardPlanKey: 'high-protein',
              };
              const activeSegmentVal =
                cfg.planType === 'custom' ? 'custom' : cfg.standardPlanKey || 'high-protein';
              const weeklyPrice =
                cfg.planType === 'standard' && cfg.standardPlanKey
                  ? STANDARD_SUBSCRIPTION_PLANS[cfg.standardPlanKey]?.pricePerMemberPerWeek ||
                    DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK
                  : DEFAULT_CUSTOM_PLAN_PRICE_PER_WEEK;

              const cardWidth = isWebOrDesktop ? (width > 1100 ? '31.5%' : '48.5%') : '100%';

              return (
                <View
                  key={`plan-card-${member.user_id}`}
                  style={[
                    styles.memberPlanCard,
                    {
                      width: cardWidth,
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                      borderRadius: radii.lg,
                      ...shadows.card,
                    },
                  ]}
                  testID={`calendar-row-${member.user_id}`}
                >
                  <View style={styles.memberPlanCardHeader}>
                    <Avatar name={member.display_name} id={member.user_id} size="md" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.memberPlanName, { color: colors.textPrimary }]}>
                        {member.display_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Badge
                          label={
                            member.dependent_type
                              ? `Dependent (${member.dependent_type})`
                              : member.role === 'owner'
                                ? 'Owner'
                                : member.role
                          }
                          variant="neutral"
                          size="sm"
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.memberPlanSummary, { color: colors.textSecondary }]}>
                    ₹{weeklyPrice.toLocaleString('en-IN')} / week • 7 dinners
                  </Text>

                  {isOwner ? (
                    <SegmentedControl
                      options={PLAN_SEGMENTS}
                      selectedValue={activeSegmentVal}
                      onSelect={(val) => handleSelectMemberPlanSegment(member, val)}
                      style={{ marginTop: 8 }}
                      testID={`plan-picker-${member.user_id}`}
                    />
                  ) : (
                    <Badge
                      label={
                        activeSegmentVal === 'custom'
                          ? 'Custom Plan'
                          : STANDARD_SUBSCRIPTION_PLANS[activeSegmentVal as StandardPlanKey]
                              ?.name || 'Standard'
                      }
                      variant="primary"
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. Weekly Meal Plan (Google Calendar Style Month Grid) */}
        <View style={{ marginTop: 28 }}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              {t.familyCalendar.planHeading}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t.familyCalendar.planSubtitle}
            </Text>
          </View>

          {/* Month Navigation Row */}
          <View
            style={[
              styles.monthNavRow,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {monthGrid.monthLabel}
            </Text>
            <View style={styles.monthNavActions}>
              <Button
                title="Today"
                size="sm"
                variant="outline"
                onPress={handleGoToToday}
                testID="calendar-today-btn"
              />
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={[
                  styles.navArrowBtn,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                ]}
                accessibilityLabel="Previous month"
                testID="calendar-prev-month-btn"
              >
                <Icon name="chevron-back" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={[
                  styles.navArrowBtn,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                ]}
                accessibilityLabel="Next month"
                testID="calendar-next-month-btn"
              >
                <Icon name="chevron-forward" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar Month Grid */}
          <View
            style={[
              styles.calendarGridWrap,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            {/* Weekday Header Row - Mon through Sun ONCE only */}
            <View style={styles.weekdayHeaderRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                <View key={`weekday-head-${dayName}`} style={styles.weekdayHeaderCell}>
                  <Text style={[styles.weekdayHeaderText, { color: colors.textSecondary }]}>
                    {dayName}
                  </Text>
                </View>
              ))}
            </View>

            {/* Weeks and Days Grid */}
            {monthGrid.weeks.map((week, wIdx) => (
              <View key={`grid-week-${wIdx}`} style={styles.weekRow}>
                {week.map((day, dIdx) => {
                  if (!day.date || !day.isCurrentMonth) {
                    return (
                      <View
                        key={`pad-cell-${wIdx}-${dIdx}`}
                        style={[styles.calendarDayCell, styles.dayCellPadding]}
                      />
                    );
                  }

                  const dayMeals = day.isInsidePeriod
                    ? mapMealsForDay({
                        members: coveredMembersList,
                        localMeals,
                        weekdayIndex: day.weekdayIndex,
                        getMealKitById,
                        filterToMemberId: isOwner ? null : user?.uid,
                      })
                    : {
                        allMemberMeals: [],
                        assignedMeals: [],
                        visibleMeals: [],
                        overflowCount: 0,
                        hasAnyConflict: false,
                      };

                  const isTappable = day.isInsidePeriod;
                  const firstMemId = coveredMembersList[0]?.user_id || user?.uid || 'user_owner';

                  return (
                    <TouchableOpacity
                      key={`day-cell-${day.dateStr}`}
                      style={[
                        styles.calendarDayCell,
                        {
                          backgroundColor: !day.isInsidePeriod
                            ? colors.bgSubtle
                            : day.isPaused
                              ? colors.bgWarningSubtle
                              : colors.bgSurface,
                          borderColor: day.isPaused
                            ? colors.warning
                            : day.isToday
                              ? colors.primary
                              : colors.borderLight,
                          borderWidth: day.isToday ? 2 : 1,
                          opacity: !day.isInsidePeriod ? 0.35 : 1,
                        },
                      ]}
                      onPress={() => handleTapDayCell(day)}
                      disabled={!isTappable}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={formatDayAccessibilityLabel(
                        day.date,
                        dayMeals.assignedMeals.length,
                        day.isPaused,
                        dayMeals.hasAnyConflict,
                      )}
                      testID={
                        dayMeals.hasAnyConflict
                          ? 'calendar-clash-cell'
                          : `calendar-cell-${day.dateStr}`
                      }
                    >
                      {/* Day Header Inside Cell */}
                      <View style={styles.cellDayHeader}>
                        <Text
                          style={[
                            styles.cellDayNum,
                            {
                              color: day.isToday ? colors.primary : colors.textPrimary,
                            },
                          ]}
                        >
                          {day.dayNum}
                        </Text>
                        <Text style={[styles.cellWeekdayShort, { color: colors.textSecondary }]}>
                          {day.weekdayShort}
                        </Text>
                        {dayMeals.hasAnyConflict && (
                          <Text style={styles.cellClashIcon} testID="cell-clash-icon">
                            ⚠️
                          </Text>
                        )}
                      </View>

                      {/* Member Meal Thumbnails (Up to 3, +N chip) */}
                      <View style={styles.cellThumbnailsRow}>
                        {dayMeals.visibleMeals.map((item) => (
                          <View
                            key={`thumb-${item.member.user_id}-${day.dateStr}`}
                            style={[styles.mealThumbWrap, { borderColor: colors.borderLight }]}
                          >
                            {item.kit?.heroImage ? (
                              <Image
                                source={{ uri: item.kit.heroImage }}
                                style={styles.mealThumbImg}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.mealThumbPlaceholder,
                                  { backgroundColor: colors.bgSubtle },
                                ]}
                              />
                            )}
                          </View>
                        ))}
                        {dayMeals.overflowCount > 0 && (
                          <View
                            style={[
                              styles.overflowChip,
                              {
                                backgroundColor: colors.bgSubtle,
                                borderColor: colors.borderLight,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.overflowChipText, { color: colors.textSecondary }]}
                            >
                              +{dayMeals.overflowCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* 4. Pricing & Upfront Checkout Card */}
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

      {/* Day Detail Popup: Modal on Web/Desktop, BottomSheet on Mobile Phones */}
      {selectedDayItem &&
        (isWebOrDesktop ? (
          <Modal
            visible={dayDetailVisible}
            onClose={() => setDayDetailVisible(false)}
            title={dayDetailTitle}
            subtitle="Daily Member Meals"
            containerStyle={{ maxWidth: 520 }}
            testID="cell-detail-modal"
          >
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {renderDayDetailContent()}
            </ScrollView>
          </Modal>
        ) : (
          <BottomSheet
            visible={dayDetailVisible}
            onClose={() => setDayDetailVisible(false)}
            title={dayDetailTitle}
            subtitle="Daily Member Meals"
            testID="cell-detail-modal"
          >
            {renderDayDetailContent()}
          </BottomSheet>
        ))}

      {/* Recipe Catalog Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        onClose={() => setPickerModalVisible(false)}
        animationType="slide"
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
                    color: catalogFilterDiet === diet ? colors.textInverse : colors.textPrimary,
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
                            color: colors.warning,
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
  sectionHeaderRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  runningTotalText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
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
  applySameCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
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
  memberCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  memberPlanCard: {
    padding: 14,
    borderWidth: 1,
  },
  memberPlanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberPlanName: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberPlanSummary: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  monthNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGridWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 6,
    marginBottom: 4,
  },
  weekdayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayHeaderText: {
    fontSize: 11,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    padding: 3,
    marginHorizontal: 1,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'space-between',
  },
  dayCellPadding: {
    borderWidth: 0,
    opacity: 0,
  },
  cellDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cellDayNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  cellWeekdayShort: {
    fontSize: 9,
  },
  cellClashIcon: {
    fontSize: 9,
  },
  cellThumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    justifyContent: 'flex-start',
  },
  mealThumbWrap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mealThumbImg: {
    width: '100%',
    height: '100%',
  },
  mealThumbPlaceholder: {
    width: '100%',
    height: '100%',
  },
  overflowChip: {
    paddingHorizontal: 2,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowChipText: {
    fontSize: 8,
    fontWeight: '800',
  },
  dayDetailContent: {
    paddingTop: 8,
  },
  memberSectionBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  memberSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberSectionName: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberSectionPlan: {
    fontSize: 11,
    marginTop: 2,
  },
  conflictAlertBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  conflictAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  conflictAlertReason: {
    fontSize: 11,
  },
  dayKitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayKitImg: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  dayKitName: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayKitMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  dayKitEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  dayKitEmptyText: {
    fontSize: 12,
  },
  memberActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  dayPauseBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  dayPauseTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayPausedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
