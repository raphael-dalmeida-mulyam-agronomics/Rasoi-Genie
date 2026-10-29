import React, { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import {
  SubscriptionProvider,
  useSubscription,
  SubscriptionContextValue,
} from '../context/SubscriptionContext';
import {
  resetSubscriptionMockStore,
  createAndActivateSubscription,
  fetchUserActiveSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  assignMemberMeal,
  clearMemberMeal,
  updateMemberPlan,
  updateCoveredMembers,
} from '../services/subscriptionService';

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test_user_sub_1', displayName: 'Aarav Sharma' },
    isAuthenticated: true,
  }),
}));

// Mock FamilyContext
jest.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    family: { id: 'fam_sub_123', name: 'Sharma Household', owner_id: 'test_user_sub_1' },
    role: 'owner',
    members: [
      { user_id: 'test_user_sub_1', display_name: 'Aarav', role: 'owner' },
      { user_id: 'test_user_sub_2', display_name: 'Priya', role: 'member' },
    ],
  }),
}));

let latestContext: SubscriptionContextValue | null = null;

const TestConsumer: React.FC<{ onUpdate?: (val: SubscriptionContextValue) => void }> = ({
  onUpdate,
}) => {
  const ctx = useSubscription();
  useEffect(() => {
    latestContext = ctx;
    if (onUpdate) onUpdate(ctx);
  }, [ctx, onUpdate]);
  return null;
};

describe('Subscription Service & Context Tests', () => {
  beforeEach(() => {
    resetSubscriptionMockStore();
    latestContext = null;
  });

  it('initially reports isSubscribed as false when user has no active subscription', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    expect(latestContext?.isSubscribed).toBe(false);
    expect(latestContext?.activeSubscription).toBeNull();
    expect(latestContext?.coveredMembers).toEqual([]);
    expect(latestContext?.assignedMeals).toEqual([]);
  });

  it('creates and activates an individual subscription via service and context', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    let subRes: any;
    await act(async () => {
      subRes = await latestContext!.subscribe({
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'high-protein',
        pricePerMemberPerWeek: 1299,
        amountPaid: 1299,
        members: [
          {
            id: 'test_user_sub_1',
            name: 'Aarav',
            isDependent: false,
            planType: 'standard',
            standardPlanKey: 'high-protein',
          },
        ],
      });
    });

    expect(subRes.success).toBe(true);

    await waitFor(() => {
      expect(latestContext?.isSubscribed).toBe(true);
      expect(latestContext?.activeSubscription?.status).toBe('active');
      expect(latestContext?.activeSubscription?.scope).toBe('individual');
      expect(latestContext?.coveredMembers.length).toBe(1);
      expect(latestContext?.assignedMeals.length).toBe(7); // 7-day standard template
    });
  });

  it('pauses and resumes an active subscription', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    await act(async () => {
      await latestContext!.subscribe({
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'keto',
        members: [{ id: 'test_user_sub_1', name: 'Aarav', isDependent: false }],
        amountPaid: 1399,
      });
    });

    // Pause
    await act(async () => {
      const pauseRes = await latestContext!.pause();
      expect(pauseRes.success).toBe(true);
    });

    await waitFor(() => {
      expect(latestContext?.activeSubscription?.status).toBe('paused');
      expect(latestContext?.isSubscribed).toBe(true);
    });

    // Resume
    await act(async () => {
      const resumeRes = await latestContext!.resume();
      expect(resumeRes.success).toBe(true);
    });

    await waitFor(() => {
      expect(latestContext?.activeSubscription?.status).toBe('active');
    });
  });

  it('cancels an active subscription', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    await act(async () => {
      await latestContext!.subscribe({
        scope: 'individual',
        planType: 'standard',
        standardPlanKey: 'vegan',
        members: [{ id: 'test_user_sub_1', name: 'Aarav', isDependent: false }],
        amountPaid: 1199,
      });
    });

    await act(async () => {
      const cancelRes = await latestContext!.cancel();
      expect(cancelRes.success).toBe(true);
    });

    await waitFor(() => {
      expect(latestContext?.activeSubscription?.status).toBe('cancelled');
      expect(latestContext?.isSubscribed).toBe(false);
    });
  });

  it('assigns and clears meals for specific weekdays', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    await act(async () => {
      await latestContext!.subscribe({
        scope: 'individual',
        planType: 'custom',
        members: [
          {
            id: 'test_user_sub_1',
            name: 'Aarav',
            isDependent: false,
            meals: { 0: 'kit-101' },
          },
        ],
        amountPaid: 1299,
      });
    });

    // Assign meal for Wednesday (weekday 2)
    await act(async () => {
      const assignRes = await latestContext!.assignMeal('test_user_sub_1', 2, 'kit-106');
      expect(assignRes.success).toBe(true);
    });

    await waitFor(() => {
      expect(
        latestContext?.assignedMeals.some(
          (m) =>
            m.member_id === 'test_user_sub_1' && m.weekday === 2 && m.meal_kit_id === 'kit-106',
        ),
      ).toBe(true);
    });

    // Clear meal for Monday (weekday 0)
    await act(async () => {
      const clearRes = await latestContext!.clearMeal('test_user_sub_1', 0);
      expect(clearRes.success).toBe(true);
    });

    await waitFor(() => {
      expect(
        latestContext?.assignedMeals.some(
          (m) => m.member_id === 'test_user_sub_1' && m.weekday === 0,
        ),
      ).toBe(false);
    });
  });

  it('updates member plan to standard and auto-populates template', async () => {
    render(
      <SubscriptionProvider>
        <TestConsumer />
      </SubscriptionProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    await act(async () => {
      await latestContext!.subscribe({
        scope: 'individual',
        planType: 'custom',
        members: [{ id: 'test_user_sub_1', name: 'Aarav', isDependent: false, meals: {} }],
        amountPaid: 1299,
      });
    });

    // Switch member to Vegan standard plan
    await act(async () => {
      const updateRes = await latestContext!.setMemberPlan('test_user_sub_1', 'standard', 'vegan');
      expect(updateRes.success).toBe(true);
    });

    await waitFor(() => {
      const memberMeals = latestContext?.assignedMeals.filter(
        (m) => m.member_id === 'test_user_sub_1',
      );
      expect(memberMeals?.length).toBe(7);
    });
  });

  it('updates covered members list in family subscription and calculates proration', async () => {
    const sub = await createAndActivateSubscription({
      ownerUserId: 'test_user_sub_1',
      familyId: 'fam_sub_123',
      scope: 'family',
      planType: 'custom',
      pricePerMemberPerWeek: 1299,
      amountPaid: 1299,
      members: [{ id: 'test_user_sub_1', name: 'Aarav', isDependent: false }],
    });

    expect(sub.success).toBe(true);

    // Add Priya as a second member
    const updateRes = await updateCoveredMembers(sub.subscription!.id, [
      { id: 'test_user_sub_1', name: 'Aarav', isDependent: false },
      { id: 'test_user_sub_2', name: 'Priya', isDependent: false },
    ]);

    expect(updateRes.success).toBe(true);
    expect(updateRes.updatedSubscription?.member_count).toBe(2);
    expect(updateRes.adjustment?.memberDelta).toBe(1);
    expect(updateRes.adjustment?.nextPeriodTotal).toBe(2598);
  });
});
