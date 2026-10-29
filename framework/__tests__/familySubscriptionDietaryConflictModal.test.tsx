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

describe('FamilySubscriptionView - Dietary Conflict Modal Dismissal', () => {
  it('dismisses the conflict pop up when Change Recipe is clicked and opens the recipe picker', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <ThemeProvider>
        <FamilySubscriptionView />
      </ThemeProvider>,
    );

    // 1. Matrix cell for Monday (weekday 0) should show the conflict badge
    const mondayCell = getByTestId('matrix-cell-user_owner-0');
    expect(mondayCell).toBeTruthy();
    expect(getByText('⚠️ Conflict')).toBeTruthy();

    // 2. Tap the cell with the dietary conflict
    fireEvent.press(mondayCell);

    // 3. Cell Detail / Action modal opens and displays Dietary Preference Conflict notice
    await waitFor(() => {
      expect(getByText('⚠️ Dietary Preference Conflict')).toBeTruthy();
      expect(getByText('• Non-vegetarian dish assigned to vegetarian member')).toBeTruthy();
    });

    // 4. Click the "Change Recipe" button
    const changeRecipeBtn = getByTestId('cell-change-recipe-btn');
    fireEvent.press(changeRecipeBtn);

    // 5. The conflict pop up MUST disappear
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

    // 9. Matrix cell for Monday updates to Paneer Makhani and conflict badge is removed
    await waitFor(() => {
      expect(getByText('Paneer Makhani Kit')).toBeTruthy();
      expect(queryByText('⚠️ Conflict')).toBeNull();
    });
  });
});
