import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Button } from '../../framework/ui/Button';
import { Badge } from '../../framework/ui/Badge';
import {
  detectCurrentLocation,
  saveStoredUserLocation,
  searchServiceableCities,
} from '../../framework/services/locationService';
import {
  ServiceableCityItem,
  hubForCity,
  seedKitsForCityIfNeeded,
} from '../admin/cityKitsSeederService';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { RegionHub } from '../../framework/services/mealKitsService';

export interface LocationOnboardingViewProps {
  onLocationSelected: (loc: { city: string; pincode: string; hub: RegionHub }) => void;
  isModal?: boolean;
}

export const LocationOnboardingView: React.FC<LocationOnboardingViewProps> = ({
  onLocationSelected,
  isModal = false,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, radii, shadows } = useTheme();
  const { updatePreferences } = usePreferences();

  const [step, setStep] = useState<'prompt' | 'detecting' | 'unserviceable' | 'picker'>('prompt');
  const [unserviceableCity, setUnserviceableCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorText, setErrorText] = useState('');

  // Auto-trigger detection on mount if not in modal
  useEffect(() => {
    handleDetect();
  }, []);

  const handleDetect = async () => {
    setStep('detecting');
    setErrorText('');

    const res = await detectCurrentLocation();

    if (res.status === 'granted_serviceable') {
      await handleConfirmCity(res.city, res.pincode, res.hub, res.state);
    } else if (res.status === 'granted_unserviceable') {
      setUnserviceableCity(res.detectedCity);
      setStep('unserviceable');
    } else if (res.status === 'denied') {
      setErrorText('Location permission was denied. Please select your city manually below.');
      setStep('picker');
    } else {
      setErrorText(res.error || 'Unable to detect location. Please choose your city.');
      setStep('picker');
    }
  };

  const handleConfirmCity = async (
    city: string,
    pincode: string,
    hub: RegionHub,
    state?: string,
  ) => {
    const resolvedHub = hub || hubForCity(city);
    await saveStoredUserLocation({
      city,
      pincode,
      hub: resolvedHub,
      state,
      isAutoDetected: true,
    });

    try {
      await seedKitsForCityIfNeeded(city);
    } catch (err) {
      console.warn('[LocationOnboarding] Seeder error:', err);
    }

    await updatePreferences({
      city,
      currentCity: city,
      regionHub: resolvedHub,
      state: state || '',
      isOnboarded: true,
    });

    onLocationSelected({ city, pincode, hub: resolvedHub });
  };

  const filteredCities = searchServiceableCities(searchQuery);

  return (
    <View
      testID="location-onboarding-view"
      style={[
        styles.container,
        {
          backgroundColor: colors.bgPrimary,
          paddingTop: isModal ? 16 : insets.top + 20,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      {/* Detecting Animation State */}
      {step === 'detecting' && (
        <View style={styles.centerBox}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Icon name="location" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Finding your nearest kitchen hub...
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            We use your location to deliver fresh ingredients with cold-chain packaging in 20
            minutes.
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
          <TouchableOpacity
            testID="manual-city-picker-btn"
            style={styles.switchLink}
            onPress={() => setStep('picker')}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Enter City or Pincode Manually
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Unserviceable City State */}
      {step === 'unserviceable' && (
        <View style={styles.centerBox}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Icon name="alert-circle" size={40} color="#EF4444" />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            We're not in {unserviceableCity || 'your city'} yet
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            RasoiGenie currently delivers fresh meal kits in 26 major cities across India. We're
            expanding fast! Meanwhile, explore what our chefs are cooking in other hubs.
          </Text>
          <Button
            testID="unserviceable-select-manually-btn"
            title="Choose a Serviceable City"
            variant="primary"
            size="lg"
            onPress={() => setStep('picker')}
            style={{ marginTop: 24, width: '100%' }}
          />
        </View>
      )}

      {/* Manual City & Pincode Picker State */}
      {step === 'picker' && (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
              Select Delivery City
            </Text>
            <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
              Showing serviceable cities across North, South, West & East Hubs
            </Text>
          </View>

          {errorText ? (
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
              ]}
            >
              <Icon name="information-circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                {errorText}
              </Text>
            </View>
          ) : null}

          {/* Quick detect trigger button */}
          <TouchableOpacity
            testID="detect-gps-location-btn"
            style={[
              styles.gpsBtn,
              { backgroundColor: colors.bgSurface, borderColor: colors.primary },
            ]}
            onPress={handleDetect}
            activeOpacity={0.8}
          >
            <Icon name="navigate" size={18} color={colors.primary} />
            <Text style={[styles.gpsBtnText, { color: colors.primary }]}>
              Use current location (GPS)
            </Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput
              testID="city-search-input"
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by city or 6-digit pincode..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Cities List */}
          <FlatList
            testID="serviceable-cities-list"
            data={filteredCities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`city-option-${item.id}`}
                style={[
                  styles.cityCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
                onPress={() =>
                  handleConfirmCity(item.name, item.defaultPincode, item.hub, item.state)
                }
                activeOpacity={0.7}
              >
                <View style={styles.cityCardLeft}>
                  <View style={[styles.pinIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <Icon name="location" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.cityName, { color: colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cityState, { color: colors.textMuted }]}>
                      {item.state} • Pincode: {item.defaultPincode}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={`${item.hub} Hub`}
                  variant={
                    item.hub === 'South'
                      ? 'success'
                      : item.hub === 'West'
                        ? 'warning'
                        : item.hub === 'North'
                          ? 'primary'
                          : 'accent'
                  }
                  size="sm"
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Icon name="search" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No serviceable city matching "{searchQuery}"
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Try searching by name like "Mumbai", "Bengaluru", "Delhi NCR" or pincode prefix
                  like "560", "400".
                </Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  switchLink: {
    marginTop: 24,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  pickerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
  },
  cityState: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
