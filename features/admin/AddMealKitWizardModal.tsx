import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import {
  MealKit,
  CuisineType,
  DietTag,
  SpiceLevel,
  NutritionFacts,
} from '../../framework/services/mealKitsService';
import { Button } from '../../framework/ui/Button';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { estimateNutritionWithAI, NutritionEstimationResult } from './nutritionEstimatorService';
import { generateDishPhotoWithAI } from './aiPhotoGeneratorService';

export interface AddMealKitWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveKit: (kit: MealKit) => void;
  initialKit?: MealKit | null;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const PRESET_DISH_IMAGES = [
  {
    name: 'Paneer Butter Masala',
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dal Makhani',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Chicken Biryani',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Chole Bhature',
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Veg Pulao',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
  },
];

const COMMON_CHEF_STAPLES = [
  { name: 'Fresh Malai Paneer', quantity: '250g', isSachet: false },
  { name: 'Boneless Tender Chicken', quantity: '300g', isSachet: false },
  { name: 'Aged Basmati Rice', quantity: '200g', isSachet: false },
  { name: 'Sachet 1: Whole Khada Spices', quantity: '15g', isSachet: true },
  { name: 'Sachet 2: Chef Gravy Base', quantity: '80g', isSachet: true },
  { name: 'Ginger Garlic Aromatics Paste', quantity: '2 tbsp', isSachet: false },
  { name: 'Diced Onions & Tomatoes', quantity: '200g', isSachet: false },
  { name: 'Fresh Dairy Cream', quantity: '50ml', isSachet: false },
  { name: 'Pure Cow Desi Ghee', quantity: '2 tbsp', isSachet: false },
  { name: 'Kasuri Methi Herb Sachet', quantity: '5g', isSachet: true },
];

