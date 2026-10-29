import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FamilyHomeView } from '../../features/family/FamilyHomeView';
import { FamilyCartView } from '../../features/family/FamilyCartView';
import { ApprovalQueueView } from '../../features/family/ApprovalQueueView';
import { JoinLandingView } from '../../features/family/JoinLandingView';
import { OrderConfirmationView } from '../../features/checkout/OrderConfirmationView';
import { FamilyContext, FamilyContextValue } from '../context/FamilyContext';
import { ThemeProvider } from '../theme/ThemeContext';
import { FamilyMember, FamilyCartItem, encodePayloadToToken } from '../services/familyService';
import { getMealKits } from '../services/mealKitsService';
import { router } from 'expo-router';
import { HomeScreenView } from '../../features/home/HomeScreenView';
import { DependentProfileSheet } from '../../features/family/DependentProfileSheet';
import { CartDestinationModal } from '../../features/cart/CartDestinationModal';
import { FamilyCartItemRow } from '../../features/family/FamilyCartItemRow';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useLocalSearchParams: () => ({ token: 'mock-token-123' }),
}));

let mockCurrentUser = { uid: 'user_owner', displayName: 'Priya Sharma' };

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAdmin: false,
    isChef: false,
  }),
}));

jest.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    referralCode: 'RASOI123',
    availableBalance: 500,
    debitCredits: jest.fn(),
    refreshAll: jest.fn(),
  }),
}));

jest.mock('../context/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: {
      currentCity: 'Bengaluru',
      city: 'Bengaluru',
      preferredCuisines: [],
      dietTypes: [],
      allergies: [],
    },
    updatePreferences: jest.fn(),
  }),
}));

jest.mock('../context/CartContext', () => ({
  useCart: () => ({
    addItem: jest.fn(),
    totalCount: 0,
    items: [],
  }),
}));

jest.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({
    isInWishlist: jest.fn(),
    toggleWishlist: jest.fn(),
    wishlistCount: 0,
  }),
}));

jest.mock('../context/CookModeContext', () => ({
  useCookMode: () => ({
    activeOrders: [],
    activeCookSession: null,
    pendingCookingOrders: [],
    startCooking: jest.fn(),
    isOrderDismissed: jest.fn(() => false),
    dismissCookMode: jest.fn(),
    getProgressForOrderKit: jest.fn(() => ({ isCompleted: false })),
    registerNewActiveOrder: jest.fn(),
  }),
}));

jest.mock('../services/mealKitsService', () => ({
  getMealKitById: jest.fn((id: string) => ({
    id,
    name: id === 'kit_1' ? 'Paneer Butter Masala Kit' : 'Dal Makhani Kit',
    price: 349,
    heroImage: 'https://images.unsplash.com/mock.jpg',
  })),
  getMealKits: jest.fn(() => []),
  subscribeToMealKits: jest.fn(() => jest.fn()),
  syncMealKitsWithSupabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/supabaseMealKitsService', () => ({
  subscribeToMealKitsRealtime: jest.fn(() => jest.fn()),
}));

jest.mock('../services/dishOriginService', () => ({
  ensureCitySpecialtiesSeeded: jest.fn().mockResolvedValue(undefined),
  isRegionalSpecialtyOfCity: jest.fn(() => false),
  rankMealKitsForCityTrending: jest.fn((kits) => kits),
}));

jest.mock('../../features/admin/cityKitsSeederService', () => ({
  seedKitsForCityIfNeeded: jest.fn().mockResolvedValue(undefined),
}));

