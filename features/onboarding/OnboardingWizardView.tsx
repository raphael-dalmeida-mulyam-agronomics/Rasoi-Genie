import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { PaymentMethod } from '../../framework/context/CartContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import {
  CuisineType,
  DietTag,
  SpiceLevel,
} from '../../framework/services/mealKitsService';
import {
  getCitiesForState,
  getStates,
  getSubRegionsForCity,
  SubRegion,
} from '../../framework/services/regionService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Button } from '../../framework/ui/Button';
import { AppIconName, Icon } from '../../framework/ui/Icon';

const { width } = Dimensions.get('window');

const ALL_CUISINES: { id: CuisineType; name: string }[] = [
  { id: 'North Indian', name: 'North Indian' },
  { id: 'South Indian', name: 'South Indian' },
  { id: 'Punjabi', name: 'Punjabi' },
  { id: 'Hyderabadi', name: 'Hyderabadi' },
  { id: 'Mughlai', name: 'Mughlai' },
  { id: 'Coastal', name: 'Coastal & Malabar' },
  { id: 'Gujarati', name: 'Gujarati' },
  { id: 'Maharashtrian', name: 'Maharashtrian' },
  { id: 'Indo-Chinese', name: 'Indo-Chinese' },
  { id: 'Italian', name: 'Italian' },
  { id: 'Mexican', name: 'Mexican' },
  { id: 'Continental', name: 'Continental' },
  { id: 'American', name: 'American' },
  { id: 'European', name: 'European' },
  { id: 'Mediterranean', name: 'Mediterranean' },
];

const DIET_OPTIONS: { id: DietTag; label: string; icon: AppIconName; desc: string }[] = [
  {
    id: 'veg',
    label: 'Vegetarian',
    icon: 'leaf',
    desc: '100% vegetarian dishes, paneer & lentils',
  },
  {
    id: 'nonveg',
    label: 'Non-Vegetarian',
    icon: 'restaurant',
    desc: 'Chicken, meats, seafood & egg options',
  },
  {
    id: 'jain',
    label: 'Jain Friendly',
    icon: 'leaf',
    desc: 'No root vegetables, onions or garlic',
  },
  { id: 'vegan', label: 'Vegan', icon: 'nutrition', desc: 'Strictly plant-based, 100% dairy-free' },
  {
    id: 'keto',
    label: 'Keto Low-Carb',
    icon: 'flame',
    desc: 'High protein, healthy fats, under 15g carbs',
  },
  {
    id: 'gluten-free',
    label: 'Gluten-Free',
    icon: 'nutrition',
    desc: 'Zero wheat, gluten-free grains',
  },
];

const SPICE_OPTIONS: { id: SpiceLevel; label: string; flameCount: number; desc: string }[] = [
  { id: 'Mild', label: 'Mild', flameCount: 1, desc: 'Gentle, aromatic, child-friendly heat' },
  {
    id: 'Medium',
    label: 'Medium',
    flameCount: 2,
    desc: 'Balanced authentic Indian restaurant heat',
  },
  { id: 'Spicy', label: 'Spicy', flameCount: 3, desc: 'Rich, bold & traditional Dhaba warmth' },
  {
    id: 'Fiery',
    label: 'Fiery',
    flameCount: 4,
    desc: 'Intense heat for Andhra & Kolhapuri lovers',
  },
];

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Dairy',
  'Gluten / Wheat',
  'Tree Nuts',
  'Soy',
  'Seafood / Shellfish',
  'Sesame',
  'Mustard',
];

// Region hierarchy - states, cities, sub-regions from regionService
const ALL_STATES = getStates();
const ALL_CUISINES_WITH_SOUPS = [
  ...ALL_CUISINES,
  { id: 'Soups & Stews' as CuisineType, name: 'Soups & Stews' },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; title: string; subtitle: string; icon: AppIconName }[] =
  [
    {
      id: 'UPI',
      title: 'UPI Instant Pay',
      subtitle: 'Google Pay, PhonePe, Paytm, BHIM',
      icon: 'flash',
    },
    {
      id: 'Card',
      title: 'Credit / Debit Card',
      subtitle: 'Visa, Mastercard, RuPay & Amex',
      icon: 'card',
    },
    {
      id: 'Cash on Delivery',
      title: 'Cash on Delivery',
      subtitle: 'Pay at your doorstep on arrival',
      icon: 'cash',
    },
    {
      id: 'Wallet',
      title: 'Wallets & Net Banking',
      subtitle: 'Paytm Wallet, Amazon Pay, NetBanking',
      icon: 'bank',
    },
  ];

