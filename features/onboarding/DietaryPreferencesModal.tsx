import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePreferences, UserDietaryPreferences } from '../../framework/context/PreferencesContext';
import { CuisineType, DietTag, SpiceLevel } from '../../framework/services/mealKitsService';
import {
  getCitiesForState,
  getStates,
  getSubRegionsForCity,
} from '../../framework/services/regionService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { PillTag } from '../../framework/ui/PillTag';

export interface DietaryPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  initialPreferences?: Partial<UserDietaryPreferences>;
  onSavePreferences?: (prefs: UserDietaryPreferences) => Promise<void> | void;
  title?: string;
  subtitle?: string;
  saveButtonText?: string;
}

const DIET_TYPES: { id: DietTag; label: string; icon: string; desc: string }[] = [
  { id: 'veg', label: 'Vegetarian', icon: '', desc: '100% vegetarian dishes, paneer & dairy' },
  { id: 'nonveg', label: 'Non-Vegetarian', icon: '', desc: 'Chicken, seafood, meats & poultry' },
  { id: 'jain', label: 'Jain Friendly', icon: '', desc: 'No root vegetables, onions or garlic' },
  { id: 'vegan', label: 'Vegan', icon: '', desc: 'Plant-based, 100% dairy-free' },
  {
    id: 'keto',
    label: 'Keto Low-Carb',
    icon: '',
    desc: 'High protein, healthy fats, under 15g net carbs',
  },
  {
    id: 'gluten-free',
    label: 'Gluten-Free',
    icon: '',
    desc: 'Zero wheat, gluten-free grains & flours',
  },
];

const ALLERGY_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'Peanuts', label: 'Peanuts', desc: 'Groundnuts, peanut butter & oil' },
  { id: 'Dairy', label: 'Dairy / Lactose', desc: 'Milk, cheese, butter, paneer & ghee' },
  { id: 'Gluten / Wheat', label: 'Gluten / Wheat', desc: 'Wheat flour, maida & semolina' },
  {
    id: 'Tree Nuts (Cashew, Almond)',
    label: 'Tree Nuts',
    desc: 'Cashews, almonds, walnuts & pistachios',
  },
  { id: 'Soy', label: 'Soy / Soya', desc: 'Soy sauce, edamame & soya chunks' },
  { id: 'Shellfish / Seafood', label: 'Shellfish / Seafood', desc: 'Prawns, crab, shrimp & fish' },
  { id: 'Sesame', label: 'Sesame', desc: 'Til seeds and sesame cooking oil' },
  { id: 'Mustard', label: 'Mustard', desc: 'Mustard seeds, paste & mustard oil' },
];

const SPICE_LEVELS: { id: SpiceLevel; label: string; icon: string }[] = [
  { id: 'Mild', label: 'Mild (Child Friendly)', icon: '' },
  { id: 'Medium', label: 'Medium (Balanced Heat)', icon: '' },
  { id: 'Spicy', label: 'Spicy (Authentic Dhaba)', icon: '' },
  { id: 'Fiery', label: 'Fiery (Kolhapuri / Andhra)', icon: '' },
];

const CUISINES: { id: CuisineType; label: string; desc: string }[] = [
  { id: 'North Indian', label: 'North Indian', desc: 'Rich gravies, paneer & tandoori rotis' },
  { id: 'South Indian', label: 'South Indian', desc: 'Dosas, idlis, sambar & coconut chutneys' },
  { id: 'Hyderabadi', label: 'Hyderabadi', desc: 'Dum biryani, mirchi salan & korma' },
  { id: 'Punjabi', label: 'Punjabi', desc: 'Dal makhani, butter gravies & kulchas' },
  { id: 'Mughlai', label: 'Mughlai', desc: 'Aromatic spices & shahi preparations' },
  { id: 'Coastal', label: 'Coastal', desc: 'Coconut, tamarind & coastal flavors' },
  { id: 'Gujarati', label: 'Gujarati', desc: 'Sweet-savory dals, theplas & kadhi' },
  { id: 'Maharashtrian', label: 'Maharashtrian', desc: 'Spiced misal, thalipeeth & poha' },
  { id: 'Indo-Chinese', label: 'Indo-Chinese', desc: 'Wok noodles, manchurian & fried rice' },
  { id: 'Italian', label: 'Italian', desc: 'Pasta, risottos, herbs & pizza' },
  { id: 'Mexican', label: 'Mexican', desc: 'Tacos, burritos, fajitas & salsa' },
  { id: 'American', label: 'American', desc: 'Burgers, loaded bowls & classic bakes' },
  { id: 'Continental', label: 'Continental', desc: 'Herb bakes, creamy soups & roasts' },
  { id: 'European', label: 'European', desc: 'Classic continental sauces & bakes' },
  { id: 'Mediterranean', label: 'Mediterranean', desc: 'Olive oil, roasted veggies & falafel' },
];

// Region hierarchy
const ALL_STATES = getStates();

