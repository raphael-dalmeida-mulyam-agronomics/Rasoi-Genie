import {
  calculatePerMemberSubscriptionTotal,
  copyPlanToAllMembers,
  validatePauseSelection,
  calculateExtendedPeriodEnd,
  calculateRemainingPauseAllowance,
  isDateLockedForPause,
  STANDARD_SUBSCRIPTION_PLANS,
  groupDatesIntoRanges,
  validateHighlightedPauseDays,
  calculateNextDeliveryInfo,
} from '../services/subscriptionPlans';
import {
  createAndActivateSubscription,
  createSubscriptionPause,
  processSubscriptionRenewal,
  resetSubscriptionMockStore,
  toggleAutoRenew,
  applyPlanToAllMembers,
  removeSubscriptionPause,
  subscribeToSubscriptionPausesRealtime,
  notifySubscriptionPauseListeners,
  unpauseSubscriptionDates,
  fetchSubscriptionPauses,
} from '../services/subscriptionService';
import {
  SUBSCRIPTION_PAUSE_CONFIG,
  SUBSCRIPTION_RENEWAL_CONFIG,
} from '../subscription/subscriptionConfig';
import { can } from '../family/permissions';

describe('Subscription Extensions Test Suite', () => {
  beforeEach(() => {
    resetSubscriptionMockStore();
  });

  // ==========================================
  // 1. Per-Member Pricing Pure Function
  // ==========================================
  describe('calculatePerMemberSubscriptionTotal', () => {
    it('calculates total for mixed plans across family members', () => {
      const members = [
        {
          planType: 'standard' as const,
          standardPlanKey: 'high-protein' as const,
          pricePerWeek: 1299,
        },
        { planType: 'standard' as const, standardPlanKey: 'keto' as const, pricePerWeek: 1499 },
        { planType: 'standard' as const, standardPlanKey: 'vegan' as const, pricePerWeek: 1199 },
        { planType: 'custom' as const, pricePerWeek: 1399 },
      ];

      const result = calculatePerMemberSubscriptionTotal({
        members,
        weeks: 1,
      });

      // 1299 + 1499 + 1199 + 1399 = 5396
      expect(result.membersCount).toBe(4);
      expect(result.weeks).toBe(1);
      expect(result.subtotal).toBe(5396);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(5396);
      expect(result.memberBreakdown).toHaveLength(4);
      expect(result.memberBreakdown[0]!.pricePerWeek).toBe(1299);
      expect(result.memberBreakdown[1]!.pricePerWeek).toBe(1499);
      expect(result.memberBreakdown[2]!.pricePerWeek).toBe(1199);
      expect(result.memberBreakdown[3]!.pricePerWeek).toBe(1399);
    });

    it('multiplies member total by number of weeks in period', () => {
      const members = [
        {
          planType: 'standard' as const,
          standardPlanKey: 'high-protein' as const,
          pricePerWeek: 1299,
        },
        { planType: 'standard' as const, standardPlanKey: 'vegan' as const, pricePerWeek: 1199 },
      ];

      // Weekly subtotal = 2498. For 4 weeks = 9992.
      const result = calculatePerMemberSubscriptionTotal({
        members,
        weeks: 4,
      });

      expect(result.weeks).toBe(4);
      expect(result.subtotal).toBe(9992);
      expect(result.total).toBe(9992);
      expect(result.memberBreakdown[0]!.totalForPeriod).toBe(1299 * 4);
      expect(result.memberBreakdown[1]!.totalForPeriod).toBe(1199 * 4);
    });

    it('correctly applies discount up to subtotal cap', () => {
      const members = [
        {
          planType: 'standard' as const,
          standardPlanKey: 'high-protein' as const,
          pricePerWeek: 1000,
        },
      ];

      const withDiscount = calculatePerMemberSubscriptionTotal({
        members,
        weeks: 1,
        discount: 250,
      });
      expect(withDiscount.subtotal).toBe(1000);
      expect(withDiscount.discount).toBe(250);
      expect(withDiscount.total).toBe(750);

      // Oversized discount capped at subtotal
      const cappedDiscount = calculatePerMemberSubscriptionTotal({
        members,
        weeks: 1,
        discount: 2000,
      });
      expect(cappedDiscount.total).toBe(0);
    });

    it('handles zero members or invalid weeks safely', () => {
      const empty = calculatePerMemberSubscriptionTotal({
        members: [],
        weeks: 2,
      });
      expect(empty.membersCount).toBe(0);
      expect(empty.subtotal).toBe(0);
      expect(empty.total).toBe(0);

      const invalidWeeks = calculatePerMemberSubscriptionTotal({
        members: [{ planType: 'custom' as const, pricePerWeek: 1000 }],
        weeks: -1,
      });
      expect(invalidWeeks.weeks).toBe(1); // normalized to minimum 1
      expect(invalidWeeks.total).toBe(1000);
    });
  });

  // ==========================================
  // 2. Same-Plan Copy Pure Function
  // ==========================================
  describe('copyPlanToAllMembers', () => {
    it('copies target plan and standard key to all given member IDs', () => {
      const memberIds = ['user_1', 'user_2', 'user_dep_3'];
      const targetPlan = { planType: 'standard' as const, standardPlanKey: 'keto' as const };

      const copied = copyPlanToAllMembers(targetPlan, memberIds, 'shared_all');

      expect(Object.keys(copied)).toHaveLength(3);
      memberIds.forEach((id) => {
        expect(copied[id]).toEqual({
          planType: 'standard',
          standardPlanKey: 'keto',
          planGroup: 'shared_all',
        });
      });
    });

    it('supports custom plan copying with custom plan group', () => {
      const memberIds = ['m1', 'm2'];
      const targetPlan = { planType: 'custom' as const, standardPlanKey: null };

      const copied = copyPlanToAllMembers(targetPlan, memberIds, 'family_custom');

      expect(copied['m1']).toEqual({
        planType: 'custom',
        standardPlanKey: null,
        planGroup: 'family_custom',
      });
      expect(copied['m2']).toEqual({
        planType: 'custom',
        standardPlanKey: null,
        planGroup: 'family_custom',
      });
    });

    it('returns empty object when no member IDs are passed', () => {
      const copied = copyPlanToAllMembers({ planType: 'custom' as const }, []);
      expect(copied).toEqual({});
    });
  });

  // ==========================================
  // 3. Pause Limits & Edge Cases Validation
  // ==========================================
  describe('validatePauseSelection', () => {
    const fixedNow = '2026-11-02T08:00:00Z';
    const periodStart = '2026-11-01';
    const periodEnd = '2026-11-30';

    it('accepts a valid pause range within all rules', () => {
      const res = validatePauseSelection({
        startDate: '2026-11-06',
        endDate: '2026-11-10', // 5 days
        periodStart,
        periodEnd,
        now: fixedNow,
        existingPauses: [],
      });

      expect(res.valid).toBe(true);
      expect(res.daysCount).toBe(5);
      expect(res.error).toBeUndefined();
    });

    it('enforces maximum 7 consecutive days limit', () => {
      // 8 consecutive days: 2026-11-06 to 2026-11-13
      const res = validatePauseSelection({
        startDate: '2026-11-06',
        endDate: '2026-11-13',
        periodStart,
        periodEnd,
        now: fixedNow,
      });

      expect(res.valid).toBe(false);
      expect(res.daysCount).toBe(8);
      expect(res.error).toContain(
        `longer than ${SUBSCRIPTION_PAUSE_CONFIG.MAX_CONSECUTIVE_PAUSE_DAYS} consecutive days`,
      );

      // Exactly 7 consecutive days is permitted
      const exact7 = validatePauseSelection({
        startDate: '2026-11-06',
        endDate: '2026-11-12', // 7 days
        periodStart,
        periodEnd,
        now: fixedNow,
      });
      expect(exact7.valid).toBe(true);
      expect(exact7.daysCount).toBe(7);
    });

    it('rejects dates in the past or within 48-hour delivery cutoff window', () => {
      // Past day
      const pastRes = validatePauseSelection({
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        periodStart,
        periodEnd,
        now: fixedNow,
      });
      expect(pastRes.valid).toBe(false);
      expect(pastRes.error).toContain('48-hour delivery cutoff window or in the past');

      // Inside 48h cutoff (< 2026-11-04)
      const cutoffRes = validatePauseSelection({
        startDate: '2026-11-03',
        endDate: '2026-11-05',
        periodStart,
        periodEnd,
        now: fixedNow,
      });
      expect(cutoffRes.valid).toBe(false);
      expect(cutoffRes.error).toContain('48-hour delivery cutoff window');
    });

    it('rejects paused days falling outside current billing period boundaries', () => {
      // Start before period
      const beforeRes = validatePauseSelection({
        startDate: '2026-10-31',
        endDate: '2026-11-05',
        periodStart,
        periodEnd,
        now: '2026-10-25T00:00:00Z',
      });
      expect(beforeRes.valid).toBe(false);
      expect(beforeRes.error).toContain('fall inside the current billing period');

      // End after period
      const afterRes = validatePauseSelection({
        startDate: '2026-11-28',
        endDate: '2026-12-02',
        periodStart,
        periodEnd,
        now: fixedNow,
      });
      expect(afterRes.valid).toBe(false);
      expect(afterRes.error).toContain('fall inside the current billing period');
    });

    it('enforces maximum 14 paused days per billing period', () => {
      const existingPauses = [
        { startDate: '2026-11-06', endDate: '2026-11-12', daysCount: 7 }, // 7 days used
      ];

      // Requesting another 7 days -> total 14: passes
      const ok14 = validatePauseSelection({
        startDate: '2026-11-15',
        endDate: '2026-11-21', // 7 days
        periodStart,
        periodEnd,
        now: fixedNow,
        existingPauses,
      });
      expect(ok14.valid).toBe(true);

      // Existing 10 days used in 1 range, requesting 5 days -> total 15: fails 14-day limit
      const existing10 = [{ startDate: '2026-11-06', endDate: '2026-11-15', daysCount: 10 }];
      const exceed14 = validatePauseSelection({
        startDate: '2026-11-20',
        endDate: '2026-11-24', // 5 days -> 15 total
        periodStart,
        periodEnd,
        now: fixedNow,
        existingPauses: existing10,
      });
      expect(exceed14.valid).toBe(false);
      expect(exceed14.error).toContain(
        `${SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD} paused days left`,
      );
    });

    it('enforces maximum 2 separate pause ranges per period', () => {
      const existing2 = [
        { startDate: '2026-11-05', endDate: '2026-11-07', daysCount: 3 },
        { startDate: '2026-11-10', endDate: '2026-11-12', daysCount: 3 },
      ];

      const res = validatePauseSelection({
        startDate: '2026-11-15',
        endDate: '2026-11-17',
        periodStart,
        periodEnd,
        now: fixedNow,
        existingPauses: existing2,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Maximum 2 separate pause ranges allowed');
    });

    it('rejects overlapping ranges', () => {
      const existing = [{ startDate: '2026-11-10', endDate: '2026-11-15', daysCount: 6 }];

      // New range intersects existing range
      const overlapRes = validatePauseSelection({
        startDate: '2026-11-14',
        endDate: '2026-11-18',
        periodStart,
        periodEnd,
        now: fixedNow,
        existingPauses: existing,
      });

      expect(overlapRes.valid).toBe(false);
      expect(overlapRes.error).toContain('overlaps with an existing pause');
    });

    it('rejects inverted dates (end date before start date)', () => {
      const res = validatePauseSelection({
        startDate: '2026-11-15',
        endDate: '2026-11-10',
        periodStart,
        periodEnd,
        now: fixedNow,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('earlier than start date');
    });
  });

  // ==========================================
  // 4. Period Extension Arithmetic
  // ==========================================
  describe('calculateExtendedPeriodEnd & allowance tracking', () => {
    it('accurately extends period end date by paused days', () => {
      const currentEnd = new Date('2026-11-15T00:00:00.000Z');
      const extended5Days = calculateExtendedPeriodEnd(currentEnd, 5);

      expect(extended5Days.toISOString()).toBe('2026-11-20T00:00:00.000Z');

      const extended7Days = calculateExtendedPeriodEnd('2026-11-15T00:00:00.000Z', 7);
      expect(extended7Days.toISOString()).toBe('2026-11-22T00:00:00.000Z');
    });

    it('calculates remaining pause allowance accurately', () => {
      const pauses = [{ startDate: '2026-11-05', endDate: '2026-11-08', daysCount: 4 }];

      const allowance = calculateRemainingPauseAllowance(pauses);
      expect(allowance.totalAllowedDays).toBe(14);
      expect(allowance.daysUsed).toBe(4);
      expect(allowance.daysRemaining).toBe(10);
      expect(allowance.maxRanges).toBe(2);
      expect(allowance.rangesUsed).toBe(1);
      expect(allowance.rangesRemaining).toBe(1);
    });

    it('identifies locked dates via isDateLockedForPause', () => {
      const now = '2026-11-10T10:00:00Z'; // Cutoff 48h -> 2026-11-12
      expect(isDateLockedForPause('2026-11-09', now)).toBe(true);
      expect(isDateLockedForPause('2026-11-11', now)).toBe(true);
      expect(isDateLockedForPause('2026-11-13', now)).toBe(false);
    });
  });

  // ==========================================
  // 5. Renewal State Machine & Idempotency
  // ==========================================
  describe('processSubscriptionRenewal', () => {
    it('successfully advances period, retains plans, and resets retry counter on success', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_owner_101',
        scope: 'family',
        planType: 'custom',
        amountPaid: 2498,
        autoRenew: true,
        members: [
          {
            id: 'm1',
            name: 'Member 1',
            isDependent: false,
            planType: 'standard',
            standardPlanKey: 'high-protein',
            pricePerWeek: 1299,
          },
          {
            id: 'm2',
            name: 'Member 2',
            isDependent: false,
            planType: 'standard',
            standardPlanKey: 'vegan',
            pricePerWeek: 1199,
          },
        ],
      });

      expect(subRes.success).toBe(true);
      const sub = subRes.subscription!;
      expect(sub.renewal_attempts).toBe(0);
      expect(sub.auto_renew).toBe(true);

      const originalEnd = sub.period_end;
      const renewRes = await processSubscriptionRenewal(sub.id);

      expect(renewRes.success).toBe(true);
      expect(renewRes.alreadyRenewed).toBe(false);
      const renewed = renewRes.subscription!;
      expect(renewed.status).toBe('active');
      expect(renewed.period_start).toBe(originalEnd);
      // Period end advanced by 7 days
      const expectedEnd = new Date(
        new Date(originalEnd).getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      expect(renewed.period_end).toBe(expectedEnd);
      expect(renewed.renewal_attempts).toBe(0);
      expect(renewed.last_renewed_period_end).toBe(expectedEnd);
    });

    it('is idempotent: executing renewal twice for the same period does not double charge or advance', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_owner_idempotent',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });

      const sub = subRes.subscription!;

      // First renewal
      const firstRenew = await processSubscriptionRenewal(sub.id);
      expect(firstRenew.success).toBe(true);
      expect(firstRenew.alreadyRenewed).toBe(false);

      // Immediate second renewal call for the exact same state
      const secondRenew = await processSubscriptionRenewal(sub.id);
      expect(secondRenew.success).toBe(true);
      expect(secondRenew.alreadyRenewed).toBe(true);
      expect(secondRenew.subscription?.period_end).toBe(firstRenew.subscription?.period_end);
    });

    it('retries on payment failure up to 3 times, then marks subscription as expired', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_retry_flow',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'keto',
        amountPaid: 1499,
        autoRenew: true,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const subId = subRes.subscription!.id;

      // Failure Attempt 1
      const fail1 = await processSubscriptionRenewal(subId, true);
      expect(fail1.success).toBe(false);
      expect(fail1.attempts).toBe(1);
      expect(fail1.expired).toBe(false);
      expect(fail1.subscription?.status).toBe('active');

      // Failure Attempt 2
      const fail2 = await processSubscriptionRenewal(subId, true);
      expect(fail2.success).toBe(false);
      expect(fail2.attempts).toBe(2);
      expect(fail2.expired).toBe(false);

      // Failure Attempt 3 -> Marks subscription as expired
      const fail3 = await processSubscriptionRenewal(subId, true);
      expect(fail3.success).toBe(false);
      expect(fail3.attempts).toBe(3);
      expect(fail3.expired).toBe(true);
      expect(fail3.subscription?.status).toBe('expired');
      expect(fail3.error).toContain('Maximum renewal attempts exceeded');
    });

    it('marks subscription as expired at period end when auto-renew is off', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_opt_out',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'vegan',
        amountPaid: 1199,
        autoRenew: false, // Opted out
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const subId = subRes.subscription!.id;

      const renewRes = await processSubscriptionRenewal(subId);
      expect(renewRes.success).toBe(true);
      expect(renewRes.expired).toBe(true);
      expect(renewRes.subscription?.status).toBe('expired');
    });
  });

  // ==========================================
  // 6. Owner-Only Permissions Guard
  // ==========================================
  describe('Family permissions matrix for subscription', () => {
    it('grants full subscription management solely to family owner', () => {
      expect(can('owner', 'manage_family_subscription')).toBe(true);
      expect(can('co_owner', 'manage_family_subscription')).toBe(false);
      expect(can('member', 'manage_family_subscription')).toBe(false);
      expect(can('dependent', 'manage_family_subscription')).toBe(false);
      expect(can(null, 'manage_family_subscription')).toBe(false);
    });

    it('grants view_own_subscription_plan to all covered family roles', () => {
      expect(can('owner', 'view_own_subscription_plan')).toBe(true);
      expect(can('co_owner', 'view_own_subscription_plan')).toBe(true);
      expect(can('member', 'view_own_subscription_plan')).toBe(true);
      expect(can('dependent', 'view_own_subscription_plan')).toBe(true);
      expect(can(null, 'view_own_subscription_plan')).toBe(false);
    });
  });

  // ==========================================
  // 7. Non-Contiguous Highlighted Day Pauses & Period Carry-On
  // ==========================================
  describe('Non-contiguous highlighted pause days & carry-on', () => {
    it('groups non-contiguous, contiguous, and mixed dates into correct ranges', () => {
      // Contiguous
      const r1 = groupDatesIntoRanges(['2026-11-05', '2026-11-06', '2026-11-07']);
      expect(r1).toEqual([{ startDate: '2026-11-05', endDate: '2026-11-07', daysCount: 3 }]);

      // Non-contiguous
      const r2 = groupDatesIntoRanges(['2026-11-05', '2026-11-08', '2026-11-12']);
      expect(r2).toEqual([
        { startDate: '2026-11-05', endDate: '2026-11-05', daysCount: 1 },
        { startDate: '2026-11-08', endDate: '2026-11-08', daysCount: 1 },
        { startDate: '2026-11-12', endDate: '2026-11-12', daysCount: 1 },
      ]);

      // Mixed
      const r3 = groupDatesIntoRanges([
        '2026-11-05',
        '2026-11-06',
        '2026-11-09',
        '2026-11-10',
        '2026-11-14',
      ]);
      expect(r3).toEqual([
        { startDate: '2026-11-05', endDate: '2026-11-06', daysCount: 2 },
        { startDate: '2026-11-09', endDate: '2026-11-10', daysCount: 2 },
        { startDate: '2026-11-14', endDate: '2026-11-14', daysCount: 1 },
      ]);
    });

    it('validates arbitrary non-contiguous days within allowance and inside period', () => {
      const res = validateHighlightedPauseDays({
        dates: ['2026-11-05', '2026-11-08', '2026-11-11'],
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        now: '2026-11-01T00:00:00Z',
      });

      expect(res.valid).toBe(true);
      expect(res.daysCount).toBe(3);
      expect(res.ranges).toHaveLength(3);
    });

    it('rejects dates in the past or within 48h cutoff window', () => {
      const now = '2026-11-05T00:00:00Z'; // 48h cutoff -> 2026-11-07
      const res = validateHighlightedPauseDays({
        dates: ['2026-11-06', '2026-11-10'],
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        now,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('within the 48-hour delivery packing cutoff window');
    });

    it('rejects dates outside current billing period', () => {
      const res = validateHighlightedPauseDays({
        dates: ['2026-11-05', '2026-12-05'],
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        now: '2026-11-01T00:00:00Z',
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('must fall inside the current billing period');
    });

    it('creates pause records and extends subscription period to carry on skipped kits', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_carry_on',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;
      const originalEnd = new Date(sub.period_end).getTime();

      // Select 2 non-contiguous days inside the 7-day period (e.g. day 3 and day 5 after cutoff)
      const baseTime = new Date(sub.period_start).getTime();
      const d1 = new Date(baseTime + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
      const d2 = new Date(baseTime + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const datesToSkip = [d1, d2];
      const pauseRes = await createSubscriptionPause({
        subscriptionId: sub.id,
        dates: datesToSkip,
        createdBy: 'user_carry_on',
      });

      expect(pauseRes.success).toBe(true);
      expect(pauseRes.extendedPeriodEnd).toBeDefined();

      const newEnd = new Date(pauseRes.extendedPeriodEnd!).getTime();
      const diffDays = Math.round((newEnd - originalEnd) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(2);
    });
  });

  // ==========================================
  // 8. Next Delivery Carry-Over Computation
  // ==========================================
  describe('calculateNextDeliveryInfo (Daily Deliveries)', () => {
    it('returns today as next delivery when today is an active unpaused subscription day', () => {
      // Fixed Thursday 29 October 2026
      const fixedNow = new Date(2026, 9, 29, 12, 0, 0); // 29 Oct 2026
      const result = calculateNextDeliveryInfo({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-05',
        pauses: [],
        now: fixedNow,
      });

      expect(result.dateStr).toBe('2026-10-29');
      expect(result.formattedDate).toBe('29 Oct');
      expect(result.dayOfWeek).toBe('Thursday');
      expect(result.isToday).toBe(true);
      expect(result.isCarriedOver).toBe(false);
      expect(result.carriedDaysCount).toBe(0);
      expect(result.deliveryNote).toBe('Next Delivery: Today • Evening Dinner Delivery');
      expect(result.resumesNote).toBeUndefined();
    });

    it('advances to next unpaused day when currently in a pause and resumes daily deliveries (e.g. 31 Oct - 4 Nov paused)', () => {
      // Current time is 31 Oct 2026 (first day of pause)
      const fixedNow = new Date(2026, 9, 31, 10, 0, 0);
      const result = calculateNextDeliveryInfo({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-10',
        pauses: [
          {
            startDate: '2026-10-31',
            endDate: '2026-11-04',
            daysCount: 5,
          },
        ],
        now: fixedNow,
      });

      // 31 Oct to 4 Nov is paused, so next delivery resumes immediately on 5 Nov (Thursday)!
      expect(result.dateStr).toBe('2026-11-05');
      expect(result.formattedDate).toBe('5 Nov');
      expect(result.dayOfWeek).toBe('Thursday');
      expect(result.isCarriedOver).toBe(true);
      expect(result.carriedDaysCount).toBe(5);
      expect(result.deliveryNote).toBe(
        'Next Delivery: 5 Nov • Thursday Evening Delivery (Resumes after pause)',
      );
      expect(result.resumesNote).toBe('Deliveries resume on 5 Nov • 5 skipped meals carried over');
      expect(result.periodSummaryNote).toBe(
        'Current Period: 29 Oct – 10 Nov (5 skipped meals carried over)',
      );
    });

    it('delivers today on 5 Nov once the pause has ended and daily deliveries resume', () => {
      const fixedNow = new Date(2026, 10, 5, 12, 0, 0); // 5 Nov 2026
      const result = calculateNextDeliveryInfo({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-10',
        pauses: [
          {
            startDate: '2026-10-31',
            endDate: '2026-11-04',
            daysCount: 5,
          },
        ],
        now: fixedNow,
      });

      expect(result.dateStr).toBe('2026-11-05');
      expect(result.isToday).toBe(true);
      expect(result.deliveryNote).toBe('Next Delivery: Today • Evening Dinner Delivery');
      expect(result.resumesNote).toBe('Deliveries resume on 5 Nov • 5 skipped meals carried over');
    });

    it('handles non-contiguous paused days cleanly', () => {
      // Today is Thu 29 Oct, pause is on Fri 30 Oct only
      const fixedNow = new Date(2026, 9, 29, 12, 0, 0);
      const result = calculateNextDeliveryInfo({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-06',
        pauses: [
          {
            startDate: '2026-10-30',
            endDate: '2026-10-30',
            daysCount: 1,
          },
        ],
        now: fixedNow,
      });

      expect(result.dateStr).toBe('2026-10-29');
      expect(result.isToday).toBe(true);
      expect(result.carriedDaysCount).toBe(1);
      expect(result.resumesNote).toBe('Deliveries resume on 31 Oct • 1 skipped meal carried over');
    });
  });

  // ==========================================
  // 9. Realtime & Event Synchronization for Pauses
  // ==========================================
  describe('Realtime Subscription Pause Sync', () => {
    it('notifies listeners when a pause is created or removed, restoring period on removal', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_realtime',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;
      const originalEnd = sub.period_end;

      let callCount = 0;
      const unsub = subscribeToSubscriptionPausesRealtime(sub.id, () => {
        callCount++;
      });

      // 1. Create a pause
      const pauseRes = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        createdBy: 'user_realtime',
      });

      expect(pauseRes.success).toBe(true);
      expect(callCount).toBe(1);
      expect(pauseRes.subscription?.period_end).not.toBe(originalEnd);

      // 2. Remove the pause -> period shrinks back and listener notified
      const removeRes = await removeSubscriptionPause(pauseRes.pause!.id);
      expect(removeRes.success).toBe(true);
      expect(callCount).toBe(2);
      expect(removeRes.subscription?.period_end).toBe(originalEnd);

      unsub();
    });
  });
  // ==========================================
  // 10. Unpausing Specific Subscription Dates (unpauseSubscriptionDates)
  // ==========================================
  describe('10. Unpausing Specific Subscription Dates', () => {
    it('unpauses a single date from a 1-day pause, deleting the pause record and restoring period_end', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_unpause_1',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;
      const originalEnd = sub.period_end;

      let listenerNotified = 0;
      const unsub = subscribeToSubscriptionPausesRealtime(sub.id, () => {
        listenerNotified++;
      });

      // Pause Nov 6 (safe outside 48h cutoff)
      const pauseRes = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-06',
        endDate: '2026-11-06',
        createdBy: 'user_unpause_1',
      });
      expect(pauseRes.success).toBe(true);
      expect(listenerNotified).toBe(1);

      // Unpause Nov 6
      const unpauseRes = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-06'],
        now: new Date('2026-11-01T10:00:00Z'),
      });

      expect(unpauseRes.success).toBe(true);
      expect(unpauseRes.unpausedCount).toBe(1);
      expect(unpauseRes.subscription?.period_end).toBe(originalEnd);
      expect(listenerNotified).toBe(2);

      const pausesAfter = await fetchSubscriptionPauses(sub.id);
      expect(pausesAfter.pauses).toHaveLength(0);

      unsub();
    });

    it('unpauses a middle date from a multi-day range, splitting it into two separate contiguous pause ranges', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_unpause_split',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;
      const originalEndMs = new Date(sub.period_end).getTime();

      // Pause 5 days: Nov 5 to Nov 9
      const pauseRes = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-05',
        endDate: '2026-11-09',
        createdBy: 'user_unpause_split',
      });
      expect(pauseRes.success).toBe(true);
      expect(new Date(pauseRes.subscription!.period_end).getTime()).toBe(
        originalEndMs + 5 * 24 * 60 * 60 * 1000,
      );

      // Unpause middle date: Nov 7
      const unpauseRes = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-07'],
        now: new Date('2026-11-01T10:00:00Z'),
      });

      expect(unpauseRes.success).toBe(true);
      expect(unpauseRes.unpausedCount).toBe(1);

      // Period end contracted by 1 day (now +4 days instead of +5 days)
      expect(new Date(unpauseRes.subscription!.period_end).getTime()).toBe(
        originalEndMs + 4 * 24 * 60 * 60 * 1000,
      );

      // Verify pause is split into 2 ranges: Nov 5 - Nov 6 (2 days) & Nov 8 - Nov 9 (2 days)
      const remainingPausesRes = await fetchSubscriptionPauses(sub.id);
      expect(remainingPausesRes.pauses).toHaveLength(2);

      const range1 = remainingPausesRes.pauses.find((p) => p.start_date === '2026-11-05');
      const range2 = remainingPausesRes.pauses.find((p) => p.start_date === '2026-11-08');

      expect(range1).toBeDefined();
      expect(range1?.end_date).toBe('2026-11-06');
      expect(range1?.days_count).toBe(2);

      expect(range2).toBeDefined();
      expect(range2?.end_date).toBe('2026-11-09');
      expect(range2?.days_count).toBe(2);
    });

    it('unpauses boundary date (first day) from a range, updating start_date and contracting period', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_unpause_boundary',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;
      const originalEndMs = new Date(sub.period_end).getTime();

      // Pause 3 days: Nov 5 to Nov 7
      const pauseRes = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-05',
        endDate: '2026-11-07',
        createdBy: 'user_unpause_boundary',
      });
      expect(pauseRes.success).toBe(true);

      // Unpause start boundary: Nov 5
      const unpauseRes = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-05'],
        now: new Date('2026-11-01T10:00:00Z'),
      });

      expect(unpauseRes.success).toBe(true);
      expect(unpauseRes.unpausedCount).toBe(1);

      // Period contracted by 1 day (+2 days remaining)
      expect(new Date(unpauseRes.subscription!.period_end).getTime()).toBe(
        originalEndMs + 2 * 24 * 60 * 60 * 1000,
      );

      const remainingPausesRes = await fetchSubscriptionPauses(sub.id);
      expect(remainingPausesRes.pauses).toHaveLength(1);
      expect(remainingPausesRes.pauses[0]?.start_date).toBe('2026-11-06');
      expect(remainingPausesRes.pauses[0]?.end_date).toBe('2026-11-07');
      expect(remainingPausesRes.pauses[0]?.days_count).toBe(2);
    });

    it('rejects unpausing dates within 48-hour cutoff window or in the past', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_unpause_cutoff',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;

      // Simulate now = 2026-11-05
      // Cutoff: today (5th), tomorrow (6th), day after (7th) locked
      const res = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-06'],
        now: new Date('2026-11-05T12:00:00Z'),
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/48-hour delivery packing cutoff/);
    });

    it('returns error when dates are not currently paused', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_unpause_notpaused',
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 1299,
        autoRenew: true,
        weeks: 4,
        members: [{ id: 'me', name: 'Me', isDependent: false }],
      });
      const sub = subRes.subscription!;

      const res = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-15'],
        now: new Date('2026-11-01T10:00:00Z'),
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/None of the specified dates are currently paused/);
    });

    it('unpauses member-specific pause without affecting other members or family pauses', async () => {
      const subRes = await createAndActivateSubscription({
        ownerUserId: 'user_family_unpause',
        scope: 'family',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        amountPaid: 2598,
        autoRenew: true,
        weeks: 4,
        members: [
          { id: 'user_aarav', name: 'Aarav', isDependent: false },
          { id: 'user_neha', name: 'Neha', isDependent: false },
        ],
      });
      const sub = subRes.subscription!;

      // Pause Nov 6 for Aarav only
      const p1 = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-06',
        endDate: '2026-11-06',
        memberId: 'user_aarav',
        createdBy: 'user_family_unpause',
      });
      expect(p1.success).toBe(true);

      // Pause Nov 6 for Neha only
      const p2 = await createSubscriptionPause({
        subscriptionId: sub.id,
        startDate: '2026-11-06',
        endDate: '2026-11-06',
        memberId: 'user_neha',
        createdBy: 'user_family_unpause',
      });
      expect(p2.success).toBe(true);

      // Unpause Nov 6 for Aarav ONLY
      const res = await unpauseSubscriptionDates({
        subscriptionId: sub.id,
        dates: ['2026-11-06'],
        memberId: 'user_aarav',
        now: new Date('2026-11-01T10:00:00Z'),
      });

      expect(res.success).toBe(true);
      expect(res.unpausedCount).toBe(1);

      const pausesAfter = await fetchSubscriptionPauses(sub.id);
      expect(pausesAfter.pauses).toHaveLength(1);
      expect(pausesAfter.pauses[0]?.member_id).toBe('user_neha');
    });
  });
});
