import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import {
  assignMemberMeal as assignMemberMealService,
  cancelSubscription as cancelSubscriptionService,
  clearMealFromMember as clearMealFromMemberService,
  createAndActivateSubscription,
  CreateSubscriptionInput,
  fetchUserActiveSubscription,
  pauseSubscription as pauseSubscriptionService,
  resumeSubscription as resumeSubscriptionService,
  Subscription,
  SubscriptionMeal,
  SubscriptionMember,
  SubscriptionPause,
  createSubscriptionPause,
  fetchSubscriptionPauses,
  toggleAutoRenew,
  applyPlanToAllMembers,
  setMemberPlanGroup,
  updateCoveredMembers as updateCoveredMembersService,
  updateMemberPlan as updateMemberPlanService,
} from '../services/subscriptionService';
import { ProrationCalculationResult, StandardPlanKey } from '../services/subscriptionPlans';

export interface SubscriptionContextValue {
  isSubscribed: boolean;
  activeSubscription: Subscription | null;
  coveredMembers: SubscriptionMember[];
  assignedMeals: SubscriptionMeal[];
  pauses: SubscriptionPause[];
  isFamilyCovered: boolean;
  isOwnerOfSubscription: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  subscribe: (input: Omit<CreateSubscriptionInput, 'ownerUserId' | 'familyId'>) => Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }>;
  pause: () => Promise<{ success: boolean; error?: string }>;
  resume: () => Promise<{ success: boolean; error?: string }>;
  cancel: () => Promise<{ success: boolean; error?: string }>;
  assignMeal: (
    memberId: string,
    weekday: number,
    mealKitId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  clearMeal: (memberId: string, weekday: number) => Promise<{ success: boolean; error?: string }>;
  setMemberPlan: (
    memberId: string,
    planType: 'standard' | 'custom',
    standardPlanKey?: StandardPlanKey | null,
  ) => Promise<{ success: boolean; error?: string }>;
  addPause: (input: {
    startDate: string;
    endDate: string;
    memberId?: string | null;
  }) => Promise<{ success: boolean; pause?: SubscriptionPause; error?: string }>;
  fetchPauses: () => Promise<SubscriptionPause[]>;
  toggleAutoRenewState: (autoRenew: boolean) => Promise<{ success: boolean; error?: string }>;
  applySamePlanToAll: (
    planType: 'standard' | 'custom',
    standardPlanKey?: StandardPlanKey | null,
  ) => Promise<{ success: boolean; error?: string }>;
  shareOwnerPlan: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateCoveredMembersList: (
    newMembers: { id: string; name: string; isDependent: boolean }[],
  ) => Promise<{
    success: boolean;
    adjustment?: ProrationCalculationResult;
    error?: string;
  }>;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { family } = useFamily();

  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [coveredMembers, setCoveredMembers] = useState<SubscriptionMember[]>([]);
  const [assignedMeals, setAssignedMeals] = useState<SubscriptionMeal[]>([]);
  const [pauses, setPauses] = useState<SubscriptionPause[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const effectiveUserId = user?.uid || null;
  const familyId = family?.id || null;

  const refreshSubscription = useCallback(async () => {
    if (!effectiveUserId) {
      setActiveSubscription(null);
      setCoveredMembers([]);
      setAssignedMeals([]);
      setPauses([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetchUserActiveSubscription(effectiveUserId, familyId);
      setActiveSubscription(res.subscription);
      setCoveredMembers(res.members);
      setAssignedMeals(res.meals);
      if (res.subscription) {
        const pausesRes = await fetchSubscriptionPauses(res.subscription.id);
        if (pausesRes.success) {
          setPauses(pausesRes.pauses);
        }
      } else {
        setPauses([]);
      }
    } catch (err) {
      console.warn('[SubscriptionContext] Error loading active subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, familyId]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isSubscribed = useMemo(() => {
    return Boolean(
      activeSubscription &&
      (activeSubscription.status === 'active' || activeSubscription.status === 'paused'),
    );
  }, [activeSubscription]);

  const isFamilyCovered = useMemo(() => {
    return Boolean(activeSubscription && activeSubscription.scope === 'family');
  }, [activeSubscription]);

  const isOwnerOfSubscription = useMemo(() => {
    return Boolean(
      activeSubscription && effectiveUserId && activeSubscription.owner_user_id === effectiveUserId,
    );
  }, [activeSubscription, effectiveUserId]);

  const subscribe = useCallback(
    async (
      input: Omit<CreateSubscriptionInput, 'ownerUserId' | 'familyId'>,
    ): Promise<{
      success: boolean;
      subscription?: Subscription;
      error?: string;
    }> => {
      if (!effectiveUserId) {
        return { success: false, error: 'Sign in is required to subscribe' };
      }

      const res = await createAndActivateSubscription({
        ...input,
        ownerUserId: effectiveUserId,
        familyId: input.scope === 'family' ? familyId : null,
      });

      if (res.success && res.subscription) {
        setActiveSubscription(res.subscription);
        setCoveredMembers(res.members || []);
        setAssignedMeals(res.meals || []);
      }
      return res;
    },
    [effectiveUserId, familyId],
  );

  const pause = useCallback(async () => {
    if (!activeSubscription || !effectiveUserId) {
      return { success: false, error: 'No active subscription' };
    }
    const res = await pauseSubscriptionService(activeSubscription.id, effectiveUserId);
    if (res.success) {
      await refreshSubscription();
    }
    return res;
  }, [activeSubscription, effectiveUserId, refreshSubscription]);

  const resume = useCallback(async () => {
    if (!activeSubscription || !effectiveUserId) {
      return { success: false, error: 'No active subscription' };
    }
    const res = await resumeSubscriptionService(activeSubscription.id, effectiveUserId);
    if (res.success) {
      await refreshSubscription();
    }
    return res;
  }, [activeSubscription, effectiveUserId, refreshSubscription]);

  const cancel = useCallback(async () => {
    if (!activeSubscription || !effectiveUserId) {
      return { success: false, error: 'No active subscription' };
    }
    const res = await cancelSubscriptionService(activeSubscription.id, effectiveUserId);
    if (res.success) {
      setActiveSubscription((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    }
    return res;
  }, [activeSubscription, effectiveUserId]);

  const assignMeal = useCallback(
    async (memberId: string, weekday: number, mealKitId: string) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await assignMemberMealService(
        activeSubscription.id,
        memberId,
        weekday,
        mealKitId,
      );
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, refreshSubscription],
  );

  const clearMeal = useCallback(
    async (memberId: string, weekday: number) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await clearMealFromMemberService(activeSubscription.id, memberId, weekday);
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, refreshSubscription],
  );

  const setMemberPlan = useCallback(
    async (
      memberId: string,
      planType: 'standard' | 'custom',
      standardPlanKey?: StandardPlanKey | null,
    ) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await updateMemberPlanService(
        activeSubscription.id,
        memberId,
        planType,
        standardPlanKey,
      );
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, refreshSubscription],
  );

  const updateCoveredMembersList = useCallback(
    async (newMembers: { id: string; name: string; isDependent: boolean }[]) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await updateCoveredMembersService(activeSubscription.id, newMembers);
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, refreshSubscription],
  );

  const addPause = useCallback(
    async (input: { startDate: string; endDate: string; memberId?: string | null }) => {
      if (!activeSubscription || !effectiveUserId) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await createSubscriptionPause({
        subscriptionId: activeSubscription.id,
        startDate: input.startDate,
        endDate: input.endDate,
        memberId: input.memberId || null,
        createdBy: effectiveUserId,
      });
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, effectiveUserId, refreshSubscription],
  );

  const fetchPauses = useCallback(async () => {
    if (!activeSubscription) return [];
    const res = await fetchSubscriptionPauses(activeSubscription.id);
    if (res.success) {
      setPauses(res.pauses);
      return res.pauses;
    }
    return [];
  }, [activeSubscription]);

  const toggleAutoRenewState = useCallback(
    async (autoRenew: boolean) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await toggleAutoRenew(activeSubscription.id, autoRenew);
      if (res.success && res.subscription) {
        setActiveSubscription(res.subscription);
      }
      return res;
    },
    [activeSubscription],
  );

  const applySamePlanToAll = useCallback(
    async (planType: 'standard' | 'custom', standardPlanKey?: StandardPlanKey | null) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      const res = await applyPlanToAllMembers(
        activeSubscription.id,
        planType,
        standardPlanKey,
        'shared_all',
      );
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, refreshSubscription],
  );

  const shareOwnerPlan = useCallback(
    async (memberId: string) => {
      if (!activeSubscription) {
        return { success: false, error: 'No active subscription' };
      }
      // Owner plan key / plan type
      const ownerMember =
        coveredMembers.find((m) => m.member_id === activeSubscription.owner_user_id) ||
        coveredMembers[0];
      const targetPlanType = ownerMember ? ownerMember.plan_type : activeSubscription.plan_type;
      const targetPlanKey = ownerMember
        ? ownerMember.standard_plan_key
        : activeSubscription.standard_plan_key;

      await setMemberPlan(memberId, targetPlanType, targetPlanKey);
      const res = await setMemberPlanGroup(activeSubscription.id, memberId, 'shared_owner');
      if (res.success) {
        await refreshSubscription();
      }
      return res;
    },
    [activeSubscription, coveredMembers, setMemberPlan, refreshSubscription],
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isSubscribed,
      activeSubscription,
      coveredMembers,
      assignedMeals,
      pauses,
      isFamilyCovered,
      isOwnerOfSubscription,
      loading,
      refreshSubscription,
      subscribe,
      pause,
      resume,
      cancel,
      assignMeal,
      clearMeal,
      setMemberPlan,
      updateCoveredMembersList,
      addPause,
      fetchPauses,
      toggleAutoRenewState,
      applySamePlanToAll,
      shareOwnerPlan,
    }),
    [
      isSubscribed,
      activeSubscription,
      coveredMembers,
      assignedMeals,
      isFamilyCovered,
      isOwnerOfSubscription,
      loading,
      refreshSubscription,
      subscribe,
      pause,
      resume,
      cancel,
      assignMeal,
      clearMeal,
      setMemberPlan,
      updateCoveredMembersList,
      pauses,
      addPause,
      fetchPauses,
      toggleAutoRenewState,
      applySamePlanToAll,
      shareOwnerPlan,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

const defaultSubscriptionFallback: SubscriptionContextValue = {
  isSubscribed: false,
  activeSubscription: null,
  assignedMeals: [],
  coveredMembers: [],
  pauses: [],
  isFamilyCovered: false,
  isOwnerOfSubscription: false,
  loading: false,
  refreshSubscription: async () => {},
  subscribe: async () => ({ success: false, error: 'No subscription provider' }),
  pause: async () => ({ success: false, error: 'No subscription provider' }),
  resume: async () => ({ success: false, error: 'No subscription provider' }),
  cancel: async () => ({ success: false, error: 'No subscription provider' }),
  assignMeal: async () => ({ success: false, error: 'No subscription provider' }),
  clearMeal: async () => ({ success: false, error: 'No subscription provider' }),
  setMemberPlan: async () => ({ success: false, error: 'No subscription provider' }),
  updateCoveredMembersList: async () => ({ success: false, error: 'No subscription provider' }),
  addPause: async () => ({ success: false, error: 'No subscription provider' }),
  fetchPauses: async () => [],
  toggleAutoRenewState: async () => ({ success: false, error: 'No subscription provider' }),
  applySamePlanToAll: async () => ({ success: false, error: 'No subscription provider' }),
  shareOwnerPlan: async () => ({ success: false, error: 'No subscription provider' }),
};

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  return context || defaultSubscriptionFallback;
}