export const DietaryPreferencesModal: React.FC<DietaryPreferencesModalProps> = ({
  visible,
  onClose,
  initialPreferences,
  onSavePreferences,
  title,
  subtitle,
  saveButtonText,
}) => {
  const { preferences, updatePreferences } = usePreferences();
  const effectiveBasePrefs = initialPreferences || preferences;
  const { colors, radii, shadows } = useTheme();

  // Region hierarchy state
  const [selectedState, setSelectedState] = useState<string>(effectiveBasePrefs.state || '');
  const [selectedCity, setSelectedCity] = useState<string>(effectiveBasePrefs.city || '');
  const [selectedSubRegion, setSelectedSubRegion] = useState<string>(
    effectiveBasePrefs.subRegion || '',
  );

  // Dropdown visibility state
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSubRegionDropdown, setShowSubRegionDropdown] = useState(false);

  // Search text for filtering
  const [stateSearchText, setStateSearchText] = useState('');
  const [citySearchText, setCitySearchText] = useState('');

  // Derived options for cities and sub-regions
  const availableCities = selectedState ? getCitiesForState(selectedState) : [];
  const availableSubRegions = selectedCity ? getSubRegionsForCity(selectedCity) : [];

  // Filtered states/cities based on search
  const filteredStates = stateSearchText
    ? ALL_STATES.filter((s: string) => s.toLowerCase().includes(stateSearchText.toLowerCase()))
    : ALL_STATES;
  const filteredCities =
    citySearchText && selectedState
      ? availableCities.filter((c: string) =>
          c.toLowerCase().includes(citySearchText.toLowerCase()),
        )
      : availableCities;

  const [selectedDiets, setSelectedDiets] = useState<DietTag[]>([]);
  const [allergies, setAllergies] = useState<string[]>(effectiveBasePrefs.allergies || []);
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceLevel>(
    effectiveBasePrefs.spiceTolerance || 'Medium',
  );
  const [preferredCuisines, setPreferredCuisines] = useState<CuisineType[]>(
    effectiveBasePrefs.preferredCuisines || [],
  );

  // Sync state whenever modal opens or preferences update
  React.useEffect(() => {
    if (visible) {
      const p = initialPreferences || preferences;
      setSelectedState(p.state || '');
      setSelectedCity(p.city || '');
      setSelectedSubRegion(p.subRegion || '');
      setSelectedDiets(p.dietTypes || []);
      setAllergies(p.allergies || []);
      setSpiceTolerance(p.spiceTolerance || 'Medium');
      setPreferredCuisines(p.preferredCuisines || []);
    }
  }, [visible, initialPreferences, preferences]);

  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy],
    );
  };

  const toggleCuisine = (cuisine: CuisineType) => {
    setPreferredCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine],
    );
  };

  const handleSave = async () => {
    const updated: UserDietaryPreferences = {
      ...(initialPreferences ? (initialPreferences as UserDietaryPreferences) : preferences),
      dietTypes: selectedDiets,
      allergies,
      spiceTolerance,
      preferredCuisines,
      state: selectedState,
      city: selectedCity,
      subRegion: selectedSubRegion,
      regionHub: preferences.regionHub,
      currentCity: selectedCity || preferences.currentCity,
      isOnboarded: true,
    };

    if (onSavePreferences) {
      await onSavePreferences(updated);
    } else {
      updatePreferences(updated);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {title || 'Taste & Dietary Profile'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {subtitle || 'Personalize recommendations & recipes'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Diet Type */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              1. What are your diet preferences?
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Select all that apply. We’ll filter home feed meal kits according to your diet.
            </Text>

            <View style={styles.dietGrid}>
              {DIET_TYPES.map((dt) => {
                const isSelected = selectedDiets.includes(dt.id);
                return (
                  <TouchableOpacity
                    key={dt.id}
                    style={[
                      styles.dietCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() =>
                      setSelectedDiets((prev) =>
                        prev.includes(dt.id) ? prev.filter((a) => a !== dt.id) : [...prev, dt.id],
                      )
                    }
                    activeOpacity={0.8}
                  >
                    {dt.icon ? <Text style={styles.dietIcon}>{dt.icon}</Text> : null}
                    <Text
                      style={[
                        styles.dietLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {dt.label}
                    </Text>
                    <Text style={[styles.dietDescText, { color: colors.textSecondary }]}>
                      {dt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Spice Tolerance */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              2. Spice Tolerance Level
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Masala sachets will be calibrated to your desired intensity.
            </Text>

            <View style={styles.spiceRow}>
              {SPICE_LEVELS.map((sp) => {
                const isSelected = spiceTolerance === sp.id;
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={[
                      styles.spiceItem,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() => setSpiceTolerance(sp.id)}
                  >
                    {sp.icon ? <Text style={{ fontSize: 20 }}>{sp.icon}</Text> : null}
                    <Text
                      style={[
                        styles.spiceText,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {sp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3: Cuisines */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              3. Favorite Regional Cuisines
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Select the authentic culinary regions you love cooking.
            </Text>

            <View style={styles.dietGrid}>
              {CUISINES.map((cuis) => {
                const isSelected = preferredCuisines.includes(cuis.id);
                return (
                  <TouchableOpacity
                    key={cuis.id}
                    style={[
                      styles.dietCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() => toggleCuisine(cuis.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dietLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {cuis.label}
                    </Text>
                    <Text style={[styles.dietDescText, { color: colors.textSecondary }]}>
                      {cuis.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 4: Allergens */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              4. Food Allergies & Exclusions
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              We’ll visibly highlight safety warnings on kits containing these ingredients.
            </Text>

            <View style={styles.dietGrid}>
              {ALLERGY_OPTIONS.map((alg) => {
                const isSelected = allergies.includes(alg.id);
                return (
                  <TouchableOpacity
                    key={alg.id}
                    style={[
                      styles.dietCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={() => toggleAllergy(alg.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dietLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {alg.label}
                    </Text>
                    <Text style={[styles.dietDescText, { color: colors.textSecondary }]}>
                      {alg.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 5: Delivery Location */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              5. Delivery Location
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Set your state, city, and neighborhood for local meal kit availability.
            </Text>

            {/* State Input with Dropdown */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>State</Text>
            <View
              style={[
                styles.picker,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: showStateDropdown ? colors.primary : colors.borderLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingRight: 8,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.pickerText,
                  {
                    flex: 1,
                    paddingVertical: 0,
                    color: selectedState ? colors.textPrimary : colors.textMuted,
                  },
                ]}
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
              <TouchableOpacity
                onPress={() => setShowStateDropdown(!showStateDropdown)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={showStateDropdown ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {showStateDropdown && filteredStates.length > 0 && (
              <View
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                ]}
              >
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {filteredStates.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.dropdownItem,
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
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: selectedState === state ? colors.primary : colors.textPrimary },
                        ]}
                      >
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* City Input with Dropdown */}
            {!!selectedState && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                  City
                </Text>
                <View
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: showCityDropdown ? colors.primary : colors.borderLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingRight: 8,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.pickerText,
                      {
                        flex: 1,
                        paddingVertical: 0,
                        color: selectedCity ? colors.textPrimary : colors.textMuted,
                      },
                    ]}
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
                  <TouchableOpacity
                    onPress={() => setShowCityDropdown(!showCityDropdown)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name={showCityDropdown ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {showCityDropdown && filteredCities.length > 0 && (
                  <View
                    style={[
                      styles.dropdownList,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                    ]}
                  >
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {filteredCities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[
                            styles.dropdownItem,
                            selectedCity === city && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedCity(city);
                            setSelectedSubRegion('');
                            setShowCityDropdown(false);
                            setCitySearchText('');
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color: selectedCity === city ? colors.primary : colors.textPrimary,
                              },
                            ]}
                          >
                            {city}
                          </Text>
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
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                  Neighborhood / Zone (Optional)
                </Text>
                <TouchableOpacity
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.borderLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => setShowSubRegionDropdown(!showSubRegionDropdown)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { color: selectedSubRegion ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {selectedSubRegion
                      ? availableSubRegions.find((sr) => sr.id === selectedSubRegion)?.name ||
                        'Select zone'
                      : 'All zones in ' + selectedCity}
                  </Text>
                  <Icon
                    name={showSubRegionDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {showSubRegionDropdown && (
                  <View
                    style={[
                      styles.dropdownList,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                    ]}
                  >
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          !selectedSubRegion && { backgroundColor: colors.primaryLight },
                        ]}
                        onPress={() => {
                          setSelectedSubRegion('');
                          setShowSubRegionDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: !selectedSubRegion ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          All zones in {selectedCity}
                        </Text>
                      </TouchableOpacity>
                      {availableSubRegions.map((sr) => (
                        <TouchableOpacity
                          key={sr.id}
                          style={[
                            styles.dropdownItem,
                            selectedSubRegion === sr.id && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedSubRegion(sr.id);
                            setShowSubRegionDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color:
                                  selectedSubRegion === sr.id ? colors.primary : colors.textPrimary,
                              },
                            ]}
                          >
                            {sr.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Bottom Save Bar */}
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: colors.bgSurface,
              borderTopColor: colors.borderLight,
              ...shadows.medium,
            },
          ]}
        >
          <Button
            title={saveButtonText || 'Save Preferences & Update Feed'}
            icon={<Icon name="check-circle" size={18} color="#FFFFFF" />}
            size="lg"
            style={{ width: '100%' }}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dietCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1.5,
  },
  dietIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  dietLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  dietDescText: {
    fontSize: 11,
    lineHeight: 14,
  },
  spiceRow: {
    gap: 8,
  },
  spiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  spiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  hubName: {
    fontSize: 14,
    fontWeight: '800',
  },
  hubCity: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  // Picker styles for region hierarchy
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  picker: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pickerText: {
    fontSize: 14,
  },
  pickerButtons: {
    flexDirection: 'column',
    gap: 4,
  },
  pickerBtn: {
    width: 36,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dropdown styles
  dropdownList: {
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    margin: 8,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
});
