import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { ChefRecipeFormState } from '../types';
import {
  DietTag,
  CuisineType,
  DishCategory,
  SpiceLevel,
} from '../../../framework/services/mealKitsService';
import { SAMPLE_RECIPE_THUMBNAILS } from '../sampleImages';

const DIET_TYPES: Array<{ key: DietTag; label: string; icon: string; desc: string }> = [
  { key: 'veg', label: 'Vegetarian', icon: 'leaf-outline', desc: 'Plant-based with dairy' },
  { key: 'nonveg', label: 'Non-Vegetarian', icon: 'restaurant-outline', desc: 'Contains poultry/meat' },
  { key: 'jain', label: 'Jain', icon: 'flower-outline', desc: 'No root vegetables' },
  { key: 'vegan', label: 'Vegan', icon: 'nutrition-outline', desc: '100% plant-based' },
  { key: 'keto', label: 'Keto', icon: 'flame-outline', desc: 'Low-carb & high-fat' },
  { key: 'gluten-free', label: 'Gluten-Free', icon: 'shield-checkmark-outline', desc: 'Zero gluten grains' },
];

const CUISINES: CuisineType[] = [
  'North Indian',
  'South Indian',
  'Hyderabadi',
  'Punjabi',
  'Mughlai',
  'Coastal',
  'Gujarati',
  'Maharashtrian',
  'Indo-Chinese',
  'Italian',
  'Mexican',
  'American',
  'Continental',
  'European',
  'Mediterranean',
];

const DISH_CATEGORIES: DishCategory[] = [
  'Curries & Gravies',
  'Biryani & Rice',
  'Burgers & Sliders',
  'Pizzas',
  'Tacos',
  'Burritos & Bowls',
  'Pastas',
  'Street Food',
  'Soups & Stews',
];

const SPICE_LEVELS: Array<{ level: SpiceLevel; label: string; color: string }> = [
  { level: 'Mild', label: 'Mild', color: '#10B981' },
  { level: 'Medium', label: 'Medium', color: '#F59E0B' },
  { level: 'Spicy', label: 'Spicy', color: '#EF4444' },
  { level: 'Fiery', label: 'Fiery', color: '#991B1B' },
];

const ALLERGEN_OPTIONS = [
  'Dairy',
  'Gluten',
  'Tree Nuts',
  'Peanuts',
  'Mustard',
  'Sesame',
  'Soy',
  'Shellfish',
  'Eggs',
];

const DIETARY_TAG_OPTIONS: Array<{ key: DietTag; label: string }> = [
  { key: 'veg', label: 'Vegetarian' },
  { key: 'nonveg', label: 'Non-Veg' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'jain', label: 'Jain Friendly' },
  { key: 'keto', label: 'Keto Friendly' },
  { key: 'gluten-free', label: 'Gluten-Free' },
];

interface Step1DetailsProps {
  form: ChefRecipeFormState;
  onChange: (updates: Partial<ChefRecipeFormState>) => void;
}

