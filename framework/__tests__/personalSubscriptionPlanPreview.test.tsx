import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SubscriptionPlanView } from '../../features/subscription/SubscriptionPlanView';
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

const mockSubscribe = jest.fn().mockResolvedValue({ success: true });
const mockAssignMeal = jest.fn().mockResolvedValue({ success: true });

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_123', displayName: 'Aarav Patel', email: 'aarav@example.com' },
    isAuthenticated: true,
  }),
}));

jest.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    availableBalance: 500,
    debitCredits: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('../context/CartContext', () => ({
  useCart: () => ({ addItem: jest.fn() }),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({ isInWishlist: jest.fn(() => false), toggleWishlist: jest.fn() }),
  WishlistProvider: ({ children }: any) => children,
}));

jest.mock('../context/PreferencesContext', () => ({
  usePreferences: () => ({ preferences: {} }),
  PreferencesProvider: ({ children }: any) => children,
}));

jest.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    family: null,
    role: 'owner',
    members: [],
  }),
}));

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({
    isSubscribed: false,
    activeSubscription: null,
    assignedMeals: {},
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    subscribe: mockSubscribe,
    assignMeal: mockAssignMeal,
    addPause: jest.fn(),
    removePause: jest.fn(),
    unpauseDate: jest.fn(),
    fetchPauses: jest.fn(),
    pauses: [],
    toggleAutoRenewState: jest.fn(),
  }),
}));

describe('Personal SubscriptionPlanView - 7-Day Menu Preview & Details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = async () => {
    return await render(
      <ThemeProvider>
        <SubscriptionPlanView />
      </ThemeProvider>,
    );
  };

  test('renders standard plan cards with Preview 7-Day Menu buttons', async () => {
    const { getByTestId } = await renderComponent();

    expect(getByTestId('standard-plan-high-protein')).toBeTruthy();
    expect(getByTestId('standard-plan-keto')).toBeTruthy();
    expect(getByTestId('standard-plan-vegan')).toBeTruthy();
    expect(getByTestId('standard-plan-kids')).toBeTruthy();

    expect(getByTestId('preview-menu-btn-high-protein')).toBeTruthy();
    expect(getByTestId('preview-menu-btn-keto')).toBeTruthy();
    expect(getByTestId('preview-menu-btn-vegan')).toBeTruthy();
    expect(getByTestId('preview-menu-btn-kids')).toBeTruthy();
  });

  test('tapping Preview 7-Day Menu button opens modal showing 7 curated meals for that plan', async () => {
    const { getByTestId, queryByTestId, getAllByText } = await renderComponent();

    // Modal is initially not visible
    expect(queryByTestId('plan-menu-preview-modal')).toBeNull();

    // Tap preview button for Keto plan
    await act(async () => {
      fireEvent.press(getByTestId('preview-menu-btn-keto'));
    });

    // Modal is now visible
    expect(getByTestId('plan-menu-preview-modal')).toBeTruthy();
    expect(getAllByText(/Keto/i).length).toBeGreaterThan(0);

    // Verify 7 day rows are rendered inside preview modal
    for (let i = 0; i < 7; i++) {
      expect(getByTestId(`preview-day-row-${i}`)).toBeTruthy();
    }

    // Close preview modal via close button
    await act(async () => {
      fireEvent.press(getByTestId('close-preview-menu-modal-btn'));
    });
    expect(queryByTestId('plan-menu-preview-modal')).toBeNull();
  });

  test('selecting a plan inside the preview modal sets that plan and closes the modal', async () => {
    const { getByTestId, queryByTestId } = await renderComponent();

    // Open vegan plan preview
    await act(async () => {
      fireEvent.press(getByTestId('preview-menu-btn-vegan'));
    });
    expect(getByTestId('plan-menu-preview-modal')).toBeTruthy();

    // Press Select This Plan in the modal footer
    await act(async () => {
      fireEvent.press(getByTestId('preview-modal-select-plan-btn'));
    });

    // Modal should close
    expect(queryByTestId('plan-menu-preview-modal')).toBeNull();
  });

  test('tapping the plan card directly selects the plan without opening modal', async () => {
    const { getByTestId, queryByTestId } = await renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId('standard-plan-keto'));
    });
    // Modal should not open on simple card click
    expect(queryByTestId('plan-menu-preview-modal')).toBeNull();
  });

  test('tapping meal kit name inside the preview modal opens meal kit details modal', async () => {
    const { getByTestId, getAllByText } = await renderComponent();

    // Open Keto plan preview
    await act(async () => {
      fireEvent.press(getByTestId('preview-menu-btn-keto'));
    });
    expect(getByTestId('plan-menu-preview-modal')).toBeTruthy();

    // In Keto plan, Monday is kit-106 (Keto Cauliflower Tikka Masala Kit)
    const kitLink = getByTestId('preview-kit-name-kit-106');
    expect(kitLink).toBeTruthy();

    // Tap the meal name
    await act(async () => {
      fireEvent.press(kitLink);
    });

    // Meal detail modal should be opened
    await waitFor(() => {
      expect(getByTestId('modal-close-detail-btn')).toBeTruthy();
      expect(getAllByText(/Cauliflower/i).length).toBeGreaterThan(0);
    });
  });

  test('does not show numbered headings or Section 2 in standard plan mode', async () => {
    const { queryByText, getByText } = await renderComponent();

    // "1." is removed from heading
    expect(queryByText('1. Choose Your Plan Style')).toBeNull();
    expect(getByText('Choose Your Plan Style')).toBeTruthy();

    // "2. 7-Day Weekly Meal Schedule" is removed
    expect(queryByText(/2\.\s*7-Day Weekly Meal Schedule/i)).toBeNull();
  });

  test('switching to custom plan shows customize schedule and allows opening meal kit details', async () => {
    const { getByTestId, getAllByText } = await renderComponent();

    // Switch to Custom Day-by-Day tab
    await act(async () => {
      fireEvent.press(getByTestId('tab-custom-plan'));
    });

    // Day 0 default custom kit is kit-102 (Hyderabadi Dum Chicken Biryani)
    const mealNameLink = getByTestId('plan-kit-name-kit-102');
    expect(mealNameLink).toBeTruthy();

    await act(async () => {
      fireEvent.press(mealNameLink);
    });

    await waitFor(() => {
      expect(getByTestId('modal-close-detail-btn')).toBeTruthy();
      expect(getAllByText(/Biryani/i).length).toBeGreaterThan(0);
    });
  });
});
