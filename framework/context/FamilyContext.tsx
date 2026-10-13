import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { MealKit } from '../services/mealKitsService';
import {
  Family,
  FamilyMember,
  FamilyRole,
  DependentType,
  FamilyInvite,
  FamilyJoinLink,
  FamilyCheckoutHold,
  FamilyCartItem,
  fetchUserFamily,
  fetchFamilyMembers,
  fetchFamilyCartItems,
  fetchFamilyInvites,
  fetchFamilyJoinLinks,
  fetchFamilyCheckoutHold,
  createFamily,
  deleteFamily as deleteFamilyService,
  inviteMemberByPhone,
  createJoinLink,
  revokeJoinLink,
  revokeAllPendingLinks as revokeAllPendingLinksService,
  reissueJoinLink,
  setMemberRole,
  removeMember,
  leaveFamily,
  transferOwnership,
  addOwnItem,
  ownerUpsertItem,
  ownerRemoveItem,
  approveItem,
  rejectItem,
  subscribeToFamilyMembersRealtime,
  subscribeToFamilyLinksRealtime,
  setCartLock,
  beginCheckoutHold,
  releaseCheckoutHold,
  placeFamilyOrder,
  isValidUUID,
  isMockEnabled,
} from '../services/familyService';
import {
  FamilyCartState,
  familyCartReducer,
  buildCartState,
  computeMemberBreakdown,
  MemberSubtotalBreakdown,
  subscribeToFamilyCartRealtime,
} from '../services/familyCartService';
import { getDependentSession, DependentSession } from '../services/familyAuthBridge';

export interface FamilyContextValue {
  family: Family | null;
  members: FamilyMember[];
  currentMember: FamilyMember | null;
  role: FamilyRole | null;
  dependentType: DependentType | null;

  // Role Permissions
  isOwner: boolean;
  isCoOwner: boolean;
  isAdultMember: boolean;
  isDependent: boolean;
  isChild: boolean;
  isSenior: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  canApproveItems: boolean;
  canPay: boolean;
  canLockCart: boolean;
  canUsePersonalFeatures: boolean;

  // Cart & Hold State
  activeCartType: 'personal' | 'family';
  setActiveCartType: (type: 'personal' | 'family') => void;
  cartState: FamilyCartState;
  memberBreakdown: MemberSubtotalBreakdown[];
  isCartLocked: boolean;
  activeHold: FamilyCheckoutHold | null;
  isHoldActive: boolean;
  isHeldByMe: boolean;
  isHeldByOther: boolean;
  heldByOtherName: string | null;

  // Invites & Links
  invites: FamilyInvite[];
  links: FamilyJoinLink[];

  // Loading
  loading: boolean;
  refreshFamily: () => Promise<void>;