export const OnboardingWizardView: React.FC = () => {
  const { user } = useAuth();
  const { completeOnboarding } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Cuisines & Spice
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([
    'North Indian',
    'South Indian',
  ]);
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceLevel>('Medium');

  // Step 2: Diets & Allergies
  const [dietTypes, setDietTypes] = useState<DietTag[]>(['veg']);
  const [allergies, setAllergies] = useState<string[]>([]);

  // Step 3: Address & Region Hierarchy
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>(user?.phoneNumber || '');
  const [flatAndStreet, setFlatAndStreet] = useState<string>('');
  const [areaAndLandmark, setAreaAndLandmark] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedSubRegion, setSelectedSubRegion] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [addressTag, setAddressTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Dropdown visibility
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSubRegionDropdown, setShowSubRegionDropdown] = useState(false);

  // Search text for filtering
  const [stateSearchText, setStateSearchText] = useState('');
  const [citySearchText, setCitySearchText] = useState('');

  // Derived options
  const availableCities = selectedState ? getCitiesForState(selectedState) : [];
  const availableSubRegions = selectedCity ? getSubRegionsForCity(selectedCity) : [];

  // Filtered lists based on search
  const filteredStates = stateSearchText
    ? ALL_STATES.filter((s) => s.toLowerCase().includes(stateSearchText.toLowerCase()))
    : ALL_STATES;
  const filteredCities = citySearchText
    ? availableCities.filter((c) => c.toLowerCase().includes(citySearchText.toLowerCase()))
    : availableCities;

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleCuisine = (c: CuisineType) => {
    setSelectedCuisines((prev) =>
      prev.includes(c)
        ? prev.length > 1
          ? prev.filter((item) => item !== c)
          : prev
        : [...prev, c],
    );
  };

  const toggleAllergy = (a: string) => {
    setAllergies((prev) => (prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (selectedCuisines.length === 0) {
        Alert.alert('Cuisine Selection', 'Please select at least one preferred cuisine.');
        return;
      }
    } else if (currentStep === 3) {
      if (!selectedState) {
        Alert.alert('State Required', 'Please select your state.');
        return;
      }
      if (!selectedCity) {
        Alert.alert('City Required', 'Please select your city.');
        return;
      }
      if (!name.trim()) {
        Alert.alert('Name Required', 'Please enter your delivery contact name.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Phone Required', 'Please enter a contact phone number.');
        return;
      }
      if (!flatAndStreet.trim()) {
        Alert.alert('Address Required', 'Please enter flat / house number and street.');
        return;
      }
      if (!pincode.trim() || pincode.trim().length < 5) {
        Alert.alert('Pincode Required', 'Please enter a valid 6-digit postal pincode.');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        cuisines: selectedCuisines,
        dietTypes,
        allergies,
        spiceTolerance,
        address: {
          name: name.trim() || 'Valued Chef',
          phone: phone.trim() || '+91 9876543210',
          flatAndStreet: flatAndStreet.trim() || 'Flat 101, Main Road',
          areaAndLandmark: areaAndLandmark.trim(),
          city: selectedCity,
          pincode: pincode.trim() || '560001',
          tag: addressTag,
          isDefault: true,
        },
        paymentMethod,
        state: selectedState,
        city: selectedCity,
        subRegion: selectedSubRegion,
      });
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Could not save profile setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header Banner */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.badgeRow}>
          <Text style={styles.brandTitle}>RasoiGenie</Text>
          <View style={[styles.stepBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>
        </View>

        <Text style={[styles.welcomeHeadline, { color: colors.textPrimary }]}>
          {currentStep === 1
            ? 'What flavors excite your palate?'
            : currentStep === 2
            ? 'Your dietary lifestyle & allergies'
            : currentStep === 3
            ? 'Where should we deliver your fresh kits?'
            : 'How would you prefer to pay?'}
        </Text>
        <Text style={[styles.welcomeSubtext, { color: colors.textSecondary }]}>
          {currentStep === 1
            ? 'Tailor your daily meal kit recommendations and recipe discovery.'
            : currentStep === 2
            ? 'We curate ingredients strictly following your nutrition & allergen needs.'
            : currentStep === 3
            ? 'Fast scheduled delivery from your nearest fresh regional kitchen hub.'
            : 'Select your default checkout method (you can change this anytime).'}
        </Text>

        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${(currentStep / totalSteps) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: CUISINES & SPICE */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Favorite Cuisines (Select at least 1)
            </Text>
            <View style={styles.chipsWrap}>
              {ALL_CUISINES.map((item) => {
                const isSelected = selectedCuisines.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleCuisine(item.id)}
                    style={[
                      styles.cuisineChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        flexDirection: 'row',
                        alignItems: 'center',
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Icon name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.cuisineChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Spice Heat Tolerance
            </Text>
            <View style={styles.listWrap}>
              {SPICE_OPTIONS.map((spice) => {
                const isSelected = spiceTolerance === spice.id;
                return (
                  <TouchableOpacity
                    key={spice.id}
                    onPress={() => setSpiceTolerance(spice.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardInfoCol}>
                      <View
                        style={[
                          styles.cardHeaderRow,
                          { flexDirection: 'row', alignItems: 'center', gap: 8 },
                        ]}
                      >
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          {spice.label}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          {Array.from({ length: spice.flameCount }).map((_, i) => (
                            <Icon key={i} name="flame" size={14} color={colors.primary} />
                          ))}
                        </View>
                      </View>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {spice.desc}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: DIETS & ALLERGIES */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Diet Preferences (Select all that apply)
            </Text>
            <View style={styles.listWrap}>
              {DIET_OPTIONS.map((diet) => {
                const isSelected = dietTypes.includes(diet.id);
                return (
                  <TouchableOpacity
                    key={diet.id}
                    onPress={() =>
                      setDietTypes((prev) =>
                        prev.includes(diet.id)
                          ? prev.filter((a) => a !== diet.id)
                          : [...prev, diet.id],
                      )
                    }
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 34,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Icon name={diet.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.cardInfoCol}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {diet.label}
                      </Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {diet.desc}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Food Allergens & Intolerances (Optional)
            </Text>
            <View style={styles.chipsWrap}>
              {ALLERGY_OPTIONS.map((allergy) => {
                const isSelected = allergies.includes(allergy);
                return (
                  <TouchableOpacity
                    key={allergy}
                    onPress={() => toggleAllergy(allergy)}
                    style={[
                      styles.allergyChip,
                      {
                        backgroundColor: isSelected ? colors.accent + '25' : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderLight,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Icon name="alert" size={12} color={colors.accent} />}
                    <Text
                      style={[
                        styles.allergyText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {allergy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: ADDRESS & REGION HIERARCHY */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Select Your Delivery Location
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Choose your state, city, and neighborhood for local meal kit availability.
            </Text>

            {/* State Input with Dropdown */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>State *</Text>
            <View style={[
                styles.pickerButton,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: showStateDropdown ? colors.primary : colors.borderLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingRight: 8,
                },
              ]}>
              <TextInput
                style={[styles.pickerButtonText, { flex: 1, paddingVertical: 0, color: selectedState ? colors.textPrimary : colors.textMuted }]}
                placeholder="Select or type state"
                placeholderTextColor={colors.textMuted}
                value={selectedState || stateSearchText}
                onChangeText={(text) => {
                  setStateSearchText(text);
                  setSelectedState('');
                  if (text.length > 0) setShowStateDropdown(true);
                }}
                onFocus={() => setShowStateDropdown(true)}
                onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
              />
              <TouchableOpacity onPress={() => setShowStateDropdown(!showStateDropdown)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name={showStateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {showStateDropdown && filteredStates.length > 0 && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {filteredStates.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.pickerOption,
                        selectedState === state && { backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => {
                        setSelectedState(state);
                        setSelectedCity('');
                        setSelectedSubRegion('');
                        setShowStateDropdown(false);
                        setStateSearchText('');
                      }}
                    >
                      <Text style={[styles.pickerOptionText, { color: selectedState === state ? colors.primary : colors.textPrimary }]}>
                        {state}
                      </Text>
                      {selectedState === state && <Icon name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* City Input with Dropdown */}
            {!!selectedState && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>City *</Text>
                <View style={[
                    styles.pickerButton,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: showCityDropdown ? colors.primary : colors.borderLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingRight: 8,
                    },
                  ]}>
                  <TextInput
                    style={[styles.pickerButtonText, { flex: 1, paddingVertical: 0, color: selectedCity ? colors.textPrimary : colors.textMuted }]}
                    placeholder="Select or type city"
                    placeholderTextColor={colors.textMuted}
                    value={selectedCity || citySearchText}
                    onChangeText={(text) => {
                      setCitySearchText(text);
                      setSelectedCity('');
                      if (text.length > 0) setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  />
                  <TouchableOpacity onPress={() => setShowCityDropdown(!showCityDropdown)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Icon name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {showCityDropdown && filteredCities.length > 0 && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {filteredCities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[
                            styles.pickerOption,
                            selectedCity === city && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedCity(city);
                            setSelectedSubRegion('');
                            setShowCityDropdown(false);
                            setCitySearchText('');
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: selectedCity === city ? colors.primary : colors.textPrimary }]}>
                            {city}
                          </Text>
                          {selectedCity === city && <Icon name="check" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            {/* Sub-Region Picker */}
            {!!selectedCity && availableSubRegions.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                  Neighborhood / Zone (Optional)
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: showSubRegionDropdown ? colors.primary : colors.borderLight,
                    },
                  ]}
                  onPress={() => setShowSubRegionDropdown(!showSubRegionDropdown)}
                >
                  <Text style={[styles.pickerButtonText, { color: selectedSubRegion ? colors.textPrimary : colors.textMuted }]}>
                    {selectedSubRegion
                      ? availableSubRegions.find((sr) => sr.id === selectedSubRegion)?.name || 'Select zone'
                      : 'Select neighborhood (optional)'}
                  </Text>
                  <Icon name={showSubRegionDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {showSubRegionDropdown && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[styles.pickerOption, !selectedSubRegion && { backgroundColor: colors.primaryLight }]}
                        onPress={() => {
                          setSelectedSubRegion('');
                          setShowSubRegionDropdown(false);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, { color: !selectedSubRegion ? colors.primary : colors.textPrimary }]}>
                          All zones in {selectedCity}
                        </Text>
                        {!selectedSubRegion && <Icon name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                      {availableSubRegions.map((sr: SubRegion) => (
                        <TouchableOpacity
                          key={sr.id}
                          style={[
                            styles.pickerOption,
                            selectedSubRegion === sr.id && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedSubRegion(sr.id);
                            setShowSubRegionDropdown(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: selectedSubRegion === sr.id ? colors.primary : colors.textPrimary }]}>
                            {sr.name}
                          </Text>
                          {selectedSubRegion === sr.id && <Icon name="check" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Primary Delivery Address
            </Text>

            <View style={styles.tagRow}>
              {(['Home', 'Work', 'Other'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setAddressTag(t)}
                  style={[
                    styles.tagButton,
                    {
                      backgroundColor: addressTag === t ? colors.primary : colors.bgSurface,
                      borderColor: addressTag === t ? colors.primary : colors.borderLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    },
                  ]}
                >
                  <Icon
                    name={t === 'Home' ? 'restaurant' : t === 'Work' ? 'bank' : 'location'}
                    size={14}
                    color={addressTag === t ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tagButtonText,
                      { color: addressTag === t ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formCol}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Phone *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Flat, House No. & Street *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={flatAndStreet}
                onChangeText={setFlatAndStreet}
                placeholder="Flat 402, Green Glen Layout, 14th Main"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Area & Landmark</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={areaAndLandmark}
                onChangeText={setAreaAndLandmark}
                placeholder="Near Outer Ring Road, Bellandur"
                placeholderTextColor={colors.textMuted}
              />

              {/* City is already selected above, just display it; Pincode is entered below */}
            <View style={[styles.rowInputs, { marginTop: 8 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>City</Text>
                  <View
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.borderLight,
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text style={[styles.pickerButtonText, { color: colors.textPrimary }]}>
                      {selectedCity || 'Select city above'}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Pincode *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="560103"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: PAYMENT METHOD */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Default Checkout Method
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              We will set this as your default when placing meal kit orders.
            </Text>

            <View style={styles.listWrap}>
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPaymentMethod(opt.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.payIconBox}>
                      <Icon
                        name={opt.icon}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.cardInfoCol}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {opt.subtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary Confirmation Banner */}
            <View
              style={[
                styles.summaryBanner,
                { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name="check-circle" size={18} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.primary, marginBottom: 0 }]}>
                  You're all set for the RasoiGenie experience!
                </Text>
              </View>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Cuisines: {selectedCuisines.join(', ')} • Diets:{' '}
                {dietTypes.map((d) => d.toUpperCase()).join(', ')} • {selectedCity}, {selectedState}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bgSurface, borderTopColor: colors.borderLight },
          shadows.medium,
        ]}
      >
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={() => setCurrentStep((prev) => prev - 1)}
            style={[
              styles.backBtn,
              {
                borderColor: colors.borderLight,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={16} color={colors.textPrimary} />
            <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1, marginLeft: currentStep > 1 ? 12 : 0 }}>
          {currentStep < totalSteps ? (
            <Button
              title={`Next: Step ${currentStep + 1}`}
              onPress={handleNextStep}
              variant="primary"
              size="lg"
            />
          ) : (
            <Button
              title={isSubmitting ? 'Saving Profile...' : 'Complete Setup & Start Cooking'}
              onPress={handleFinish}
              variant="primary"
              size="lg"
              disabled={isSubmitting}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeHeadline: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: -6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
  },
  cuisineEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  cuisineChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listWrap: {
    gap: 10,
  },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardInfoCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  dietEmoji: {
    fontSize: 24,
  },
  payIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  allergyChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  allergyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hubGrid: {
    gap: 8,
  },
  hubCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  hubName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  hubDesc: {
    fontSize: 12,
  },
  // Region picker styles
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pickerButtonText: {
    fontSize: 14,
    flex: 1,
  },
  pickerDropdown: {
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 180,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pickerOptionText: {
    fontSize: 14,
    flex: 1,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    margin: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCol: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  summaryBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
