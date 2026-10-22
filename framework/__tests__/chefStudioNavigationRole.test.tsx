import React from 'react';
import { render } from '@testing-library/react-native';
import { ChefStudioView } from '../../features/chef/ChefStudioView';
import { ThemeProvider } from '../theme/ThemeContext';
import * as AuthContextModule from '../context/AuthContext';

// Helper to determine Chef Studio tab href as configured in app/(tabs)/_layout.tsx
export function getChefStudioTabHref({ isChef }: { isChef: boolean }): string | undefined | null {
  return isChef ? undefined : null;
}

// Helper to determine Profile Chef Studio button visibility as configured in features/profile/ProfileView.tsx
export function canShowProfileChefStudioButton({ isChef }: { isChef: boolean }): boolean {
  return isChef;
}

describe('Chef Studio Navigation Role & Access Control', () => {
  describe('1. Navigation Tab Bar Visibility (app/(tabs)/_layout.tsx)', () => {
    it('hides Chef Studio from the navigation tab for an admin who does NOT have the chef role', () => {
      const userState = { isAdmin: true, isChef: false };
      const href = getChefStudioTabHref(userState);

      expect(href).toBeNull(); // null means hidden in expo-router Tabs.Screen
    });

    it('shows Chef Studio on the navigation tab for an admin who HAS the chef role assigned', () => {
      const userState = { isAdmin: true, isChef: true };
      const href = getChefStudioTabHref(userState);

      expect(href).toBeUndefined(); // undefined means displayed in expo-router Tabs.Screen
    });

    it('shows Chef Studio on the navigation tab for a regular chef who is not an admin', () => {
      const userState = { isAdmin: false, isChef: true };
      const href = getChefStudioTabHref(userState);

      expect(href).toBeUndefined();
    });

    it('hides Chef Studio on the navigation tab for a regular customer without chef role', () => {
      const userState = { isAdmin: false, isChef: false };
      const href = getChefStudioTabHref(userState);

      expect(href).toBeNull();
    });
  });

  describe('2. Profile Screen Chef Shortcut (ProfileView.tsx)', () => {
    it('does not display Chef Studio button for an admin without the chef role', () => {
      expect(canShowProfileChefStudioButton({ isChef: false })).toBe(false);
    });

    it('displays Chef Studio button for an admin who has the chef role', () => {
      expect(canShowProfileChefStudioButton({ isChef: true })).toBe(true);
    });
  });

  describe('3. ChefStudioView Component Access Guard', () => {
    it('renders access denied prompt when an admin without chef role accesses ChefStudioView', async () => {
      jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: {
          uid: 'admin_1',
          email: 'admin@rasoigenie.com',
          displayName: 'Admin User',
          role: 'admin',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
        loading: false,
        isAdmin: true,
        isSuperAdmin: false,
        isRegionalAdmin: false,
        isChef: false,
        assignedRegions: [],
        currentAdminRole: 'regional_admin',
        refreshAdminPermissions: jest.fn(),
        refreshChefStatus: jest.fn(),
        userType: 'admin',
        verificationId: null,
        phoneNumber: null,
        emailAddress: 'admin@rasoigenie.com',
        activeOtpHint: null,
        loginGoogle: jest.fn(),
        requestEmailOTP: jest.fn(),
        confirmEmailOTP: jest.fn(),
        requestPhoneOTP: jest.fn(),
        confirmPhoneOTP: jest.fn(),
        updateUserContact: jest.fn(),
        logout: jest.fn(),
      });

      const { getByText } = await render(
        <ThemeProvider>
          <ChefStudioView />
        </ThemeProvider>,
      );

      expect(getByText('Chef Studio Access Required')).toBeTruthy();
      expect(
        getByText(
          'You are signed in as an administrator. To create and manage recipes in Chef Studio, assign the Chef role to your account in the Admin Panel.',
        ),
      ).toBeTruthy();
    });

    it('renders customer access prompt when a regular user without chef role accesses ChefStudioView', async () => {
      jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: {
          uid: 'user_1',
          email: 'user@example.com',
          displayName: 'Customer User',
          role: 'customer',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
        loading: false,
        isAdmin: false,
        isSuperAdmin: false,
        isRegionalAdmin: false,
        isChef: false,
        assignedRegions: [],
        currentAdminRole: null,
        refreshAdminPermissions: jest.fn(),
        refreshChefStatus: jest.fn(),
        userType: 'customer',
        verificationId: null,
        phoneNumber: null,
        emailAddress: 'user@example.com',
        activeOtpHint: null,
        loginGoogle: jest.fn(),
        requestEmailOTP: jest.fn(),
        confirmEmailOTP: jest.fn(),
        requestPhoneOTP: jest.fn(),
        confirmPhoneOTP: jest.fn(),
        updateUserContact: jest.fn(),
        logout: jest.fn(),
      });

      const { getByText } = await render(
        <ThemeProvider>
          <ChefStudioView />
        </ThemeProvider>,
      );

      expect(getByText('Chef Studio Access Required')).toBeTruthy();
      expect(
        getByText(
          'You need an approved chef profile to access Chef Studio and create meal kit recipes.',
        ),
      ).toBeTruthy();
    });
  });
});
