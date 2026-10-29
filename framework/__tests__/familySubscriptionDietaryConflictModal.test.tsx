import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FamilySubscriptionView } from '../../features/family/FamilySubscriptionView';
import { ThemeProvider } from '../theme/ThemeContext';
import { FamilyMember } from '../services/familyService';
import { getMealKits } from '../services/mealKitsService';

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
  family_id: 'fam_123',
  user_id: 'user_owner',
  role: 'owner',
  display_name: 'Priya Sharma',
  joined_at: new Date().toISOString(),
  preferences: {
    dietTypes: ['veg'],
    allergies: ['Peanuts'],
    spiceTolerance: 'Mild',
  },
};

const mockMembers = [mockMember];
const mockAssignedMeals = [
  {
    member_id: 'user_owner',
    weekday: 0,
    meal_kit_id: 'kit_chicken_biryani', // non-veg kit -> triggers conflict for vegetarian member
  },
];

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_owner', displayName: 'Priya Sharma' },
    isAuthenticated: true,
  }),
}));

jest.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    family: { id: 'fam_123', name: 'Sharma Household', owner_id: 'user_owner' },
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

const mockAssignMeal = jest.fn();
const mockClearMeal = jest.fn();

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({
    isSubscribed: false,
    activeSubscription: null,
    assignedMeals: mockAssignedMeals,
    subscribe: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    assignMeal: mockAssignMeal,
    clearMeal: mockClearMeal,
    setMemberPlan: jest.fn(),
    updateCoveredMembersList: jest.fn(),
    addPause: jest.fn(),
    fetchPauses: jest.fn(),
    pauses: [],
    toggleAutoRenewState: jest.fn(),
    applySamePlanToAll: jest.fn(),
    shareOwnerPlan: jest.fn(),
    coveredMembers: [],
  }),
}));

// Mock meal kits
jest.mock('../services/mealKitsService', () => {
  const kits = [
    {
      id: 'kit_chicken_biryani',
      name: 'Lucknowi Chicken Biryani',
      cuisine: 'Mughlai',
      diet: 'nonveg',
      dietaryTags: ['nonveg'],
      allergens: [],
      spiceLevel: 'Medium',
      heroImage: 'https://example.com/chicken.jpg',
      nutrition: { protein: 35 },
    },
    {
      id: 'kit_paneer_makhani',
      name: 'Paneer Makhani Kit',
      cuisine: 'North Indian',
      diet: 'veg',
      dietaryTags: ['veg'],
      allergens: ['Dairy'],
      spiceLevel: 'Mild',
      heroImage: 'https://example.com/paneer.jpg',
      nutrition: { protein: 22 },
    },
  ];
  return {
    getMealKits: jest.fn(() => kits),
    getMealKitById: jest.fn((id: string) => kits.find((k) => k.id === id)),
  };
});

jest.setTimeout(30000);

describe('FamilySubscriptionView - Dietary Conflict Modal Dismissal', () => {
  it('shows clash icon on the month calendar cell, displays warning banner in Day Detail popup, and dismisses when Change Recipe is clicked', async () => {
    const { getByTestId, getAllByTestId, getByText, queryByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // 1. Month calendar cells with dietary clash should be marked
    const clashCells = getAllByTestId('calendar-clash-cell');
    expect(clashCells.length).toBeGreaterThan(0);

    const clashIcons = getAllByTestId('cell-clash-icon');
    expect(clashIcons.length).toBeGreaterThan(0);

    // 2. Tap the cell with the dietary conflict to open Day Detail popup
    fireEvent.press(clashCells[0]!);

    // 3. Day Detail popup opens and displays Dietary Preference Conflict banner inside member section
    await waitFor(() => {
      expect(getByText('⚠️ Dietary Preference Conflict')).toBeTruthy();
      expect(getByText('• Non-vegetarian dish assigned to vegetarian member')).toBeTruthy();
      expect(getByText('Lucknowi Chicken Biryani')).toBeTruthy();
    });

    // 4. Click the "Change Recipe" / "Swap" button
    const changeRecipeBtn = getByTestId('cell-change-recipe-btn');
    fireEvent.press(changeRecipeBtn);

    // 5. The day detail conflict pop up MUST disappear
    await waitFor(() => {
      expect(queryByText('⚠️ Dietary Preference Conflict')).toBeNull();
    });

    // 6. The Recipe Picker Modal MUST now be open
    await waitFor(() => {
      expect(getByText('Pick Recipe for Priya Sharma')).toBeTruthy();
      expect(getByTestId('recipe-picker-modal')).toBeTruthy();
    });

    // 7. Select a safe kit (Paneer Makhani)
    const paneerCard = getByTestId('catalog-kit-kit_paneer_makhani');
    fireEvent.press(paneerCard);

    // 8. Recipe picker modal closes
    await waitFor(() => {
      expect(queryByText('Pick Recipe for Priya Sharma')).toBeNull();
    });

    // 9. Re-open Day Detail to verify it was updated to Paneer Makhani Kit and conflict banner is gone
    fireEvent.press(clashCells[0]!);
    await waitFor(() => {
      expect(getByText('Paneer Makhani Kit')).toBeTruthy();
      expect(queryByText('⚠️ Dietary Preference Conflict')).toBeNull();
    });
  });
});