export function Step1Details({ form, onChange }: Step1DetailsProps) {
  const { colors } = useTheme();

  // Search states for dropdowns
  const [cuisineQuery, setCuisineQuery] = useState('');
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);

  const [categoryQuery, setCategoryQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [allergenQuery, setAllergenQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onChange({ thumbnailUrl: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredCuisines = CUISINES.filter((c) =>
    c.toLowerCase().includes(cuisineQuery.toLowerCase()),
  );

  const filteredCategories = DISH_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(categoryQuery.toLowerCase()),
  );

  const filteredAllergens = ALLERGEN_OPTIONS.filter((a) =>
    a.toLowerCase().includes(allergenQuery.toLowerCase()),
  );

  const toggleAllergen = (a: string) => {
    const exists = form.allergens.includes(a);
    const updated = exists ? form.allergens.filter((x) => x !== a) : [...form.allergens, a];
    onChange({ allergens: updated });
  };

  const toggleDietTag = (t: DietTag) => {
    const exists = form.dietaryTags.includes(t);
    const updated = exists ? form.dietaryTags.filter((x) => x !== t) : [...form.dietaryTags, t];
    onChange({ dietaryTags: updated });
  };

  return (
    <View style={styles.container}>
      {/* SECTION: Recipe Thumbnail */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recipe Thumbnail
            </Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            High-resolution 4:3 hero cover image for the meal kit catalog.
          </Text>
        </View>

        <View style={styles.thumbnailContainer}>
          {form.thumbnailUrl ? (
            <View style={styles.imagePreviewWrapper}>
              <Image
                source={{ uri: form.thumbnailUrl }}
                style={styles.thumbnailPreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayActions}>
                <TouchableOpacity
                  style={[styles.overlayBtn, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                  onPress={() => {
                    if (Platform.OS === 'web' && fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Icon name="create-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.overlayBtnText}>Replace Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.overlayBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                  onPress={() => onChange({ thumbnailUrl: '' })}
                >
                  <Icon name="trash-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.overlayBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.uploadDropzone,
                { backgroundColor: colors.bgSubtle, borderColor: colors.border },
              ]}
              onPress={() => {
                if (Platform.OS === 'web' && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Icon name="cloud-upload-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.uploadPrompt, { color: colors.textPrimary }]}>
                Click to upload dish photo
              </Text>
              <Text style={[styles.uploadSpecs, { color: colors.textMuted }]}>
                PNG, JPG or WEBP (Recommended 1200 x 900 px)
              </Text>
            </TouchableOpacity>
          )}

          {/* Hidden HTML input for web */}
          {Platform.OS === 'web' && (
            <input
              type="file"
              ref={fileInputRef as any}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          )}

          {/* Quick preset selector */}
          <View style={styles.presetSection}>
            <Text style={[styles.presetLabel, { color: colors.textMuted }]}>
              Or choose an authentic culinary preset:
            </Text>
            <View style={styles.presetRow}>
              {SAMPLE_RECIPE_THUMBNAILS.map((sample) => (
                <TouchableOpacity
                  key={sample.id}
                  style={[
                    styles.presetThumb,
                    {
                      borderColor:
                        form.thumbnailUrl === sample.url ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => onChange({ thumbnailUrl: sample.url })}
                >
                  <Image source={{ uri: sample.url }} style={styles.presetImage} />
                  <Text style={[styles.presetText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {sample.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* SECTION: Recipe Overview */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Basic Information
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Clear and appetizing name and description for prospective customers.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Recipe Name</Text>
            <Text style={styles.requiredStar}>*</Text>
          </View>
          <TextInput
            testID="chef-recipe-name-input"
            value={form.name}
            onChangeText={(text) => onChange({ name: text })}
            placeholder="e.g. Royal Kashmiri Dum Aloo"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.borderLight,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Short Tagline</Text>
          </View>
          <TextInput
            testID="chef-recipe-tagline-input"
            value={form.tagline}
            onChangeText={(text) => onChange({ tagline: text })}
            placeholder="e.g. Slow-cooked baby potatoes in velvety fennel-ginger gravy"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.borderLight,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Description</Text>
            <Text style={styles.requiredStar}>*</Text>
          </View>
          <TextInput
            testID="chef-recipe-desc-input"
            value={form.description}
            onChangeText={(text) => onChange({ description: text })}
            placeholder="Describe the dish, its culinary heritage, and what makes it extraordinary..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.borderLight,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>
      </View>

      {/* SECTION: Diet Type (Single-select Card Grid) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Diet Type</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Single Select</Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Select the primary dietary category that best classifies this recipe.
          </Text>
        </View>

        <View style={styles.dietGrid}>
          {DIET_TYPES.map((dt) => {
            const isSelected = form.dietType === dt.key;
            return (
              <TouchableOpacity
                key={dt.key}
                onPress={() => onChange({ dietType: dt.key })}
                activeOpacity={0.8}
                style={[
                  styles.dietCard,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
              >
                <View style={styles.dietCardTop}>
                  <Icon
                    name={dt.icon as any}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                </View>
                <Text
                  style={[
                    styles.dietCardTitle,
                    { color: isSelected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {dt.label}
                </Text>
                <Text style={[styles.dietCardDesc, { color: colors.textMuted }]}>
                  {dt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SECTION: Cuisine & Dish Category Dropdowns */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Classification
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Regional cuisine and dish category for catalog filtering.
          </Text>
        </View>

        <View style={styles.twoColRow}>
          {/* Cuisine Searchable Dropdown */}
          <View style={styles.col}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Cuisine</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => setShowCuisineDropdown(!showCuisineDropdown)}
            >
              <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>
                {form.cuisine || 'Select Cuisine'}
              </Text>
              <Icon
                name={showCuisineDropdown ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showCuisineDropdown && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <TextInput
                  value={cuisineQuery}
                  onChangeText={setCuisineQuery}
                  placeholder="Search cuisine..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.dropdownSearch,
                    {
                      backgroundColor: colors.bgSubtle,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                />
                <View style={styles.dropdownList}>
                  {filteredCuisines.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            form.cuisine === c ? colors.primaryLight : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        onChange({ cuisine: c });
                        setShowCuisineDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: form.cuisine === c ? colors.primary : colors.textPrimary,
                            fontWeight: form.cuisine === c ? '700' : '400',
                          },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Dish Category Searchable Dropdown */}
          <View style={styles.col}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Dish Category</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={[styles.dropdownValue, { color: colors.textPrimary }]}>
                {form.dishCategory || 'Select Category'}
              </Text>
              <Icon
                name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <TextInput
                  value={categoryQuery}
                  onChangeText={setCategoryQuery}
                  placeholder="Search category..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.dropdownSearch,
                    {
                      backgroundColor: colors.bgSubtle,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                />
                <View style={styles.dropdownList}>
                  {filteredCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            form.dishCategory === cat ? colors.primaryLight : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        onChange({ dishCategory: cat });
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color:
                              form.dishCategory === cat ? colors.primary : colors.textPrimary,
                            fontWeight: form.dishCategory === cat ? '700' : '400',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* SECTION: Spice Level & Timings */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Spice Level & Portion Details
          </Text>
        </View>

        {/* Spice Level Segmented Control */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
            Spice Level
          </Text>
          <View
            style={[
              styles.segmentedContainer,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
            ]}
          >
            {SPICE_LEVELS.map((sp) => {
              const isSelected = form.spiceLevel === sp.level;
              return (
                <TouchableOpacity
                  key={sp.level}
                  style={[
                    styles.segmentTab,
                    {
                      backgroundColor: isSelected ? colors.bgSurface : 'transparent',
                      shadowOpacity: isSelected ? 0.08 : 0,
                    },
                  ]}
                  onPress={() => onChange({ spiceLevel: sp.level })}
                >
                  <View
                    style={[
                      styles.spiceDot,
                      { backgroundColor: sp.color, opacity: isSelected ? 1 : 0.6 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected ? colors.textPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {sp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Servings, Prep Time, Cook Time numeric inputs */}
        <View style={styles.threeColRow}>
          <View style={styles.col}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Servings</Text>
            <View
              style={[
                styles.numberInputWrap,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <TextInput
                value={String(form.servings)}
                onChangeText={(t) => onChange({ servings: Math.max(1, parseInt(t) || 1) })}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.textPrimary }]}
              />
              <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>people</Text>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Prep Time</Text>
            <View
              style={[
                styles.numberInputWrap,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <TextInput
                value={String(form.prepTimeMinutes)}
                onChangeText={(t) =>
                  onChange({ prepTimeMinutes: Math.max(0, parseInt(t) || 0) })
                }
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.textPrimary }]}
              />
              <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>mins</Text>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Cook Time</Text>
            <View
              style={[
                styles.numberInputWrap,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <TextInput
                value={String(form.cookTimeMinutes)}
                onChangeText={(t) =>
                  onChange({ cookTimeMinutes: Math.max(0, parseInt(t) || 0) })
                }
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.textPrimary }]}
              />
              <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>mins</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SECTION: Dietary Tags & Allergens (Searchable Multi-select) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Dietary Tags & Allergens
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Inform customers with dietary preferences and allergy sensitivities.
          </Text>
        </View>

        {/* Dietary Tags */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
            Dietary Badges (Multi-select)
          </Text>
          <View style={styles.checkboxGrid}>
            {DIETARY_TAG_OPTIONS.map((tag) => {
              const checked = form.dietaryTags.includes(tag.key);
              return (
                <TouchableOpacity
                  key={tag.key}
                  onPress={() => toggleDietTag(tag.key)}
                  style={[
                    styles.checkboxChip,
                    {
                      backgroundColor: checked ? colors.primaryLight : colors.bgSubtle,
                      borderColor: checked ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Icon
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={checked ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checkboxText,
                      {
                        color: checked ? colors.primary : colors.textSecondary,
                        fontWeight: checked ? '700' : '400',
                      },
                    ]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Allergens */}
        <View style={styles.fieldGroup}>
          <View style={styles.allergenHeader}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Contains Allergens
            </Text>
            <TextInput
              value={allergenQuery}
              onChangeText={setAllergenQuery}
              placeholder="Filter allergens..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.miniSearchInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>

          <View style={styles.checkboxGrid}>
            {filteredAllergens.map((alg) => {
              const checked = form.allergens.includes(alg);
              return (
                <TouchableOpacity
                  key={alg}
                  onPress={() => toggleAllergen(alg)}
                  style={[
                    styles.checkboxChip,
                    {
                      backgroundColor: checked ? '#FEE2E2' : colors.bgSubtle,
                      borderColor: checked ? '#EF4444' : colors.borderLight,
                    },
                  ]}
                >
                  <Icon
                    name={checked ? 'alert-circle' : 'square-outline'}
                    size={16}
                    color={checked ? '#DC2626' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checkboxText,
                      {
                        color: checked ? '#DC2626' : colors.textSecondary,
                        fontWeight: checked ? '700' : '400',
                      },
                    ]}
                  >
                    {alg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  requiredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  thumbnailContainer: {
    gap: 16,
  },
  uploadDropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 4 / 3,
    maxHeight: 280,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadPrompt: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadSpecs: {
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    maxHeight: 340,
    width: '100%',
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayActions: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  overlayBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  presetSection: {
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  presetThumb: {
    width: 80,
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 2,
  },
  presetImage: {
    width: '100%',
    height: 50,
    borderRadius: 6,
  },
  presetText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dietCard: {
    flexBasis: '31%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    minWidth: 160,
  },
  dietCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  dietCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  dietCardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  col: {
    flex: 1,
    minWidth: 200,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  dropdownSearch: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 6,
  },
  dropdownList: {
    maxHeight: 160,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentText: {
    fontSize: 13,
  },
  numberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  numericInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  inputSuffix: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checkboxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkboxText: {
    fontSize: 12,
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  miniSearchInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    width: 140,
  },
});
