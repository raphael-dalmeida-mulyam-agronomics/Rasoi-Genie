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

const mockMemberVegetarian: FamilyMember = {
  family_id: 'fam_diet_test',
  user_id: 'user_owner',
  role: 'owner',
  display_name: 'Priya Sharma',
  joined_at: new Date().toISOString(),
  preferences: {
    dietTypes: ['veg'],
    allergies: ['Peanuts'],
    spiceTolerance: 'Spicy',
  },
};

const mockMemberNonVeg: FamilyMember = {
  family_id: 'fam_diet_test',
  user_id: 'user_rohan',
  role: 'member',
  display_name: 'Rohan Sharma',
  joined_at: new Date().toISOString(),
  preferences: {
    dietTypes: ['nonveg'],
    allergies: [],
    spiceTolerance: 'Medium',
  },
};

const mockMembers = [mockMemberVegetarian, mockMemberNonVeg];

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_owner', displayName: 'Priya Sharma' },
    isAuthenticated: true,
  }),
}));

jest.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    family: { id: 'fam_diet_test', name: 'Sharma Household', owner_id: 'user_owner' },
    role: 'owner',
    members: mockMembers,
  }),
}));

jest.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    availableBalance: 5000,
    debitCredits: jest.fn(),
  }),
}));

const mockAssignMeal = jest.fn();
const mockClearMeal = jest.fn();
const mockSetMemberPlan = jest.fn();

let mockSubscriptionState: any = {};

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionState,
}));

describe('FamilySubscriptionView - Meal Kit Plan Preview and Dietary Warnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionState = {
      isSubscribed: false,
      activeSubscription: null,
      assignedMeals: [],
      subscribe: jest.fn().mockResolvedValue({ success: true }),
      pause: jest.fn(),
      resume: jest.fn(),
      cancel: jest.fn(),
      assignMeal: mockAssignMeal,
      clearMeal: mockClearMeal,
      setMemberPlan: mockSetMemberPlan,
      updateCoveredMembersList: jest.fn(),
      addPause: jest.fn(),
      fetchPauses: jest.fn(),
      pauses: [],
      toggleAutoRenewState: jest.fn(),
      applySamePlanToAll: jest.fn(),
      shareOwnerPlan: jest.fn(),
      coveredMembers: [],
    };
  });

  it('renders the 7-day meal delivery schedule with meal kit names and days (Mon - Sun) before subscribing', async () => {
    const { getByTestId, getAllByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Section 2: Member Weekly Schedule exists before subscribing
    const priyaSchedule = getByTestId('member-weekly-schedule-user_owner');
    expect(priyaSchedule).toBeTruthy();

    // Verify all 7 weekdays are visible in the schedule
    expect(getAllByText('Mon').length).toBeGreaterThan(0);
    expect(getAllByText('Tue').length).toBeGreaterThan(0);
    expect(getAllByText('Wed').length).toBeGreaterThan(0);
    expect(getAllByText('Thu').length).toBeGreaterThan(0);
    expect(getAllByText('Fri').length).toBeGreaterThan(0);
    expect(getAllByText('Sat').length).toBeGreaterThan(0);
    expect(getAllByText('Sun').length).toBeGreaterThan(0);

    // Default plan is High Protein; verify meal kit titles are previewed
    expect(getAllByText('Hyderabadi Dum Chicken Biryani Kit').length).toBeGreaterThan(0);
    expect(getAllByText('Coastal Prawns Ghee Roast Kit').length).toBeGreaterThan(0);
    expect(getAllByText('Smoky Grilled Chipotle Chicken Burrito Bowl Kit').length).toBeGreaterThan(
      0,
    );
  });

  it('displays dietary clash warning banner with specific clash reasons when standard plan conflicts with member dietary restrictions', async () => {
    const { getByTestId, getAllByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Priya is vegetarian; High Protein plan contains chicken and prawns
    const warningBanner = getByTestId('plan-dietary-warning-user_owner');
    expect(warningBanner).toBeTruthy();

    // Verify specific clash reasons are rendered
    expect(
      getAllByText(/Non-vegetarian dish assigned to vegetarian member/).length,
    ).toBeGreaterThan(0);

    // Verify day-level clash pill is visible for Monday (Chicken Biryani)
    const mondayClashPill = getByTestId('dietary-clash-pill-user_owner-0');
    expect(mondayClashPill).toBeTruthy();
  });

  it('allows 1-tap switch to Vegan plan or selecting Vegan plan which updates schedule and eliminates dietary clash', async () => {
    const { getByTestId, queryByTestId, getAllByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Warning banner should be initially visible
    expect(getByTestId('plan-dietary-warning-user_owner')).toBeTruthy();

    // Tap "Switch to Vegan Plan (0 Clashes)" quick-action button
    const switchBtn = getByTestId('switch-safe-plan-user_owner');
    expect(switchBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(switchBtn);
    });

    // Warning banner should now be gone for Priya
    await waitFor(() => {
      expect(queryByTestId('plan-dietary-warning-user_owner')).toBeNull();
    });

    // The weekly schedule should now feature vegan meal kits
    expect(getAllByText('Keto Cauliflower Tikka Masala Kit').length).toBeGreaterThan(0);
  });

  it('allows swapping a meal kit on a specific day using the Swap button', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Find the Swap button for Monday (weekday 0)
    const swapMondayBtn = getByTestId('swap-meal-btn-user_owner-0');
    expect(swapMondayBtn).toBeTruthy();

    // Press swap button
    await act(async () => {
      fireEvent.press(swapMondayBtn);
    });

    // Recipe picker modal opens
    expect(getByTestId('recipe-picker-modal')).toBeTruthy();
    expect(getByText('Pick Recipe for Priya Sharma')).toBeTruthy();

    // Select a kit from the catalog
    const paneerCard = getByTestId('catalog-kit-kit-101');
    await act(async () => {
      fireEvent.press(paneerCard);
    });

    // Modal should close and the new kit (Paneer Butter Masala) is set
    await waitFor(() => {
      expect(getByText('Paneer Butter Masala Kit')).toBeTruthy();
    });
  });

  it('warns owner with an Alert when applying a plan to everyone if it creates dietary conflicts', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Click "High Protein" in "Apply the same plan to everyone"
    const applyProteinBtn = getByTestId('apply-all-protein-btn');
    expect(applyProteinBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(applyProteinBtn);
    });

    // Alert should pop up warning about Priya Sharma having dietary conflicts
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dietary Warning'),
      expect.stringContaining('Priya Sharma'),
      expect.any(Array),
    );
  });

  it('displays pre-checkout dietary conflict warning and warns before proceeding to pay upfront', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // Section 4: Checkout dietary clash warning banner is shown
    expect(getByTestId('checkout-dietary-clash-warning')).toBeTruthy();

    // Tapping the upfront subscribe button triggers an Alert warning about conflicts
    const subscribeBtn = getByTestId('family-subscribe-upfront-btn');
    await act(async () => {
      fireEvent.press(subscribeBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Dietary Clashes Detected',
      expect.stringContaining('Priya Sharma'),
      expect.any(Array),
    );
  });
});
