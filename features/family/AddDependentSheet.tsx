import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { usePreferences, UserDietaryPreferences } from '../../framework/context/PreferencesContext';
import { DependentType, FamilyMember } from '../../framework/services/familyService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { SegmentedControl } from '../../framework/ui/SegmentedControl';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Checkbox } from '../../framework/ui/Checkbox';
import { PillTag } from '../../framework/ui/PillTag';
import { DietTag, SpiceLevel, CuisineType } from '../../framework/services/mealKitsService';

export interface AddDependentSheetProps {
  visible: boolean;
  onClose: () => void;
  onDependentAdded?: () => void;
  onLinkCreated?: () => void;
  initialMember?: FamilyMember | null;
  mode?: 'create' | 'edit';
}

const DIET_TYPES: { id: DietTag; label: string; desc: string }[] = [
  { id: 'veg', label: 'Vegetarian', desc: '100% vegetarian dishes, paneer & dairy' },
  { id: 'nonveg', label: 'Non-Vegetarian', desc: 'Chicken, seafood, meats & poultry' },
  { id: 'jain', label: 'Jain Friendly', desc: 'No root vegetables, onions or garlic' },
  { id: 'vegan', label: 'Vegan', desc: 'Plant-based, 100% dairy-free' },
  { id: 'keto', label: 'Keto Low-Carb', desc: 'High protein, healthy fats, under 15g net carbs' },
  { id: 'gluten-free', label: 'Gluten-Free', desc: 'Zero wheat, gluten-free grains & flours' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

const SPICE_LEVELS: { id: SpiceLevel; label: string }[] = [
  { id: 'Mild', label: 'Mild (Child Friendly)' },
  { id: 'Medium', label: 'Medium (Balanced Heat)' },
  { id: 'Spicy', label: 'Spicy (Authentic Dhaba)' },
  { id: 'Fiery', label: 'Fiery (Kolhapuri / Andhra)' },
];

const CUISINES: { id: CuisineType; label: string; desc: string }[] = [
  { id: 'North Indian', label: 'North Indian', desc: 'Rich gravies, paneer & tandoori' },
  { id: 'South Indian', label: 'South Indian', desc: 'Dosas, idlis, sambar & coconut curries' },
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

const ALLERGY_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'None', label: 'No Allergies', desc: 'Safe for all standard ingredients' },
  { id: 'Peanuts', label: 'Peanuts', desc: 'Groundnuts, peanut butter & oil' },
  { id: 'Dairy', label: 'Dairy / Lactose', desc: 'Milk, cheese, butter, paneer & ghee' },
  { id: 'Gluten / Wheat', label: 'Gluten / Wheat', desc: 'Wheat flour, maida & semolina' },
  { id: 'Tree Nuts', label: 'Tree Nuts', desc: 'Almonds, cashews, walnuts & pistachios' },
  { id: 'Soy', label: 'Soy / Soya', desc: 'Soy sauce, edamame & soya chunks' },
  { id: 'Shellfish / Seafood', label: 'Shellfish / Seafood', desc: 'Prawns, crab, shrimp & fish' },
  { id: 'Sesame', label: 'Sesame', desc: 'Til seeds and sesame cooking oil' },
  { id: 'Mustard', label: 'Mustard', desc: 'Mustard seeds, paste & mustard oil' },
];

export const AddDependentSheet: React.FC<AddDependentSheetProps> = ({
  visible,
  onClose,
  onDependentAdded,
  onLinkCreated,
  initialMember,
  mode = 'create',
}) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { addDependentProfile, updateDependentPreferences, members, invites } = useFamily();
  const { preferences: ownerPreferences } = usePreferences();
  const isEdit = mode === 'edit';

  const initialPrefs = initialMember?.preferences || {};

  const [dependentType, setDependentType] = useState<DependentType>(
    initialMember?.dependent_type === 'senior' ? 'senior' : 'child',
  );
  const [firstName, setFirstName] = useState(initialMember?.display_name || '');
  const [age, setAge] = useState(
    initialMember?.age != null
      ? String(initialMember.age)
      : initialPrefs.age != null
        ? String(initialPrefs.age)
        : '',
  );
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(
    initialMember?.gender === 'Female'
      ? 'Female'
      : initialMember?.gender === 'Other'
        ? 'Other'
        : initialPrefs.gender === 'Female'
          ? 'Female'
          : initialPrefs.gender === 'Other'
            ? 'Other'
            : 'Male',
  );
  const [selectedDiets, setSelectedDiets] = useState<DietTag[]>(
    initialPrefs.dietTypes && initialPrefs.dietTypes.length > 0 ? initialPrefs.dietTypes : ['veg'],
  );
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceLevel>(
    initialPrefs.spiceTolerance || (initialMember?.dependent_type === 'senior' ? 'Medium' : 'Mild'),
  );
  const [preferredCuisines, setPreferredCuisines] = useState<CuisineType[]>(
    initialPrefs.preferredCuisines && initialPrefs.preferredCuisines.length > 0
      ? initialPrefs.preferredCuisines
      : initialMember?.dependent_type === 'senior'
        ? ['North Indian', 'South Indian', 'Continental']
        : ['Italian', 'North Indian'],
  );
  const [allergies, setAllergies] = useState<string[]>(initialPrefs.allergies || []);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [guardianConsent, setGuardianConsent] = useState(isEdit ? true : false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial member data when opening in edit mode
  useEffect(() => {
    if (visible && isEdit && initialMember) {
      const isSenior = initialMember.dependent_type === 'senior';
      setDependentType(isSenior ? 'senior' : 'child');
      setFirstName(initialMember.display_name || '');
      const prefs = initialMember.preferences || {};
      const rawAge = initialMember.age ?? prefs.age;
      setAge(rawAge != null ? String(rawAge) : '');
      const rawGender = initialMember.gender || prefs.gender || 'Male';
      setGender(rawGender === 'Female' ? 'Female' : rawGender === 'Other' ? 'Other' : 'Male');
      setSelectedDiets(prefs.dietTypes && prefs.dietTypes.length > 0 ? prefs.dietTypes : ['veg']);
      setSpiceTolerance(prefs.spiceTolerance || (isSenior ? 'Medium' : 'Mild'));
      setPreferredCuisines(
        prefs.preferredCuisines && prefs.preferredCuisines.length > 0
          ? prefs.preferredCuisines
          : isSenior
            ? ['North Indian', 'South Indian', 'Continental']
            : ['Italian', 'North Indian'],
      );
      setAllergies(prefs.allergies || []);
      setCustomAllergyInput('');
      setGuardianConsent(true);
      setErrorMsg(null);
    } else if (visible && !isEdit) {
      setFirstName('');
      setAge('');
      setGender('Male');
      setSelectedDiets(['veg']);
      setSpiceTolerance(dependentType === 'child' ? 'Mild' : 'Medium');
      setPreferredCuisines(
        dependentType === 'child'
          ? ['Italian', 'North Indian']
          : ['North Indian', 'South Indian', 'Continental'],
      );
      setAllergies([]);
      setCustomAllergyInput('');
      setGuardianConsent(false);
      setErrorMsg(null);
    }
  }, [visible, isEdit, initialMember]);

  // Calibrate defaults when toggling Child / Senior
  const handleTypeChange = (type: DependentType) => {
    setDependentType(type);
    if (type === 'child') {
      setSpiceTolerance('Mild');
      setPreferredCuisines(['Italian', 'North Indian']);
    } else {
      setSpiceTolerance('Medium');
      setPreferredCuisines(['North Indian', 'South Indian', 'Continental']);
    }
  };

  const toggleDiet = (diet: DietTag) => {
    setSelectedDiets((prev) => {
      if (prev.includes(diet)) {
        const next = prev.filter((d) => d !== diet);
        return next.length > 0 ? next : ['veg'];
      }
      return [...prev, diet];
    });
  };

  const toggleCuisine = (cuisine: CuisineType) => {
    setPreferredCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine],
    );
  };

  const toggleAllergy = (allergy: string) => {
    if (allergy === 'None') {
      setAllergies([]);
      return;
    }
    setAllergies((prev) => {
      const filtered = prev.filter((a) => a !== 'None');
      if (filtered.includes(allergy)) {
        return filtered.filter((a) => a !== allergy);
      }
      return [...filtered, allergy];
    });
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies((prev) => [...prev.filter((a) => a !== 'None'), trimmed]);
      setCustomAllergyInput('');
    }
  };

  const handleCreate = async () => {
    const trimmed = firstName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a name for the profile');
      return;
    }

    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge)) {
      setErrorMsg('Please enter an age');
      return;
    }

    if (dependentType === 'child' && (parsedAge < 4 || parsedAge > 15)) {
      setErrorMsg('Child age must be between 4 and 15 years');
      return;
    }

    if (dependentType === 'senior' && (parsedAge < 60 || parsedAge > 120)) {
      setErrorMsg('Senior citizen age must be between 60 and 120 years');
      return;
    }

    if (!isEdit && dependentType === 'child' && !guardianConsent) {
      setErrorMsg('Parental or guardian confirmation is required for a child profile');
      return;
    }

    if (!isEdit) {
      const occupiedSeats = members.length + invites.filter((i) => i.status === 'pending').length;
      if (occupiedSeats >= 6) {
        setErrorMsg('Family has reached the maximum capacity of 6 members');
        return;
      }
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const fullPreferences: UserDietaryPreferences & {
        age: number;
        gender: string;
        display_name: string;
      } = {
        display_name: trimmed,
        age: parsedAge,
        gender: gender,
        dietTypes: selectedDiets,
        allergies: allergies,
        spiceTolerance: spiceTolerance,
        preferredCuisines: preferredCuisines,
        state: ownerPreferences.state || 'Karnataka',
        city: ownerPreferences.city || 'Bengaluru',
        subRegion: ownerPreferences.subRegion || '',
        regionHub: ownerPreferences.regionHub || 'South',
        currentCity: ownerPreferences.city || 'Bengaluru',
        isOnboarded: true,
      };

      if (isEdit && initialMember) {
        const res = await updateDependentPreferences(initialMember.user_id, fullPreferences);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update preferences');
        } else {
          onDependentAdded?.();
          onClose();
        }
      } else {
        const res = await addDependentProfile(dependentType, trimmed, fullPreferences);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to add profile');
        } else {
          handleReset();
          onDependentAdded?.();
          onLinkCreated?.();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error creating profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName('');
    setAge('');
    setGender('Male');
    setAllergies([]);
    setCustomAllergyInput('');
    setGuardianConsent(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleReset}
      title={
        isEdit
          ? `Edit ${firstName ? `${firstName}'s` : dependentType === 'child' ? 'Child' : 'Senior'} Preferences`
          : dependentType === 'child'
            ? 'Add Child Profile'
            : 'Add Senior Citizen Profile'
      }
      subtitle={
        isEdit
          ? 'Customize dietary preferences and taste recommendations.'
          : 'Directly creates their profile and customizes dietary recommendations.'
      }
      testID="add-dependent-sheet"
    >
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Profile Details */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            1. Profile Details
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Basic member profile information managed by you.
          </Text>

          {/* Profile Type Selector (Only in Create Mode) */}
          {!isEdit && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Profile Type</Text>
              <SegmentedControl
                options={[
                  { label: 'Child Profile', value: 'child' },
                  { label: 'Senior Citizen', value: 'senior' },
                ]}
                selectedValue={dependentType}
                onSelect={(val: string) => handleTypeChange(val as DependentType)}
                testID="dependent-type-selector"
              />
            </>
          )}

          {/* Name & Age Row */}
          <View style={styles.nameAgeRow}>
            <View style={styles.nameCol}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgSubtle,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                    borderRadius: radii.md,
                  },
                ]}
                placeholder="Enter name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoCapitalize="words"
                testID="dependent-first-name-input"
              />
            </View>

            <View style={styles.ageCol}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age (Years)</Text>
              <TextInput
                style={[
                  styles.ageCompactInput,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgSubtle,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                    borderRadius: radii.md,
                  },
                ]}
                keyboardType="numeric"
                maxLength={3}
                value={age}
                onChangeText={(val) => {
                  setAge(val.replace(/[^0-9]/g, ''));
                  if (errorMsg) setErrorMsg(null);
                }}
                testID="dependent-age-input"
              />
            </View>
          </View>

          {/* Gender Selector: ONLY Male, Female, Other */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            Gender
          </Text>
          <View style={styles.pillsWrap} testID="dependent-gender-selector">
            {GENDER_OPTIONS.map((g) => (
              <PillTag key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>
        </View>

        {/* Section 2: Dietary Preferences */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            2. Dietary Preferences
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Select all that apply. Meal kits will be filtered to match this diet.
          </Text>

          <View style={styles.dietGrid} testID="dependent-diet-selector">
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
                  onPress={() => toggleDiet(dt.id)}
                  activeOpacity={0.8}
                >
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

        {/* Section 3: Spice Tolerance Level */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            3. Spice Tolerance Level
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Masala sachets will be calibrated to desired intensity.
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
                  activeOpacity={0.8}
                >
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

        {/* Section 4: Favorite Regional Cuisines */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            4. Favorite Regional Cuisines
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Select the culinary regions preferred for meal kits.
          </Text>

          <View style={styles.cardGrid} testID="dependent-cuisine-selector">
            {CUISINES.map((cuis) => {
              const isSelected = preferredCuisines.includes(cuis.id);
              return (
                <TouchableOpacity
                  key={cuis.id}
                  style={[
                    styles.optionCard,
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
                      styles.cardLabel,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {cuis.label}
                  </Text>
                  <Text style={[styles.cardDescText, { color: colors.textSecondary }]}>
                    {cuis.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 5: Food Allergies & Exclusions */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            5. Food Allergies & Exclusions
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Safety warnings and strict filtration for meal kits containing these ingredients.
          </Text>

          <View style={styles.cardGrid} testID="dependent-allergy-selector">
            {ALLERGY_OPTIONS.map((alg) => {
              const isSelected =
                alg.id === 'None' ? allergies.length === 0 : allergies.includes(alg.id);
              return (
                <TouchableOpacity
                  key={alg.id}
                  style={[
                    styles.optionCard,
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
                      styles.cardLabel,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {alg.label}
                  </Text>
                  <Text style={[styles.cardDescText, { color: colors.textSecondary }]}>
                    {alg.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom allergies added by user */}
            {allergies
              .filter((a) => !ALLERGY_OPTIONS.some((o) => o.id === a))
              .map((customAlg) => (
                <TouchableOpacity
                  key={customAlg}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                      borderRadius: radii.lg,
                    },
                  ]}
                  onPress={() => toggleAllergy(customAlg)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cardLabel, { color: colors.primary }]}>{customAlg}</Text>
                  <Text style={[styles.cardDescText, { color: colors.textSecondary }]}>
                    Custom exclusion (Tap to remove)
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Custom Allergy Input */}
          <View style={styles.customInputRow}>
            <TextInput
              style={[
                styles.customTextInput,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgSubtle,
                  borderColor: colors.borderLight,
                  color: colors.textPrimary,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Enter allergy"
              placeholderTextColor={colors.textMuted}
              value={customAllergyInput}
              onChangeText={setCustomAllergyInput}
              onSubmitEditing={handleAddCustomAllergy}
            />
            <Button
              title="Add"
              variant="outline"
              size="sm"
              onPress={handleAddCustomAllergy}
              disabled={!customAllergyInput.trim()}
            />
          </View>
        </View>

        {/* Parental Confirmation (for New Child in Create Mode) */}
        {!isEdit && dependentType === 'child' && (
          <View
            style={[
              styles.consentCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.lg,
              },
            ]}
          >
            <Checkbox
              checked={guardianConsent}
              onPress={() => setGuardianConsent((prev) => !prev)}
              testID="guardian-consent-checkbox"
              label={
                <Text style={[styles.consentText, { color: colors.textPrimary }]}>
                  I confirm I am the parent or legal guardian managing meal choices for this child.
                </Text>
              }
            />
          </View>
        )}

        {/* Error Message */}
        {errorMsg && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: '#FEE2E2', borderRadius: radii.md, borderColor: '#FCA5A5' },
            ]}
          >
            <Icon name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            size="lg"
            onPress={handleReset}
            style={{ flex: 1 }}
          />
          <Button
            title={
              isSubmitting
                ? isEdit
                  ? 'Saving...'
                  : 'Adding...'
                : isEdit
                  ? 'Save Taste Preferences'
                  : 'Add Profile'
            }
            variant="primary"
            size="lg"
            loading={isSubmitting}
            onPress={handleCreate}
            style={{ flex: 1.5 }}
            testID="submit-add-dependent-btn"
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 560,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },
  section: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  nameCol: {
    flex: 1,
  },
  ageCol: {
    width: 86,
  },
  ageCompactInput: {
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  dietLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  dietDescText: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1.5,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDescText: {
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
  },
  spiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  customTextInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  consentCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  consentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
});
