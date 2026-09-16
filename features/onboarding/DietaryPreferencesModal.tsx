import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { usePreferences, UserDietaryPreferences } from '../../framework/context/PreferencesContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Button } from '../../framework/ui/Button';
import { PillTag } from '../../framework/ui/PillTag';
import {
  CuisineType,
  DietTag,
  RegionHub,
  SpiceLevel,
} from '../../framework/services/mealKitsService';

export interface DietaryPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

const DIET_TYPES: { id: DietTag | 'all'; label: string; icon: string; desc: string }[] = [
  { id: 'veg', label: 'Vegetarian', icon: '🥬', desc: '100% vegetarian dishes, paneer & dairy' },
  { id: 'nonveg', label: 'Non-Vegetarian', icon: '🍗', desc: 'Chicken, seafood, meats & poultry' },
  { id: 'jain', label: 'Jain Friendly', icon: '🌱', desc: 'No root vegetables, onions or garlic' },
  { id: 'vegan', label: 'Vegan', icon: '🥑', desc: 'Plant-based, 100% dairy-free' },
  {
    id: 'keto',
    label: 'Keto Low-Carb',
    icon: '🍳',
    desc: 'High protein, healthy fats, under 15g net carbs',
  },
  {
    id: 'gluten-free',
    label: 'Gluten-Free',
    icon: '🌾',
    desc: 'Zero wheat, gluten-free grains & flours',
  },
];

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Dairy',
  'Gluten / Wheat',
  'Tree Nuts (Cashew, Almond)',
  'Soy',
  'Shellfish / Seafood',
  'Sesame',
  'Mustard',
];

const SPICE_LEVELS: { id: SpiceLevel; label: string; icon: string }[] = [
  { id: 'Mild', label: 'Mild (Child Friendly)', icon: '🟢' },
  { id: 'Medium', label: 'Medium (Balanced Heat)', icon: '🟡' },
  { id: 'Spicy', label: 'Spicy (Authentic Dhaba)', icon: '🌶️' },
  { id: 'Fiery', label: 'Fiery (Kolhapuri / Andhra)', icon: '🔥' },
];

const CUISINES: CuisineType[] = [
  'Italian',
  'Mexican',
  'American',
  'North Indian',
  'South Indian',
  'Hyderabadi',
  'Punjabi',
  'Mughlai',
  'Coastal',
  'Gujarati',
  'Indo-Chinese',
  'Continental',
];

const REGIONAL_HUBS: { id: RegionHub; name: string; city: string }[] = [
  { id: 'South', name: 'South Hub', city: 'Bengaluru / Hyderabad / Chennai' },
  { id: 'West', name: 'West Hub', city: 'Mumbai / Pune / Ahmedabad' },
  { id: 'North', name: 'North Hub', city: 'Delhi NCR / Chandigarh / Jaipur' },
  { id: 'East', name: 'East Hub', city: 'Kolkata / Bhubaneswar' },
];

export const DietaryPreferencesModal: React.FC<DietaryPreferencesModalProps> = ({
  visible,
  onClose,
}) => {
  const { preferences, updatePreferences } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [dietType, setDietType] = useState<DietTag | 'all'>(preferences.dietType);
  const [allergies, setAllergies] = useState<string[]>(preferences.allergies);
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceLevel>(preferences.spiceTolerance);
  const [preferredCuisines, setPreferredCuisines] = useState<CuisineType[]>(
    preferences.preferredCuisines,
  );
  const [regionHub, setRegionHub] = useState<RegionHub>(preferences.regionHub);

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

  const handleSave = () => {
    const hubMatch = REGIONAL_HUBS.find((h) => h.id === regionHub);
    updatePreferences({
      dietType,
      allergies,
      spiceTolerance,
      preferredCuisines,
      regionHub,
      currentCity: hubMatch?.city.split(' / ')[0] || 'Bengaluru',
    });
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
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Taste & Dietary Profile
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Personalize recommendations & recipes
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
              1. What is your primary diet?
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              We’ll filter home feed meal kits according to your diet.
            </Text>

            <View style={styles.dietGrid}>
              {DIET_TYPES.map((dt) => {
                const isSelected = dietType === dt.id;
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
                    onPress={() => setDietType(dt.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dietIcon}>{dt.icon}</Text>
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
                    <Text style={{ fontSize: 20 }}>{sp.icon}</Text>
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

            <View style={styles.pillsWrap}>
              {CUISINES.map((cuis) => {
                const isSelected = preferredCuisines.includes(cuis);
                return (
                  <PillTag
                    key={cuis}
                    label={cuis}
                    selected={isSelected}
                    onPress={() => toggleCuisine(cuis)}
                  />
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

            <View style={styles.pillsWrap}>
              {ALLERGY_OPTIONS.map((alg) => {
                const isSelected = allergies.includes(alg);
                return (
                  <PillTag
                    key={alg}
                    label={alg}
                    selected={isSelected}
                    onPress={() => toggleAllergy(alg)}
                  />
                );
              })}
            </View>
          </View>

          {/* Section 5: Delivery Region */}
          <View
            style={[styles.section, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              5. Fulfillment Region Hub
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Determines cold-chain warehouse availability and same-day delivery slots.
            </Text>

            {REGIONAL_HUBS.map((hub) => {
              const isSelected = regionHub === hub.id;
              return (
                <TouchableOpacity
                  key={hub.id}
                  style={[
                    styles.hubCard,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      borderRadius: radii.lg,
                    },
                  ]}
                  onPress={() => setRegionHub(hub.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.hubName,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {hub.name}
                    </Text>
                    <Text style={[styles.hubCity, { color: colors.textSecondary }]}>
                      {hub.city}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
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
            title="Save Preferences & Update Feed ✨"
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
  closeText: {
    fontSize: 20,
    fontWeight: '700',
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