export const AddMealKitWizardModal: React.FC<AddMealKitWizardModalProps> = ({
  visible,
  onClose,
  onSaveKit,
  initialKit,
}) => {
  const { colors, radii, shadows } = useTheme();

  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Dish Basics
  const [name, setName] = useState(initialKit?.name || '');
  const [hindiName, setHindiName] = useState(initialKit?.hindiName || '');
  const [tagline, setTagline] = useState(
    initialKit?.tagline || 'Chef handcrafted gourmet meal kit with exact portioned masalas',
  );
  const [cuisine, setCuisine] = useState<CuisineType>(initialKit?.cuisine || 'North Indian');
  const [diet, setDiet] = useState<DietTag>(initialKit?.diet || 'veg');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>(initialKit?.spiceLevel || 'Medium');
  const [servings, setServings] = useState(String(initialKit?.servings || '2'));
  const [prepTime, setPrepTime] = useState(String(initialKit?.prepTimeMinutes || '10'));
  const [cookTime, setCookTime] = useState(String(initialKit?.cookTimeMinutes || '20'));
  const [price, setPrice] = useState(String(initialKit?.price || '299'));
  const [heroImage, setHeroImage] = useState(
    initialKit?.heroImage ||
      PRESET_DISH_IMAGES[0]?.url ||
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
  );

  // Dish Photo Customization (Upload & AI)
  type PhotoMode = 'ai' | 'upload' | 'presets';
  const [photoMode, setPhotoMode] = useState<PhotoMode>('ai');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [photoStyle, setPhotoStyle] = useState<'handi' | 'finedining' | 'flatlay'>('handi');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [photoBadge, setPhotoBadge] = useState(initialKit ? 'Existing Photo' : 'Preset Showcase');

  const handleUploadFromDevice = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) {
              setHeroImage(evt.target.result as string);
              setPhotoBadge('Uploaded Photo');
              Alert.alert('Photo Uploaded! 📸', 'Your custom dish presentation photo is ready.');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Upload Photo',
        'Please enter the photo URL below or select AI Generation on this device.',
      );
    }
  };

  const handleGenerateAiPhoto = async () => {
    setIsGeneratingPhoto(true);
    try {
      const result = await generateDishPhotoWithAI({
        dishName: name || 'Artisanal Indian Dish',
        cuisine,
        diet,
        presentationStyle: photoStyle,
      });
      setHeroImage(result.imageUrl);
      setPhotoBadge(`AI Generated (${result.presentationStyle})`);
      Alert.alert(
        'AI Photo Generated! ✨',
        `Gourmet presentation photo generated for "${name || 'your recipe'}".`,
      );
    } catch {
      Alert.alert('Notice', 'Using chef presentation library.');
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customPhotoUrl.trim()) return;
    setHeroImage(customPhotoUrl.trim());
    setPhotoBadge('Custom Web URL');
    setCustomPhotoUrl('');
    Alert.alert('Photo Updated', 'Custom dish image URL applied.');
  };

  // Step 2: Ingredients & Sachets
  const [ingredients, setIngredients] = useState<
    { name: string; quantity: string; isMasalaSachet: boolean }[]
  >(
    initialKit?.ingredients?.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      isMasalaSachet: !!i.isMasalaSachet,
    })) || [
      { name: 'Fresh Malai Paneer', quantity: '250g', isMasalaSachet: false },
      { name: 'Sachet 1: Whole Khada Spices', quantity: '15g', isMasalaSachet: true },
      { name: 'Sachet 2: Chef Gravy Base', quantity: '80g', isMasalaSachet: true },
    ],
  );
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngIsSachet, setNewIngIsSachet] = useState(false);

  // Step 3: Step-by-Step Recipe Guide
  const [recipeSteps, setRecipeSteps] = useState<
    {
      stepNumber: number;
      title: string;
      instruction: string;
      timerSeconds?: number;
      tip?: string;
    }[]
  >(
    initialKit?.recipeSteps || [
      {
        stepNumber: 1,
        title: 'Temper Whole Spices',
        instruction:
          'Heat 2 tbsp ghee or oil in a pan. Empty Sachet 1 (Khada Spices) and sizzle for 45 seconds until fragrant.',
        timerSeconds: 45,
        tip: 'Keep flame low so whole spices release aromatics without browning.',
      },
      {
        stepNumber: 2,
        title: 'Simmer Base Gravy',
        instruction:
          'Pour in Sachet 2 (Chef Gravy Base) with 100ml warm water. Bring to a gentle boil for 4-5 minutes.',
        timerSeconds: 300,
        tip: 'Stir occasionally to create a silky, velvety restaurant texture.',
      },
      {
        stepNumber: 3,
        title: 'Add Fresh Produce & Finish',
        instruction:
          'Fold in the diced paneer cubes or vegetables. Simmer gently for 3 minutes. Garnish with fresh cream.',
        timerSeconds: 180,
        tip: 'Do not overcook paneer so it remains melt-in-the-mouth tender.',
      },
    ],
  );
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepInstruction, setNewStepInstruction] = useState('');
  const [newStepMinutes, setNewStepMinutes] = useState('3');
  const [newStepTip, setNewStepTip] = useState('');

  // Step 4: AI Nutrition Estimator
  const [nutrition, setNutrition] = useState<NutritionFacts>(
    initialKit?.nutrition || { calories: 380, protein: 16, carbs: 28, fat: 18, fiber: 5 },
  );
  const [isEstimatingAI, setIsEstimatingAI] = useState(false);
  const [aiBreakdown, setAiBreakdown] = useState<NutritionEstimationResult | null>(null);

  // Quick add an ingredient from pantry staples
  const handleAddStaple = (staple: { name: string; quantity: string; isSachet: boolean }) => {
    setIngredients((prev) => [
      ...prev,
      { name: staple.name, quantity: staple.quantity, isMasalaSachet: staple.isSachet },
    ]);
  };

  // Add custom ingredient
  const handleAddCustomIngredient = () => {
    if (!newIngName.trim()) {
      Alert.alert('Missing Ingredient', 'Please type the ingredient name.');
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        name: newIngName.trim(),
        quantity: newIngQty.trim() || '1 portion',
        isMasalaSachet: newIngIsSachet,
      },
    ]);
    setNewIngName('');
    setNewIngQty('');
    setNewIngIsSachet(false);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Add recipe step
  const handleAddStep = () => {
    if (!newStepTitle.trim() || !newStepInstruction.trim()) {
      Alert.alert('Incomplete Step', 'Please enter a step title and cooking instruction.');
      return;
    }
    const mins = parseFloat(newStepMinutes) || 0;
    const nextStep = {
      stepNumber: recipeSteps.length + 1,
      title: newStepTitle.trim(),
      instruction: newStepInstruction.trim(),
      timerSeconds: mins > 0 ? Math.round(mins * 60) : undefined,
      tip: newStepTip.trim() || undefined,
    };
    setRecipeSteps((prev) => [...prev, nextStep]);
    setNewStepTitle('');
    setNewStepInstruction('');
    setNewStepMinutes('3');
    setNewStepTip('');
  };

  const handleRemoveStep = (stepNumber: number) => {
    setRecipeSteps((prev) =>
      prev
        .filter((s) => s.stepNumber !== stepNumber)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    );
  };

  // AI Nutrition Calculation
  const handleRunAiNutrition = () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients Found', 'Please add ingredients in Step 2 first.');
      return;
    }

    setIsEstimatingAI(true);
    setTimeout(() => {
      const s = parseInt(servings) || 2;
      const result = estimateNutritionWithAI(ingredients, s);
      setAiBreakdown(result);
      setNutrition(result.perServing);
      setIsEstimatingAI(false);
    }, 600);
  };

  // Publish / Save Kit
  const handleFinalPublish = () => {
    if (!name.trim()) {
      Alert.alert('Dish Name Required', 'Please enter the dish name.');
      setCurrentStep(1);
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Price Required', 'Please enter a valid price.');
      setCurrentStep(1);
      return;
    }

    const kitId = initialKit?.id || 'kit-' + Math.floor(100 + Math.random() * 900);
    const masalaSachets = ingredients.filter((i) => i.isMasalaSachet).map((i) => i.name);

    const savedKit: MealKit = {
      id: kitId,
      name: name.trim(),
      hindiName: hindiName.trim() || undefined,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: tagline.trim(),
      description: `${name} kit carefully prepared by master chefs with fresh ingredients and authentic masala sachets for restaurant taste at home.`,
      heroImage,
      galleryImages: [heroImage],
      price: parseInt(price) || 299,
      servings: parseInt(servings) || 2,
      prepTimeMinutes: parseInt(prepTime) || 10,
      cookTimeMinutes: parseInt(cookTime) || 20,
      diet,
      cuisine,
      spiceLevel,
      difficulty: 'Easy',
      dietaryTags: [diet],
      availableRegions: ['North', 'South', 'West', 'East'],
      stockByRegion: { North: 50, South: 50, West: 50, East: 50 },
      rating: initialKit?.rating || 5.0,
      reviewCount: initialKit?.reviewCount || 1,
      nutrition,
      allergens: diet === 'nonveg' ? [] : ['Dairy'],
      ingredients: ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        isMasalaSachet: i.isMasalaSachet,
      })),
      masalaSachets:
        masalaSachets.length > 0
          ? masalaSachets
          : ['Whole Khada Spices Sachet', 'Signature Gravy Base'],
      recipeSteps,
      reviews: initialKit?.reviews || [],
      salesByRegion: initialKit?.salesByRegion || { Maharashtra: 120, Karnataka: 80 },
    };

    onSaveKit(savedKit);
    Alert.alert(
      'Meal Kit Published! 🎉',
      `"${savedKit.name}" is now live in your RasoiGenie catalog with AI-calculated nutrition facts.`,
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Top Chef Header */}
        <View
          style={[
            styles.headerBar,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>✕ Cancel</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              👨‍🍳 Chef Recipe Builder
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
              {initialKit ? 'Edit Meal Kit' : 'Create Custom Meal Kit'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleFinalPublish}
            style={[styles.publishHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.publishHeaderBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Wizard Step Progress Bar */}
        <View style={[styles.stepNavBar, { backgroundColor: colors.bgSurface }]}>
          {[
            { step: 1, label: '1. Dish Info', icon: '🍲' },
            { step: 2, label: '2. Ingredients', icon: '🧂' },
            { step: 3, label: '3. Recipe Steps', icon: '📋' },
            { step: 4, label: '4. AI Nutrition', icon: '🤖' },
            { step: 5, label: '5. Preview', icon: '✨' },
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <TouchableOpacity
                key={s.step}
                onPress={() => setCurrentStep(s.step as WizardStep)}
                style={[
                  styles.stepTab,
                  isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                ]}
              >
                <Text style={styles.stepTabIcon}>{s.icon}</Text>
                <Text
                  style={[
                    styles.stepTabLabel,
                    {
                      color: isActive
                        ? colors.primary
                        : isCompleted
                          ? colors.textPrimary
                          : colors.textMuted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Main Content Area */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* STEP 1: DISH BASICS */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  🍲 What dish are you crafting?
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Give your meal kit a mouth-watering title and culinary details.
                </Text>

                {/* Dish Name */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Dish Name <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                  ]}
                  placeholder="e.g. Royal Shahi Paneer"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                {/* Hindi Name */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Hindi / Regional Name (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                  ]}
                  placeholder="e.g. शाही पनीर"
                  placeholderTextColor={colors.textMuted}
                  value={hindiName}
                  onChangeText={setHindiName}
                />

                {/* Tagline */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Short Chef Tagline
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                  ]}
                  placeholder="e.g. Velvety tomato cashew gravy with hand-ground cardamom"
                  placeholderTextColor={colors.textMuted}
                  value={tagline}
                  onChangeText={setTagline}
                />

                {/* Cuisine & Diet Row */}
                <View style={styles.rowTwoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Cuisine</Text>
                    <View style={styles.chipsWrap}>
                      {(
                        [
                          'North Indian',
                          'South Indian',
                          'Mughlai',
                          'Punjabi',
                          'Continental',
                        ] as CuisineType[]
                      ).map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setCuisine(c)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: cuisine === c ? colors.primary : colors.bgSubtle,
                              borderColor: cuisine === c ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: cuisine === c ? '#fff' : colors.textPrimary,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Diet Type
                    </Text>
                    <View style={styles.chipsWrap}>
                      {[
                        { key: 'veg', label: 'Pure Veg' },
                        { key: 'nonveg', label: 'Non-Veg' },
                        { key: 'vegan', label: 'Vegan' },
                        { key: 'keto', label: 'Keto' },
                        { key: 'jain', label: 'Jain' },
                        { key: 'gluten-free', label: 'Gluten-Free' },
                      ].map((d) => (
                        <TouchableOpacity
                          key={d.key}
                          onPress={() => setDiet(d.key as DietTag)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: diet === d.key ? colors.primary : colors.bgSubtle,
                              borderColor: diet === d.key ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: diet === d.key ? '#fff' : colors.textPrimary,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Price, Servings, Cook Time */}
                <View style={[styles.rowTwoCol, { marginTop: 14 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Kit Price (₹)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="299"
                      placeholderTextColor={colors.textMuted}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Base Servings
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="2"
                      placeholderTextColor={colors.textMuted}
                      value={servings}
                      onChangeText={setServings}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Cook Time (Mins)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="20"
                      placeholderTextColor={colors.textMuted}
                      value={cookTime}
                      onChangeText={setCookTime}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Dish Presentation Photo Section: AI, Upload & Presets */}
                <View
                  style={[
                    styles.photoSectionWrapper,
                    {
                      borderColor: colors.borderLight,
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <View style={styles.photoHeaderRow}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: colors.textPrimary, marginTop: 0, marginBottom: 0 },
                      ]}
                    >
                      📸 Dish Presentation Photo
                    </Text>
                    <Badge label={photoBadge} variant="accent" />
                  </View>

                  {/* Mode Selector Tabs */}
                  <View style={styles.photoModeTabs}>
                    <TouchableOpacity
                      onPress={() => setPhotoMode('ai')}
                      style={[
                        styles.photoModeTab,
                        photoMode === 'ai' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.photoModeTabText,
                          { color: photoMode === 'ai' ? '#fff' : colors.textPrimary },
                        ]}
                      >
                        ✨ Generate with AI
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPhotoMode('upload')}
                      style={[
                        styles.photoModeTab,
                        photoMode === 'upload' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.photoModeTabText,
                          { color: photoMode === 'upload' ? '#fff' : colors.textPrimary },
                        ]}
                      >
                        📤 Upload / URL
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPhotoMode('presets')}
                      style={[
                        styles.photoModeTab,
                        photoMode === 'presets' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.photoModeTabText,
                          { color: photoMode === 'presets' ? '#fff' : colors.textPrimary },
                        ]}
                      >
                        🖼️ Presets
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* TAB 1: AI PHOTO GENERATION */}
                  {photoMode === 'ai' && (
                    <View style={styles.aiPhotoPanel}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                        AI generates authentic culinary photography based on recipe name "
                        {name || 'your dish'}" and cuisine style.
                      </Text>

                      <Text
                        style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 0 }]}
                      >
                        Presentation Style:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                        {[
                          { key: 'handi', label: '🍲 Brass Handi' },
                          { key: 'finedining', label: '🍽️ Fine Dining' },
                          { key: 'flatlay', label: '🍱 Kit Box Flatlay' },
                        ].map((s) => (
                          <TouchableOpacity
                            key={s.key}
                            onPress={() => setPhotoStyle(s.key as any)}
                            style={[
                              styles.aiStyleChip,
                              {
                                backgroundColor:
                                  photoStyle === s.key ? colors.primary : colors.bgSurface,
                                borderColor:
                                  photoStyle === s.key ? colors.primary : colors.borderLight,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: photoStyle === s.key ? '#fff' : colors.textPrimary,
                              }}
                            >
                              {s.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleGenerateAiPhoto}
                        style={[styles.aiGenerateBtn, { backgroundColor: colors.primary }]}
                      >
                        {isGeneratingPhoto ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.aiGenerateBtnText}>
                            ✨ Generate Dish Photo with AI
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* TAB 2: UPLOAD FROM DEVICE OR PASTE URL */}
                  {photoMode === 'upload' && (
                    <View style={styles.uploadPhotoPanel}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleUploadFromDevice}
                        style={[
                          styles.deviceUploadButton,
                          { borderColor: colors.primary, backgroundColor: colors.bgSurface },
                        ]}
                      >
                        <Text style={{ fontSize: 22, marginBottom: 4 }}>📁</Text>
                        <Text style={[styles.deviceUploadText, { color: colors.primary }]}>
                          Click to Upload from Device / Files
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          Supports JPG, PNG, WEBP high-resolution photos
                        </Text>
                      </TouchableOpacity>

                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}
                      >
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
                        <Text
                          style={{
                            marginHorizontal: 8,
                            fontSize: 11,
                            color: colors.textMuted,
                            fontWeight: '700',
                          }}
                        >
                          OR WEB URL
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.borderLight }} />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              flex: 1,
                              backgroundColor: colors.bgSurface,
                              borderColor: colors.border,
                            },
                          ]}
                          placeholder="Paste image URL (https://...)"
                          placeholderTextColor={colors.textMuted}
                          value={customPhotoUrl}
                          onChangeText={setCustomPhotoUrl}
                        />
                        <Button title="Apply" size="sm" onPress={handleApplyCustomUrl} />
                      </View>
                    </View>
                  )}

                  {/* TAB 3: PRESET GALLERY */}
                  {photoMode === 'presets' && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 8 }}
                    >
                      {PRESET_DISH_IMAGES.map((img, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setHeroImage(img.url);
                            setPhotoBadge(`Preset: ${img.name}`);
                          }}
                          style={[
                            styles.photoPresetCard,
                            {
                              borderColor:
                                heroImage === img.url ? colors.primary : colors.borderLight,
                              borderWidth: heroImage === img.url ? 2.5 : 1,
                            },
                          ]}
                        >
                          <Image source={{ uri: img.url }} style={styles.photoPresetImg} />
                          <Text style={styles.photoPresetText} numberOfLines={1}>
                            {img.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Live Active Preview Card */}
                  <View
                    style={[
                      styles.activePhotoCard,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                    ]}
                  >
                    <Image
                      source={{ uri: heroImage }}
                      style={styles.activePhotoImg}
                      resizeMode="cover"
                    />
                    <View style={styles.activePhotoInfo}>
                      <Text style={[styles.activePhotoTitle, { color: colors.textPrimary }]}>
                        Selected Presentation Cover
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                        {heroImage.startsWith('data:') ? 'Custom Uploaded File' : heroImage}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Button
                title="Next: Add Ingredients 🧂 →"
                size="lg"
                onPress={() => setCurrentStep(2)}
                style={{ marginTop: 16 }}
              />
            </View>
          )}

          {/* STEP 2: INGREDIENTS & MASALA SACHETS */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  🧂 Ingredients & Masala Sachets
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  List all pre-portioned items packed into this meal kit box.
                </Text>

                {/* Quick-Add Staples */}
                <Text style={[styles.inputLabel, { color: colors.primary, marginTop: 4 }]}>
                  ⚡ 1-Tap Quick Add Pantry Staples:
                </Text>
                <View style={styles.staplesRow}>
                  {COMMON_CHEF_STAPLES.map((staple, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAddStaple(staple)}
                      style={[
                        styles.stapleChip,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textPrimary }}>
                        + {staple.name} ({staple.quantity})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Add Custom Ingredient Form */}
                <View
                  style={[
                    styles.customIngBox,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                    Add Custom Item:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 2, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Ingredient Name (e.g. Kasuri Methi)"
                      placeholderTextColor={colors.textMuted}
                      value={newIngName}
                      onChangeText={setNewIngName}
                    />
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 1, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Qty (e.g. 100g)"
                      placeholderTextColor={colors.textMuted}
                      value={newIngQty}
                      onChangeText={setNewIngQty}
                    />
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setNewIngIsSachet(!newIngIsSachet)}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>
                        {newIngIsSachet ? '☑️' : '⬜'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                        Packaged as Masala Sachet
                      </Text>
                    </TouchableOpacity>

                    <Button title="+ Add Item" size="sm" onPress={handleAddCustomIngredient} />
                  </View>
                </View>

                {/* Current Ingredients List */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                  Items in Kit Box ({ingredients.length} total):
                </Text>
                {ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.ingItemRow,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ingItemName, { color: colors.textPrimary }]}>
                        {ing.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: ing.isMasalaSachet ? colors.primary : colors.textMuted,
                          fontWeight: '700',
                        }}
                      >
                        {ing.isMasalaSachet
                          ? '✨ Chef Secret Masala Sachet'
                          : '🥬 Fresh Produce / Base'}
                      </Text>
                    </View>
                    <Badge
                      label={ing.quantity}
                      variant={ing.isMasalaSachet ? 'primary' : 'neutral'}
                    />
                    <TouchableOpacity
                      onPress={() => handleRemoveIngredient(idx)}
                      style={styles.deleteIngBtn}
                    >
                      <Text style={{ color: colors.danger, fontWeight: '900', fontSize: 14 }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.navBtnRow}>
                <Button
                  title="← Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(1)}
                />
                <Button
                  title="Next: Recipe Steps 📋 →"
                  style={{ flex: 2 }}
                  onPress={() => setCurrentStep(3)}
                />
              </View>
            </View>
          )}

          {/* STEP 3: STEP-BY-STEP RECIPE INSTRUCTIONS */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  📋 Recipe Instructions For Home Cooks
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Guide your customers step-by-step to cook like a master chef.
                </Text>

                {/* Existing Steps */}
                {recipeSteps.map((step) => (
                  <View
                    key={step.stepNumber}
                    style={[
                      styles.recipeStepCard,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.recipeStepHeader}>
                      <View style={[styles.stepNumBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.stepNumBadgeText}>{step.stepNumber}</Text>
                      </View>
                      <Text
                        style={[styles.recipeStepTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {step.title}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveStep(step.stepNumber)}>
                        <Text style={{ color: colors.danger, fontWeight: '800' }}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.recipeStepText, { color: colors.textSecondary }]}>
                      {step.instruction}
                    </Text>

                    {step.tip && (
                      <View style={styles.tipBox}>
                        <Text
                          style={{ fontSize: 11, color: colors.primaryDark, fontWeight: '600' }}
                        >
                          💡 Chef Tip: {step.tip}
                        </Text>
                      </View>
                    )}

                    {step.timerSeconds && (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: colors.primary,
                          marginTop: 4,
                        }}
                      >
                        ⏱️ Timer: {Math.round(step.timerSeconds / 60)} minutes
                      </Text>
                    )}
                  </View>
                ))}

                {/* Add Step Card */}
                <View
                  style={[
                    styles.addStepBox,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                    + Add New Step {recipeSteps.length + 1}:
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: colors.bgSurface, borderColor: colors.border },
                    ]}
                    placeholder="Step Title (e.g. Sauté Onion Base)"
                    placeholderTextColor={colors.textMuted}
                    value={newStepTitle}
                    onChangeText={setNewStepTitle}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                        height: 70,
                        textAlignVertical: 'top',
                        marginTop: 8,
                      },
                    ]}
                    multiline
                    placeholder="What should the home cook do? (e.g. Heat oil, add aromatics, stir continuously for 3 mins)"
                    placeholderTextColor={colors.textMuted}
                    value={newStepInstruction}
                    onChangeText={setNewStepInstruction}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 1, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Timer (mins)"
                      placeholderTextColor={colors.textMuted}
                      value={newStepMinutes}
                      onChangeText={setNewStepMinutes}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 2, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Chef Pro-Tip (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={newStepTip}
                      onChangeText={setNewStepTip}
                    />
                  </View>

                  <Button
                    title="+ Append Cooking Step"
                    variant="outline"
                    size="sm"
                    onPress={handleAddStep}
                    style={{ marginTop: 10 }}
                  />
                </View>
              </View>

              <View style={styles.navBtnRow}>
                <Button
                  title="← Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(2)}
                />
                <Button
                  title="Next: AI Nutrition 🤖 →"
                  style={{ flex: 2 }}
                  onPress={() => setCurrentStep(4)}
                />
              </View>
            </View>
          )}

          {/* STEP 4: AI NUTRITIONAL ESTIMATION */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  🤖 AI Nutrition Value Estimator
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Our AI evaluates your listed ingredients and portions to calculate approximate
                  calories and macronutrients automatically.
                </Text>

                {/* AI Calculation Trigger Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRunAiNutrition}
                  style={[styles.aiActionButton, { backgroundColor: colors.primary }]}
                >
                  {isEstimatingAI ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.aiActionIcon}>✨</Text>
                      <Text style={styles.aiActionText}>
                        Calculate Approximate Nutrition with AI
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Macro Results Display */}
                <View style={styles.macroCardsGrid}>
                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.primary }]}>
                      {nutrition.calories}
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Calories</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      kcal/serving
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {nutrition.protein}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Protein</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      muscle health
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {nutrition.carbs}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Carbs</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      energy supply
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {nutrition.fat}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Fats</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      essential lipids
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {nutrition.fiber}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Fiber</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      gut health
                    </Text>
                  </View>
                </View>

                {/* AI Explanation Breakdown */}
                {aiBreakdown && (
                  <View
                    style={[
                      styles.aiBreakdownBox,
                      { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '800', color: '#166534', marginBottom: 6 }}
                    >
                      🧠 AI Culinary Nutritional Analysis:
                    </Text>
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: '#15803D', marginBottom: 6 }}
                    >
                      {aiBreakdown.keyHighlights}
                    </Text>
                    {aiBreakdown.breakdownSummary.map((item, idx) => (
                      <Text key={idx} style={{ fontSize: 12, color: '#166534', lineHeight: 18 }}>
                        {item}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Manual Fine Tuning Accordion */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  Chef Manual Adjustments (Optional):
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[
                      styles.textInput,
                      { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    placeholder="Cal"
                    value={String(nutrition.calories)}
                    onChangeText={(t) =>
                      setNutrition((prev) => ({ ...prev, calories: parseInt(t) || 0 }))
                    }
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    placeholder="Pro(g)"
                    value={String(nutrition.protein)}
                    onChangeText={(t) =>
                      setNutrition((prev) => ({ ...prev, protein: parseFloat(t) || 0 }))
                    }
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    placeholder="Carb(g)"
                    value={String(nutrition.carbs)}
                    onChangeText={(t) =>
                      setNutrition((prev) => ({ ...prev, carbs: parseFloat(t) || 0 }))
                    }
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    placeholder="Fat(g)"
                    value={String(nutrition.fat)}
                    onChangeText={(t) =>
                      setNutrition((prev) => ({ ...prev, fat: parseFloat(t) || 0 }))
                    }
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    placeholder="Fib(g)"
                    value={String(nutrition.fiber)}
                    onChangeText={(t) =>
                      setNutrition((prev) => ({ ...prev, fiber: parseFloat(t) || 0 }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.navBtnRow}>
                <Button
                  title="← Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(3)}
                />
                <Button
                  title="Next: Preview & Save ✨ →"
                  style={{ flex: 2 }}
                  onPress={() => setCurrentStep(5)}
                />
              </View>
            </View>
          )}

          {/* STEP 5: PREVIEW & PUBLISH */}
          {currentStep === 5 && (
            <View style={styles.stepContent}>
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  ✨ Customer Preview
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Here is how your meal kit will look to home cooks in the app catalog.
                </Text>

                {/* Preview Meal Kit Card */}
                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Image source={{ uri: heroImage }} style={styles.previewHeroImg} />
                  <View style={styles.previewContent}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={[styles.previewKitName, { color: colors.textPrimary }]}>
                        {name || 'Your Recipe Title'}
                      </Text>
                      <Text style={[styles.previewPrice, { color: colors.primary }]}>
                        ₹{price || '299'}
                      </Text>
                    </View>

                    {hindiName ? (
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
                        {hindiName}
                      </Text>
                    ) : null}

                    <Text style={[styles.previewTagline, { color: colors.textSecondary }]}>
                      {tagline}
                    </Text>

                    <View style={styles.previewPillsRow}>
                      <Badge label={`${servings} Servings`} variant="neutral" />
                      <Badge label={`${cookTime} mins`} variant="neutral" />
                      {(() => {
                        const badge = getDietBadgeInfo(diet);
                        return <Badge label={badge.label} variant={badge.variant} />;
                      })()}
                    </View>

                    {/* Masala Sachets Banner */}
                    <View style={styles.previewSachetsBanner}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                        {ingredients.filter((i) => i.isMasalaSachet).length || 2} Pre-portioned
                        Masala Sachets included
                      </Text>
                    </View>

                    {/* Estimated Nutrition Banner */}
                    <View style={styles.previewNutritionRow}>
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}
                      >
                        AI Nutrition: {nutrition.calories} kcal • {nutrition.protein}g protein •{' '}
                        {nutrition.carbs}g carbs
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.navBtnRow}>
                <Button
                  title="Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(4)}
                />
                <Button
                  title="Publish Meal Kit to Catalog"
                  size="lg"
                  style={{ flex: 2 }}
                  onPress={handleFinalPublish}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  publishHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  publishHeaderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  stepNavBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  stepTabIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  stepTabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  stepContent: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 10,
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  rowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  photoPresetCard: {
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    width: 105,
  },
  photoPresetImg: {
    width: 105,
    height: 70,
  },
  photoPresetText: {
    fontSize: 10,
    fontWeight: '700',
    padding: 4,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  staplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  stapleChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  customIngBox: {
    padding: 12,
    marginBottom: 14,
  },
  ingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  ingItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteIngBtn: {
    padding: 6,
  },
  navBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recipeStepCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  recipeStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  recipeStepTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  recipeStepText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipBox: {
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  addStepBox: {
    padding: 12,
    marginTop: 10,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 14,
    gap: 8,
  },
  aiActionIcon: {
    fontSize: 18,
  },
  aiActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  macroCardsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  macroCard: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  macroSub: {
    fontSize: 8,
    fontWeight: '500',
  },
  aiBreakdownBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  previewCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewHeroImg: {
    width: '100%',
    height: 180,
  },
  previewContent: {
    padding: 14,
  },
  previewKitName: {
    fontSize: 18,
    fontWeight: '900',
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  previewTagline: {
    fontSize: 13,
    marginVertical: 6,
  },
  previewPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  previewSachetsBanner: {
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  previewNutritionRow: {
    marginTop: 4,
  },
  photoSectionWrapper: {
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoModeTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  photoModeTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  photoModeTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aiPhotoPanel: {
    paddingVertical: 4,
  },
  aiStyleChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  aiGenerateBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiGenerateBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  uploadPhotoPanel: {
    paddingVertical: 4,
  },
  deviceUploadButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceUploadText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  activePhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  activePhotoImg: {
    width: 60,
    height: 48,
    borderRadius: 6,
    marginRight: 10,
  },
  activePhotoInfo: {
    flex: 1,
  },
  activePhotoTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
});
