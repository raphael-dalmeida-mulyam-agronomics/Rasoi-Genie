/**
 * Chef Studio View
 * The dedicated workspace for approved chefs to create and manage their
 * own meal kit recipe submissions. After submission the recipe is sent
 * to the admin for price-setting and region assignment before going live.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { Icon } from '../../framework/ui/Icon';
import {
  ChefSubmissionRecord,
  ChefRecipeSubmission,
  fetchChefSubmissions,
  createChefSubmission,
  updateChefSubmission,
  deleteChefSubmission,
} from '../../framework/services/chefMealKitsService';
import {
  DietTag,
  CuisineType,
  DishCategory,
  SpiceLevel,
  IngredientItem,
  RecipeStep,
} from '../../framework/services/mealKitsService';
import {
  ChefProfile,
  fetchAllChefProfiles,
} from '../../framework/services/adminRbacService';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIET_OPTIONS: DietTag[] = ['veg', 'nonveg', 'jain', 'vegan', 'keto', 'gluten-free'];
const CUISINE_OPTIONS: CuisineType[] = [
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
const SPICE_LEVELS: SpiceLevel[] = ['Mild', 'Medium', 'Spicy', 'Fiery'];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ChefSubmissionRecord['submissionStatus'] }) {
  const colorMap: Record<
    ChefSubmissionRecord['submissionStatus'],
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: '#F3F4F6', text: '#374151', label: 'Draft' },
    pending_review: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review' },
    published: { bg: '#DCFCE7', text: '#15803D', label: 'Published' },
    rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' },
  };
  const s = colorMap[status] ?? colorMap.draft;
  return (
    <View
      style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: s.bg }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: s.text }}>{s.label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 10,
        color: colors.textSecondary,
      }}
    >
      {title}
    </Text>
  );
}

function OptionPill({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
        {
          backgroundColor: selected ? color || colors.primary : colors.bgSubtle,
          borderColor: selected ? color || colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: selected ? '#FFFFFF' : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Create Recipe Modal ───────────────────────────────────────────────────────

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  chefId: string;
  chefName: string;
  initialRecipe?: ChefSubmissionRecord | null;
}

function CreateRecipeModal({
  visible,
  onClose,
  onSubmitted,
  chefId,
  chefName,
  initialRecipe,
}: CreateRecipeModalProps) {
  const { colors } = useTheme();

  // ── Form state ──
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [diet, setDiet] = useState<DietTag>('veg');
  const [cuisine, setCuisine] = useState<CuisineType>('North Indian');
  const [dishCategory, setDishCategory] = useState<DishCategory>('Curries & Gravies');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('Medium');
  const [servings, setServings] = useState('2');
  const [prepTime, setPrepTime] = useState('15');
  const [cookTime, setCookTime] = useState('30');
  const [dietaryTags, setDietaryTags] = useState<DietTag[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: '', quantity: '' }]);
  const [steps, setSteps] = useState<RecipeStep[]>([{ stepNumber: 1, title: '', instruction: '' }]);

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'basic' | 'recipe' | 'review'>('basic');

  const allergenOptions = [
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

  const toggleTag = (tag: DietTag) =>
    setDietaryTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const toggleAllergen = (a: string) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const addIngredient = () => setIngredients((prev) => [...prev, { name: '', quantity: '' }]);
  const updateIngredient = (i: number, field: keyof IngredientItem, value: string) =>
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, [field]: value } : ing)),
    );
  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  const addStep = () =>
    setSteps((prev) => [...prev, { stepNumber: prev.length + 1, title: '', instruction: '' }]);
  const updateStep = (i: number, field: keyof RecipeStep, value: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  const removeStep = (i: number) =>
    setSteps((prev) =>
      prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    );

  useEffect(() => {
    if (initialRecipe) {
      setName(initialRecipe.name || '');
      setTagline(initialRecipe.tagline || '');
      setDescription(initialRecipe.description || '');
      setHeroImage(initialRecipe.heroImage || '');
      setDiet(initialRecipe.diet || 'veg');
      setCuisine(initialRecipe.cuisine || 'North Indian');
      setDishCategory(initialRecipe.dishCategory || 'Curries & Gravies');
      setSpiceLevel(initialRecipe.spiceLevel || 'Medium');
      setServings(String(initialRecipe.servings || 2));
      setPrepTime(String(initialRecipe.prepTimeMinutes || 15));
      setCookTime(String(initialRecipe.cookTimeMinutes || 30));
      setDietaryTags(initialRecipe.dietaryTags || []);
      setAllergens(initialRecipe.allergens || []);
      setIngredients(
        initialRecipe.ingredients && initialRecipe.ingredients.length > 0
          ? initialRecipe.ingredients
          : [{ name: '', quantity: '' }],
      );
      setSteps(
        initialRecipe.recipeSteps && initialRecipe.recipeSteps.length > 0
          ? initialRecipe.recipeSteps
          : [{ stepNumber: 1, title: '', instruction: '' }],
      );
      setStep('basic');
    } else {
      resetForm();
    }
  }, [initialRecipe, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a recipe name.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please add a description.');
      return;
    }
    if (ingredients.filter((ing) => ing.name.trim()).length === 0) {
      Alert.alert('Required', 'Please add at least one ingredient.');
      return;
    }
    if (steps.filter((s) => s.instruction.trim()).length === 0) {
      Alert.alert('Required', 'Please add at least one recipe step.');
      return;
    }

    setSubmitting(true);
    const submission: ChefRecipeSubmission = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      heroImage: heroImage.trim(),
      galleryImages: heroImage.trim() ? [heroImage.trim()] : [],
      diet,
      cuisine,
      dishCategory,
      spiceLevel,
      servings: parseInt(servings) || 2,
      prepTimeMinutes: parseInt(prepTime) || 15,
      cookTimeMinutes: parseInt(cookTime) || 30,
      dietaryTags,
      allergens,
      ingredients: ingredients.filter((ing) => ing.name.trim()),
      recipeSteps: steps.filter((s) => s.instruction.trim()),
      chefId,
      chefName,
    };

    const isEdit = !!initialRecipe;
    let result;
    if (isEdit) {
      result = await updateChefSubmission(initialRecipe.id, submission, chefId);
    } else {
      result = await createChefSubmission(submission);
    }
    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        isEdit ? 'Recipe Updated' : 'Recipe Submitted',
        isEdit
          ? 'Your recipe changes have been submitted to the admin team for review. The recipe status is now Pending Review until approved.'
          : 'Your recipe has been sent to the admin team for review. You will be notified once it is published.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSubmitted();
              onClose();
              resetForm();
            },
          },
        ],
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to submit recipe. Please try again.');
    }
  };

  const resetForm = () => {
    setName('');
    setTagline('');
    setDescription('');
    setHeroImage('');
    setDiet('veg');
    setCuisine('North Indian');
    setDishCategory('Curries & Gravies');
    setSpiceLevel('Medium');
    setServings('2');
    setPrepTime('15');
    setCookTime('30');
    setDietaryTags([]);
    setAllergens([]);
    setIngredients([{ name: '', quantity: '' }]);
    setSteps([{ stepNumber: 1, title: '', instruction: '' }]);
    setStep('basic');
  };

  const canProceedToRecipe = name.trim().length > 0 && description.trim().length > 0;
  const canProceedToReview =
    ingredients.filter((i) => i.name.trim()).length > 0 &&
    steps.filter((s) => s.instruction.trim()).length > 0;

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      flex: 1,
      marginTop: 48,
      backgroundColor: colors.bgSurface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    stepIndicator: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    stepDot: {
      flex: 1,
      height: 3,
      borderRadius: 2,
    },
    content: { padding: 20 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.bgSubtle,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 10 },
    flex1: { flex: 1 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    ingredientRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      marginBottom: 10,
    },
    removeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCard: {
      backgroundColor: colors.bgSubtle,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepNum: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    navRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    backBtn: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backBtnText: { color: colors.textSecondary, fontWeight: '600' },
    nextBtn: {
      flex: 2,
      padding: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    reviewSection: {
      backgroundColor: colors.bgSubtle,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    reviewTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    reviewLabel: { fontSize: 13, color: colors.textSecondary },
    reviewValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    reviewNote: {
      backgroundColor: '#FEF3C7',
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    reviewNoteText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  });

  const STEP_COLORS = [colors.primary, '#6366F1', '#16A34A'];
  const stepIdx = step === 'basic' ? 0 : step === 'recipe' ? 1 : 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.overlay}
      >
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{initialRecipe ? 'Edit Recipe' : 'Create Recipe'}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={s.stepIndicator}>
            {['Basic Info', 'Recipe', 'Review'].map((label, idx) => (
              <View
                key={label}
                style={[
                  s.stepDot,
                  { backgroundColor: idx <= stepIdx ? colors.primary : colors.border },
                ]}
              />
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.content}>
              {/* ── STEP 1: Basic Info ── */}
              {step === 'basic' && (
                <>
                  <Text style={s.label}>Recipe Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Grandma's Butter Chicken"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={s.label}>Tagline</Text>
                  <TextInput
                    style={s.input}
                    placeholder="One-line description for the card"
                    placeholderTextColor={colors.textMuted}
                    value={tagline}
                    onChangeText={setTagline}
                  />

                  <Text style={s.label}>Description *</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    placeholder="Tell customers what makes this recipe special..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />

                  <Text style={s.label}>Hero Image URL</Text>
                  <TextInput
                    style={s.input}
                    placeholder="https://... (paste an image link)"
                    placeholderTextColor={colors.textMuted}
                    value={heroImage}
                    onChangeText={setHeroImage}
                    autoCapitalize="none"
                    keyboardType="url"
                  />

                  <Text style={s.label}>Diet Type *</Text>
                  <View style={s.pillRow}>
                    {DIET_OPTIONS.map((d) => (
                      <OptionPill
                        key={d}
                        label={d.toUpperCase()}
                        selected={diet === d}
                        onPress={() => setDiet(d)}
                        color={d === 'veg' || d === 'vegan' || d === 'jain' ? '#15803D' : '#B91C1C'}
                      />
                    ))}
                  </View>

                  <Text style={s.label}>Cuisine *</Text>
                  <View style={s.pillRow}>
                    {CUISINE_OPTIONS.map((c) => (
                      <OptionPill
                        key={c}
                        label={c}
                        selected={cuisine === c}
                        onPress={() => setCuisine(c)}
                      />
                    ))}
                  </View>

                  <Text style={s.label}>Dish Category</Text>
                  <View style={s.pillRow}>
                    {DISH_CATEGORIES.map((dc) => (
                      <OptionPill
                        key={dc}
                        label={dc}
                        selected={dishCategory === dc}
                        onPress={() => setDishCategory(dc)}
                      />
                    ))}
                  </View>

                  <Text style={s.label}>Spice Level</Text>
                  <View style={s.pillRow}>
                    {SPICE_LEVELS.map((sl) => (
                      <OptionPill
                        key={sl}
                        label={sl}
                        selected={spiceLevel === sl}
                        onPress={() => setSpiceLevel(sl)}
                      />
                    ))}
                  </View>

                  <Text style={s.label}>Servings / Prep / Cook Time</Text>
                  <View style={s.row}>
                    {[
                      { label: 'Servings', value: servings, set: setServings },
                      { label: 'Prep (min)', value: prepTime, set: setPrepTime },
                      { label: 'Cook (min)', value: cookTime, set: setCookTime },
                    ].map(({ label, value, set }) => (
                      <View key={label} style={s.flex1}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                          {label}
                        </Text>
                        <TextInput
                          style={s.input}
                          value={value}
                          onChangeText={set}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    ))}
                  </View>

                  <Text style={s.label}>Additional Dietary Tags</Text>
                  <View style={s.pillRow}>
                    {DIET_OPTIONS.filter((d) => d !== diet).map((d) => (
                      <OptionPill
                        key={d}
                        label={d.toUpperCase()}
                        selected={dietaryTags.includes(d)}
                        onPress={() => toggleTag(d)}
                      />
                    ))}
                  </View>

                  <Text style={s.label}>Allergens</Text>
                  <View style={s.pillRow}>
                    {allergenOptions.map((a) => (
                      <OptionPill
                        key={a}
                        label={a}
                        selected={allergens.includes(a)}
                        onPress={() => toggleAllergen(a)}
                        color="#D97706"
                      />
                    ))}
                  </View>
                </>
              )}

              {/* ── STEP 2: Recipe (ingredients + steps) ── */}
              {step === 'recipe' && (
                <>
                  <SectionHeader title="INGREDIENTS" />
                  {ingredients.map((ing, i) => (
                    <View key={i} style={s.ingredientRow}>
                      <TextInput
                        style={[s.input, s.flex1]}
                        placeholder="Ingredient name"
                        placeholderTextColor={colors.textMuted}
                        value={ing.name}
                        onChangeText={(v) => updateIngredient(i, 'name', v)}
                      />
                      <TextInput
                        style={[s.input, { width: 90 }]}
                        placeholder="Qty"
                        placeholderTextColor={colors.textMuted}
                        value={ing.quantity}
                        onChangeText={(v) => updateIngredient(i, 'quantity', v)}
                      />
                      {ingredients.length > 1 && (
                        <TouchableOpacity style={s.removeBtn} onPress={() => removeIngredient(i)}>
                          <Icon name="close" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={s.addBtn} onPress={addIngredient}>
                    <Icon name="add" size={18} color={colors.primary} />
                    <Text style={s.addBtnText}>Add Ingredient</Text>
                  </TouchableOpacity>

                  <SectionHeader title="COOKING STEPS" />
                  {steps.map((stp, i) => (
                    <View key={i} style={s.stepCard}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={s.stepNum}>Step {stp.stepNumber}</Text>
                        {steps.length > 1 && (
                          <TouchableOpacity onPress={() => removeStep(i)}>
                            <Icon name="trash" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput
                        style={[s.input, { marginBottom: 8 }]}
                        placeholder="Step title (e.g. Marinate the paneer)"
                        placeholderTextColor={colors.textMuted}
                        value={stp.title}
                        onChangeText={(v) => updateStep(i, 'title', v)}
                      />
                      <TextInput
                        style={[s.input, s.textArea]}
                        placeholder="Write the instruction for this step..."
                        placeholderTextColor={colors.textMuted}
                        value={stp.instruction}
                        onChangeText={(v) => updateStep(i, 'instruction', v)}
                        multiline
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={s.addBtn} onPress={addStep}>
                    <Icon name="add" size={18} color={colors.primary} />
                    <Text style={s.addBtnText}>Add Step</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── STEP 3: Review & Submit ── */}
              {step === 'review' && (
                <>
                  <View style={s.reviewSection}>
                    <Text style={s.reviewTitle}>{name}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      {tagline}
                    </Text>
                  </View>

                  <View style={s.reviewSection}>
                    {[
                      { label: 'Diet', value: diet.toUpperCase() },
                      { label: 'Cuisine', value: cuisine },
                      { label: 'Category', value: dishCategory },
                      { label: 'Spice', value: spiceLevel },
                      { label: 'Servings', value: servings },
                      { label: 'Prep time', value: `${prepTime} min` },
                      { label: 'Cook time', value: `${cookTime} min` },
                      {
                        label: 'Ingredients',
                        value: `${ingredients.filter((i) => i.name.trim()).length} items`,
                      },
                      {
                        label: 'Recipe steps',
                        value: `${steps.filter((s) => s.instruction.trim()).length} steps`,
                      },
                      {
                        label: 'Allergens',
                        value: allergens.length > 0 ? allergens.join(', ') : 'None',
                      },
                    ].map(({ label, value }) => (
                      <View key={label} style={s.reviewRow}>
                        <Text style={s.reviewLabel}>{label}</Text>
                        <Text style={s.reviewValue}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.reviewNote}>
                    <Text style={s.reviewNoteText}>
                      {initialRecipe
                        ? 'After you submit your updates, the recipe status will revert to Pending Review. The admin team will review and approve your changes before the updated recipe goes live.'
                        : 'After you submit, the admin team will review your recipe and set the price and delivery regions before publishing it as a live meal kit.'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Nav buttons */}
          <View style={s.navRow}>
            {step !== 'basic' && (
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => setStep(step === 'review' ? 'recipe' : 'basic')}
              >
                <Text style={s.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            {step === 'basic' && (
              <TouchableOpacity
                style={[s.nextBtn, { opacity: canProceedToRecipe ? 1 : 0.4 }]}
                onPress={() => {
                  if (canProceedToRecipe) setStep('recipe');
                }}
                disabled={!canProceedToRecipe}
              >
                <Text style={s.nextBtnText}>Next: Ingredients & Steps</Text>
              </TouchableOpacity>
            )}

            {step === 'recipe' && (
              <TouchableOpacity
                style={[s.nextBtn, { opacity: canProceedToReview ? 1 : 0.4 }]}
                onPress={() => {
                  if (canProceedToReview) setStep('review');
                }}
                disabled={!canProceedToReview}
              >
                <Text style={s.nextBtnText}>Review Recipe</Text>
              </TouchableOpacity>
            )}

            {step === 'review' && (
              <TouchableOpacity
                style={[s.nextBtn, { opacity: submitting ? 0.6 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.nextBtnText}>
                    {initialRecipe ? 'Update & Submit for Review' : 'Submit for Review'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export function ChefStudioView() {
  const { colors } = useTheme();
  const { user, isAdmin } = useAuth();

  const [submissions, setSubmissions] = useState<ChefSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<ChefSubmissionRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [approvedChefs, setApprovedChefs] = useState<ChefProfile[]>([]);
  const [activeChefUid, setActiveChefUid] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const chefs = await fetchAllChefProfiles();
        if (mounted && chefs.length > 0) {
          setApprovedChefs(chefs);
          if (!activeChefUid) {
            const currentIsChef = chefs.find((c) => c.uid === user?.uid);
            setActiveChefUid(currentIsChef ? currentIsChef.uid : chefs[0]!.uid);
          }
        } else if (mounted && user?.uid) {
          setActiveChefUid(user.uid);
        }
      } catch {
        if (mounted && user?.uid) setActiveChefUid(user.uid);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const loadSubmissions = useCallback(async () => {
    const targetUid = activeChefUid || user?.uid;
    if (!targetUid) return;
    setLoading(true);
    const result = await fetchChefSubmissions(targetUid);
    setSubmissions(result);
    setLoading(false);
  }, [activeChefUid, user?.uid]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            setDeleting(id);
            await deleteChefSubmission(id, user.uid, false);
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
            setDeleting(null);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ChefSubmissionRecord }) => (
    <View style={[st.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={st.cardHeader}>
        <View style={st.cardTitleRow}>
          <Text style={[st.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <StatusBadge status={item.submissionStatus} />
        </View>
        <Text style={[st.cardTagline, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.cuisine} • {item.diet.toUpperCase()} • {item.spiceLevel}
        </Text>
        <Text style={[st.cardDate, { color: colors.textMuted }]}>
          Submitted{' '}
          {new Date(item.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Stats row */}
      <View style={st.statsRow}>
        {[
          { icon: 'people', value: `${item.servings} servings` },
          { icon: 'timer', value: `${item.prepTimeMinutes + item.cookTimeMinutes} min` },
          { icon: 'leaf', value: `${item.ingredients.length} ingredients` },
        ].map(({ icon, value }) => (
          <View key={value} style={st.statItem}>
            <Icon name={icon as any} size={13} color={colors.textMuted} />
            <Text style={[st.statText, { color: colors.textMuted }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Rejection feedback */}
      {item.submissionStatus === 'rejected' && item.reviewNotes && (
        <View style={[st.feedbackBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Icon name="alert" size={14} color="#DC2626" />
          <Text style={[st.feedbackText, { color: '#DC2626' }]}>{item.reviewNotes}</Text>
        </View>
      )}

      {/* Published info */}
      {item.submissionStatus === 'published' && (
        <View style={[st.feedbackBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Icon name="check-circle" size={14} color="#15803D" />
          <Text style={[st.feedbackText, { color: '#15803D' }]}>
            Your recipe is live! Price set by admin: {item.price ? `Rs. ${item.price}` : 'TBD'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={st.actions}>
        <TouchableOpacity
          style={[st.editBtn, { borderColor: colors.primary, marginRight: 8 }]}
          onPress={() => {
            setEditingRecipe(item);
            setShowCreate(true);
          }}
        >
          <Icon name="create" size={14} color={colors.primary} />
          <Text style={[st.editBtnText, { color: colors.primary }]}>Edit Recipe</Text>
        </TouchableOpacity>

        {(item.submissionStatus === 'draft' || item.submissionStatus === 'rejected') && (
          <TouchableOpacity
            style={[st.deleteBtn, { borderColor: colors.danger }]}
            onPress={() => handleDelete(item.id, item.name)}
            disabled={deleting === item.id}
          >
            {deleting === item.id ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Icon name="trash" size={14} color={colors.danger} />
                <Text style={[st.deleteBtnText, { color: colors.danger }]}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          st.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={st.headerContent}>
          <View style={[st.chefBadge, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chef" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[st.headerTitle, { color: colors.textPrimary }]}>Chef Studio</Text>
            <Text style={[st.headerSubtitle, { color: colors.textMuted }]}>
              {approvedChefs.find((c) => c.uid === activeChefUid)?.displayName ??
                user?.displayName ??
                'Chef'}{' '}
              • Recipe Submissions
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[st.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditingRecipe(null);
            setShowCreate(true);
          }}
          id="chef-create-recipe-btn"
        >
          <Icon name="add" size={18} color="#FFFFFF" />
          <Text style={st.createBtnText}>New Recipe</Text>
        </TouchableOpacity>
      </View>



      {/* Stats strip */}
      {submissions.length > 0 && (
        <View
          style={[
            st.statsStrip,
            { backgroundColor: colors.bgSubtle, borderBottomColor: colors.borderLight },
          ]}
        >
          {[
            { label: 'Total', value: submissions.length, color: colors.textPrimary },
            {
              label: 'Pending',
              value: submissions.filter((s) => s.submissionStatus === 'pending_review').length,
              color: '#D97706',
            },
            {
              label: 'Published',
              value: submissions.filter((s) => s.submissionStatus === 'published').length,
              color: '#15803D',
            },
            {
              label: 'Rejected',
              value: submissions.filter((s) => s.submissionStatus === 'rejected').length,
              color: colors.danger,
            },
          ].map(({ label, value, color }) => (
            <View key={label} style={st.stripItem}>
              <Text style={[st.stripValue, { color }]}>{value}</Text>
              <Text style={[st.stripLabel, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[st.emptyText, { color: colors.textMuted, marginTop: 12 }]}>
            Loading your recipes...
          </Text>
        </View>
      ) : submissions.length === 0 ? (
        <View style={st.center}>
          <View style={[st.emptyIcon, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chef" size={40} color={colors.primary} />
          </View>
          <Text style={[st.emptyTitle, { color: colors.textPrimary }]}>No recipes yet</Text>
          <Text style={[st.emptyText, { color: colors.textMuted }]}>
            Create your first recipe and submit it for admin review. Once approved it will be
            published as a live meal kit on RasoiGenie.
          </Text>
          <TouchableOpacity
            style={[st.createBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={() => setShowCreate(true)}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={st.createBtnText}>Create My First Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create / Edit Recipe Modal */}
      {user && (
        <CreateRecipeModal
          visible={showCreate}
          onClose={() => {
            setShowCreate(false);
            setEditingRecipe(null);
          }}
          onSubmitted={() => {
            loadSubmissions();
            setEditingRecipe(null);
          }}
          chefId={activeChefUid || user.uid}
          chefName={
            approvedChefs.find((c) => c.uid === (activeChefUid || user.uid))?.displayName ||
            user.displayName ||
            'Chef'
          }
          initialRecipe={editingRecipe}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chefBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  stripItem: { flex: 1, alignItems: 'center' },
  stripValue: { fontSize: 20, fontWeight: '800' },
  stripLabel: { fontSize: 11, marginTop: 2 },
  list: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  cardTagline: { fontSize: 13, marginBottom: 4 },
  cardDate: { fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    marginBottom: 12,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12 },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  feedbackText: { fontSize: 12, flex: 1, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600' },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
