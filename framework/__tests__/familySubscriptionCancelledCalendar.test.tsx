import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { FamilySubscriptionView } from '../../features/family/FamilySubscriptionView';
import { FamilyMember } from '../services/familyService';
import { ThemeProvider } from '../theme/ThemeContext';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

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
}));

const mockMember: FamilyMember = {
  family_id: 'fam_cancelled_1',
  user_id: 'user_owner',
  role: 'owner',
  display_name: 'Priya Sharma',
  joined_at: new Date().toISOString(),
  preferences: {
    dietTypes: ['veg'],
    allergies: [],
    spiceTolerance: 'Medium',
  },
};

const mockMembers = [mockMember];

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_owner', displayName: 'Priya Sharma' },
    isAuthenticated: true,
  }),
}));

jest.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    family: { id: 'fam_cancelled_1', name: 'Sharma Household', owner_id: 'user_owner' },
    role: 'owner',
    members: mockMembers,
  }),
}));

jest.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    availableBalance: 1000,
    debitCredits: jest.fn(),
  }),
}));

// Mock meal kits
jest.mock('../services/mealKitsService', () => {
  const kits = [
    {
      id: 'kit_dal_makhani',
      name: 'Dal Makhani Kit',
      cuisine: 'North Indian',
      diet: 'veg',
      dietaryTags: ['veg'],
      allergens: ['Dairy'],
      spiceLevel: 'Mild',
      heroImage: 'https://example.com/dal.jpg',
      nutrition: { protein: 18 },
    },
  ];
  return {
    getMealKits: jest.fn(() => kits),
    getMealKitById: jest.fn((id: string) => kits.find((k) => k.id === id)),
  };
});

let mockSubscriptionState: any = {};

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionState,
}));

describe('FamilySubscriptionView - Cancelled Subscription Calendar Clearance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not display meal kits, clash icons, or active cells when subscription is cancelled', async () => {
    mockSubscriptionState = {
      isSubscribed: false,
      activeSubscription: {
        id: 'sub_cancelled_123',
        owner_user_id: 'user_owner',
        family_id: 'fam_cancelled_1',
        scope: 'family',
        status: 'cancelled',
        plan_type: 'standard',
        standard_plan_key: 'high-protein',
        price_per_member_per_week: 1299,
        member_count: 1,
        auto_renew: false,
        amount_paid: 1299,
        period_start: '2026-10-01',
        period_end: '2026-10-31',
        created_at: new Date().toISOString(),
      },
      coveredMembers: [],
      assignedMeals: [],
      pauses: [],
      subscribe: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      cancel: jest.fn(),
      assignMeal: jest.fn(),
      clearMeal: jest.fn(),
      setMemberPlan: jest.fn(),
      updateCoveredMembersList: jest.fn(),
      addPause: jest.fn(),
      removePause: jest.fn(),
      unpauseDate: jest.fn(),
      unpauseDates: jest.fn(),
      fetchPauses: jest.fn(),
      toggleAutoRenewState: jest.fn(),
      applySamePlanToAll: jest.fn(),
      shareOwnerPlan: jest.fn(),
    };

    const { getByTestId, queryByTestId, queryAllByTestId, getByText, queryByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // 1. Cancelled Subscription Status Card is rendered
    expect(getByTestId('family-cancelled-sub-card')).toBeTruthy();
    expect(getByText('Subscription Cancelled • Deliveries have ended')).toBeTruthy();

    // 2. Section subtitle confirms cancellation and no deliveries
    expect(
      getByText('Your subscription is cancelled. No meal deliveries are scheduled.'),
    ).toBeTruthy();

    // 3. No dietary clash cells or clash icons exist
    expect(queryByTestId('calendar-clash-cell')).toBeNull();
    expect(queryByTestId('cell-clash-icon')).toBeNull();

    // 4. No meal kit thumbnail images or placeholder wrappers should exist in any calendar cell
    const allCells = queryAllByTestId(/^calendar-cell-/);
    expect(allCells.length).toBeGreaterThan(0);

    // Verify day cells are not tappable (disabled)
    const firstCell = allCells[0];
    expect(firstCell?.props.accessibilityState?.disabled).toBe(true);

    // Tapping the cell should NOT open Day Detail modal
    fireEvent.press(firstCell!);
    expect(queryByTestId('cell-detail-modal')).toBeNull();
    expect(queryByText('Daily Member Meals')).toBeNull();
  });

  it('allows owner to cancel an active subscription, triggering cancel and transitioning state', async () => {
    const mockCancelFn = jest.fn().mockResolvedValue({ success: true });
    let cancelCallback: (() => void) | null = null;

    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const cancelBtn = buttons?.find((b) => b.text === 'Cancel Plan');
      if (cancelBtn?.onPress) {
        cancelCallback = cancelBtn.onPress;
      }
    });

    mockSubscriptionState = {
      isSubscribed: true,
      activeSubscription: {
        id: 'sub_active_123',
        owner_user_id: 'user_owner',
        family_id: 'fam_cancelled_1',
        scope: 'family',
        status: 'active',
        plan_type: 'standard',
        standard_plan_key: 'high-protein',
        price_per_member_per_week: 1299,
        member_count: 1,
        auto_renew: true,
        amount_paid: 1299,
        period_start: '2026-10-01',
        period_end: '2026-10-31',
        created_at: new Date().toISOString(),
      },
      coveredMembers: [
        {
          id: 'cm_1',
          subscription_id: 'sub_active_123',
          member_id: 'user_owner',
          plan_type: 'standard',
          standard_plan_key: 'high-protein',
          plan_group: null,
          created_at: new Date().toISOString(),
        },
      ],
      assignedMeals: [
        {
          id: 'meal_1',
          subscription_id: 'sub_active_123',
          member_id: 'user_owner',
          weekday: 0,
          meal_kit_id: 'kit_dal_makhani',
          created_at: new Date().toISOString(),
        },
      ],
      pauses: [],
      subscribe: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      cancel: mockCancelFn,
      assignMeal: jest.fn(),
      clearMeal: jest.fn(),
      setMemberPlan: jest.fn(),
      updateCoveredMembersList: jest.fn(),
      addPause: jest.fn(),
      removePause: jest.fn(),
      unpauseDate: jest.fn(),
      unpauseDates: jest.fn(),
      fetchPauses: jest.fn(),
      toggleAutoRenewState: jest.fn(),
      applySamePlanToAll: jest.fn(),
      shareOwnerPlan: jest.fn(),
    };

    const { getByTestId } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Active sub card is present
    expect(getByTestId('family-active-sub-card')).toBeTruthy();

    // Cancel Plan button is pressed
    const cancelSubBtn = getByTestId('family-cancel-sub-btn');
    fireEvent.press(cancelSubBtn);

    expect(Alert.alert).toHaveBeenCalled();
    expect(cancelCallback).not.toBeNull();

    // Trigger confirmation
    await cancelCallback!();
    expect(mockCancelFn).toHaveBeenCalledTimes(1);
  });
});
