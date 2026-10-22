import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../../app/(tabs)/_layout';

// Mock contexts
jest.mock('../../framework/context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAdmin: false, isChef: false }),
}));

jest.mock('../../framework/context/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: { city: 'Pune', currentCity: 'Pune', isOnboarded: true },
    updatePreferences: jest.fn(),
  }),
}));

jest.mock('../../framework/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#EA580C',
      primaryLight: '#FFF7ED',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      bgPrimary: '#FFFFFF',
      bgSurface: '#F9FAFB',
      bgSubtle: '#F3F4F6',
      borderLight: '#E5E7EB',
    },
    radii: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: { card: {} },
  }),
}));

jest.mock('../../framework/context/CartContext', () => ({
  useCart: () => ({ totalCount: 2 }),
}));

jest.mock('../../framework/context/CookModeContext', () => ({
  useCookMode: () => ({ activeOrder: null }),
}));

jest.mock('../../framework/context/FamilyContext', () => ({
  useFamily: () => ({
    family: null,
    isDependent: false,
    dependentType: null,
    canApproveItems: false,
    cartState: { approvedCount: 0, pendingCount: 0 },
    leaveCurrentFamily: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  Tabs: Object.assign(({ children }: any) => <>{children}</>, {
    Screen: () => null,
  }),
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../framework/services/notificationService', () => ({
  subscribeToPendingApprovalCount: () => () => {},
}));

jest.mock('../../framework/services/supabaseOrdersService', () => ({
  refreshPendingApprovalCount: jest.fn(),
}));

jest.mock('../../framework/services/guestService', () => ({
  hasSeenWelcomeScreen: jest.fn().mockResolvedValue(true),
  markWelcomeScreenSeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../framework/services/locationService', () => ({
  getStoredUserLocation: jest
    .fn()
    .mockResolvedValue({ city: 'Pune', pincode: '411001', hub: 'West' }),
  saveStoredUserLocation: jest.fn().mockResolvedValue(undefined),
  detectCurrentLocation: jest.fn(),
  searchServiceableCities: jest.fn().mockReturnValue([]),
}));

describe('TabLayout', () => {
  it('renders without crashing', () => {
    const tree = render(<TabLayout />);
    expect(tree).toBeTruthy();
  });

  it('renders location onboarding when location is missing', () => {
    const pref = require('../../framework/context/PreferencesContext');
    jest.spyOn(pref, 'usePreferences').mockReturnValue({
      preferences: { city: '', currentCity: '', isOnboarded: false },
      updatePreferences: jest.fn(),
    });
    const loc = require('../../framework/services/locationService');
    loc.getStoredUserLocation.mockResolvedValue(null);

    const { SafeAreaProvider } = require('react-native-safe-area-context');
    const tree = render(
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
          frame: { x: 0, y: 0, width: 375, height: 812 },
        }}
      >
        <TabLayout />
      </SafeAreaProvider>,
    );
    expect(tree).toBeTruthy();
  });
});
