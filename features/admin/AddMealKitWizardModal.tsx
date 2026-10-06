/**
 * Add / Edit Meal Kit Modal (Chef Studio Aligned)
 * Full-featured meal kit authoring and operational configuration modal
 * matching the structured 4-stage UI of the Chef Studio recipe builder:
 * Stage 1: Details (Thumbnail, Basic info, Diet, Cuisine, Category, Spice, Timings, Retail Price, Tags)
 * Stage 2: Ingredients (Live Inventory search, strict units, Masala Sachets & whole spices, reordering)
 * Stage 3: Cooking Steps (Title, instructions, step photos, AI generator, presets, reordering)
 * Stage 4: Review & Fulfilment (Visual card preview, multi-city target dropdown, grouped sub-areas checklist,
 *          12-item quality readiness checklist, shelf life, and catalog saving)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import {
  MealKit,
  DietTag,
  CuisineType,
  DishCategory,
  SpiceLevel,
  RegionHub,
  NutritionFacts,
  SachetItem,
  IngredientItem,
  RecipeStep,
  compileMealKitTags,
} from '../../framework/services/mealKitsService';
import {
  getSubRegionsForCity,
  getStateForCity,
  legacyHubForCity,
  SubRegion,
} from '../../framework/services/regionService';
import {
  ALL_GEO_CITIES,
  POPULAR_CITIES,
  GeoCityOption,
} from './ChefSubmissionApprovalView';
import { STORAGE_CENTRE_REGIONS } from '../../framework/services/adminRbacService';
import { getInventoryItems, InventoryItem } from '../../framework/services/inventoryService';
import { SAMPLE_RECIPE_THUMBNAILS, SAMPLE_STEP_IMAGES } from '../chef/sampleImages';
import { generateDishPhotoWithAI, generateStepPhotoWithAI } from './aiPhotoGeneratorService';
import { estimateNutritionWithAI, NutritionEstimationResult } from './nutritionEstimatorService';
import { showInAppAlert } from '../../framework/context/InAppDialogContext';

export const showWebSafeAlert = (title: string, message?: string) => {
  showInAppAlert(title, message);
};

export interface AddMealKitWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveKit: (kit: MealKit) => void | Promise<void>;
  initialKit?: MealKit | null;
}

export type AdminKitStage = 'details' | 'ingredients' | 'steps' | 'review';

export const VALID_UNITS = [
  'g',
  'kg',
  'ml',
  'L',
  'piece',
  'packet',
  'sachet',
  'bunch',
  'clove',
  'tbsp',
  'tsp',
] as const;

export type MeasurementUnit = (typeof VALID_UNITS)[number];

export interface SpiceCatalogItem {
  name: string;
  hindi?: string;
  category: 'Whole' | 'Ground' | 'Blend' | 'Herb/Seed' | 'Seasoning';
  defaultQty?: string;
}

export const MASTER_SPICE_CATALOG: SpiceCatalogItem[] = [
  { name: 'Jeera (Cumin Seeds)', hindi: 'जीरा', category: 'Whole', defaultQty: '1 tsp' },
  { name: 'Sabut Dhaniya (Coriander Seeds)', hindi: 'साबुत धनिया', category: 'Whole', defaultQty: '1 tsp' },
  { name: 'Elaichi (Green Cardamom)', hindi: 'हरी इलायची', category: 'Whole', defaultQty: '3 pods' },
  { name: 'Badi Elaichi (Black Cardamom)', hindi: 'बड़ी इलायची', category: 'Whole', defaultQty: '1 pod' },
  { name: 'Dalchini (Cinnamon Stick)', hindi: 'दालचीनी', category: 'Whole', defaultQty: '1 stick' },
  { name: 'Laung (Cloves)', hindi: 'लौंग', category: 'Whole', defaultQty: '4 pieces' },
  { name: 'Tejpatta (Indian Bay Leaf)', hindi: 'तेजपत्ता', category: 'Whole', defaultQty: '2 leaves' },
  { name: 'Kali Mirch (Black Peppercorns)', hindi: 'काली मिर्च', category: 'Whole', defaultQty: '0.5 tsp' },
  { name: 'Star Anise (Chakra Phool)', hindi: 'चक्र फूल', category: 'Whole', defaultQty: '1 piece' },
  { name: 'Mustard Seeds (Rai / Sarson)', hindi: 'राई / सरसों', category: 'Whole', defaultQty: '0.5 tsp' },
  { name: 'Methi Seeds (Fenugreek Seeds)', hindi: 'मेथी दाना', category: 'Whole', defaultQty: '0.25 tsp' },
  { name: 'Kashmiri Red Chilli Powder', hindi: 'कश्मीरी लाल मिर्च', category: 'Ground', defaultQty: '1 tbsp' },
  { name: 'Haldi (Turmeric Powder)', hindi: 'हल्दी पाउडर', category: 'Ground', defaultQty: '0.5 tsp' },
  { name: 'Garam Masala Blend', hindi: 'गरम मसाला', category: 'Blend', defaultQty: '1 tsp' },
  { name: 'Kasuri Methi (Fenugreek Leaves)', hindi: 'कसूरी मेथी', category: 'Herb/Seed', defaultQty: '1 tbsp' },
];

const DIET_TYPES: Array<{ key: DietTag; label: string; icon: string; desc: string }> = [
  { key: 'veg', label: 'Vegetarian', icon: 'leaf-outline', desc: 'Plant-based with fresh dairy' },
  { key: 'nonveg', label: 'Non-Vegetarian', icon: 'restaurant-outline', desc: 'Contains poultry/meat/fish' },
  { key: 'jain', label: 'Jain', icon: 'flower-outline', desc: 'No root vegetables or onion/garlic' },
  { key: 'vegan', label: 'Vegan', icon: 'nutrition-outline', desc: '100% plant-based, zero dairy' },
  { key: 'keto', label: 'Keto', icon: 'flame-outline', desc: 'Low-carb, high good fats' },
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
  { key: 'vegan', label: 'Vegan' },
  { key: 'jain', label: 'Jain' },
  { key: 'gluten-free', label: 'Gluten-Free' },
  { key: 'keto', label: 'Keto' },
];

export const AddMealKitWizardModal: React.FC<AddMealKitWizardModalProps> = ({
  visible,
  onClose,
  onSaveKit,
  initialKit,
}) => {
  const { colors, radii, shadows } = useTheme();
  const { isSuperAdmin } = useAuth();

  const isEditing = Boolean(initialKit);

  // Active Stage in the 4-Stage Builder
  const [currentStage, setCurrentStage] = useState<AdminKitStage>('details');
  const [isSaving, setIsSaving] = useState(false);

  // Stage 1: Recipe Identity & Details
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('299');
  const [originalPrice, setOriginalPrice] = useState('349');
  const [heroImage, setHeroImage] = useState(SAMPLE_RECIPE_THUMBNAILS[0]?.url || '');
  const [diet, setDiet] = useState<DietTag>('veg');
  const [cuisine, setCuisine] = useState<CuisineType>('North Indian');
  const [dishCategory, setDishCategory] = useState<DishCategory>('Curries & Gravies');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('Medium');
  const [servings, setServings] = useState('2');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [cookTimeMinutes, setCookTimeMinutes] = useState('25');
  const [dietaryTags, setDietaryTags] = useState<DietTag[]>(['veg']);
  const [allergens, setAllergens] = useState<string[]>(['Dairy']);
  const [isTrending, setIsTrending] = useState(false);

  // Stage 1: Photo selection modes
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isGeneratingAiPhoto, setIsGeneratingAiPhoto] = useState(false);

  // Stage 2: Ingredients & Sachets
  const [ingredients, setIngredients] = useState<
    Array<{
      id: string;
      name: string;
      amount: number;
      unit: string;
      quantity: string;
      ingredientId?: string;
    }>
  >([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [newIngName, setNewIngName] = useState('');
  const [newIngAmount, setNewIngAmount] = useState('200');
  const [newIngUnit, setNewIngUnit] = useState<MeasurementUnit>('g');

  // Masala sachets
  const [sachets, setSachets] = useState<SachetItem[]>([]);
  const [newSachetName, setNewSachetName] = useState('');
  const [selectedSpicesForSachet, setSelectedSpicesForSachet] = useState<
    Array<{ name: string; quantity: string }>
  >([]);

  // Stage 3: Cooking Steps
  const [recipeSteps, setRecipeSteps] = useState<
    Array<{
      stepNumber: number;
      title: string;
      instruction: string;
      timerSeconds?: number;
      tip?: string;
      imageUrl: string;
    }>
  >([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepPhotoModalIndex, setStepPhotoModalIndex] = useState<number | null>(null);
  const [stepCustomUrl, setStepCustomUrl] = useState('');
  const [isGeneratingStepAi, setIsGeneratingStepAi] = useState(false);

  // Stage 4: Coverage & Review
  const [selectedCities, setSelectedCities] = useState<string[]>(['Pune']);
  const [selectedSubAreas, setSelectedSubAreas] = useState<string[]>([]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');

  // Shelf-life & Nutrition
  const [shelfLifeDays, setShelfLifeDays] = useState('4');
  const [storageCondition, setStorageCondition] = useState('Refrigerated at 2°C - 5°C');
  const [nutrition, setNutrition] = useState<NutritionFacts>({
    calories: 420,
    protein: 16,
    carbs: 48,
    fat: 18,
    fiber: 6,
  });
  const [isEstimatingNutrition, setIsEstimatingNutrition] = useState(false);
  const [nutritionAIResult, setNutritionAIResult] = useState<NutritionEstimationResult | null>(null);

  // Initial load when modal opens
  const prevKitIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!visible) return;

    if (initialKit && initialKit.id !== prevKitIdRef.current) {
      prevKitIdRef.current = initialKit.id;
      setName(initialKit.name || '');
      setHindiName(initialKit.hindiName || '');
      setTagline(initialKit.tagline || '');
      setDescription(initialKit.description || '');
      setPrice(String(initialKit.price || 299));
      setOriginalPrice(String(initialKit.originalPrice || Math.round((initialKit.price || 299) * 1.25)));
      setHeroImage(initialKit.heroImage || SAMPLE_RECIPE_THUMBNAILS[0]?.url || '');
      setDiet(initialKit.diet || 'veg');
      setCuisine(initialKit.cuisine || 'North Indian');
      setDishCategory(initialKit.dishCategory || 'Curries & Gravies');
      setSpiceLevel(initialKit.spiceLevel || 'Medium');
      setServings(String(initialKit.servings || 2));
      setPrepTimeMinutes(String(initialKit.prepTimeMinutes || 15));
      setCookTimeMinutes(String(initialKit.cookTimeMinutes || 25));
      setDietaryTags(initialKit.dietaryTags || [initialKit.diet || 'veg']);
      setAllergens(initialKit.allergens || ['Dairy']);
      setIsTrending(Boolean(initialKit.isTrending));

      // Ingredients
      if (initialKit.ingredients && initialKit.ingredients.length > 0) {
        setIngredients(
          initialKit.ingredients.map((ing, idx) => ({
            id: `ing-${idx}-${Date.now()}`,
            name: ing.name,
            amount: parseFloat(ing.quantity) || 100,
            unit: (ing.quantity.replace(/[0-9.\s]/g, '') || 'g') as MeasurementUnit,
            quantity: ing.quantity,
          })),
        );
      } else {
        setIngredients([
          { id: 'ing-1', name: 'Fresh Paneer / Protein', amount: 250, unit: 'g', quantity: '250 g' },
          { id: 'ing-2', name: 'Tomatoes (Diced Puree)', amount: 200, unit: 'g', quantity: '200 g' },
        ]);
      }

      // Sachets
      setSachets(initialKit.sachets || []);

      // Steps
      if (initialKit.recipeSteps && initialKit.recipeSteps.length > 0) {
        setRecipeSteps(
          initialKit.recipeSteps.map((st, idx) => ({
            stepNumber: st.stepNumber || idx + 1,
            title: st.title || `Step ${idx + 1}`,
            instruction: st.instruction,
            timerSeconds: st.timerSeconds,
            tip: st.tip,
            imageUrl: st.imageUrl || SAMPLE_STEP_IMAGES[0]?.url || '',
          })),
        );
      } else {
        setRecipeSteps([
          {
            stepNumber: 1,
            title: 'Prepare Fresh Produce & Base',
            instruction: 'Wash and dice the vegetables. Sauté aromatics in a skillet with oil until golden and fragrant.',
            imageUrl: SAMPLE_STEP_IMAGES[0]?.url || '',
          },
          {
            stepNumber: 2,
            title: 'Simmer Masala & Simmer Dish',
            instruction: 'Add the chef masala sachet spices with pureed tomatoes and simmer on low heat for 12 minutes.',
            imageUrl: SAMPLE_STEP_IMAGES[1]?.url || '',
          },
        ]);
      }

      // Operational coverage
      const kitCities: string[] =
        initialKit.cities && initialKit.cities.length > 0 ? initialKit.cities : ['Pune'];
      setSelectedCities(kitCities);
      if (initialKit.subRegions && initialKit.subRegions.length > 0) {
        setSelectedSubAreas(initialKit.subRegions);
      } else {
        const subs: string[] = [];
        for (const c of kitCities) {
          const cSubs = getSubRegionsForCity(c);
          if (cSubs.length > 0) subs.push(...cSubs.map((s) => s.id));
        }
        setSelectedSubAreas(subs);
      }

      // Shelf-life & Nutrition
      setShelfLifeDays(String(initialKit.shelfLifeDays || 4));
      setStorageCondition(initialKit.storageCondition || 'Refrigerated at 2°C - 5°C');
      setNutrition(initialKit.nutrition || { calories: 420, protein: 16, carbs: 48, fat: 18, fiber: 6 });
      setCurrentStage('details');
    } else if (!initialKit && (!prevKitIdRef.current || prevKitIdRef.current !== 'new')) {
      prevKitIdRef.current = 'new';
      // Reset to defaults for a new kit
      setName('');
      setHindiName('');
      setTagline('');
      setDescription('');
      setPrice('299');
      setOriginalPrice('349');
      setHeroImage(SAMPLE_RECIPE_THUMBNAILS[0]?.url || '');
      setDiet('veg');
      setCuisine('North Indian');
      setDishCategory('Curries & Gravies');
      setSpiceLevel('Medium');
      setServings('2');
      setPrepTimeMinutes('15');
      setCookTimeMinutes('25');
      setDietaryTags(['veg']);
      setAllergens(['Dairy']);
      setIsTrending(false);
      setIngredients([
        { id: 'ing-1', name: 'Fresh Paneer / Veggies', amount: 250, unit: 'g', quantity: '250 g' },
      ]);
      setSachets([]);
      setRecipeSteps([
        {
          stepNumber: 1,
          title: 'Sauté Aromatics & Temper Spices',
          instruction: 'Heat 2 tbsp oil in a non-stick pan, add cumin and sauté aromatics until fragrant.',
          imageUrl: SAMPLE_STEP_IMAGES[0]?.url || '',
        },
      ]);
      setSelectedCities(['Pune']);
      const puneSubs = getSubRegionsForCity('Pune');
      setSelectedSubAreas(puneSubs.map((s) => s.id));
      setShelfLifeDays('4');
      setStorageCondition('Refrigerated at 2°C - 5°C');
      setNutrition({ calories: 420, protein: 16, carbs: 48, fat: 18, fiber: 6 });
      setCurrentStage('details');
    }
  }, [visible, initialKit]);

  // Available sub-regions across all selected cities
  const availableSubRegions = useMemo<SubRegion[]>(() => {
    const list: SubRegion[] = [];
    for (const city of selectedCities) {
      const subs = getSubRegionsForCity(city);
      if (subs && subs.length > 0) {
        list.push(...subs);
      } else {
        const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        list.push(
          { id: `${citySlug}-central`, name: `${city} Central / Downtown`, keywords: [city] },
          { id: `${citySlug}-north`, name: `${city} North Zone`, keywords: [city] },
          { id: `${citySlug}-south`, name: `${city} South Zone`, keywords: [city] },
          { id: `${citySlug}-east`, name: `${city} East Zone`, keywords: [city] },
          { id: `${citySlug}-west`, name: `${city} West Zone`, keywords: [city] },
        );
      }
    }
    return list;
  }, [selectedCities]);

  // Group sub-regions by city for clean categorized rendering
  const subRegionsByCity = useMemo(() => {
    const list: { city: string; subRegions: SubRegion[] }[] = [];
    for (const city of selectedCities) {
      const citySubs = getSubRegionsForCity(city);
      const allCitySubs =
        citySubs && citySubs.length > 0
          ? citySubs
          : [
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`, name: `${city} Central / Downtown`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-north`, name: `${city} North Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-south`, name: `${city} South Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-east`, name: `${city} East Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-west`, name: `${city} West Zone`, keywords: [city] },
            ];

      const filtered = !areaSearch.trim()
        ? allCitySubs
        : allCitySubs.filter((sr) => {
            const q = areaSearch.toLowerCase().trim();
            return (
              sr.name.toLowerCase().includes(q) ||
              sr.id.toLowerCase().includes(q) ||
              sr.pincodes?.some((p) => p.includes(q))
            );
          });

      if (filtered.length > 0) {
        list.push({ city, subRegions: filtered });
      }
    }
    return list;
  }, [selectedCities, areaSearch]);

  // City toggling
  const toggleCity = (cityName: string) => {
    setSelectedCities((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === cityName.toLowerCase());
      if (exists) {
        const next = prev.filter((c) => c.toLowerCase() !== cityName.toLowerCase());
        const citySubs = getSubRegionsForCity(cityName).map((s) => s.id);
        const citySlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        setSelectedSubAreas((subPrev) =>
          subPrev.filter((id) => !citySubs.includes(id) && !id.startsWith(`${citySlug}-`)),
        );
        return next;
      } else {
        const next = [...prev, cityName];
        const citySubs = getSubRegionsForCity(cityName);
        const newIds =
          citySubs.length > 0
            ? citySubs.map((s) => s.id)
            : [`${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`];
        setSelectedSubAreas((subPrev) => Array.from(new Set([...subPrev, ...newIds])));
        return next;
      }
    });
  };

  const selectTopHubs = () => {
    const topHubs = ['Pune', 'Mumbai', 'Bengaluru', 'New Delhi'];
    setSelectedCities((prev) => Array.from(new Set([...prev, ...topHubs])));
    const newIds: string[] = [];
    for (const c of topHubs) {
      const subs = getSubRegionsForCity(c);
      if (subs.length > 0) newIds.push(...subs.map((s) => s.id));
    }
    setSelectedSubAreas((prev) => Array.from(new Set([...prev, ...newIds])));
  };

  const clearAllCities = () => {
    setSelectedCities([]);
    setSelectedSubAreas([]);
  };

  const toggleSubArea = (subId: string) => {
    setSelectedSubAreas((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId],
    );
  };

  const toggleCitySubAreas = (cityName: string) => {
    const citySubs = getSubRegionsForCity(cityName);
    const citySubIds =
      citySubs.length > 0
        ? citySubs.map((s) => s.id)
        : [`${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`];
    const allChecked = citySubIds.every((id) => selectedSubAreas.includes(id));
    if (allChecked) {
      setSelectedSubAreas((prev) => prev.filter((id) => !citySubIds.includes(id)));
    } else {
      setSelectedSubAreas((prev) => Array.from(new Set([...prev, ...citySubIds])));
    }
  };

  const selectAllSubAreas = () => {
    setSelectedSubAreas(availableSubRegions.map((s) => s.id));
  };

  const clearAllSubAreas = () => {
    setSelectedSubAreas([]);
  };

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return ALL_GEO_CITIES;
    const q = citySearch.toLowerCase().trim();
    return ALL_GEO_CITIES.filter(
      (c: GeoCityOption) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    );
  }, [citySearch]);

  // Inventory suggestions
  const inventorySuggestions = useMemo(() => {
    const allItems = getInventoryItems();
    if (!inventorySearch.trim()) return allItems.slice(0, 8);
    const q = inventorySearch.toLowerCase().trim();
    return allItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.section.toLowerCase().includes(q))
      .slice(0, 10);
  }, [inventorySearch]);

  // 12-Item Quality Readiness Checklist
  const numPrice = parseFloat(price);
  const numServings = parseInt(servings, 10) || 0;
  const numPrep = parseInt(prepTimeMinutes, 10) || 0;
  const numCook = parseInt(cookTimeMinutes, 10) || 0;

  const readinessChecks = [
    {
      key: 'thumbnail',
      label: 'Recipe Hero Photo Uploaded',
      isValid: !!heroImage && heroImage.trim().length > 0,
    },
    {
      key: 'name',
      label: 'Recipe Name Provided (min 3 chars)',
      isValid: !!name && name.trim().length >= 3,
    },
    {
      key: 'tagline',
      label: 'Appetizing Tagline / Subtitle',
      isValid: !!tagline && tagline.trim().length >= 5,
    },
    {
      key: 'description',
      label: 'Culinary Description (min 15 chars)',
      isValid: !!description && description.trim().length >= 15,
    },
    {
      key: 'diet',
      label: 'Dietary Category Selected',
      isValid: !!diet,
    },
    {
      key: 'cuisine',
      label: 'Regional Cuisine Specified',
      isValid: !!cuisine && cuisine.trim().length > 0,
    },
    {
      key: 'category',
      label: 'Dish Category Specified',
      isValid: !!dishCategory && dishCategory.trim().length > 0,
    },
    {
      key: 'spice',
      label: 'Spice Heat Level Specified',
      isValid: !!spiceLevel,
    },
    {
      key: 'timings',
      label: 'Portion Servings & Prep/Cook Times',
      isValid: numServings >= 1 && numPrep > 0 && numCook > 0,
    },
    {
      key: 'price',
      label: 'Retail Pricing Set (> ₹0)',
      isValid: !isNaN(numPrice) && numPrice > 0,
    },
    {
      key: 'ingredients',
      label: 'Fresh Produce & Ingredients Added',
      isValid: ingredients.length > 0 && ingredients.every((ing) => ing.name.trim().length > 0),
    },
    {
      key: 'steps',
      label: 'Cooking Steps Defined with Instructions',
      isValid: recipeSteps.length > 0 && recipeSteps.every((s) => s.instruction.trim().length >= 10),
    },
  ];

  const passedChecksCount = readinessChecks.filter((c) => c.isValid).length;
  const allChecksPassed = passedChecksCount === readinessChecks.length;

  // Add fresh ingredient
  const handleAddIngredient = () => {
    if (!newIngName.trim()) {
      showWebSafeAlert('Ingredient Name Required', 'Please enter a name for the ingredient.');
      return;
    }
    const amt = parseFloat(newIngAmount) || 100;
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}`,
        name: newIngName.trim(),
        amount: amt,
        unit: newIngUnit,
        quantity: `${amt} ${newIngUnit}`,
      },
    ]);
    setNewIngName('');
    setNewIngAmount('100');
  };

  const handleAddFromInventory = (item: InventoryItem) => {
    const exists = ingredients.some((i) => i.name.toLowerCase() === item.name.toLowerCase());
    if (exists) {
      showWebSafeAlert('Already Added', `"${item.name}" is already in your ingredients list.`);
      return;
    }
    const unit = (VALID_UNITS.includes(item.unit as any) ? item.unit : 'g') as MeasurementUnit;
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}`,
        name: item.name,
        amount: 200,
        unit,
        quantity: `200 ${unit}`,
        ingredientId: item.id,
      },
    ]);
    setInventorySearch('');
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  // Add cooking step
  const handleAddStep = () => {
    const nextNum = recipeSteps.length + 1;
    setRecipeSteps((prev) => [
      ...prev,
      {
        stepNumber: nextNum,
        title: `Step ${nextNum}: Cooking Phase`,
        instruction: 'Explain the precise cooking action, flame temperature, and timing.',
        imageUrl: SAMPLE_STEP_IMAGES[(nextNum - 1) % SAMPLE_STEP_IMAGES.length]?.url || '',
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setRecipeSteps((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.map((st, idx) => ({ ...st, stepNumber: idx + 1 }));
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === recipeSteps.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setRecipeSteps((prev) => {
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[targetIdx]!;
      copy[targetIdx] = temp;
      return copy.map((st, idx) => ({ ...st, stepNumber: idx + 1 }));
    });
  };

  // AI photo generators
  const handleGenerateAiDishPhoto = async () => {
    if (!name.trim()) {
      showWebSafeAlert('Dish Name Required', 'Please enter a dish name first for the AI generator.');
      return;
    }
    setIsGeneratingAiPhoto(true);
    try {
      const res = await generateDishPhotoWithAI({
        dishName: name.trim(),
        cuisine,
        diet,
        spiceLevel,
        ingredients: ingredients.map((i) => i.name),
        presentationStyle: 'finedining',
      });
      setHeroImage(res.imageUrl);
      showWebSafeAlert('AI Photo Generated', `Gourmet presentation photo created for ${name}.`);
    } catch {
      showWebSafeAlert('Notice', 'Using gourmet chef presentation photograph.');
    } finally {
      setIsGeneratingAiPhoto(false);
    }
  };

  const handleEstimateNutrition = async () => {
    if (ingredients.length === 0) {
      showWebSafeAlert('Ingredients Needed', 'Please add ingredients before estimating nutrition.');
      return;
    }
    setIsEstimatingNutrition(true);
    try {
      const res = estimateNutritionWithAI(
        ingredients.map((i) => ({ name: i.name, quantity: i.quantity })),
        numServings || 2,
      );
      setNutrition(res.perServing);
      setNutritionAIResult(res);
      showWebSafeAlert('Nutrition Estimated', `AI calculated ${res.perServing.calories} kcal per serving.`);
    } catch {
      showWebSafeAlert('Error', 'Could not estimate nutrition at this time.');
    } finally {
      setIsEstimatingNutrition(false);
    }
  };

  // Final Save Handler
  const handleSaveMealKit = async () => {
    if (!name.trim() || name.trim().length < 3) {
      setCurrentStage('details');
      showWebSafeAlert('Name Required', 'Please enter a valid recipe name (min 3 chars).');
      return;
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      setCurrentStage('details');
      showWebSafeAlert('Price Required', 'Please enter a valid retail price for this meal kit.');
      return;
    }

    if (ingredients.length === 0) {
      setCurrentStage('ingredients');
      showWebSafeAlert('Ingredients Required', 'Please add at least one fresh produce ingredient.');
      return;
    }

    if (recipeSteps.length === 0) {
      setCurrentStage('steps');
      showWebSafeAlert('Steps Required', 'Please provide at least one cooking step.');
      return;
    }

    if (selectedCities.length === 0) {
      setCurrentStage('review');
      showWebSafeAlert('Target Cities Required', 'Please select at least one target operational city.');
      return;
    }

    if (selectedSubAreas.length === 0) {
      setCurrentStage('review');
      showWebSafeAlert('Delivery Areas Required', 'Please check at least one delivery sub-area.');
      return;
    }

    const kitId = initialKit?.id || 'kit-' + Math.floor(100 + Math.random() * 900);
    const legacyHubs = Array.from(new Set(selectedCities.map((c) => legacyHubForCity(c)))) as RegionHub[];

    // Map selected cities to depot IDs
    const targetStorageCentres = STORAGE_CENTRE_REGIONS.filter((sc) => {
      const matchCity = selectedCities.some(
        (c) => sc.city.toLowerCase() === c.toLowerCase() || sc.name.toLowerCase().includes(c.toLowerCase()),
      );
      const matchZone = legacyHubs.includes(sc.zone);
      return matchCity || matchZone;
    }).map((sc) => sc.id);

    // Format all ingredients
    const formattedIngredients: IngredientItem[] = ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
    }));

    // Add masala sachets to ingredients representation if defined
    for (const s of sachets) {
      formattedIngredients.push({
        name: s.name,
        quantity: s.spices.map((sp) => `${sp.name} (${sp.quantity})`).join(', ') || 'Chef Spice Blend',
        isMasalaSachet: true,
      });
    }

    const savedKit: MealKit = {
      id: kitId,
      name: name.trim(),
      hindiName: hindiName.trim() || undefined,
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: tagline.trim() || `${cuisine} Specialty Meal Kit`,
      description:
        description.trim() ||
        `${name.trim()} meal kit carefully curated with fresh produce, authentic spices, and restaurant-quality recipe steps.`,
      heroImage: heroImage.trim() || SAMPLE_RECIPE_THUMBNAILS[0]!.url,
      galleryImages: [heroImage.trim() || SAMPLE_RECIPE_THUMBNAILS[0]!.url],
      price: numPrice,
      originalPrice: parseFloat(originalPrice) || Math.round(numPrice * 1.2),
      servings: numServings || 2,
      prepTimeMinutes: numPrep || 15,
      cookTimeMinutes: numCook || 25,
      diet,
      cuisine,
      dishCategory,
      spiceLevel,
      difficulty: 'Easy',
      dietaryTags,
      isTrending,
      availableRegions: legacyHubs.length > 0 ? legacyHubs : ['West'],
      cities: selectedCities,
      subRegions: selectedSubAreas,
      originCity: selectedCities[0] || 'Pune',
      availableStorageCentres: targetStorageCentres,
      stockByRegion: initialKit?.stockByRegion || { North: 50, South: 50, West: 50, East: 50 },
      shelfLifeDays: parseInt(shelfLifeDays, 10) || 4,
      shelfLife: `${shelfLifeDays} days (${storageCondition})`,
      storageCondition,
      rating: initialKit?.rating || 5.0,
      reviewCount: initialKit?.reviewCount || 0,
      nutrition,
      allergens,
      tags: compileMealKitTags({
        diet,
        cuisine,
        dishCategory,
        availableRegions: legacyHubs,
        availableStorageCentres: targetStorageCentres,
        allergens,
        isTrending,
        dietaryTags,
      }),
      ingredients: formattedIngredients,
      masalaSachets: sachets.map((s) => s.name),
      sachets,
      recipeSteps: recipeSteps.map((st) => ({
        stepNumber: st.stepNumber,
        title: st.title,
        instruction: st.instruction,
        timerSeconds: st.timerSeconds,
        tip: st.tip,
        imageUrl: st.imageUrl,
      })),
      reviews: initialKit?.reviews || [],
      salesByRegion: initialKit?.salesByRegion || {},
      chefId: initialKit?.chefId,
      chefName: initialKit?.chefName,
      submissionStatus: 'published',
    };

    setIsSaving(true);
    try {
      await onSaveKit(savedKit);
      showWebSafeAlert(
        'Meal Kit Saved!',
        `"${savedKit.name}" (₹${savedKit.price}) has been saved and updated in the active meal kit catalog.`,
      );
      onClose();
    } catch (err: any) {
      showWebSafeAlert('Save Error', err?.message || 'Could not save meal kit.');
    } finally {
      setIsSaving(false);
    }
  };

  const STAGE_CONFIGS: Array<{
    key: AdminKitStage;
    label: string;
    subtitle: string;
    icon: string;
  }> = [
    { key: 'details', label: 'Details', subtitle: 'Basic & Dietary', icon: 'document-text-outline' },
    { key: 'ingredients', label: 'Ingredients', subtitle: 'Inventory Items', icon: 'nutrition-outline' },
    { key: 'steps', label: 'Cooking Steps', subtitle: 'Method & Photos', icon: 'restaurant-outline' },
    { key: 'review', label: 'Review & Fulfilment', subtitle: 'Readiness & Delivery', icon: 'checkmark-circle-outline' },
  ];

  const currentStageIndex = STAGE_CONFIGS.findIndex((s) => s.key === currentStage);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* ── 1. STUDIO HEADER ── */}
        <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.backBtn, { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle }]}
              accessibilityLabel="Back to Meal Kits"
            >
              <Icon name="arrow-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <View style={styles.breadcrumbRow}>
                <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>Admin Kitchen</Text>
                <Text style={[styles.breadcrumbDivider, { color: colors.textMuted }]}>/</Text>
                <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>Meal Kits</Text>
                <Text style={[styles.breadcrumbDivider, { color: colors.textMuted }]}>/</Text>
                <Text style={[styles.breadcrumbCurrent, { color: colors.primary }]}>
                  {isEditing ? 'Edit Meal Kit' : 'Author New Meal Kit'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {name.trim() ? name.trim() : isEditing ? 'Edit Meal Kit' : 'New Chef Meal Kit'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isEditing ? '#ECFDF5' : colors.bgSubtle,
                  borderColor: isEditing ? '#A7F3D0' : colors.borderLight,
                },
              ]}
            >
              <Icon
                name={isEditing ? 'checkmark-circle' : 'create-outline'}
                size={14}
                color={isEditing ? '#059669' : colors.textSecondary}
              />
              <Text style={[styles.statusBadgeText, { color: isEditing ? '#065F46' : colors.textSecondary }]}>
                {isEditing ? 'Live Catalog Kit' : 'Draft Mode'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveMealKit}
              disabled={isSaving}
              style={[styles.headerQuickSaveBtn, { backgroundColor: colors.primary }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark" size={15} color="#fff" />
                  <Text style={styles.headerQuickSaveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. STEP NAVIGATION BAR (MATCHING CHEF STUDIO) ── */}
        <View style={[styles.stepNavBar, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepNavScroll}>
            {STAGE_CONFIGS.map((stage, idx) => {
              const isActive = currentStage === stage.key;
              const isPast = idx < currentStageIndex;

              return (
                <React.Fragment key={stage.key}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.stepConnector,
                        { backgroundColor: idx <= currentStageIndex ? colors.primary : colors.borderLight },
                      ]}
                    />
                  )}

                  <TouchableOpacity
                    onPress={() => setCurrentStage(stage.key)}
                    activeOpacity={0.7}
                    style={styles.stepNavItem}
                  >
                    <View
                      style={[
                        styles.stepBadge,
                        {
                          backgroundColor: isActive ? colors.primary : isPast ? '#10B981' : colors.bgSubtle,
                          borderColor: isActive ? colors.primary : isPast ? '#10B981' : colors.borderLight,
                        },
                      ]}
                    >
                      {isPast ? (
                        <Icon name="checkmark" size={13} color="#fff" />
                      ) : (
                        <Text style={[styles.stepBadgeNum, { color: isActive ? '#fff' : colors.textSecondary }]}>
                          {idx + 1}
                        </Text>
                      )}
                    </View>

                    <View style={styles.stepNavTextCol}>
                      <Text
                        style={[
                          styles.stepNavLabel,
                          {
                            color: isActive ? colors.primary : isPast ? colors.textPrimary : colors.textSecondary,
                            fontWeight: isActive ? '800' : '600',
                          },
                        ]}
                      >
                        {stage.label}
                      </Text>
                      <Text style={[styles.stepNavSubtitle, { color: colors.textMuted }]}>
                        {stage.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 3. MAIN STAGE CONTENT SCROLLER ── */}
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
          {/* ════════════════ STAGE 1: DETAILS ════════════════ */}
          {currentStage === 'details' && (
            <View style={styles.stageWrap}>
              {/* SECTION: Hero Image Selection */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconCol}>
                    <Icon name="camera-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      Recipe Hero Photo *
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      High-resolution visual representation shown to customers on the app & web catalog.
                    </Text>
                  </View>
                </View>

                {/* Hero Photo Preview & Actions */}
                <View style={styles.heroPhotoRow}>
                  <Image source={{ uri: heroImage }} style={styles.heroPhotoPreview} resizeMode="cover" />
                  <View style={styles.heroPhotoControls}>
                    <View style={styles.photoActionsGrid}>
                      <TouchableOpacity
                        onPress={() => setShowPhotoPickerModal(true)}
                        style={[styles.photoActionBtn, { borderColor: colors.border, backgroundColor: colors.bgSubtle }]}
                      >
                        <Icon name="images-outline" size={16} color={colors.textPrimary} />
                        <Text style={[styles.photoActionBtnText, { color: colors.textPrimary }]}>
                          Preset Library
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleGenerateAiDishPhoto}
                        disabled={isGeneratingAiPhoto}
                        style={[styles.photoActionBtn, { borderColor: '#818CF8', backgroundColor: '#EEF2FF' }]}
                      >
                        {isGeneratingAiPhoto ? (
                          <ActivityIndicator size="small" color="#4F46E5" />
                        ) : (
                          <>
                            <Icon name="sparkles" size={16} color="#4F46E5" />
                            <Text style={[styles.photoActionBtnText, { color: '#4F46E5', fontWeight: '700' }]}>
                              AI Generate
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Custom URL Input */}
                    <View style={styles.photoUrlInputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Or paste external image URL..."
                        placeholderTextColor={colors.textMuted}
                        value={customPhotoUrl}
                        onChangeText={setCustomPhotoUrl}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          if (customPhotoUrl.trim()) {
                            setHeroImage(customPhotoUrl.trim());
                            setCustomPhotoUrl('');
                          }
                        }}
                        style={[styles.applyUrlBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.applyUrlBtnText}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION: Basic Identity */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconCol}>
                    <Icon name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      Recipe Identity & Descriptions *
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Core culinary details, title, appetizing tagline, and pricing.
                    </Text>
                  </View>
                </View>

                {/* Name & Hindi Name */}
                <View style={styles.formRow2}>
                  <View style={[styles.formCol, { flex: 2 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>DISH NAME *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. Handi Paneer Lazeez"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>

                  <View style={[styles.formCol, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>HINDI NAME</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. हांडी पनीर लज़ीज़"
                      placeholderTextColor={colors.textMuted}
                      value={hindiName}
                      onChangeText={setHindiName}
                    />
                  </View>
                </View>

                {/* Tagline */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>APPETIZING TAGLINE *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. Slow-cooked cottage cheese in a clay pot aromatic gravy"
                    placeholderTextColor={colors.textMuted}
                    value={tagline}
                    onChangeText={setTagline}
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>CULINARY DESCRIPTION *</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Describe the texture, taste profile, and culinary heritage of this meal kit..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Pricing & MRP */}
                <View style={styles.formRow2}>
                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>RETAIL PRICE (₹) *</Text>
                    <View style={styles.currencyInputWrap}>
                      <Text style={[styles.currencyPrefix, { color: colors.primary }]}>₹</Text>
                      <TextInput
                        style={[styles.inputWithPrefix, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="299"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                      />
                    </View>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>ORIGINAL MRP (₹)</Text>
                    <View style={styles.currencyInputWrap}>
                      <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>₹</Text>
                      <TextInput
                        style={[styles.inputWithPrefix, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="349"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={originalPrice}
                        onChangeText={setOriginalPrice}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION: Dietary Category (Chef Studio Cards) */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 4 }]}>
                  Dietary Classification *
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 12 }]}>
                  Select the dietary profile for customer filtering and dietary preferences.
                </Text>

                <View style={styles.dietGrid}>
                  {DIET_TYPES.map((dt) => {
                    const isSelected = diet === dt.key;
                    return (
                      <TouchableOpacity
                        key={dt.key}
                        onPress={() => setDiet(dt.key)}
                        activeOpacity={0.8}
                        style={[
                          styles.dietCard,
                          {
                            backgroundColor: isSelected ? `${colors.primary}12` : colors.bgSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderLight,
                          },
                        ]}
                      >
                        <View style={styles.dietCardTop}>
                          <View
                            style={[
                              styles.dietIconCircle,
                              { backgroundColor: isSelected ? colors.primary : colors.bgSurface },
                            ]}
                          >
                            <Icon name={dt.icon} size={18} color={isSelected ? '#fff' : colors.textPrimary} />
                          </View>
                          {isSelected && <Icon name="checkmark-circle" size={18} color={colors.primary} />}
                        </View>
                        <Text style={[styles.dietCardTitle, { color: colors.textPrimary }]}>{dt.label}</Text>
                        <Text style={[styles.dietCardDesc, { color: colors.textMuted }]}>{dt.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION: Cuisine, Category & Spice */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                {/* Cuisine */}
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>REGIONAL CUISINE *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRowScroll}>
                  {CUISINES.map((c) => {
                    const isSelected = cuisine === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCuisine(c)}
                        style={[
                          styles.selectionPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderLight,
                          },
                        ]}
                      >
                        <Text style={[styles.selectionPillText, { color: isSelected ? '#fff' : colors.textPrimary }]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Dish Category */}
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  DISH CATEGORY *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRowScroll}>
                  {DISH_CATEGORIES.map((cat) => {
                    const isSelected = dishCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setDishCategory(cat)}
                        style={[
                          styles.selectionPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderLight,
                          },
                        ]}
                      >
                        <Text style={[styles.selectionPillText, { color: isSelected ? '#fff' : colors.textPrimary }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Spice Heat Level */}
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  SPICE HEAT LEVEL *
                </Text>
                <View style={styles.spiceRow}>
                  {SPICE_LEVELS.map((sp) => {
                    const isSelected = spiceLevel === sp.level;
                    return (
                      <TouchableOpacity
                        key={sp.level}
                        onPress={() => setSpiceLevel(sp.level)}
                        style={[
                          styles.spicePill,
                          {
                            backgroundColor: isSelected ? sp.color : colors.bgSubtle,
                            borderColor: isSelected ? sp.color : colors.borderLight,
                          },
                        ]}
                      >
                        <Icon name="flame" size={14} color={isSelected ? '#fff' : sp.color} />
                        <Text style={[styles.spicePillText, { color: isSelected ? '#fff' : colors.textPrimary }]}>
                          {sp.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Portions & Timings */}
                <View style={[styles.formRow3, { marginTop: 16 }]}>
                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>SERVINGS</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={servings}
                      onChangeText={setServings}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>PREP TIME (MIN)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={prepTimeMinutes}
                      onChangeText={setPrepTimeMinutes}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>COOK TIME (MIN)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={cookTimeMinutes}
                      onChangeText={setCookTimeMinutes}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION: Allergens */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 4 }]}>
                  Allergen Warning Declarations
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 10 }]}>
                  Check allergens present in this recipe for food safety compliance.
                </Text>

                <View style={styles.chipsWrap}>
                  {ALLERGEN_OPTIONS.map((alg) => {
                    const isChecked = allergens.includes(alg);
                    return (
                      <TouchableOpacity
                        key={alg}
                        onPress={() => {
                          setAllergens((prev) =>
                            isChecked ? prev.filter((a) => a !== alg) : [...prev, alg],
                          );
                        }}
                        style={[
                          styles.filterCheckPill,
                          {
                            backgroundColor: isChecked ? '#FEF2F2' : colors.bgSubtle,
                            borderColor: isChecked ? '#F87171' : colors.borderLight,
                          },
                        ]}
                      >
                        <Icon
                          name={isChecked ? 'checkmark-circle' : 'add-circle-outline'}
                          size={14}
                          color={isChecked ? '#DC2626' : colors.textMuted}
                        />
                        <Text style={[styles.filterCheckPillText, { color: isChecked ? '#DC2626' : colors.textPrimary }]}>
                          {alg}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ════════════════ STAGE 2: INGREDIENTS ════════════════ */}
          {currentStage === 'ingredients' && (
            <View style={styles.stageWrap}>
              {/* Inventory Search & Quick Add */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconCol}>
                    <Icon name="search" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      Search Active Inventory Items
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Pick tracked ingredients from warehouse inventory to connect stock and shelf-life.
                    </Text>
                  </View>
                </View>

                <View style={[styles.searchBarWrap, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Icon name="search" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search produce (e.g. Paneer, Basmati, Tomatoes, Ghee)..."
                    placeholderTextColor={colors.textMuted}
                    value={inventorySearch}
                    onChangeText={setInventorySearch}
                  />
                  {inventorySearch.length > 0 && (
                    <TouchableOpacity onPress={() => setInventorySearch('')}>
                      <Icon name="close" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Suggestions List */}
                <View style={styles.inventorySuggestionsList}>
                  {inventorySuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleAddFromInventory(item)}
                      style={[styles.inventorySuggestionRow, { borderColor: colors.borderLight }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inventoryItemName, { color: colors.textPrimary }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.inventoryItemSub, { color: colors.textMuted }]}>
                          {item.section.replace('_', ' ').toUpperCase()} • Stock: {item.currentStock} {item.unit}
                        </Text>
                      </View>
                      <View style={[styles.addPillBtn, { backgroundColor: `${colors.primary}15` }]}>
                        <Icon name="add" size={14} color={colors.primary} />
                        <Text style={[styles.addPillBtnText, { color: colors.primary }]}>Add</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Add Custom Ingredient */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                  Add Custom Produce / Grocery
                </Text>

                <View style={styles.addCustomIngRow}>
                  <TextInput
                    style={[styles.input, { flex: 2, backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Produce name (e.g. Kashmiri Chillies)"
                    placeholderTextColor={colors.textMuted}
                    value={newIngName}
                    onChangeText={setNewIngName}
                  />

                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newIngAmount}
                    onChangeText={setNewIngAmount}
                  />

                  <View style={styles.unitPickerWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {VALID_UNITS.map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setNewIngUnit(u)}
                          style={[
                            styles.unitPill,
                            {
                              backgroundColor: newIngUnit === u ? colors.primary : colors.bgSubtle,
                              borderColor: newIngUnit === u ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: newIngUnit === u ? '#fff' : colors.textPrimary }}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <TouchableOpacity
                    onPress={handleAddIngredient}
                    style={[styles.addBtnIcon, { backgroundColor: colors.primary }]}
                  >
                    <Icon name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Added Ingredients List */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 10 }]}>
                  Recipe Ingredients ({ingredients.length})
                </Text>

                {ingredients.map((ing, idx) => (
                  <View
                    key={ing.id}
                    style={[styles.ingredientItemRow, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}
                  >
                    <View style={styles.ingNumBadge}>
                      <Text style={styles.ingNumBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ingItemTitle, { color: colors.textPrimary }]}>{ing.name}</Text>
                      <Text style={[styles.ingItemQty, { color: colors.textMuted }]}>{ing.quantity}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveIngredient(ing.id)}
                      style={styles.ingRemoveBtn}
                    >
                      <Icon name="trash" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                {ingredients.length === 0 && (
                  <Text style={[styles.emptyPrompt, { color: colors.textMuted }]}>
                    No ingredients added yet. Search inventory above or enter custom items.
                  </Text>
                )}
              </View>

              {/* Master Spices Catalog */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 4 }]}>
                  Quick Masala & Whole Spices Catalog
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 10 }]}>
                  Tap any spice to automatically add it to your recipe ingredients.
                </Text>

                <View style={styles.spiceCatalogGrid}>
                  {MASTER_SPICE_CATALOG.map((sp) => (
                    <TouchableOpacity
                      key={sp.name}
                      onPress={() => {
                        setIngredients((prev) => [
                          ...prev,
                          {
                            id: `spice-${Date.now()}`,
                            name: sp.name,
                            amount: 1,
                            unit: 'sachet',
                            quantity: sp.defaultQty || '1 sachet',
                          },
                        ]);
                      }}
                      style={[styles.spiceCatalogPill, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}
                    >
                      <Icon name="leaf-outline" size={13} color={colors.primary} />
                      <Text style={[styles.spiceCatalogPillText, { color: colors.textPrimary }]}>
                        {sp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ════════════════ STAGE 3: COOKING STEPS ════════════════ */}
          {currentStage === 'steps' && (
            <View style={styles.stageWrap}>
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconCol}>
                    <Icon name="restaurant-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      Step-by-Step Cooking Guide ({recipeSteps.length} Steps)
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Clear instructions for the customer with step title, timing, and step photos.
                    </Text>
                  </View>
                </View>

                {recipeSteps.map((step, idx) => (
                  <View
                    key={idx}
                    style={[styles.stepCardItem, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}
                  >
                    {/* Step Card Header */}
                    <View style={styles.stepCardHeader}>
                      <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
                        <Text style={styles.stepCircleText}>{step.stepNumber}</Text>
                      </View>
                      <TextInput
                        style={[styles.stepTitleInput, { color: colors.textPrimary }]}
                        placeholder="Step Title (e.g. Temper Spices & Sauté)"
                        placeholderTextColor={colors.textMuted}
                        value={step.title}
                        onChangeText={(txt) => {
                          setRecipeSteps((prev) => {
                            const copy = [...prev];
                            copy[idx]!.title = txt;
                            return copy;
                          });
                        }}
                      />
                      <View style={styles.stepOrderActions}>
                        <TouchableOpacity
                          disabled={idx === 0}
                          onPress={() => handleMoveStep(idx, 'up')}
                          style={[styles.orderBtn, { opacity: idx === 0 ? 0.3 : 1 }]}
                        >
                          <Icon name="arrow-up" size={14} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={idx === recipeSteps.length - 1}
                          onPress={() => handleMoveStep(idx, 'down')}
                          style={[styles.orderBtn, { opacity: idx === recipeSteps.length - 1 ? 0.3 : 1 }]}
                        >
                          <Icon name="arrow-down" size={14} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveStep(idx)} style={styles.orderBtn}>
                          <Icon name="trash" size={14} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Step Instruction */}
                    <TextInput
                      style={[styles.stepInstructionInput, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, color: colors.textPrimary }]}
                      placeholder="Enter detailed cooking instructions for this phase..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      value={step.instruction}
                      onChangeText={(txt) => {
                        setRecipeSteps((prev) => {
                          const copy = [...prev];
                          copy[idx]!.instruction = txt;
                          return copy;
                        });
                      }}
                    />

                    {/* Step Photo Preview & Controls */}
                    <View style={styles.stepPhotoRow}>
                      {step.imageUrl ? (
                        <Image source={{ uri: step.imageUrl }} style={styles.stepPhotoThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.stepPhotoPlaceholder, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                          <Icon name="camera-outline" size={16} color={colors.textMuted} />
                        </View>
                      )}

                      <View style={styles.stepPhotoOptions}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {SAMPLE_STEP_IMAGES.map((sImg) => (
                            <TouchableOpacity
                              key={sImg.id}
                              onPress={() => {
                                setRecipeSteps((prev) => {
                                  const copy = [...prev];
                                  copy[idx]!.imageUrl = sImg.url;
                                  return copy;
                                });
                              }}
                              style={[
                                styles.stepSampleChip,
                                {
                                  borderColor: step.imageUrl === sImg.url ? colors.primary : colors.borderLight,
                                },
                              ]}
                            >
                              <Image source={{ uri: sImg.url }} style={styles.stepSampleChipImg} />
                              <Text style={[styles.stepSampleChipText, { color: colors.textPrimary }]}>
                                {sImg.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={handleAddStep}
                  style={[styles.addStepBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` }]}
                >
                  <Icon name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.addStepBtnText, { color: colors.primary }]}>
                    + Add Next Cooking Step
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════ STAGE 4: REVIEW & FULFILMENT ════════════════ */}
          {currentStage === 'review' && (
            <View style={styles.stageWrap}>
              {/* Visual Customer Preview Card */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                  Customer Catalog Card Preview
                </Text>
                <View style={[styles.previewCardWrap, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Image source={{ uri: heroImage }} style={styles.previewHeroImg} resizeMode="cover" />
                  <View style={styles.previewCardBody}>
                    <View style={styles.previewTopRow}>
                      <Badge label={diet.toUpperCase()} variant={diet === 'veg' ? 'success' : 'danger'} size="sm" />
                      <Text style={[styles.previewPriceText, { color: colors.primary }]}>₹{price}</Text>
                    </View>
                    <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{name || 'Recipe Name'}</Text>
                    <Text style={[styles.previewTagline, { color: colors.textSecondary }]}>{tagline || 'Appetizing tagline'}</Text>
                    <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
                      {cuisine} • {dishCategory} • {servings} Servings • {prepTimeMinutes}m prep • {cookTimeMinutes}m cook
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── DELIVERY COVERAGE & AREA FULFILMENT (MULTI-CITY SELECT) ── */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderIconCol}>
                    <Icon name="map-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      Delivery Coverage & Area Fulfilment *
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Select operational cities and check applicable sub-areas or neighbourhoods where this kit is fulfilled.
                    </Text>
                  </View>
                </View>

                {/* 1. Target Cities Dropdown Menu */}
                <View style={styles.dropdownSectionWrap}>
                  <View style={styles.dropdownSectionHeader}>
                    <Text style={[styles.subDropdownLabel, { color: colors.textSecondary }]}>
                      1. TARGET CITIES (SELECT APPLICABLE) *
                    </Text>
                    <View style={styles.headerQuickActions}>
                      <TouchableOpacity onPress={selectTopHubs}>
                        <Text style={[styles.quickActionText, { color: colors.primary }]}>Top Hubs</Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.textMuted }}>•</Text>
                      <TouchableOpacity onPress={clearAllCities}>
                        <Text style={[styles.quickActionText, { color: colors.danger }]}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setIsCityDropdownOpen(!isCityDropdownOpen);
                      setIsAreaDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: isCityDropdownOpen ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Icon name="business-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dropdownTriggerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {selectedCities.length === 0
                            ? 'No Cities Selected (Click to Select)'
                            : selectedCities.length === 1
                            ? `${selectedCities[0]}${getStateForCity(selectedCities[0] ?? '') ? `, ${getStateForCity(selectedCities[0] ?? '')}` : ''}`
                            : `${selectedCities.length} Cities Selected: ${selectedCities.join(', ')}`}
                        </Text>
                        <Text style={[styles.dropdownTriggerSub, { color: colors.textMuted }]}>
                          {availableSubRegions.length} deliverable sub-areas available • Click to toggle
                        </Text>
                      </View>
                    </View>
                    <Icon name={isCityDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* City Menu Content */}
                  {isCityDropdownOpen && (
                    <View style={[styles.dropdownMenuBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                      {/* Search */}
                      <View style={[styles.dropdownSearchWrap, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                        <Icon name="search" size={15} color={colors.textMuted} />
                        <TextInput
                          style={[styles.dropdownSearchInput, { color: colors.textPrimary }]}
                          placeholder="Search Indian operational cities..."
                          placeholderTextColor={colors.textMuted}
                          value={citySearch}
                          onChangeText={setCitySearch}
                        />
                      </View>

                      {/* Quick City Pills */}
                      <View style={[styles.quickCitiesBar, { borderBottomColor: colors.borderLight }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {POPULAR_CITIES.map((popCity: string) => {
                            const isCurrent = selectedCities.some((c) => c.toLowerCase() === popCity.toLowerCase());
                            return (
                              <TouchableOpacity
                                key={popCity}
                                onPress={() => toggleCity(popCity)}
                                style={[
                                  styles.quickCityPill,
                                  {
                                    backgroundColor: isCurrent ? colors.primary : colors.bgSubtle,
                                    borderColor: isCurrent ? colors.primary : colors.borderLight,
                                  },
                                ]}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isCurrent ? '#fff' : colors.textPrimary }}>
                                  {popCity}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Scrollable list */}
                      <ScrollView style={styles.dropdownScrollList} nestedScrollEnabled>
                        {filteredCities.map((c: GeoCityOption) => {
                          const isSelected = selectedCities.some((sc) => sc.toLowerCase() === c.name.toLowerCase());
                          return (
                            <TouchableOpacity
                              key={`${c.name}-${c.state}`}
                              onPress={() => toggleCity(c.name)}
                              style={[
                                styles.dropdownOptionRow,
                                {
                                  backgroundColor: isSelected ? `${colors.primary}0E` : 'transparent',
                                  borderColor: isSelected ? colors.primary : colors.borderLight,
                                },
                              ]}
                            >
                              <View style={styles.optionLeft}>
                                <View
                                  style={[
                                    styles.checkboxBox,
                                    {
                                      borderColor: isSelected ? colors.primary : colors.border,
                                      backgroundColor: isSelected ? colors.primary : 'transparent',
                                    },
                                  ]}
                                >
                                  {isSelected && <Icon name="check" size={12} color="#fff" />}
                                </View>
                                <View>
                                  <Text style={[styles.cityNameText, { color: colors.textPrimary, fontWeight: isSelected ? '700' : '600' }]}>
                                    {c.name} <Text style={{ fontSize: 11, color: colors.textMuted }}>({c.state})</Text>
                                  </Text>
                                  <Text style={[styles.cityCountText, { color: colors.textMuted }]}>
                                    {c.subRegionCount} sub-areas available
                                  </Text>
                                </View>
                              </View>
                              {isSelected && (
                                <View style={styles.activePillBadge}>
                                  <Text style={styles.activePillBadgeText}>Selected ✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <View style={[styles.dropdownFooter, { backgroundColor: colors.bgSubtle, borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.dropdownFooterText, { color: colors.textMuted }]}>
                          {selectedCities.length} of {filteredCities.length} cities selected
                        </Text>
                        <TouchableOpacity
                          onPress={() => setIsCityDropdownOpen(false)}
                          style={[styles.dropdownDoneBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.dropdownDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* 2. Sub-Areas Checklist (Grouped by City, No redundant green tags!) */}
                <View style={[styles.dropdownSectionWrap, { marginTop: 14 }]}>
                  <View style={styles.dropdownSectionHeader}>
                    <Text style={[styles.subDropdownLabel, { color: colors.textSecondary }]}>
                      2. SUB-AREAS & NEIGHBOURHOODS (CHECK APPLICABLE) *
                    </Text>
                    <View style={styles.headerQuickActions}>
                      <TouchableOpacity onPress={selectAllSubAreas}>
                        <Text style={[styles.quickActionText, { color: colors.primary }]}>
                          Check All ({availableSubRegions.length})
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.textMuted }}>•</Text>
                      <TouchableOpacity onPress={clearAllSubAreas}>
                        <Text style={[styles.quickActionText, { color: colors.danger }]}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setIsAreaDropdownOpen(!isAreaDropdownOpen);
                      setIsCityDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: isAreaDropdownOpen ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Icon name="map-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dropdownTriggerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {selectedSubAreas.length === availableSubRegions.length && availableSubRegions.length > 0
                            ? `All ${availableSubRegions.length} Sub-Areas Selected across ${selectedCities.length} Cities`
                            : selectedSubAreas.length > 0
                            ? `${selectedSubAreas.length} of ${availableSubRegions.length} Sub-Areas Selected`
                            : selectedCities.length === 0
                            ? 'Select operational cities above first'
                            : 'No Sub-Areas Selected (Click to Check)'}
                        </Text>
                        <Text style={[styles.dropdownTriggerSub, { color: colors.textMuted }]}>
                          {isAreaDropdownOpen ? 'Click to close checklist' : 'Click to manually check or uncheck individual areas'}
                        </Text>
                      </View>
                    </View>
                    <Icon name={isAreaDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Area Checklist Card */}
                  {isAreaDropdownOpen && (
                    <View style={[styles.dropdownMenuBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                      <View style={[styles.dropdownSearchWrap, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                        <Icon name="search" size={15} color={colors.textMuted} />
                        <TextInput
                          style={[styles.dropdownSearchInput, { color: colors.textPrimary }]}
                          placeholder="Search sub-areas or pincodes..."
                          placeholderTextColor={colors.textMuted}
                          value={areaSearch}
                          onChangeText={setAreaSearch}
                        />
                      </View>

                      <ScrollView style={styles.dropdownScrollList} nestedScrollEnabled>
                        {selectedCities.length === 0 ? (
                          <View style={styles.emptyListWrap}>
                            <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                              Please select at least one city above first.
                            </Text>
                          </View>
                        ) : subRegionsByCity.length === 0 ? (
                          <View style={styles.emptyListWrap}>
                            <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                              No sub-areas match "{areaSearch}"
                            </Text>
                          </View>
                        ) : (
                          subRegionsByCity.map(({ city, subRegions: citySubs }) => {
                            const citySubIds = citySubs.map((sr) => sr.id);
                            const allCityChecked =
                              citySubIds.length > 0 && citySubIds.every((id) => selectedSubAreas.includes(id));
                            const checkedCount = citySubIds.filter((id) => selectedSubAreas.includes(id)).length;

                            return (
                              <View key={city} style={styles.cityGroupWrap}>
                                <View style={[styles.cityGroupHeader, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.cityGroupTitle, { color: colors.textPrimary }]}>
                                      {city.toUpperCase()}
                                    </Text>
                                    <Text style={[styles.cityGroupSub, { color: colors.textMuted }]}>
                                      {checkedCount} of {citySubs.length} areas active
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => toggleCitySubAreas(city)}
                                    style={styles.cityGroupToggleBtn}
                                  >
                                    <Text style={[styles.cityGroupToggleBtnText, { color: colors.primary }]}>
                                      {allCityChecked ? 'Uncheck All' : 'Check All'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>

                                {citySubs.map((sub) => {
                                  const isChecked = selectedSubAreas.includes(sub.id);
                                  return (
                                    <TouchableOpacity
                                      key={sub.id}
                                      onPress={() => toggleSubArea(sub.id)}
                                      style={[
                                        styles.dropdownOptionRow,
                                        {
                                          backgroundColor: isChecked ? `${colors.primary}0D` : 'transparent',
                                          borderColor: isChecked ? colors.primary : colors.borderLight,
                                          marginBottom: 4,
                                        },
                                      ]}
                                    >
                                      <View style={styles.optionLeft}>
                                        <View
                                          style={[
                                            styles.checkboxBox,
                                            {
                                              backgroundColor: isChecked ? colors.primary : colors.bgSurface,
                                              borderColor: isChecked ? colors.primary : colors.border,
                                            },
                                          ]}
                                        >
                                          {isChecked && <Icon name="check" size={12} color="#fff" />}
                                        </View>
                                        <View>
                                          <Text style={[styles.cityNameText, { color: colors.textPrimary, fontWeight: isChecked ? '700' : '600' }]}>
                                            {sub.name}
                                          </Text>
                                          <Text style={[styles.cityCountText, { color: colors.textMuted }]}>
                                            {sub.pincodes && sub.pincodes.length > 0
                                              ? `Pincodes: ${sub.pincodes.join(', ')}`
                                              : 'Standard Hub'}
                                          </Text>
                                        </View>
                                      </View>
                                      {isChecked && (
                                        <View style={styles.activePillBadge}>
                                          <Text style={styles.activePillBadgeText}>Deliverable ✓</Text>
                                        </View>
                                      )}
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            );
                          })
                        )}
                      </ScrollView>

                      <View style={[styles.dropdownFooter, { backgroundColor: colors.bgSubtle, borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.dropdownFooterText, { color: colors.textMuted }]}>
                          {selectedSubAreas.length} sub-areas activated across {selectedCities.length} cities
                        </Text>
                        <TouchableOpacity
                          onPress={() => setIsAreaDropdownOpen(false)}
                          style={[styles.dropdownDoneBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.dropdownDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Shelf-Life & Nutrition */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                  Shelf-Life & Storage Conditions
                </Text>

                <View style={styles.formRow2}>
                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>SHELF LIFE (DAYS)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={shelfLifeDays}
                      onChangeText={setShelfLifeDays}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>STORAGE CONDITION</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgSubtle, borderColor: colors.border, color: colors.textPrimary }]}
                      value={storageCondition}
                      onChangeText={setStorageCondition}
                    />
                  </View>
                </View>

                {/* Nutrition Estimator */}
                <View style={styles.nutritionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 13 }]}>
                      Nutrition Facts (Per Serving)
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      {nutrition.calories} kcal • {nutrition.protein}g Protein • {nutrition.carbs}g Carbs • {nutrition.fat}g Fat
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleEstimateNutrition}
                    disabled={isEstimatingNutrition}
                    style={[styles.estimateBtn, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}
                  >
                    {isEstimatingNutrition ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Icon name="sparkles" size={14} color={colors.primary} />
                        <Text style={[styles.estimateBtnText, { color: colors.primary }]}>AI Estimator</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 12-Item Quality Readiness Checklist */}
              <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      12-Item Quality Readiness Checklist
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Validates recipe completeness and operational requirements before publishing.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checklistCountBadge,
                      { backgroundColor: allChecksPassed ? '#ECFDF5' : '#FEF3C7', borderColor: allChecksPassed ? '#A7F3D0' : '#FDE68A' },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: allChecksPassed ? '#065F46' : '#92400E' }}>
                      {passedChecksCount} / {readinessChecks.length} Passed
                    </Text>
                  </View>
                </View>

                <View style={styles.checksList}>
                  {readinessChecks.map((check) => (
                    <View key={check.key} style={styles.checkItemRow}>
                      <Icon
                        name={check.isValid ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={check.isValid ? '#10B981' : '#EF4444'}
                      />
                      <Text style={[styles.checkItemLabel, { color: colors.textPrimary }]}>{check.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── 4. STICKY BOTTOM BAR (MATCHING CHEF STUDIO) ── */}
        <View style={[styles.bottomBar, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderLight }]}>
          <View style={styles.bottomBarLeft}>
            {currentStageIndex > 0 ? (
              <TouchableOpacity
                onPress={() => setCurrentStage(STAGE_CONFIGS[currentStageIndex - 1]!.key)}
                style={[styles.bottomNavBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}
              >
                <Icon name="arrow-back" size={16} color={colors.textPrimary} />
                <Text style={[styles.bottomNavBtnText, { color: colors.textPrimary }]}>Previous</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onClose}
                style={[styles.bottomNavBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}
              >
                <Text style={[styles.bottomNavBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.stageProgressText, { color: colors.textMuted }]}>
              Stage {currentStageIndex + 1} of 4 • {STAGE_CONFIGS[currentStageIndex]!.label}
            </Text>
          </View>

          <View style={styles.bottomBarRight}>
            {currentStageIndex < STAGE_CONFIGS.length - 1 ? (
              <TouchableOpacity
                onPress={() => setCurrentStage(STAGE_CONFIGS[currentStageIndex + 1]!.key)}
                style={[styles.bottomNextBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.bottomNextBtnText}>Next Stage</Text>
                <Icon name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSaveMealKit}
                disabled={isSaving}
                style={[styles.bottomNextBtn, { backgroundColor: colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark" size={16} color="#fff" />
                    <Text style={styles.bottomNextBtnText}>
                      {isEditing ? 'Save & Update Meal Kit' : 'Publish to Catalog'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Preset Photos Modal */}
        {showPhotoPickerModal && (
          <Modal transparent visible={showPhotoPickerModal} animationType="fade" onRequestClose={() => setShowPhotoPickerModal(false)}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.presetModalBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                <View style={styles.presetModalHeader}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Choose Preset Food Photo</Text>
                  <TouchableOpacity onPress={() => setShowPhotoPickerModal(false)}>
                    <Icon name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 380 }}>
                  <View style={styles.presetGrid}>
                    {SAMPLE_RECIPE_THUMBNAILS.map((thumb) => (
                      <TouchableOpacity
                        key={thumb.id}
                        onPress={() => {
                          setHeroImage(thumb.url);
                          setShowPhotoPickerModal(false);
                        }}
                        style={[styles.presetThumbItem, { borderColor: heroImage === thumb.url ? colors.primary : colors.borderLight }]}
                      >
                        <Image source={{ uri: thumb.url }} style={styles.presetThumbImg} resizeMode="cover" />
                        <Text style={[styles.presetThumbLabel, { color: colors.textPrimary }]}>{thumb.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  breadcrumbText: {
    fontSize: 11,
  },
  breadcrumbDivider: {
    fontSize: 11,
  },
  breadcrumbCurrent: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerQuickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerQuickSaveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepNavBar: {
    borderBottomWidth: 1,
    height: 62,
    justifyContent: 'center',
  },
  stepNavScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  stepNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  stepConnector: {
    width: 24,
    height: 2,
    marginHorizontal: 4,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepNavTextCol: {},
  stepNavLabel: {
    fontSize: 12,
  },
  stepNavSubtitle: {
    fontSize: 10,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stageWrap: {
    gap: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardHeaderIconCol: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  heroPhotoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  heroPhotoPreview: {
    width: 120,
    height: 100,
    borderRadius: 10,
  },
  heroPhotoControls: {
    flex: 1,
    gap: 10,
  },
  photoActionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoUrlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  applyUrlBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  applyUrlBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  formRow2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formRow3: {
    flexDirection: 'row',
    gap: 10,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  currencyPrefix: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
    fontWeight: '800',
    fontSize: 14,
  },
  inputWithPrefix: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 26,
    paddingRight: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dietCard: {
    width: '31%',
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
  },
  dietCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dietIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietCardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  dietCardDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  pillRowScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  selectionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  selectionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  spiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  spicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  spicePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterCheckPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  inventorySuggestionsList: {
    gap: 6,
  },
  inventorySuggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  inventoryItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  inventoryItemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addPillBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addCustomIngRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  unitPickerWrap: {
    maxWidth: 160,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 4,
  },
  addBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  ingNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingNumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  ingItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ingItemQty: {
    fontSize: 11,
  },
  ingRemoveBtn: {
    padding: 4,
  },
  emptyPrompt: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },
  spiceCatalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  spiceCatalogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  spiceCatalogPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepCardItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitleInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  stepOrderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  orderBtn: {
    padding: 4,
  },
  stepInstructionInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 56,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  stepPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepPhotoThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  stepPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPhotoOptions: {
    flex: 1,
  },
  stepSampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  stepSampleChipImg: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  stepSampleChipText: {
    fontSize: 10,
    fontWeight: '600',
    paddingRight: 4,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addStepBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  previewCardWrap: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewHeroImg: {
    width: '100%',
    height: 140,
  },
  previewCardBody: {
    padding: 12,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewPriceText: {
    fontSize: 16,
    fontWeight: '900',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewTagline: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 11,
  },
  dropdownSectionWrap: {
    marginTop: 6,
  },
  dropdownSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subDropdownLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  dropdownTriggerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownTriggerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdownMenuBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  dropdownSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 12,
  },
  quickCitiesBar: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  quickCityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  dropdownScrollList: {
    maxHeight: 240,
    padding: 8,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityNameText: {
    fontSize: 12,
  },
  cityCountText: {
    fontSize: 10,
  },
  activePillBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  dropdownFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  dropdownFooterText: {
    fontSize: 11,
  },
  dropdownDoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dropdownDoneBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyListWrap: {
    padding: 16,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cityGroupWrap: {
    marginBottom: 8,
  },
  cityGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  cityGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  cityGroupSub: {
    fontSize: 10,
  },
  cityGroupToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
  },
  cityGroupToggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  estimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  estimateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  checksList: {
    gap: 6,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkItemLabel: {
    fontSize: 12,
  },
  bottomBar: {
    borderTopWidth: 1,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bottomNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stageProgressText: {
    fontSize: 12,
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  bottomNextBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  presetModalBox: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  presetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetThumbItem: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  presetThumbImg: {
    width: '100%',
    height: 80,
  },
  presetThumbLabel: {
    fontSize: 11,
    fontWeight: '700',
    padding: 6,
    textAlign: 'center',
  },
});
