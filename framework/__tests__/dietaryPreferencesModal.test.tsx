import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DietaryPreferencesModal } from '../../features/onboarding/DietaryPreferencesModal';
import { ThemeProvider } from '../theme/ThemeContext';
import { PreferencesProvider } from '../context/PreferencesContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

describe('DietaryPreferencesModal Component', () => {
  const initialPrefs = {
    dietTypes: ['veg' as const],
    allergies: ['Peanuts'],
    spiceTolerance: 'Medium' as const,
    preferredCuisines: ['North Indian' as const],
    state: 'Maharashtra',
    city: 'Pune',
    subRegion: 'Kothrud',
    regionHub: 'West' as const,
    currentCity: 'Pune',
    isOnboarded: true,
  };

  it('renders dietary, spice, cuisine, and allergy sections, but does NOT render delivery location section', async () => {
    const { getByText, queryByText } = await render(
      <ThemeProvider>
        <PreferencesProvider>
          <DietaryPreferencesModal
            visible={true}
            onClose={jest.fn()}
            initialPreferences={initialPrefs}
          />
        </PreferencesProvider>
      </ThemeProvider>,
    );

    // Section 1: Diet Preferences
    expect(getByText('1. What are your diet preferences?')).toBeTruthy();
    expect(getByText('Vegetarian')).toBeTruthy();

    // Section 2: Spice Tolerance
    expect(getByText('2. Spice Tolerance Level')).toBeTruthy();
    expect(getByText('Medium (Balanced Heat)')).toBeTruthy();

    // Section 3: Favorite Regional Cuisines
    expect(getByText('3. Favorite Regional Cuisines')).toBeTruthy();
    expect(getByText('North Indian')).toBeTruthy();

    // Section 4: Food Allergies & Exclusions
    expect(getByText('4. Food Allergies & Exclusions')).toBeTruthy();
    expect(getByText('Peanuts')).toBeTruthy();

    // Section 5 (Delivery Location) MUST NOT BE PRESENT
    expect(queryByText('5. Delivery Location')).toBeNull();
    expect(
      queryByText('Set your state, city, and neighborhood for local meal kit availability.'),
    ).toBeNull();
    expect(queryByText('Select or type state')).toBeNull();
    expect(queryByText('Select or type city')).toBeNull();
    expect(queryByText('Neighborhood / Zone (Optional)')).toBeNull();
  });

  it('preserves existing location when saving updated taste and dietary preferences', async () => {
    const onSavePreferences = jest.fn();
    const onClose = jest.fn();

    const { getByText } = await render(
      <ThemeProvider>
        <PreferencesProvider>
          <DietaryPreferencesModal
            visible={true}
            onClose={onClose}
            initialPreferences={initialPrefs}
            onSavePreferences={onSavePreferences}
          />
        </PreferencesProvider>
      </ThemeProvider>,
    );

    // Click Jain Friendly
    fireEvent.press(getByText('Jain Friendly'));

    // Click Save Preferences
    await waitFor(() => {
      expect(getByText('Jain Friendly')).toBeTruthy();
    });

    fireEvent.press(getByText('Save Preferences & Update Feed'));

    await waitFor(() => {
      expect(onSavePreferences).toHaveBeenCalled();
    });

    expect(onSavePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Pune',
        state: 'Maharashtra',
        subRegion: 'Kothrud',
        currentCity: 'Pune',
        regionHub: 'West',
        isOnboarded: true,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