  // Family Management Actions
  createNewFamily: (
    name: string,
    ownerDisplayName?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteFamily: () => Promise<{ success: boolean; error?: string }>;
  inviteAdult: (phone: string) => Promise<{ success: boolean; inviteId?: string; error?: string }>;
  createDependentLink: (
    type: DependentType,
    name: string,
    guardianConfirmed: boolean,
  ) => Promise<{
    success: boolean;
    rawToken?: string;
    linkId?: string;
    expiresAt?: string;
    error?: string;
  }>;
  revokeLink: (linkId: string) => Promise<{ success: boolean; error?: string }>;
  revokeAllLinks: () => Promise<{ success: boolean; count?: number; error?: string }>;
  reissueLink: (
    memberUserId: string,
  ) => Promise<{ success: boolean; rawToken?: string; error?: string }>;
  promoteOrDemoteCoOwner: (
    targetUserId: string,
    newRole: 'co_owner' | 'member',
  ) => Promise<{ success: boolean; error?: string }>;
  removeFamilyMember: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  leaveCurrentFamily: () => Promise<{ success: boolean; error?: string }>;
  transferFamilyOwnership: (
    newOwnerUserId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Cart Actions
  addFamilyItem: (
    kit: MealKit,
    quantity?: number,
    servings?: number,
    spiceLevel?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  editFamilyItem: (
    item: FamilyCartItem,
    quantity: number,
    servings?: number,
    spiceLevel?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  removeFamilyItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  approveDependentItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDependentItem: (
    itemId: string,
    reason?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  toggleCartLock: (locked: boolean) => Promise<{ success: boolean; error?: string }>;

  // Checkout Actions
  startCheckoutHold: () => Promise<{
    success: boolean;
    heldByOther?: boolean;
    holderName?: string;
    error?: string;
  }>;
  cancelCheckoutHold: () => Promise<{ success: boolean; error?: string }>;
  checkoutFamilyOrder: (params: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryAddress: string;
    deliveryAddressSnapshot?: Record<string, any>;
    deliverySlot: string;
    couponCode?: string;
    deliveryFee?: number;
    walletCreditsToApply?: number;
    paymentMethod?: string;
    region?: string;
  }) => Promise<{
    success: boolean;
    orderId?: string;
    subtotal?: number;
    discount?: number;
    totalAmount?: number;
    pendingItemsExcluded?: number;
    error?: string;
  }>;
}

export const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [dependentSession, setDependentSession] = useState<DependentSession | null>(null);

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [links, setLinks] = useState<FamilyJoinLink[]>([]);
  const [activeHold, setActiveHold] = useState<FamilyCheckoutHold | null>(null);
  const [cartState, setCartState] = useState<FamilyCartState>({
    items: [],
    approvedItems: [],
    pendingItems: [],
    subtotal: 0,
    approvedCount: 0,
    pendingCount: 0,
  });

  const [activeCartType, setActiveCartType] = useState<'personal' | 'family'>('personal');
  const [loading, setLoading] = useState<boolean>(true);

  // Restore dependent session if active
  useEffect(() => {
    getDependentSession().then((dep) => {
      if (dep) {
        setDependentSession(dep);
        setActiveCartType('family'); // Dependents are locked to family cart
      }
    });
  }, []);

  const effectiveUserId = user?.uid || dependentSession?.uid || null;

  // Load family state
  const refreshFamily = useCallback(async () => {
    let currentDep = dependentSession;
    if (!currentDep) {
      currentDep = await getDependentSession();
      if (currentDep) {
        setDependentSession(currentDep);
        setActiveCartType('family');
      }
    }

    const currentUserId = user?.uid || currentDep?.uid || null;

    if (!currentUserId) {
      setFamily(null);
      setMembers([]);
      setInvites([]);
      setLinks([]);
      setActiveHold(null);
      setCartState(buildCartState([]));
      setLoading(false);
      return;
    }

    try {
      const fam = await fetchUserFamily(currentUserId);
      if (fam && !isMockEnabled() && !isValidUUID(fam.id)) {
        // Stale mock family detected while live Supabase mode is active.
        // Clear local state so the user can create a real family on Supabase.
        setFamily(null);
        setMembers([]);
        setInvites([]);
        setLinks([]);
        setActiveHold(null);
        setCartState(buildCartState([]));
        return;
      }
      setFamily(fam);

      if (fam) {
        const [memList, cartList, invList, hold, linkList] = await Promise.all([
          fetchFamilyMembers(fam.id),
          fetchFamilyCartItems(fam.id),
          fetchFamilyInvites(fam.id),
          fetchFamilyCheckoutHold(fam.id),
          fetchFamilyJoinLinks(fam.id),
        ]);
        setMembers(memList);
        setInvites(invList);
        setLinks(linkList || []);
        setActiveHold(hold);
        setCartState(buildCartState(cartList));
      } else {
        setMembers([]);
        setInvites([]);
        setLinks([]);
        setActiveHold(null);
        setCartState(buildCartState([]));
      }
    } catch (err) {
      console.warn('[FamilyContext] Error loading family:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, dependentSession, user?.uid]);

  useEffect(() => {
    refreshFamily();
  }, [refreshFamily]);

  // Realtime subscription to family cart items
  useEffect(() => {
    if (!family?.id) return;

    const unsubscribe = subscribeToFamilyCartRealtime(
      family.id,
      (item) => {
        setCartState((prev) => familyCartReducer(prev, { type: 'UPSERT_ITEM', item }));
      },
      (itemId) => {
        setCartState((prev) => familyCartReducer(prev, { type: 'REMOVE_ITEM', itemId }));
      },
      () => {
        // On resync, re-fetch all cart items
        fetchFamilyCartItems(family.id).then((items) => {
          setCartState(buildCartState(items));
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [family?.id]);

  // Realtime subscription to family members and join links
  useEffect(() => {
    if (!family?.id) return;

    const unsubMembers = subscribeToFamilyMembersRealtime(family.id, () => {
      fetchFamilyMembers(family.id).then((memList) => setMembers(memList));
    });

    const unsubLinks = subscribeToFamilyLinksRealtime(family.id, () => {
      fetchFamilyJoinLinks(family.id).then((linkList) => setLinks(linkList || []));
    });

    return () => {
      unsubMembers();
      unsubLinks();
    };
  }, [family?.id]);

  // Derive Current Member and Role
  const currentMember = useMemo(() => {
    if (!effectiveUserId) return null;
    return members.find((m) => m.user_id === effectiveUserId) || null;
  }, [members, effectiveUserId]);

  const role: FamilyRole | null = currentMember?.role || (dependentSession ? 'dependent' : null);
  const dependentType: DependentType | null =
    currentMember?.dependent_type || dependentSession?.dependentType || null;

  const isOwner = role === 'owner';
  const isCoOwner = role === 'co_owner';
  const isAdultMember = role === 'member';
  const isDependent = role === 'dependent';
  const isChild = isDependent && dependentType === 'child';
  const isSenior = isDependent && dependentType === 'senior';

  const canInvite = isOwner;
  const canManageMembers = isOwner;
  const canApproveItems = isOwner;
  const canPay = isOwner || isCoOwner;
  const canLockCart = isOwner;
  const canUsePersonalFeatures = !isDependent;

  // Checkout Hold Status
  const isHoldActive = !!(activeHold && new Date(activeHold.expires_at).getTime() > Date.now());
  const isHeldByMe = isHoldActive && activeHold?.held_by === effectiveUserId;
  const isHeldByOther = isHoldActive && !isHeldByMe;

  const heldByOtherName = useMemo(() => {
    if (!isHeldByOther || !activeHold) return null;
    const holder = members.find((m) => m.user_id === activeHold.held_by);
    return holder?.display_name || 'Another payer';
  }, [isHeldByOther, activeHold, members]);

  // Member names map for breakdown
  const memberNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.user_id] = m.display_name;
    });
    return map;
  }, [members]);

  const memberBreakdown = useMemo(() => {
    return computeMemberBreakdown(cartState.items, memberNamesMap, 0, 0);
  }, [cartState.items, memberNamesMap]);

  // Actions
  const createNewFamily = async (name: string, ownerDisplayName?: string) => {
    if (!effectiveUserId) return { success: false, error: 'Sign in required' };
    const res = await createFamily(
      name,
      ownerDisplayName || user?.displayName || undefined,
      effectiveUserId,
    );
    if (res.success && res.family) {
      setFamily(res.family);
      await refreshFamily();
      setActiveCartType('family');
    }
    return res;
  };

  const inviteAdult = async (phone: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await inviteMemberByPhone(family.id, phone, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const createDependentLink = async (
    type: DependentType,
    name: string,
    guardianConfirmed: boolean,
  ) => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await createJoinLink(
      family.id,
      type,
      name,
      guardianConfirmed,
      'v1.0',
      effectiveUserId,
    );
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const revokeLink = async (linkId: string) => {
    if (!effectiveUserId) return { success: false, error: 'Authentication required' };
    const res = await revokeJoinLink(linkId, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const reissueLink = async (memberUserId: string) => {
    if (!effectiveUserId) return { success: false, error: 'Authentication required' };
    return reissueJoinLink(memberUserId, effectiveUserId);
  };

  const promoteOrDemoteCoOwner = async (targetUserId: string, newRole: 'co_owner' | 'member') => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await setMemberRole(family.id, targetUserId, newRole, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const removeFamilyMember = async (targetUserId: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await removeMember(family.id, targetUserId, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const leaveCurrentFamily = async () => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await leaveFamily(family.id, effectiveUserId);
    if (res.success) {
      setFamily(null);
      setMembers([]);
      setInvites([]);
      setLinks([]);
      setActiveCartType('personal');
      await refreshFamily();
    }
    return res;
  };

  const deleteFamily = async () => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await deleteFamilyService(family.id, effectiveUserId);
    if (res.success) {
      setFamily(null);
      setMembers([]);
      setInvites([]);
      setLinks([]);
      setActiveCartType('personal');
      await refreshFamily();
    }
    return res;
  };

  const revokeAllLinks = async () => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await revokeAllPendingLinksService(family.id, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  const transferFamilyOwnership = async (newOwnerUserId: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'Family not found' };
    const res = await transferOwnership(family.id, newOwnerUserId, effectiveUserId);
    if (res.success) {
      await refreshFamily();
    }
    return res;
  };

  // Cart operations
  const addFamilyItem = async (kit: MealKit, quantity = 1, servings = 2, spiceLevel = 'Medium') => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    if (family.is_locked) {
      return { success: false, error: 'Family cart is currently locked by the owner' };
    }

    if (isOwner) {
      return ownerUpsertItem(
        family.id,
        null,
        kit.id,
        quantity,
        servings,
        spiceLevel,
        kit.price,
        effectiveUserId,
      );
    } else {
      return addOwnItem(
        family.id,
        kit.id,
        quantity,
        servings,
        spiceLevel,
        kit.price,
        effectiveUserId,
      );
    }
  };

  const editFamilyItem = async (
    item: FamilyCartItem,
    quantity: number,
    servings?: number,
    spiceLevel?: string,
  ) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    if (family.is_locked) {
      return { success: false, error: 'Family cart is locked by owner' };
    }

    if (isOwner) {
      return ownerUpsertItem(
        family.id,
        item.id,
        item.kit_id,
        quantity,
        servings || item.servings,
        spiceLevel || item.spice_level,
        item.unit_price,
        effectiveUserId,
      );
    } else {
      if (item.added_by !== effectiveUserId) {
        return { success: false, error: 'You can only edit your own items' };
      }
      return addOwnItem(
        family.id,
        item.kit_id,
        quantity,
        servings || item.servings,
        spiceLevel || item.spice_level,
        item.unit_price,
        effectiveUserId,
      );
    }
  };

  const removeFamilyItem = async (itemId: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    if (family.is_locked) {
      return { success: false, error: 'Family cart is locked by owner' };
    }

    if (isOwner) {
      return ownerRemoveItem(family.id, itemId, effectiveUserId);
    } else {
      const item = cartState.items.find((i) => i.id === itemId);
      if (item && item.added_by !== effectiveUserId) {
        return { success: false, error: 'You can only remove your own items' };
      }
      return ownerRemoveItem(family.id, itemId, effectiveUserId);
    }
  };

  const approveDependentItem = async (itemId: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    return approveItem(family.id, itemId, effectiveUserId);
  };

  const rejectDependentItem = async (itemId: string, reason?: string) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    return rejectItem(family.id, itemId, reason, effectiveUserId);
  };

  const toggleCartLock = async (locked: boolean) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    const res = await setCartLock(family.id, locked, effectiveUserId);
    if (res.success) {
      setFamily((prev) => (prev ? { ...prev, is_locked: locked } : null));
    }
    return res;
  };

  const startCheckoutHold = async () => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    const res = await beginCheckoutHold(family.id, `hold_${Date.now()}`, effectiveUserId);
    if (res.success && res.expiresAt) {
      setActiveHold({
        family_id: family.id,
        held_by: effectiveUserId,
        expires_at: res.expiresAt,
        created_at: new Date().toISOString(),
      });
    }
    return res;
  };

  const cancelCheckoutHold = async () => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    const res = await releaseCheckoutHold(family.id, effectiveUserId);
    if (res.success) {
      setActiveHold(null);
    }
    return res;
  };

  const checkoutFamilyOrder = async (params: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryAddress: string;
    deliveryAddressSnapshot?: Record<string, any>;
    deliverySlot: string;
    couponCode?: string;
    deliveryFee?: number;
    walletCreditsToApply?: number;
    paymentMethod?: string;
    region?: string;
  }) => {
    if (!family || !effectiveUserId) return { success: false, error: 'No active family' };
    const res = await placeFamilyOrder({
      ...params,
      familyId: family.id,
      callerId: effectiveUserId,
    });
    if (res.success) {
      setActiveHold(null);
      await refreshFamily();
    }
    return res;
  };

  const value: FamilyContextValue = {
    family,
    members,
    currentMember,
    role,
    dependentType,
    isOwner,
    isCoOwner,
    isAdultMember,
    isDependent,
    isChild,
    isSenior,
    canInvite,
    canManageMembers,
    canApproveItems,
    canPay,
    canLockCart,
    canUsePersonalFeatures,
    activeCartType,
    setActiveCartType,
    cartState,
    memberBreakdown,
    isCartLocked: !!family?.is_locked,
    activeHold,
    isHoldActive,
    isHeldByMe,
    isHeldByOther,
    heldByOtherName,
    invites,
    links,
    loading,
    refreshFamily,
    createNewFamily,
    deleteFamily,
    inviteAdult,
    createDependentLink,
    revokeLink,
    revokeAllLinks,
    reissueLink,
    promoteOrDemoteCoOwner,
    removeFamilyMember,
    leaveCurrentFamily,
    transferFamilyOwnership,
    addFamilyItem,
    editFamilyItem,
    removeFamilyItem,
    approveDependentItem,
    rejectDependentItem,
    toggleCartLock,
    startCheckoutHold,
    cancelCheckoutHold,
    checkoutFamilyOrder,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};

export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