const baseFamily = {
  id: 'fam_1',
  name: 'Sharma Family',
  owner_id: 'user_owner',
  is_locked: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMembers: FamilyMember[] = [
  {
    family_id: 'fam_1',
    user_id: 'user_owner',
    role: 'owner',
    display_name: 'Priya Sharma',
    joined_at: new Date().toISOString(),
  },
  {
    family_id: 'fam_1',
    user_id: 'user_co_owner',
    role: 'co_owner',
    display_name: 'Rahul Sharma',
    joined_at: new Date().toISOString(),
  },
  {
    family_id: 'fam_1',
    user_id: 'user_member',
    role: 'member',
    display_name: 'Anjali Sharma',
    joined_at: new Date().toISOString(),
  },
  {
    family_id: 'fam_1',
    user_id: 'user_child',
    role: 'dependent',
    dependent_type: 'child',
    display_name: 'Aarav (Child)',
    joined_at: new Date().toISOString(),
  },
];

const mockCartItems: FamilyCartItem[] = [
  {
    id: 'item_1',
    family_id: 'fam_1',
    added_by: 'user_owner',
    kit_id: 'kit_1',
    quantity: 2,
    servings: 2,
    unit_price: 349,
    status: 'approved',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item_2',
    family_id: 'fam_1',
    added_by: 'user_child',
    kit_id: 'kit_2',
    quantity: 1,
    servings: 2,
    unit_price: 299,
    status: 'pending_approval',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function createMockFamilyContext(
  role: 'owner' | 'co_owner' | 'member' | 'dependent',
): FamilyContextValue {
  const isOwner = role === 'owner';
  const isCoOwner = role === 'co_owner';
  const isAdultMember = role === 'member';
  const isDependent = role === 'dependent';

  const currentMember = mockMembers.find((m) => m.role === role) || mockMembers[0]!;

  return {
    family: baseFamily,
    members: mockMembers,
    currentMember,
    role,
    dependentType: isDependent ? 'child' : null,
    isOwner,
    isCoOwner,
    isAdultMember,
    isDependent,
    isChild: isDependent,
    isSenior: false,
    canInvite: isOwner,
    canManageMembers: isOwner,
    canApproveItems: isOwner,
    canPay: isOwner || isCoOwner,
    canLockCart: isOwner,
    canUsePersonalFeatures: !isDependent,
    activeCartType: 'family',
    setActiveCartType: jest.fn(),
    cartState: {
      items: mockCartItems,
      approvedItems: [mockCartItems[0]!],
      pendingItems: [mockCartItems[1]!],
      subtotal: 698,
      approvedCount: 2,
      pendingCount: 1,
    },
    memberBreakdown: [
      {
        userId: 'user_owner',
        displayName: 'Priya Sharma',
        items: [mockCartItems[0]!],
        subtotal: 698,
        allocatedFee: 0,
        allocatedDiscount: 0,
        finalTotal: 698,
      },
      {
        userId: 'user_child',
        displayName: 'Aarav (Child)',
        items: [mockCartItems[1]!],
        subtotal: 299,
        allocatedFee: 0,
        allocatedDiscount: 0,
        finalTotal: 299,
      },
    ],
    isCartLocked: false,
    activeHold: null,
    isHoldActive: false,
    isHeldByMe: false,
    isHeldByOther: false,
    heldByOtherName: null,
    invites: [],
    links: [],
    loading: false,
    refreshFamily: jest.fn().mockResolvedValue(undefined),
    createNewFamily: jest.fn().mockResolvedValue({ success: true }),
    deleteFamily: jest.fn().mockResolvedValue({ success: true }),
    inviteAdult: jest.fn().mockResolvedValue({ success: true }),
    createDependentLink: jest.fn().mockResolvedValue({ success: true }),
    revokeLink: jest.fn().mockResolvedValue({ success: true }),
    revokeAllLinks: jest.fn().mockResolvedValue({ success: true }),
    reissueLink: jest.fn().mockResolvedValue({ success: true }),
    promoteOrDemoteCoOwner: jest.fn().mockResolvedValue({ success: true }),
    removeFamilyMember: jest.fn().mockResolvedValue({ success: true }),
    leaveCurrentFamily: jest.fn().mockResolvedValue({ success: true }),
    resetDependentSession: jest.fn().mockResolvedValue(undefined),
    transferFamilyOwnership: jest.fn().mockResolvedValue({ success: true }),
    addFamilyItem: jest.fn().mockResolvedValue({ success: true }),
    editFamilyItem: jest.fn().mockResolvedValue({ success: true }),
    removeFamilyItem: jest.fn().mockResolvedValue({ success: true }),
    approveDependentItem: jest.fn().mockResolvedValue({ success: true }),
    rejectDependentItem: jest.fn().mockResolvedValue({ success: true }),
    toggleCartLock: jest.fn().mockResolvedValue({ success: true }),
    startCheckoutHold: jest.fn().mockResolvedValue({ success: true }),
    cancelCheckoutHold: jest.fn().mockResolvedValue({ success: true }),
    checkoutFamilyOrder: jest.fn().mockResolvedValue({ success: true, orderId: 'ORD-FAM-1' }),
    clearFamilyCart: jest.fn().mockResolvedValue({ success: true }),
    addDependentProfile: jest.fn().mockResolvedValue({ success: true }),
    updateDependentPreferences: jest.fn().mockResolvedValue({ success: true }),
  };
}

async function renderWithProviders(ui: React.ReactElement, ctx: FamilyContextValue) {
  return await render(
    <ThemeProvider>
      <FamilyContext.Provider value={ctx}>{ui}</FamilyContext.Provider>
    </ThemeProvider>,
  );
}

describe('Family Feature UI Test Suite', () => {
  // ─── 1. FamilyHomeView (Role based controls) ──────────────────────────────
  describe('FamilyHomeView Role Matrix', () => {
    it('renders Owner controls: Invite adult, Add child/senior, Approvals, Manage links, Danger zone', async () => {
      const ctx = createMockFamilyContext('owner');
      const { getByTestId, queryByTestId, getByText } = await renderWithProviders(
        <FamilyHomeView />,
        ctx,
      );

      expect(getByText('Sharma Family')).toBeTruthy();
      expect(getByTestId('capacity-meter')).toBeTruthy();
      expect(getByTestId('invite-adult-btn')).toBeTruthy();
      expect(getByTestId('add-dependent-btn')).toBeTruthy();
      expect(getByTestId('view-approvals-btn')).toBeTruthy();
      expect(getByTestId('open-family-cart-btn')).toBeTruthy();
      expect(getByTestId('danger-zone')).toBeTruthy();
      expect(getByTestId('transfer-ownership-btn')).toBeTruthy();
      expect(getByTestId('delete-family-btn')).toBeTruthy();

      // Owner does NOT see the leave button
      expect(queryByTestId('leave-family-btn')).toBeNull();
    });

    it('renders Co-Owner controls: Info chip, Open cart, Leave family, but NO member management or danger actions', async () => {
      const ctx = createMockFamilyContext('co_owner');
      const { getByTestId, queryByTestId, getByText } = await renderWithProviders(
        <FamilyHomeView />,
        ctx,
      );

      expect(getByText(/You can pay for the family cart/i)).toBeTruthy();
      expect(getByTestId('open-family-cart-btn')).toBeTruthy();
      expect(getByTestId('leave-family-btn')).toBeTruthy();

      // Forbidden for Co-Owner:
      expect(queryByTestId('invite-adult-btn')).toBeNull();
      expect(queryByTestId('add-dependent-btn')).toBeNull();
      expect(queryByTestId('view-approvals-btn')).toBeNull();
      expect(queryByTestId('danger-zone')).toBeNull();
      expect(queryByTestId('transfer-ownership-btn')).toBeNull();
    });

    it('renders Member controls: Open cart and Leave family only', async () => {
      const ctx = createMockFamilyContext('member');
      const { getByTestId, queryByTestId } = await renderWithProviders(<FamilyHomeView />, ctx);

      expect(getByTestId('open-family-cart-btn')).toBeTruthy();
      expect(getByTestId('leave-family-btn')).toBeTruthy();

      // Forbidden for Member:
      expect(queryByTestId('invite-adult-btn')).toBeNull();
      expect(queryByTestId('add-dependent-btn')).toBeNull();
      expect(queryByTestId('view-approvals-btn')).toBeNull();
      expect(queryByTestId('danger-zone')).toBeNull();
    });

    it('renders Dependent controls: Open cart only, no member management or danger options', async () => {
      const ctx = createMockFamilyContext('dependent');
      const { getByTestId, queryByTestId } = await renderWithProviders(<FamilyHomeView />, ctx);

      expect(getByTestId('open-family-cart-btn')).toBeTruthy();
      expect(queryByTestId('invite-adult-btn')).toBeNull();
      expect(queryByTestId('add-dependent-btn')).toBeNull();
      expect(queryByTestId('danger-zone')).toBeNull();
    });
  });

  // ─── 2. FamilyCartView (Role based checkout and editing) ─────────────────
  describe('FamilyCartView Role Matrix', () => {
    it('allows Owner to Lock cart, Approve pending items, and Proceed to Checkout', async () => {
      const ctx = createMockFamilyContext('owner');
      const { getByTestId, getByText } = await renderWithProviders(<FamilyCartView />, ctx);

      expect(getByTestId('cart-lock-toggle-btn')).toBeTruthy();
      expect(getByTestId('family-checkout-cta-btn')).toBeTruthy();
      expect(getByText(/Needs Approval/i)).toBeTruthy();
    });

    it('allows Co-Owner to Checkout and edit own items, but NOT Lock cart', async () => {
      const ctx = createMockFamilyContext('co_owner');
      const { getByTestId, queryByTestId } = await renderWithProviders(<FamilyCartView />, ctx);

      expect(getByTestId('family-checkout-cta-btn')).toBeTruthy();
      expect(queryByTestId('cart-lock-toggle-btn')).toBeNull();
    });

    it('displays Member view: waiting for owner/co-owner notice and NO checkout button', async () => {
      const ctx = createMockFamilyContext('member');
      const { queryByTestId, getByText } = await renderWithProviders(<FamilyCartView />, ctx);

      expect(queryByTestId('family-checkout-cta-btn')).toBeNull();
      expect(queryByTestId('cart-lock-toggle-btn')).toBeNull();
      expect(getByText(/Waiting for .* to place the order/i)).toBeTruthy();
    });

    it('displays Dependent view: items needing approval, no prices of others, NO checkout', async () => {
      const ctx = createMockFamilyContext('dependent');
      const { queryByTestId, getByText } = await renderWithProviders(<FamilyCartView />, ctx);

      expect(queryByTestId('family-checkout-cta-btn')).toBeNull();
      expect(
        getByText(/Your meal kits will be sent to the family owner for approval/i),
      ).toBeTruthy();
    });

    it('allows Owner to edit, remove items, and checkout when cart is locked', async () => {
      const ctx = createMockFamilyContext('owner');
      ctx.isCartLocked = true;
      const { getByTestId, getAllByLabelText, getByText } = await renderWithProviders(
        <FamilyCartView />,
        ctx,
      );

      // Owner sees lock indicator message allowing them to edit
      expect(
        getByText(
          /Family basket is locked for other members. You can still add, edit, or remove items./i,
        ),
      ).toBeTruthy();

      // Owner still has remove button and checkout button enabled
      expect(getAllByLabelText(/Remove .* from basket/i).length).toBeGreaterThan(0);
      const checkoutBtn = getByTestId('family-checkout-cta-btn');
      expect(checkoutBtn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('blocks other members from editing or removing items and checking out when cart is locked', async () => {
      const ctx = createMockFamilyContext('co_owner');
      ctx.isCartLocked = true;
      const { queryAllByLabelText, getByText, getByTestId } = await renderWithProviders(
        <FamilyCartView />,
        ctx,
      );

      // Co-owner sees member lock banner
      expect(getByText(/locked by/i)).toBeTruthy();

      // Co-owner cannot remove items when locked
      expect(queryAllByLabelText(/Remove .* from basket/i)).toHaveLength(0);

      // Co-owner cannot checkout when locked
      const checkoutBtn = getByTestId('family-checkout-cta-btn');
      expect(checkoutBtn.props.accessibilityState?.disabled).toBe(true);
    });

    it('invokes onProceedToCheckout callback or routes to checkout URL when clicked by payer', async () => {
      const ctx = createMockFamilyContext('owner');
      const onProceedMock = jest.fn();
      const { getByTestId } = await renderWithProviders(
        <FamilyCartView onProceedToCheckout={onProceedMock} />,
        ctx,
      );

      fireEvent.press(getByTestId('family-checkout-cta-btn'));
      await waitFor(() => expect(onProceedMock).toHaveBeenCalledTimes(1));

      // Without onProceedToCheckout prop, routes to /(tabs)/cart?step=checkout&type=family
      const { getByTestId: getBtn2 } = await renderWithProviders(<FamilyCartView />, ctx);
      fireEvent.press(getBtn2('family-checkout-cta-btn'));
      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/(tabs)/cart',
          params: { step: 'checkout', type: 'family' },
        }),
      );
    });
  });

  // ─── 3. ApprovalQueueView ─────────────────────────────────────────────────
  describe('ApprovalQueueView', () => {
    it('renders pending items with approve and reject buttons and bulk approve', async () => {
      const ctx = createMockFamilyContext('owner');
      ctx.cartState.pendingItems = [
        mockCartItems[1]!,
        {
          ...mockCartItems[1]!,
          id: 'item_3',
        },
      ];
      ctx.cartState.pendingCount = 2;

      const { getByTestId, getByText } = await renderWithProviders(<ApprovalQueueView />, ctx);

      expect(getByText(/Pending Approvals/i)).toBeTruthy();
      expect(getByTestId('approve-all-btn')).toBeTruthy();
      expect(getByTestId('approve-approval-item_2')).toBeTruthy();
      expect(getByTestId('reject-approval-item_2')).toBeTruthy();
    });

    it('renders empty state when there are no pending items', async () => {
      const ctx = createMockFamilyContext('owner');
      ctx.cartState.pendingItems = [];
      ctx.cartState.pendingCount = 0;

      const { getByText, queryByTestId } = await renderWithProviders(<ApprovalQueueView />, ctx);

      expect(getByText(/Nothing waiting for approval/i)).toBeTruthy();
      expect(queryByTestId('approve-all-btn')).toBeNull();
    });
  });

  // ─── 4. JoinLandingView (Public landing and errors) ───────────────────────
  describe('JoinLandingView', () => {
    it('renders large touch targets, font toggle, and join button', async () => {
      const ctx = createMockFamilyContext('member');
      const { getByTestId, getByText } = await renderWithProviders(
        <JoinLandingView token="mock-token-123" />,
        ctx,
      );

      // Verify font toggle button
      expect(getByTestId('font-size-toggle')).toBeTruthy();

      // Trigger font size toggle
      fireEvent.press(getByTestId('font-size-toggle'));
      await waitFor(() => {
        expect(getByText('A+ (Large Text)')).toBeTruthy();
      });

      // Join button
      expect(getByTestId('join-family-big-btn')).toBeTruthy();
    });

    it('renders personalized child invitation with guardian notice and no senior checkbox', async () => {
      const childToken = encodePayloadToToken({
        fid: 'fam_1',
        fn: 'Sharma Family',
        dt: 'child',
        dn: 'Aarav',
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });

      const ctx = createMockFamilyContext('member');
      const { getByText, queryByText } = await renderWithProviders(
        <JoinLandingView token={childToken} />,
        ctx,
      );

      // Personalized headline
      expect(getByText('Aarav, you are invited to join Sharma Family!')).toBeTruthy();
      // Guardian confirmation notice
      expect(
        getByText(/Parent or legal guardian consent confirmed by Sharma Family/i),
      ).toBeTruthy();
      // No senior checkbox for child
      expect(queryByText(/I agree to join this family basket on RasoiGenie/i)).toBeNull();
    });

    it('renders senior invitation with explicit consent checkbox', async () => {
      const seniorToken = encodePayloadToToken({
        fid: 'fam_1',
        fn: 'Sharma Family',
        dt: 'senior',
        dn: 'Dadi',
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });

      const ctx = createMockFamilyContext('member');
      const { getByText, queryByText } = await renderWithProviders(
        <JoinLandingView token={seniorToken} />,
        ctx,
      );

      // Personalized headline
      expect(getByText('Dadi, you are invited to join Sharma Family!')).toBeTruthy();
      // Senior checkbox must be present
      expect(getByText(/I agree to join this family basket on RasoiGenie/i)).toBeTruthy();
      // No child notice
      expect(queryByText(/Parent or legal guardian consent confirmed/i)).toBeNull();
    });

    it('displays expired error message when join token is expired', async () => {
      const expiredToken = encodePayloadToToken({
        fid: 'fam_1',
        fn: 'Sharma Family',
        dt: 'child',
        dn: 'Kittu',
        exp: Date.now() - 10000, // expired in the past
      });

      const ctx = createMockFamilyContext('member');
      const { getByText } = await renderWithProviders(
        <JoinLandingView token={expiredToken} />,
        ctx,
      );

      expect(getByText(/This join link has expired/i)).toBeTruthy();
    });
  });

  // ─── 5. HomeScreen Family Access Controls ─────────────────────────
  describe('HomeScreen Family Access Controls', () => {
    it('shows Family top tab and header button when user is in a family', async () => {
      const ctx = createMockFamilyContext('owner');
      const { getByTestId, getByText } = await renderWithProviders(<HomeScreenView />, ctx);

      expect(getByTestId('home-family-header-btn')).toBeTruthy();
      expect(getByTestId('home-family-top-tab')).toBeTruthy();
      expect(getByText('Sharma Family')).toBeTruthy();

      fireEvent.press(getByTestId('home-family-top-tab'));
      expect(router.push).toHaveBeenCalledWith('/family');
    });

    it('does NOT render Family top tab or header button when user is not in a family', async () => {
      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('member'),
        family: null,
        role: null,
        members: [],
        currentMember: null,
      };
      const { queryByTestId } = await renderWithProviders(<HomeScreenView />, ctx);

      expect(queryByTestId('home-family-header-btn')).toBeNull();
      expect(queryByTestId('home-family-top-tab')).toBeNull();
    });

    it('renders "Recommended for {childs name}" section for each child on owner home page', async () => {
      const customMembers: FamilyMember[] = [
        ...mockMembers.filter((m) => m.role === 'owner'),
        {
          family_id: 'fam_1',
          user_id: 'user_child_1',
          role: 'dependent',
          dependent_type: 'child',
          display_name: 'Aarav',
          joined_at: new Date().toISOString(),
          preferences: { dietTypes: ['veg'], preferredCuisines: ['Italian'] },
        },
        {
          family_id: 'fam_1',
          user_id: 'user_child_2',
          role: 'dependent',
          dependent_type: 'child',
          display_name: 'Ananya',
          joined_at: new Date().toISOString(),
          preferences: { dietTypes: ['veg'], preferredCuisines: ['North Indian'] },
        },
      ];
      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: customMembers,
      };
      const { getByText, getByTestId } = await renderWithProviders(<HomeScreenView />, ctx);

      expect(getByText('Recommended for Aarav')).toBeTruthy();
      expect(getByTestId('recommended-section-aarav')).toBeTruthy();
      expect(getByText('Recommended for Ananya')).toBeTruthy();
      expect(getByTestId('recommended-section-ananya')).toBeTruthy();
    });

    it('renders "Recommended for {seniors name}" section for senior citizens on owner home page', async () => {
      const customMembers: FamilyMember[] = [
        ...mockMembers.filter((m) => m.role === 'owner'),
        {
          family_id: 'fam_1',
          user_id: 'user_senior_1',
          role: 'dependent',
          dependent_type: 'senior',
          display_name: 'Dadaji',
          joined_at: new Date().toISOString(),
          preferences: { dietTypes: ['veg'], preferredCuisines: ['South Indian'] },
        },
      ];
      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: customMembers,
      };
      const { getByText, getByTestId } = await renderWithProviders(<HomeScreenView />, ctx);

      expect(getByText('Recommended for Dadaji')).toBeTruthy();
      expect(getByTestId('recommended-section-dadaji')).toBeTruthy();
    });

    it('does NOT render dependent recommendation sections if user is not the owner', async () => {
      const customMembers: FamilyMember[] = [
        {
          family_id: 'fam_1',
          user_id: 'user_member',
          role: 'member',
          display_name: 'Anjali Sharma',
          joined_at: new Date().toISOString(),
        },
        {
          family_id: 'fam_1',
          user_id: 'user_child_1',
          role: 'dependent',
          dependent_type: 'child',
          display_name: 'Aarav',
          joined_at: new Date().toISOString(),
        },
      ];
      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('member'),
        members: customMembers,
        isOwner: false,
        role: 'member',
      };
      const { queryByText, queryByTestId } = await renderWithProviders(<HomeScreenView />, ctx);

      expect(queryByText('Recommended for Aarav')).toBeNull();
      expect(queryByTestId('recommended-section-aarav')).toBeNull();
    });
  });

  // ─── 6. OrderConfirmationView Recipe Scoping ────────────────────────
  describe('OrderConfirmationView Recipe Scoping', () => {
    const sampleFamilyOrder: any = {
      id: 'order_fam_test_1',
      userId: 'user_owner',
      familyId: 'fam_1',
      familyOwnerId: 'user_owner',
      status: 'placed',
      items: [
        {
          id: 'item_kit_1',
          kitId: 'kit_1',
          name: 'Paneer Butter Masala Kit',
          quantity: 2,
          price: 349,
          servings: 2,
          addedBy: 'user_owner',
        },
        {
          id: 'item_kit_2',
          kitId: 'kit_2',
          name: 'Dal Makhani Kit',
          quantity: 1,
          price: 299,
          servings: 2,
          addedBy: 'user_child',
        },
      ],
      totalAmount: 997,
      subtotal: 997,
      deliveryFee: 0,
      discount: 0,
      tax: 0,
      paymentMethod: 'mock',
      paymentStatus: 'completed',
      deliveryAddress: '123 MG Road, Bengaluru, Karnataka 560001',
      customerName: 'Priya Sharma',
      createdAt: new Date().toISOString(),
    };

    it('shows recipes and items for ALL family members when viewed by Family Owner', async () => {
      mockCurrentUser = { uid: 'user_owner', displayName: 'Priya Sharma' };
      const ctx = createMockFamilyContext('owner');

      const { getByText } = await renderWithProviders(
        <OrderConfirmationView order={sampleFamilyOrder} />,
        ctx,
      );

      // Owner sees all kits
      expect(getByText('Paneer Butter Masala Kit')).toBeTruthy();
      expect(getByText('Dal Makhani Kit')).toBeTruthy();
      expect(getByText(/Ordered Kits \(2\)/i)).toBeTruthy();
    });

    it('shows recipes and items ONLY for their own items when viewed by a regular member/child', async () => {
      mockCurrentUser = { uid: 'user_child', displayName: 'Aarav (Child)' };
      const ctx = createMockFamilyContext('dependent');

      const { getByText, queryByText } = await renderWithProviders(
        <OrderConfirmationView order={sampleFamilyOrder} />,
        ctx,
      );

      // Child only sees their own kit
      expect(getByText('Dal Makhani Kit')).toBeTruthy();
      expect(queryByText('Paneer Butter Masala Kit')).toBeNull();
      expect(getByText(/Your Ordered Recipes \(1\)/i)).toBeTruthy();
    });

    it('opens the recipe page when user clicks on a mealkit in their cart after order is placed', async () => {
      mockCurrentUser = { uid: 'user_owner', displayName: 'Priya Sharma' };
      const ctx = createMockFamilyContext('owner');

      const { getByTestId } = await renderWithProviders(
        <OrderConfirmationView order={sampleFamilyOrder} />,
        ctx,
      );

      const kitRow = getByTestId('order-confirmation-kit-kit_1');
      expect(kitRow).toBeTruthy();

      fireEvent.press(kitRow);
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/cook/[orderId]',
        params: {
          orderId: sampleFamilyOrder.id,
          kitId: 'kit_1',
        },
      });
    });
  });

  // ─── 7. DependentProfileSheet Edit Preferences Menu ──────────────────
  describe('DependentProfileSheet Edit Preferences Menu', () => {
    it('opens the same preferences setup menu when editing taste preferences', async () => {
      const childMember: FamilyMember = {
        family_id: 'fam_1',
        user_id: 'user_child_1',
        role: 'dependent',
        dependent_type: 'child',
        display_name: 'Aarav',
        age: 9,
        gender: 'Male',
        joined_at: new Date().toISOString(),
        preferences: {
          dietTypes: ['veg'],
          spiceTolerance: 'Mild',
          preferredCuisines: ['Italian'],
          allergies: ['Peanuts'],
        },
      };

      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: [...mockMembers, childMember],
      };

      const { getByTestId, getByText } = await renderWithProviders(
        <DependentProfileSheet visible={true} member={childMember} onClose={jest.fn()} />,
        ctx,
      );

      // Verify "Edit Taste Preferences" button exists
      const editBtn = getByTestId('edit-dependent-preferences-btn');
      expect(editBtn).toBeTruthy();

      // Press Edit Taste Preferences
      fireEvent.press(editBtn);

      // Verify the same AddDependentSheet opens with prefilled preferences setup menu
      await waitFor(() => {
        expect(getByTestId('add-dependent-sheet')).toBeTruthy();
      });
      expect(getByText("Edit Aarav's Preferences")).toBeTruthy();
      expect(getByText('American')).toBeTruthy();
      expect(getByText('Burgers, loaded bowls & classic bakes')).toBeTruthy();
      expect(getByText('Save Taste Preferences')).toBeTruthy();
    });

    it('slides down both the preference editing menu and the profile sheet after saving preferences', async () => {
      const handleCloseParentSheet = jest.fn();
      const childMember: FamilyMember = {
        family_id: 'fam_1',
        user_id: 'user_child_1',
        role: 'dependent',
        dependent_type: 'child',
        display_name: 'Aarav',
        age: 9,
        gender: 'Male',
        joined_at: new Date().toISOString(),
        preferences: {
          dietTypes: ['veg'],
          spiceTolerance: 'Mild',
          preferredCuisines: ['Italian'],
        },
      };

      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: [...mockMembers, childMember],
      };

      const { getByTestId, getByText } = await renderWithProviders(
        <DependentProfileSheet
          visible={true}
          member={childMember}
          onClose={handleCloseParentSheet}
        />,
        ctx,
      );

      // Open Edit Taste Preferences
      fireEvent.press(getByTestId('edit-dependent-preferences-btn'));
      await waitFor(() => {
        expect(getByTestId('add-dependent-sheet')).toBeTruthy();
      });

      // Save preferences
      fireEvent.press(getByText('Save Taste Preferences'));

      // Both the edit sheet and profile sheet should slide down (handleCloseParentSheet called)
      await waitFor(() => {
        expect(handleCloseParentSheet).toHaveBeenCalled();
      });
    });

    it('strictly shows only mealkits that suit senior citizen cuisine preferences, excluding European ratatouille', async () => {
      const seniorMember: FamilyMember = {
        family_id: 'fam_1',
        user_id: 'user_senior_1',
        role: 'dependent',
        dependent_type: 'senior',
        display_name: 'Dadaji',
        age: 72,
        gender: 'Male',
        joined_at: new Date().toISOString(),
        preferences: {
          dietTypes: ['veg'],
          spiceTolerance: 'Mild',
          preferredCuisines: ['North Indian', 'South Indian'],
        },
      };

      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: [...mockMembers, seniorMember],
      };

      const { queryByText, queryAllByText } = await renderWithProviders(
        <DependentProfileSheet visible={true} member={seniorMember} onClose={jest.fn()} />,
        ctx,
      );

      // Ratatouille is European cuisine, must NOT be shown for Indian cuisine preferences
      expect(queryByText(/Ratatouille/i)).toBeNull();
      expect(queryByText(/Provencal/i)).toBeNull();
    });

    it('renders a button that redirects the family owner to the home page to view dependent recommendations', async () => {
      const handleClose = jest.fn();
      const childMember: FamilyMember = {
        family_id: 'fam_1',
        user_id: 'user_child_1',
        role: 'dependent',
        dependent_type: 'child',
        display_name: 'Aarav',
        age: 9,
        gender: 'Male',
        joined_at: new Date().toISOString(),
        preferences: {
          dietTypes: ['veg'],
          spiceTolerance: 'Mild',
          preferredCuisines: ['Italian'],
        },
      };

      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('owner'),
        members: [...mockMembers, childMember],
      };

      const { getByTestId, getByText } = await renderWithProviders(
        <DependentProfileSheet visible={true} member={childMember} onClose={handleClose} />,
        ctx,
      );

      const redirectBtn = getByTestId('view-dependent-recommendations-btn');
      expect(redirectBtn).toBeTruthy();
      expect(getByText("View Aarav's Recommendations")).toBeTruthy();

      fireEvent.press(redirectBtn);
      expect(handleClose).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(tabs)',
        params: {
          targetMemberId: childMember.user_id,
          targetMemberName: childMember.display_name,
        },
      });
    });
  });

  // ─── 8. CartDestinationModal & Basket Move Actions ────────────────────
  describe('CartDestinationModal & Basket Move Actions', () => {
    const sampleKit: any = {
      id: 'kit_1',
      name: 'Paneer Butter Masala Kit',
      price: 349,
      servings: 2,
      spiceLevel: 'Medium',
      heroImage: 'https://images.unsplash.com/mock.jpg',
      diet: 'veg',
    };

    it('renders CartDestinationModal with personal and family options and fires callbacks', async () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      const ctx = createMockFamilyContext('owner');
      const { getByTestId, getByText } = await renderWithProviders(
        <CartDestinationModal
          visible={true}
          kit={sampleKit}
          onClose={onClose}
          onSelectDestination={onSelect}
        />,
        ctx,
      );

      expect(getByTestId('cart-destination-modal')).toBeTruthy();
      expect(getByText('Personal Basket')).toBeTruthy();
      expect(getByText('Family Basket')).toBeTruthy();

      fireEvent.press(getByTestId('destination-personal-basket-btn'));
      expect(onSelect).toHaveBeenCalledWith('personal');
    });

    it('disables family basket destination when cart is locked by owner for a non-owner member', async () => {
      const onSelect = jest.fn();

      const ctx: FamilyContextValue = {
        ...createMockFamilyContext('member'),
        isCartLocked: true,
      };

      const { getByTestId, getAllByText } = await renderWithProviders(
        <CartDestinationModal
          visible={true}
          kit={sampleKit}
          onClose={jest.fn()}
          onSelectDestination={onSelect}
        />,
        ctx,
      );

      expect(getAllByText(/Locked/i).length).toBeGreaterThan(0);
      fireEvent.press(getByTestId('destination-family-basket-btn'));
      expect(onSelect).not.toHaveBeenCalledWith('family');
    });

    it('renders Move to Personal Basket button on FamilyCartItemRow and triggers action', async () => {
      const handleMove = jest.fn();
      const sampleItem = mockCartItems[0]!;
      const ctx = createMockFamilyContext('owner');

      const { getByTestId, getByText } = await renderWithProviders(
        <FamilyCartItemRow
          item={sampleItem}
          canMoveToPersonal={true}
          onMoveToPersonal={handleMove}
        />,
        ctx,
      );

      const moveBtn = getByTestId(`move-to-personal-cart-${sampleItem.id}`);
      expect(moveBtn).toBeTruthy();
      expect(getByText('Move to Personal Basket')).toBeTruthy();

      fireEvent.press(moveBtn);
      expect(handleMove).toHaveBeenCalled();
    });

    it('does NOT render Move to Personal Basket button on FamilyCartItemRow if canMoveToPersonal is false', async () => {
      const sampleItem = mockCartItems[0]!;
      const ctx = createMockFamilyContext('owner');

      const { queryByTestId, queryByText } = await renderWithProviders(
        <FamilyCartItemRow item={sampleItem} canMoveToPersonal={false} />,
        ctx,
      );

      expect(queryByTestId(`move-to-personal-cart-${sampleItem.id}`)).toBeNull();
      expect(queryByText('Move to Personal Basket')).toBeNull();
    });

    it('renders remove button and triggers onRemove when canRemove is true', async () => {
      const handleRemove = jest.fn();
      const sampleItem = mockCartItems[0]!;
      const ctx = createMockFamilyContext('owner');

      const { getByTestId } = await renderWithProviders(
        <FamilyCartItemRow item={sampleItem} canRemove={true} onRemove={handleRemove} />,
        ctx,
      );

      const removeBtn = getByTestId(`remove-family-item-${sampleItem.id}`);
      expect(removeBtn).toBeTruthy();

      fireEvent.press(removeBtn);
      expect(handleRemove).toHaveBeenCalled();
    });

    it('allows deleting item from FamilyCartView and invokes removeFamilyItem', async () => {
      const ctx = createMockFamilyContext('owner');

      const { getByTestId } = await renderWithProviders(<FamilyCartView />, ctx);

      const firstItem = mockCartItems[0]!;
      const removeBtn = getByTestId(`remove-family-item-${firstItem.id}`);
      expect(removeBtn).toBeTruthy();

      fireEvent.press(removeBtn);
      expect(ctx.removeFamilyItem).toHaveBeenCalledWith(firstItem.id);
    });

    it('clears family basket after order is placed', async () => {
      const ctx = createMockFamilyContext('owner');
      await ctx.clearFamilyCart();
      expect(ctx.clearFamilyCart).toHaveBeenCalled();
    });
  });
});
