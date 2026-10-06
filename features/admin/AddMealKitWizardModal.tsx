import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CuisineType,
  DietTag,
  DishCategory,
  MealKit,
  NutritionFacts,
  RegionHub,
  SachetItem,
  SpiceLevel,
  COMMON_ALLERGENS,
  compileMealKitTags,
  parseCategorizedTags,
} from '../../framework/services/mealKitsService';
import { STORAGE_CENTRE_REGIONS } from '../../framework/services/adminRbacService';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AppIconName, Icon } from '../../framework/ui/Icon';
import {
  AI_STEP_PREPARATION_PRESETS,
  generateDishPhotoWithAI,
  generateStepPhotoWithAI,
} from './aiPhotoGeneratorService';
import { estimateNutritionWithAI, NutritionEstimationResult } from './nutritionEstimatorService';
import {
  RecipeCardBackView,
  RecipeCardFrontView,
  RecipeCardPrintModal,
} from './RecipeCardPrintModal';
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

export interface SpiceCatalogItem {
  name: string;
  hindi?: string;
  category: 'Whole' | 'Ground' | 'Blend' | 'Herb/Seed' | 'Seasoning';
  defaultQty?: string;
}

export const MASTER_SPICE_CATALOG: SpiceCatalogItem[] = [
  // Whole Spices (Khada Masala)
  { name: 'Jeera (Cumin Seeds)', hindi: 'जीरा', category: 'Whole', defaultQty: '1 tsp' },
  {
    name: 'Sabut Dhaniya (Coriander Seeds)',
    hindi: 'साबुत धनिया',
    category: 'Whole',
    defaultQty: '1 tsp',
  },
  {
    name: 'Elaichi (Green Cardamom)',
    hindi: 'हरी इलायची',
    category: 'Whole',
    defaultQty: '3 pods',
  },
  {
    name: 'Badi Elaichi (Black Cardamom)',
    hindi: 'बड़ी इलायची',
    category: 'Whole',
    defaultQty: '1 pod',
  },
  { name: 'Dalchini (Cinnamon Stick)', hindi: 'दालचीनी', category: 'Whole', defaultQty: '1 stick' },
  { name: 'Laung (Cloves)', hindi: 'लौंग', category: 'Whole', defaultQty: '4 pieces' },
  {
    name: 'Tejpatta (Indian Bay Leaf)',
    hindi: 'तेजपत्ता',
    category: 'Whole',
    defaultQty: '2 leaves',
  },
  {
    name: 'Kali Mirch (Black Peppercorns)',
    hindi: 'काली मिर्च',
    category: 'Whole',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Star Anise (Chakra Phool)',
    hindi: 'चक्र फूल',
    category: 'Whole',
    defaultQty: '1 piece',
  },
  { name: 'Mace (Javitri)', hindi: 'जावित्री', category: 'Whole', defaultQty: '1 blade' },
  { name: 'Jaiphal (Nutmeg)', hindi: 'जायफल', category: 'Whole', defaultQty: '0.25 tsp' },
  {
    name: 'Shahi Jeera (Caraway Seeds)',
    hindi: 'शाही जीरा',
    category: 'Whole',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Mustard Seeds (Rai / Sarson)',
    hindi: 'राई / सरसों',
    category: 'Whole',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Methi Seeds (Fenugreek Seeds)',
    hindi: 'मेथी दाना',
    category: 'Whole',
    defaultQty: '0.25 tsp',
  },
  { name: 'Saunf (Fennel Seeds)', hindi: 'सौंफ', category: 'Whole', defaultQty: '0.5 tsp' },
  { name: 'Ajwain (Carom Seeds)', hindi: 'अजवाइन', category: 'Whole', defaultQty: '0.25 tsp' },
  { name: 'Kalonji (Nigella Seeds)', hindi: 'कलौंजी', category: 'Whole', defaultQty: '0.25 tsp' },
  { name: 'White Sesame Seeds (Til)', hindi: 'सफेद तिल', category: 'Whole', defaultQty: '1 tsp' },
  { name: 'Khus Khus (Poppy Seeds)', hindi: 'खसखस', category: 'Whole', defaultQty: '1 tsp' },

  // Ground Masalas (Pisa Masala)
  {
    name: 'Haldi (Turmeric Powder)',
    hindi: 'हल्दी पाउडर',
    category: 'Ground',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Kashmiri Red Chilli Powder',
    hindi: 'कश्मीरी लाल मिर्च',
    category: 'Ground',
    defaultQty: '1 tsp',
  },
  {
    name: 'Lal Mirch (Spicy Red Chilli)',
    hindi: 'तीखी लाल मिर्च',
    category: 'Ground',
    defaultQty: '0.5 tsp',
  },
  { name: 'Degi Mirch Powder', hindi: 'देगी मिर्च', category: 'Ground', defaultQty: '1 tsp' },
  {
    name: 'Dhaniya Powder (Coriander)',
    hindi: 'धनिया पाउडर',
    category: 'Ground',
    defaultQty: '1.5 tsp',
  },
  {
    name: 'Jeera Powder (Roasted Cumin)',
    hindi: 'भुना जीरा पाउडर',
    category: 'Ground',
    defaultQty: '1 tsp',
  },
  {
    name: 'Kali Mirch Powder (Black Pepper)',
    hindi: 'काली मिर्च पाउडर',
    category: 'Ground',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Amchur (Dry Mango Powder)',
    hindi: 'आमचूर पाउडर',
    category: 'Ground',
    defaultQty: '0.75 tsp',
  },
  {
    name: 'Saunth (Dry Ginger Powder)',
    hindi: 'सोंठ पाउडर',
    category: 'Ground',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Anardana Powder (Pomegranate)',
    hindi: 'अनारदाना',
    category: 'Ground',
    defaultQty: '0.5 tsp',
  },

  // Blends & Special Masalas
  { name: 'Garam Masala (Chef Blend)', hindi: 'गरम मसाला', category: 'Blend', defaultQty: '1 tsp' },
  { name: 'Chaat Masala', hindi: 'चाट मसाला', category: 'Blend', defaultQty: '0.5 tsp' },
  { name: 'Kitchen King Masala', hindi: 'किचन किंग', category: 'Blend', defaultQty: '1 tsp' },
  {
    name: 'Chana Masala (Chole Blend)',
    hindi: 'चना मसाला',
    category: 'Blend',
    defaultQty: '1.5 tsp',
  },
  {
    name: 'Biryani Masala (Potli Blend)',
    hindi: 'बिरयानी मसाला',
    category: 'Blend',
    defaultQty: '2 tsp',
  },
  { name: 'Pav Bhaji Masala', hindi: 'पाव भाजी मसाला', category: 'Blend', defaultQty: '1.5 tsp' },
  { name: 'Sambhar Masala', hindi: 'सांभर मसाला', category: 'Blend', defaultQty: '2 tsp' },
  { name: 'Rasam Powder', hindi: 'रसम पाउडर', category: 'Blend', defaultQty: '1.5 tsp' },
  {
    name: 'Panch Phoron (Bengali 5-Spice)',
    hindi: 'पांच फोड़न',
    category: 'Blend',
    defaultQty: '1 tsp',
  },
  { name: 'Tandoori Tikka Masala', hindi: 'तंदूरी मसाला', category: 'Blend', defaultQty: '2 tsp' },
  {
    name: 'Kadhai Masala (Crushed)',
    hindi: 'कढ़ाई मसाला',
    category: 'Blend',
    defaultQty: '1.5 tsp',
  },

  // Herbs & Seasonings
  {
    name: 'Kasuri Methi (Fenugreek Leaves)',
    hindi: 'कसूरी मेथी',
    category: 'Herb/Seed',
    defaultQty: '1 tbsp',
  },
  { name: 'Hing (Asafoetida)', hindi: 'हींग', category: 'Seasoning', defaultQty: '1 pinch' },
  {
    name: 'Kala Namak (Black Salt)',
    hindi: 'काला नमक',
    category: 'Seasoning',
    defaultQty: '0.5 tsp',
  },
  {
    name: 'Sendha Namak (Rock Salt)',
    hindi: 'सेंधा नमक',
    category: 'Seasoning',
    defaultQty: '1 tsp',
  },
  {
    name: 'Saffron Strands (Kesar)',
    hindi: 'केसर',
    category: 'Seasoning',
    defaultQty: '6 strands',
  },
  {
    name: 'Curry Leaves (Dried / Flaked)',
    hindi: 'कढ़ी पत्ता',
    category: 'Herb/Seed',
    defaultQty: '8 leaves',
  },
];

export const COMMON_INDIAN_SPICES = MASTER_SPICE_CATALOG.map((s) => s.name);

export const SPICE_QUANTITY_PRESETS = [
  '0.25 tsp',
  '0.5 tsp',
  '0.75 tsp',
  '1 tsp',
  '1.5 tsp',
  '2 tsp',
  '1 tbsp',
  '2 tbsp',
  '2g',
  '5g',
  '10g',
  '1 piece',
  '2 pieces',
  '1 pinch',
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step5Error, setStep5Error] = useState<string | null>(null);
  const prevVisibleRef = useRef(false);
  const prevKitIdRef = useRef<string | undefined>(undefined);

  const { isSuperAdmin, assignedRegions } = useAuth();

  const resolveZonesFromAssigned = (regions?: (RegionHub | string)[]): RegionHub[] => {
    if (!regions || regions.length === 0) return ['North'];
    const zones = new Set<RegionHub>();
    for (const reg of regions) {
      if (['North', 'South', 'West', 'East'].includes(reg as RegionHub)) {
        zones.add(reg as RegionHub);
      } else {
        const sc = STORAGE_CENTRE_REGIONS.find((r) => r.id === reg);
        if (sc) zones.add(sc.zone);
      }
    }
    return zones.size > 0 ? Array.from(zones) : ['North'];
  };

  // Step 1: Dish Basics
  const [name, setName] = useState(initialKit?.name || '');
  const [hindiName, setHindiName] = useState(initialKit?.hindiName || '');
  const [tagline, setTagline] = useState(initialKit?.tagline || '');
  const [cuisine, setCuisine] = useState<CuisineType>(initialKit?.cuisine || 'North Indian');
  const [diet, setDiet] = useState<DietTag>(initialKit?.diet || 'veg');
  const [dishCategory, setDishCategory] = useState<DishCategory>(
    initialKit?.dishCategory || 'Curries & Gravies',
  );
  const [selectedRegions, setSelectedRegions] = useState<RegionHub[]>(
    initialKit?.availableRegions && initialKit.availableRegions.length > 0
      ? initialKit.availableRegions
      : isSuperAdmin
        ? ['North', 'South', 'West', 'East']
        : resolveZonesFromAssigned(assignedRegions),
  );
  const [selectedStorageCentres, setSelectedStorageCentres] = useState<string[]>(
    initialKit?.availableStorageCentres || [],
  );
  const [isTrending, setIsTrending] = useState<boolean>(initialKit?.isTrending ?? false);
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>(initialKit?.spiceLevel || 'Medium');
  const [servings, setServings] = useState(initialKit ? String(initialKit.servings) : '');
  const [prepTime, setPrepTime] = useState(initialKit ? String(initialKit.prepTimeMinutes) : '');
  const [cookTime, setCookTime] = useState(initialKit ? String(initialKit.cookTimeMinutes) : '');
  const [price, setPrice] = useState(initialKit ? String(initialKit.price) : '');
  const [heroImage, setHeroImage] = useState(initialKit?.heroImage || '');

  // Tags & Allergens State
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    initialKit?.allergens || (initialKit?.diet === 'nonveg' ? [] : ['Dairy']),
  );
  const [customAllergenInput, setCustomAllergenInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>(
    initialKit?.tags
      ? initialKit.tags
          .filter(
            (t) =>
              !['Diet:', 'Cuisine:', 'Dish:', 'Region:', 'Allergy:'].some((p) => t.startsWith(p)),
          )
          .map((t) => t.replace(/^Tag:\s*/i, ''))
      : [],
  );
  const [customTagInput, setCustomTagInput] = useState('');

  // City targeting: empty = all cities in hub, otherwise explicit city list
  const [allCitiesMode, setAllCitiesMode] = useState<boolean>(
    !initialKit?.cities || initialKit.cities.length === 0,
  );
  const [kitCities, setKitCities] = useState<string[]>(initialKit?.cities || []);
  const [cityInputValue, setCityInputValue] = useState('');

  // Dish Photo Customization (Upload & AI)
  type PhotoMode = 'ai' | 'upload' | 'presets';
  const [photoMode, setPhotoMode] = useState<PhotoMode>('ai');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [photoStyle, setPhotoStyle] = useState<'handi' | 'finedining' | 'flatlay'>('handi');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [photoBadge, setPhotoBadge] = useState(
    initialKit?.heroImage ? 'Existing Photo' : 'No Photo Selected',
  );

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
              showWebSafeAlert('Photo Uploaded', 'Your custom dish presentation photo is ready.');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      showWebSafeAlert(
        'Upload Photo',
        'Please enter the photo URL below or select AI Generation on this device.',
      );
    }
  };

  const handleGenerateAiPhoto = async () => {
    if (!name.trim()) {
      showWebSafeAlert(
        'Dish Name Required',
        'Please enter a dish name first so the AI can craft an authentic presentation photo.',
      );
      return;
    }
    setIsGeneratingPhoto(true);
    try {
      const result = await generateDishPhotoWithAI({
        dishName: name.trim(),
        hindiName: hindiName.trim(),
        tagline: tagline.trim(),
        cuisine,
        diet,
        spiceLevel,
        ingredients: ingredients.map((i) => i.name),
        sachets: sachets.map((s) => s.name),
        presentationStyle: photoStyle,
      });
      setHeroImage(result.imageUrl);
      setPhotoBadge(`AI Generated (${result.presentationStyle})`);
      showWebSafeAlert(
        'AI Photo Generated',
        `Gourmet presentation photo generated for "${name.trim()}" in ${result.presentationStyle} style.`,
      );
    } catch {
      showWebSafeAlert('Notice', 'Using chef presentation library.');
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customPhotoUrl.trim()) return;
    setHeroImage(customPhotoUrl.trim());
    setPhotoBadge('Custom Web URL');
    setCustomPhotoUrl('');
    showWebSafeAlert('Photo Updated', 'Custom dish image URL applied.');
  };

  // Step 2: Fresh Produce & Groceries
  const [ingredients, setIngredients] = useState<
    { name: string; quantity: string; isMasalaSachet: boolean }[]
  >(
    initialKit?.ingredients
      ?.filter((i) => !i.isMasalaSachet)
      .map((i) => ({
        name: i.name,
        quantity: i.quantity,
        isMasalaSachet: false,
      })) || [],
  );
  const [newFreshName, setNewFreshName] = useState('');
  const [newFreshQty, setNewFreshQty] = useState('');

  // Step 2: Pre-Portioned Masala Sachets (Multi-Sachet Mix)
  const [sachets, setSachets] = useState<SachetItem[]>(() => {
    if (initialKit?.sachets && initialKit.sachets.length > 0) {
      return initialKit.sachets;
    }
    if (initialKit?.masalaSachets && initialKit.masalaSachets.length > 0) {
      return initialKit.masalaSachets.map((mName, idx) => ({
        id: `sachet-${idx + 1}`,
        name: mName,
        spices: [],
      }));
    }
    return [];
  });
  const [sachetDrafts, setSachetDrafts] = useState<
    Record<string, { spiceName: string; quantity: string; searchQuery: string }>
  >({});

  // Step 3: Step-by-Step Recipe Guide
  const [recipeSteps, setRecipeSteps] = useState<
    {
      stepNumber: number;
      title: string;
      instruction: string;
      timerSeconds?: number;
      tip?: string;
      imageUrl?: string;
    }[]
  >(initialKit?.recipeSteps || []);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepInstruction, setNewStepInstruction] = useState('');
  const [newStepMinutes, setNewStepMinutes] = useState('');
  const [newStepTip, setNewStepTip] = useState('');

  // Step 3 Photo Management State (Upload, Presets & AI Contextual Generation)
  type StepPhotoMode = 'ai' | 'upload' | 'presets';
  const [newStepPhotoMode, setNewStepPhotoMode] = useState<StepPhotoMode>('ai');
  const [newStepPhotoUrl, setNewStepPhotoUrl] = useState('');
  const [customStepPhotoUrl, setCustomStepPhotoUrl] = useState('');
  const [isGeneratingStepPhoto, setIsGeneratingStepPhoto] = useState(false);
  const [stepAiBadge, setStepAiBadge] = useState('');

  // Live Card Preview in Step 3
  const [cardPreviewSide, setCardPreviewSide] = useState<'front' | 'back'>('front');
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // Step 4: AI Nutrition Estimator
  const [nutrition, setNutrition] = useState<NutritionFacts>(
    initialKit?.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const [isEstimatingAI, setIsEstimatingAI] = useState(false);
  const [aiBreakdown, setAiBreakdown] = useState<NutritionEstimationResult | null>(null);

  // Form Reset Function (Blanks out all fields, ingredients, sachets & steps)
  const resetForm = () => {
    setName('');
    setHindiName('');
    setTagline('');
    setCuisine('North Indian');
    setDiet('veg');
    setDishCategory('Curries & Gravies');
    setSelectedRegions(
      isSuperAdmin ? ['North', 'South', 'West', 'East'] : resolveZonesFromAssigned(assignedRegions),
    );
    setSelectedStorageCentres([]);
    setSelectedAllergens(['Dairy']);
    setCustomAllergenInput('');
    setCustomTags([]);
    setCustomTagInput('');
    setIsTrending(false);
    setSpiceLevel('Medium');
    setServings('');
    setPrepTime('');
    setCookTime('');
    setPrice('');
    setHeroImage('');
    setPhotoBadge('No Photo Selected');
    setAllCitiesMode(true);
    setKitCities([]);
    setCityInputValue('');
    setIngredients([]);
    setSachets([]);
    setSachetDrafts({});
    setNewFreshName('');
    setNewFreshQty('');
    setRecipeSteps([]);
    setNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    setAiBreakdown(null);
    setNewStepTitle('');
    setNewStepInstruction('');
    setNewStepMinutes('');
    setNewStepTip('');
    setNewStepPhotoUrl('');
    setCustomStepPhotoUrl('');
    setStepAiBadge('');
    setStep1Error(null);
    setStep5Error(null);
    setCurrentStep(1);
  };

  // Reset or populate fields only when modal opens or initialKit ID changes
  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    const isKitChanged = Boolean(initialKit && initialKit.id !== prevKitIdRef.current);

    if (visible && (isOpening || isKitChanged)) {
      prevKitIdRef.current = initialKit?.id;
      if (initialKit) {
        setName(initialKit.name || '');
        setHindiName(initialKit.hindiName || '');
        setTagline(initialKit.tagline || '');
        setCuisine(initialKit.cuisine || 'North Indian');
        setDiet(initialKit.diet || 'veg');
        setDishCategory(initialKit.dishCategory || 'Curries & Gravies');
        setSelectedRegions(
          initialKit.availableRegions && initialKit.availableRegions.length > 0
            ? initialKit.availableRegions
            : isSuperAdmin
              ? ['North', 'South', 'West', 'East']
              : resolveZonesFromAssigned(assignedRegions),
        );
        setSelectedStorageCentres(initialKit.availableStorageCentres || []);
        setSelectedAllergens(
          initialKit.allergens && initialKit.allergens.length > 0
            ? initialKit.allergens
            : initialKit.diet === 'nonveg'
              ? []
              : ['Dairy'],
        );
        setCustomAllergenInput('');
        setCustomTags(
          initialKit.tags
            ? initialKit.tags
                .filter(
                  (t) =>
                    !['Diet:', 'Cuisine:', 'Dish:', 'Region:', 'Allergy:'].some((p) =>
                      t.startsWith(p),
                    ),
                )
                .map((t) => t.replace(/^Tag:\s*/i, ''))
            : [],
        );
        setCustomTagInput('');
        setIsTrending(initialKit.isTrending ?? false);
        setSpiceLevel(initialKit.spiceLevel || 'Medium');
        setServings(initialKit.servings ? String(initialKit.servings) : '');
        setPrepTime(initialKit.prepTimeMinutes ? String(initialKit.prepTimeMinutes) : '');
        setCookTime(initialKit.cookTimeMinutes ? String(initialKit.cookTimeMinutes) : '');
        setPrice(initialKit.price ? String(initialKit.price) : '');
        setHeroImage(initialKit.heroImage || '');
        setPhotoBadge(initialKit.heroImage ? 'Existing Photo' : 'No Photo Selected');
        setAllCitiesMode(!initialKit.cities || initialKit.cities.length === 0);
        setKitCities(initialKit.cities || []);
        setCityInputValue('');
        setIngredients(
          initialKit.ingredients
            ?.filter((i) => !i.isMasalaSachet)
            .map((i) => ({
              name: i.name,
              quantity: i.quantity,
              isMasalaSachet: false,
            })) || [],
        );
        if (initialKit.sachets && initialKit.sachets.length > 0) {
          setSachets(initialKit.sachets);
        } else if (initialKit.masalaSachets && initialKit.masalaSachets.length > 0) {
          setSachets(
            initialKit.masalaSachets.map((mName, idx) => ({
              id: `sachet-${idx + 1}`,
              name: mName,
              spices: [],
            })),
          );
        } else {
          setSachets([]);
        }
        setRecipeSteps(
          initialKit.recipeSteps?.map((s, idx) => ({
            stepNumber: s.stepNumber || idx + 1,
            title: s.title || '',
            instruction: s.instruction || '',
            timerSeconds: s.timerSeconds,
            tip: s.tip,
            imageUrl: s.imageUrl,
          })) || [],
        );
        setNutrition(
          initialKit.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );
      } else {
        resetForm();
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, initialKit?.id]);

  // Real-time Live Nutrition Calculation based on all fresh ingredients + all sachet spices
  useEffect(() => {
    const s = parseInt(servings) || 2;
    const freshItems = ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      isMasalaSachet: false,
    }));
    const sachetItems = sachets.flatMap((sachet) =>
      sachet.spices.map((spice) => ({
        name: spice.name,
        quantity: spice.quantity,
        isMasalaSachet: true,
      })),
    );
    const combined = [...freshItems, ...sachetItems];

    if (combined.length === 0) {
      setNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      setAiBreakdown(null);
      return;
    }

    const result = estimateNutritionWithAI(combined, s);
    setNutrition(result.perServing);
    setAiBreakdown(result);
  }, [ingredients, sachets, servings]);

  // Fresh produce handlers
  const handleAddFreshIngredient = () => {
    if (!newFreshName.trim()) {
      showWebSafeAlert('Missing Name', 'Please enter the produce / grocery name.');
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        name: newFreshName.trim(),
        quantity: newFreshQty.trim() || '1 portion',
        isMasalaSachet: false,
      },
    ]);
    setNewFreshName('');
    setNewFreshQty('');
  };

  const handleRemoveFreshIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFreshIngredientQty = (index: number, newQty: string) => {
    setIngredients((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item)),
    );
  };

  // Masala Sachet Management Handlers
  const handleAddSachet = () => {
    const nextNum = sachets.length + 1;
    const newId = `sachet-${Date.now()}-${nextNum}`;
    const newSachet: SachetItem = {
      id: newId,
      name: `Sachet ${nextNum}: Masala Blend`,
      spices: [],
    };
    setSachets((prev) => [...prev, newSachet]);
    setSachetDrafts((prev) => ({
      ...prev,
      [newId]: { spiceName: '', quantity: '1 tsp', searchQuery: '' },
    }));
  };

  const handleRemoveSachet = (id: string) => {
    setSachets((prev) => prev.filter((s) => s.id !== id));
    setSachetDrafts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleUpdateSachetName = (id: string, name: string) => {
    setSachets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleUpdateSachetDraft = (
    sachetId: string,
    updates: Partial<{ spiceName: string; quantity: string; searchQuery: string }>,
  ) => {
    setSachetDrafts((prev) => {
      const current = prev[sachetId] || { spiceName: '', quantity: '1 tsp', searchQuery: '' };
      return {
        ...prev,
        [sachetId]: { ...current, ...updates },
      };
    });
  };

  const handleAddSpiceToSachet = (sachetId: string) => {
    const draft = sachetDrafts[sachetId] || { spiceName: '', quantity: '1 tsp', searchQuery: '' };
    const spiceToAdd = (draft.spiceName || draft.searchQuery || '').trim();
    if (!spiceToAdd) {
      showWebSafeAlert('Missing Spice', 'Please search and select a spice, or enter a spice name.');
      return;
    }
    const qty = (draft.quantity || '1 tsp').trim();
    setSachets((prev) =>
      prev.map((s) => {
        if (s.id !== sachetId) return s;
        return {
          ...s,
          spices: [...s.spices, { name: spiceToAdd, quantity: qty }],
        };
      }),
    );
    setSachetDrafts((prev) => ({
      ...prev,
      [sachetId]: { spiceName: '', quantity: '1 tsp', searchQuery: '' },
    }));
  };

  const handleRemoveSpiceFromSachet = (sachetId: string, spiceIndex: number) => {
    setSachets((prev) =>
      prev.map((s) => {
        if (s.id !== sachetId) return s;
        return {
          ...s,
          spices: s.spices.filter((_, idx) => idx !== spiceIndex),
        };
      }),
    );
  };

  // Upload step preparation photo from device
  const handleUploadStepPhoto = () => {
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
              setNewStepPhotoUrl(evt.target.result as string);
              setStepAiBadge('Custom Uploaded Photo');
              showWebSafeAlert('Step Photo Attached', 'Preparation step photo ready.');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      showWebSafeAlert('Upload Photo', 'Please paste the image URL below or select AI Generation.');
    }
  };

  // AI Step Photo Generation: synthesizes dish name, all ingredients from step 2,
  // and all previous cooking instructions to create the most accurate culinary stage photo
  const handleGenerateStepAiPhoto = async () => {
    if (!newStepTitle.trim() && !newStepInstruction.trim()) {
      showWebSafeAlert(
        'Step Details Needed',
        'Please enter at least a step title or cooking instruction so the AI can read what stage is being prepared!',
      );
      return;
    }

    setIsGeneratingStepPhoto(true);
    try {
      const result = await generateStepPhotoWithAI({
        dishName: name || 'Artisanal Indian Recipe',
        cuisine,
        diet,
        stepNumber: recipeSteps.length + 1,
        stepTitle: newStepTitle.trim() || `Step ${recipeSteps.length + 1}`,
        stepInstruction: newStepInstruction.trim() || newStepTitle.trim(),
        allIngredients: [
          ...ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            isMasalaSachet: false,
          })),
          ...sachets.flatMap((s) =>
            s.spices.map((sp) => ({
              name: `${sp.name} (${s.name})`,
              quantity: sp.quantity,
              isMasalaSachet: true,
            })),
          ),
        ],
        previousSteps: recipeSteps,
      });
      setNewStepPhotoUrl(result.imageUrl);
      setStepAiBadge(result.presentationStyle);
      showWebSafeAlert(
        'AI Step Photo Generated',
        `Generated reference photo based on dish ingredients and cooking instructions (${result.presentationStyle}).`,
      );
    } catch {
      showWebSafeAlert('Notice', 'Using chef preparation library.');
    } finally {
      setIsGeneratingStepPhoto(false);
    }
  };

  // Regenerate an existing step's photo using AI
  const handleRegenerateExistingStepPhoto = async (stepNumber: number) => {
    const targetStep = recipeSteps.find((s) => s.stepNumber === stepNumber);
    if (!targetStep) return;
    const priorSteps = recipeSteps.filter((s) => s.stepNumber < stepNumber);

    try {
      const result = await generateStepPhotoWithAI({
        dishName: name || 'Artisanal Indian Recipe',
        cuisine,
        diet,
        stepNumber: targetStep.stepNumber,
        stepTitle: targetStep.title,
        stepInstruction: targetStep.instruction,
        allIngredients: [
          ...ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            isMasalaSachet: false,
          })),
          ...sachets.flatMap((s) =>
            s.spices.map((sp) => ({
              name: `${sp.name} (${s.name})`,
              quantity: sp.quantity,
              isMasalaSachet: true,
            })),
          ),
        ],
        previousSteps: priorSteps,
      });
      setRecipeSteps((prev) =>
        prev.map((s) => (s.stepNumber === stepNumber ? { ...s, imageUrl: result.imageUrl } : s)),
      );
      showWebSafeAlert(
        'Step Photo Refreshed',
        `AI updated photo for Step ${stepNumber} (${result.presentationStyle}).`,
      );
    } catch {
      showWebSafeAlert('Notice', 'Existing photo kept.');
    }
  };

  const handleApplyCustomStepUrl = () => {
    if (!customStepPhotoUrl.trim()) return;
    setNewStepPhotoUrl(customStepPhotoUrl.trim());
    setStepAiBadge('Custom Web URL');
    setCustomStepPhotoUrl('');
    showWebSafeAlert('Photo Updated', 'Custom step image URL applied.');
  };

  // Add recipe step (with photo)
  const handleAddStep = () => {
    if (!newStepTitle.trim() || !newStepInstruction.trim()) {
      showWebSafeAlert('Incomplete Step', 'Please enter a step title and cooking instruction.');
      return;
    }
    const mins = parseFloat(newStepMinutes) || 0;
    const nextStep = {
      stepNumber: recipeSteps.length + 1,
      title: newStepTitle.trim(),
      instruction: newStepInstruction.trim(),
      timerSeconds: mins > 0 ? Math.round(mins * 60) : undefined,
      tip: newStepTip.trim() || undefined,
      imageUrl: newStepPhotoUrl || undefined,
    };
    setRecipeSteps((prev) => [...prev, nextStep]);
    setNewStepTitle('');
    setNewStepInstruction('');
    setNewStepMinutes('3');
    setNewStepTip('');
    setNewStepPhotoUrl('');
    setCustomStepPhotoUrl('');
    setStepAiBadge('');
  };

  const handleRemoveStep = (stepNumber: number) => {
    setRecipeSteps((prev) =>
      prev
        .filter((s) => s.stepNumber !== stepNumber)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    );
  };

  // AI Nutrition Manual Recalculation
  const handleRunAiNutrition = () => {
    const s = parseInt(servings) || 2;
    const freshItems = ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      isMasalaSachet: false,
    }));
    const sachetItems = sachets.flatMap((sachet) =>
      sachet.spices.map((spice) => ({
        name: spice.name,
        quantity: spice.quantity,
        isMasalaSachet: true,
      })),
    );
    const combined = [...freshItems, ...sachetItems];

    if (combined.length === 0) {
      showWebSafeAlert('No Items Found', 'Please add fresh produce or masala sachets in Step 2.');
      return;
    }

    setIsEstimatingAI(true);
    setTimeout(() => {
      const result = estimateNutritionWithAI(combined, s);
      setAiBreakdown(result);
      setNutrition(result.perServing);
      setIsEstimatingAI(false);
    }, 400);
  };

  // Publish / Save Kit
  const handleFinalPublish = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStep5Error('Dish Name is required before publishing.');
      showWebSafeAlert('Dish Name Required', 'Please enter a dish name for your meal kit.');
      return;
    }
    setStep5Error(null);

    // Clean price string; default to 299 if empty, whitespace, or invalid
    const cleanPriceStr = price.replace(/[^0-9.]/g, '');
    const parsedPrice = parseFloat(cleanPriceStr);
    const finalPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice) : 299;

    const kitId = initialKit?.id || 'kit-' + Math.floor(100 + Math.random() * 900);
    const masalaSachets = sachets.map((s) => s.name);
    const imageToUse =
      heroImage ||
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80';

    // Format all ingredients: fresh produce + sachet summaries
    const sachetIngredientsForKit = sachets.map((s) => ({
      name: s.name,
      quantity:
        s.spices.length > 0
          ? `${s.spices.map((sp) => `${sp.name} (${sp.quantity})`).join(', ')}`
          : 'Chef Masala Sachet',
      isMasalaSachet: true,
    }));
    const allKitIngredients = [...ingredients, ...sachetIngredientsForKit];

    const cleanServings = parseInt(String(servings).replace(/[^0-9]/g, '')) || 2;
    const cleanPrepTime = parseInt(String(prepTime).replace(/[^0-9]/g, '')) || 10;
    const cleanCookTime = parseInt(String(cookTime).replace(/[^0-9]/g, '')) || 20;

    const savedKit: MealKit = {
      id: kitId,
      name: trimmedName,
      hindiName: hindiName.trim() || undefined,
      slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: tagline.trim(),
      description: `${trimmedName} kit carefully prepared by master chefs with fresh ingredients and authentic masala sachets for restaurant taste at home.`,
      heroImage: imageToUse,
      galleryImages: [imageToUse],
      price: finalPrice,
      servings: cleanServings,
      prepTimeMinutes: cleanPrepTime,
      cookTimeMinutes: cleanCookTime,
      diet,
      cuisine,
      dishCategory,
      spiceLevel,
      difficulty: 'Easy',
      dietaryTags: [diet],
      isTrending,
      availableRegions: selectedRegions.length > 0 ? selectedRegions : ['North'],
      cities: allCitiesMode ? [] : kitCities,
      availableStorageCentres: selectedStorageCentres,
      stockByRegion: initialKit?.stockByRegion || { North: 50, South: 50, West: 50, East: 50 },
      rating: initialKit?.rating || 5.0,
      reviewCount: initialKit?.reviewCount || 0,
      nutrition,
      allergens: selectedAllergens,
      tags: compileMealKitTags({
        diet,
        cuisine,
        dishCategory,
        availableRegions: selectedRegions,
        availableStorageCentres: selectedStorageCentres,
        allergens: selectedAllergens,
        isTrending,
        dietaryTags: [diet, ...(customTags as any)],
      }),
      ingredients: allKitIngredients,
      masalaSachets,
      sachets,
      recipeSteps,
      reviews: initialKit?.reviews || [],
      salesByRegion: initialKit?.salesByRegion || {},
    };

    setIsPublishing(true);
    try {
      await onSaveKit(savedKit);
      showWebSafeAlert(
        'Meal Kit Published!',
        `"${savedKit.name}" (₹${savedKit.price}) is now live in your RasoiGenie catalog and saved to the database.`,
      );
      resetForm();
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Could not save meal kit to database.';
      setStep5Error(errMsg);
      showWebSafeAlert('Save Failed', errMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentKitForPreview: MealKit = {
    id: initialKit?.id || 'kit-preview',
    name: name.trim() || 'Untitled Recipe',
    hindiName: hindiName.trim() || undefined,
    slug: (name || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    tagline: tagline.trim() || '',
    description: `${name || 'Dish'} kit carefully prepared with fresh ingredients and authentic masala sachets.`,
    heroImage:
      heroImage ||
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      heroImage ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    ],
    price: parseInt(price) || 0,
    servings: parseInt(servings) || 0,
    prepTimeMinutes: parseInt(prepTime) || 0,
    cookTimeMinutes: parseInt(cookTime) || 0,
    diet,
    cuisine,
    dishCategory,
    spiceLevel,
    difficulty: 'Easy',
    dietaryTags: [diet, ...(customTags as any)],
    isTrending,
    availableRegions: selectedRegions.length > 0 ? selectedRegions : ['North'],
    cities: allCitiesMode ? [] : kitCities,
    availableStorageCentres: selectedStorageCentres,
    stockByRegion: { North: 50, South: 50, West: 50, East: 50 },
    rating: 5.0,
    reviewCount: 0,
    nutrition,
    allergens: selectedAllergens,
    tags: compileMealKitTags({
      diet,
      cuisine,
      dishCategory,
      availableRegions: selectedRegions,
      availableStorageCentres: selectedStorageCentres,
      allergens: selectedAllergens,
      isTrending,
      dietaryTags: [diet, ...(customTags as any)],
    }),
    ingredients: [
      ...ingredients,
      ...sachets.map((s) => ({
        name: s.name,
        quantity:
          s.spices.length > 0
            ? `${s.spices.map((sp) => `${sp.name} (${sp.quantity})`).join(', ')}`
            : 'Masala Sachet',
        isMasalaSachet: true,
      })),
    ],
    masalaSachets: sachets.map((s) => s.name),
    sachets,
    recipeSteps: recipeSteps.map((s) => ({
      ...s,
      imageUrl: s.imageUrl || heroImage,
    })),
    reviews: [],
    salesByRegion: {},
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleModalClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Top Chef Header */}
        <View
          style={[
            styles.headerBar,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Chef Recipe Builder
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
              {initialKit ? 'Edit Meal Kit' : 'Create Custom Meal Kit'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleFinalPublish}
            disabled={isPublishing}
            style={[
              styles.publishHeaderBtn,
              { backgroundColor: colors.primary, opacity: isPublishing ? 0.7 : 1 },
            ]}
          >
            {isPublishing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.publishHeaderBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Wizard Step Progress Bar */}
        <View style={[styles.stepNavBar, { backgroundColor: colors.bgSurface }]}>
          {[
            { step: 1, label: '1. Dish Info', icon: 'restaurant' as AppIconName },
            { step: 2, label: '2. Ingredients', icon: 'nutrition' as AppIconName },
            { step: 3, label: '3. Recipe Steps', icon: 'document-text' as AppIconName },
            { step: 4, label: '4. AI Nutrition', icon: 'sparkles' as AppIconName },
            { step: 5, label: '5. Preview', icon: 'eye' as AppIconName },
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
                <View style={{ marginBottom: 2 }}>
                  <Icon
                    name={s.icon}
                    size={16}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                </View>
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
                  What dish are you crafting?
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

                {/* Dish Type & Region Tags */}
                <View style={[styles.rowTwoCol, { marginTop: 14 }]}>
                  {/* Dish Type */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Dish Type <Text style={{ color: colors.textMuted }}>(Category)</Text>
                    </Text>
                    <View style={styles.chipsWrap}>
                      {(
                        [
                          'Curries & Gravies',
                          'Biryani & Rice',
                          'Burgers & Sliders',
                          'Pizzas',
                          'Tacos',
                          'Burritos & Bowls',
                          'Pastas',
                          'Street Food',
                          'Soups & Stews',
                        ] as DishCategory[]
                      ).map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setDishCategory(cat)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor:
                                dishCategory === cat ? colors.primary : colors.bgSubtle,
                              borderColor:
                                dishCategory === cat ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: dishCategory === cat ? '#fff' : colors.textPrimary,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Available Regions */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Operating Regions{' '}
                      {!isSuperAdmin && (
                        <Text style={{ color: colors.primary, fontSize: 11 }}>
                          (Regional Admin Scope)
                        </Text>
                      )}
                    </Text>
                    <View style={styles.chipsWrap}>
                      {(['North', 'South', 'West', 'East'] as RegionHub[]).map((reg) => {
                        const isPermitted =
                          isSuperAdmin ||
                          (assignedRegions &&
                            (assignedRegions.includes(reg) ||
                              resolveZonesFromAssigned(assignedRegions).includes(reg)));
                        const isSelected = selectedRegions.includes(reg);
                        return (
                          <TouchableOpacity
                            key={reg}
                            disabled={!isPermitted}
                            onPress={() => {
                              setSelectedRegions((prev) =>
                                prev.includes(reg)
                                  ? prev.length > 1
                                    ? prev.filter((r) => r !== reg)
                                    : prev
                                  : [...prev, reg],
                              );
                            }}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                                borderColor: isSelected ? colors.primary : colors.borderLight,
                                opacity: isPermitted ? 1 : 0.4,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSelected ? '#fff' : colors.textPrimary,
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              {reg} Region
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Micro-Regions / Storage Centres Selection */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Fulfillment Storage Centres (Micro-Regions)
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                    Select specific storage centres to dispatch this meal kit (e.g. Pune City vs
                    Pimpri Chinchwad). Leave unselected to dispatch from all depots in the operating
                    regions.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {STORAGE_CENTRE_REGIONS.filter((sc) => selectedRegions.includes(sc.zone)).map(
                      (sc) => {
                        const isSelected = selectedStorageCentres.includes(sc.id);
                        return (
                          <TouchableOpacity
                            key={sc.id}
                            onPress={() => {
                              setSelectedStorageCentres((prev) =>
                                prev.includes(sc.id)
                                  ? prev.filter((id) => id !== sc.id)
                                  : [...prev, sc.id],
                              );
                            }}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                                borderColor: isSelected ? colors.primary : colors.borderLight,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSelected ? '#fff' : colors.textPrimary,
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {sc.name} ({sc.city})
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>

                {/* Trending Toggle Option */}
                <View style={{ marginTop: 14 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsTrending((prev) => !prev)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      backgroundColor: isTrending ? colors.primary + '18' : colors.bgSubtle,
                      borderColor: isTrending ? colors.primary : colors.borderLight,
                      borderWidth: 1.5,
                      borderRadius: radii.lg,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: isTrending ? colors.primary : colors.border,
                        }}
                      />
                      <View>
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}
                        >
                          {isTrending ? 'Marked as Trending Dish' : 'Set as Trending Dish'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                          Highlight this meal kit with a Trending badge on customer feeds & homepage
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={isTrending ? 'TRENDING ACTIVE' : 'STANDARD DISH'}
                      variant={isTrending ? 'warning' : 'neutral'}
                    />
                  </TouchableOpacity>
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
                      Dish Presentation Photo
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
                        Generate with AI
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
                        Upload / URL
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
                        Presets
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* TAB 1: AI PHOTO GENERATION */}
                  {photoMode === 'ai' && (
                    <View style={styles.aiPhotoPanel}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                        AI creates an authentic presentation cover photo tailored to recipe name "
                        {name || 'your dish'}", chef tagline "{tagline || 'your tagline'}", and
                        selected presentation style.
                      </Text>

                      <Text
                        style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 0 }]}
                      >
                        Presentation Style:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                        {[
                          { key: 'handi', label: 'Brass Handi' },
                          { key: 'finedining', label: 'Fine Dining' },
                          { key: 'flatlay', label: 'Kit Box Flatlay' },
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
                          <Text style={styles.aiGenerateBtnText}>Generate Dish Photo with AI</Text>
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
                        <View style={{ marginBottom: 4 }}>
                          <Icon name="folder" size={22} color={colors.primary} />
                        </View>
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
                    {heroImage ? (
                      <Image
                        source={{ uri: heroImage }}
                        style={styles.activePhotoImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.activePhotoImg,
                          {
                            backgroundColor: colors.bgSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                      >
                        <Icon name="image" size={28} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.activePhotoInfo}>
                      <Text style={[styles.activePhotoTitle, { color: colors.textPrimary }]}>
                        Selected Presentation Cover
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                        {!heroImage
                          ? 'No photo selected yet'
                          : heroImage.startsWith('data:')
                            ? 'Custom Uploaded File'
                            : heroImage}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* City Targeting */}
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}
                >
                  <Icon name="location" size={18} color={colors.primary} />
                  <Text
                    style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 0 }]}
                  >
                    City Availability
                  </Text>
                </View>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Choose whether this kit is available to everyone in the region hub, or only in
                  specific cities.
                </Text>

                {/* All cities toggle */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAllCitiesMode(true)}
                    style={[
                      styles.photoModeTab,
                      allCitiesMode && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                      { flex: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.photoModeTabText,
                        { color: allCitiesMode ? '#fff' : colors.textPrimary },
                      ]}
                    >
                      All Cities in Region
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAllCitiesMode(false)}
                    style={[
                      styles.photoModeTab,
                      !allCitiesMode && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                      { flex: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.photoModeTabText,
                        { color: !allCitiesMode ? '#fff' : colors.textPrimary },
                      ]}
                    >
                      Specific Cities
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* City chips + input */}
                {!allCitiesMode && (
                  <View style={{ marginTop: 12 }}>
                    {/* Selected city chips */}
                    {kitCities.length > 0 && (
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
                      >
                        {kitCities.map((city) => (
                          <TouchableOpacity
                            key={city}
                            activeOpacity={0.75}
                            onPress={() => setKitCities((prev) => prev.filter((c) => c !== city))}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.primaryLight,
                              borderRadius: 20,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              gap: 5,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}
                            >
                              {city}
                            </Text>
                            <Icon name="close-circle" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Add city input */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            flex: 1,
                            backgroundColor: colors.bgSubtle,
                            borderColor: colors.border,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Type city name (e.g. Bengaluru)"
                        placeholderTextColor={colors.textMuted}
                        value={cityInputValue}
                        onChangeText={setCityInputValue}
                        onSubmitEditing={() => {
                          const city = cityInputValue.trim();
                          if (
                            city &&
                            !kitCities.some((c) => c.toLowerCase() === city.toLowerCase())
                          ) {
                            setKitCities((prev) => [...prev, city]);
                          }
                          setCityInputValue('');
                        }}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={[
                          {
                            backgroundColor: colors.primary,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                        onPress={() => {
                          const city = cityInputValue.trim();
                          if (
                            city &&
                            !kitCities.some((c) => c.toLowerCase() === city.toLowerCase())
                          ) {
                            setKitCities((prev) => [...prev, city]);
                          }
                          setCityInputValue('');
                        }}
                      >
                        <Icon name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {kitCities.length === 0 && (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                        Add at least one city, or switch to "All Cities in Hub".
                      </Text>
                    )}
                  </View>
                )}

                {allCitiesMode && (
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    This kit will appear in the catalog for all users in the selected region hub.
                  </Text>
                )}
              </View>

              {/* Allergens & Kitchen Advisory */}
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="warning" size={18} color="#f59e0b" />
                    <Text
                      style={[
                        styles.sectionHeading,
                        { color: colors.textPrimary, marginBottom: 0 },
                      ]}
                    >
                      Allergens & Kitchen Advisory
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedAllergens([])}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor:
                        selectedAllergens.length === 0 ? colors.primary + '20' : colors.bgSubtle,
                      borderColor:
                        selectedAllergens.length === 0 ? colors.primary : colors.borderLight,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color:
                          selectedAllergens.length === 0 ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {selectedAllergens.length === 0 ? '✓ Allergen-Free' : 'Mark Allergen-Free'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Disclose common culinary allergens contained in this meal kit box for customer
                  food safety.
                </Text>

                {/* Common Allergens Toggles */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {COMMON_ALLERGENS.map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen);
                    return (
                      <TouchableOpacity
                        key={allergen}
                        onPress={() => {
                          setSelectedAllergens((prev) =>
                            prev.includes(allergen)
                              ? prev.filter((a) => a !== allergen)
                              : [...prev, allergen],
                          );
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? '#ef4444' : colors.bgSubtle,
                            borderColor: isSelected ? '#ef4444' : colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#fff' : colors.textPrimary,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {isSelected ? '✓ ' : ''}
                          {allergen}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Allergen Input */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        flex: 1,
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="Add custom allergen (e.g. Fish, Celery, Sulphites)"
                    placeholderTextColor={colors.textMuted}
                    value={customAllergenInput}
                    onChangeText={setCustomAllergenInput}
                    onSubmitEditing={() => {
                      const trimmed = customAllergenInput.trim();
                      if (trimmed && !selectedAllergens.includes(trimmed)) {
                        setSelectedAllergens((prev) => [...prev, trimmed]);
                      }
                      setCustomAllergenInput('');
                    }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      const trimmed = customAllergenInput.trim();
                      if (trimmed && !selectedAllergens.includes(trimmed)) {
                        setSelectedAllergens((prev) => [...prev, trimmed]);
                      }
                      setCustomAllergenInput('');
                    }}
                  >
                    <Icon name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {selectedAllergens.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textMuted,
                        width: '100%',
                        marginBottom: 2,
                      }}
                    >
                      Active Advisory Disclosures:
                    </Text>
                    {selectedAllergens.map((alg) => (
                      <TouchableOpacity
                        key={alg}
                        onPress={() =>
                          setSelectedAllergens((prev) => prev.filter((a) => a !== alg))
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#ef444420',
                          borderColor: '#ef444460',
                          borderWidth: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: radii.pill,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                          {alg}
                        </Text>
                        <Icon name="close-circle" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Categorized Meal Kit Tags */}
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}
                >
                  <Icon name="tag" size={18} color={colors.primary} />
                  <Text
                    style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 0 }]}
                  >
                    Categorized Meal Kit Tags
                  </Text>
                </View>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Tags are automatically generated across Diet Type, Cuisine Type, Dish Type,
                  Region, and Allergens. Add custom specialty tags below.
                </Text>

                {/* Auto-compiled tags preview */}
                <View style={{ marginTop: 10 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Live Auto-Generated Tags:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {parseCategorizedTags(
                      compileMealKitTags({
                        diet,
                        cuisine,
                        dishCategory,
                        availableRegions: selectedRegions,
                        availableStorageCentres: selectedStorageCentres,
                        allergens: selectedAllergens,
                        isTrending,
                        dietaryTags: [diet, ...(customTags as any)],
                      }),
                    ).map((t, idx) => (
                      <Badge
                        key={`${t.category}-${idx}`}
                        label={t.label}
                        variant={t.variant}
                        size="sm"
                      />
                    ))}
                  </View>
                </View>

                {/* Custom Tags adder */}
                <View style={{ marginTop: 14 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Custom Specialty Tags (Optional):
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          flex: 1,
                          backgroundColor: colors.bgSubtle,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      placeholder="Add tag (e.g. High Protein, Fast Cooking, Festival Special)"
                      placeholderTextColor={colors.textMuted}
                      value={customTagInput}
                      onChangeText={setCustomTagInput}
                      onSubmitEditing={() => {
                        const trimmed = customTagInput.trim();
                        if (trimmed && !customTags.includes(trimmed)) {
                          setCustomTags((prev) => [...prev, trimmed]);
                        }
                        setCustomTagInput('');
                      }}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        const trimmed = customTagInput.trim();
                        if (trimmed && !customTags.includes(trimmed)) {
                          setCustomTags((prev) => [...prev, trimmed]);
                        }
                        setCustomTagInput('');
                      }}
                    >
                      <Icon name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {customTags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {customTags.map((ct) => (
                        <TouchableOpacity
                          key={ct}
                          onPress={() => setCustomTags((prev) => prev.filter((t) => t !== ct))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: colors.primary + '18',
                            borderColor: colors.primary + '40',
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: radii.pill,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                            {ct}
                          </Text>
                          <Icon name="close-circle" size={13} color={colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {step1Error ? (
                <View style={styles.errorAlertBox}>
                  <Icon name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorAlertText}>{step1Error}</Text>
                </View>
              ) : null}

              <Button
                title="Next: Add Ingredients"
                size="lg"
                onPress={() => {
                  if (!name.trim()) {
                    setStep1Error('Please enter a dish name before proceeding.');
                    showWebSafeAlert('Dish Name Required', 'Please enter a name for the dish.');
                    return;
                  }
                  setStep1Error(null);
                  setCurrentStep(2);
                }}
                style={{ marginTop: 16 }}
              />
            </View>
          )}

          {/* STEP 2: INGREDIENTS & MASALA SACHETS */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              {/* SECTION 1: FRESH PRODUCE & GROCERIES */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, marginBottom: 16 },
                ]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}
                >
                  <Icon name="basket" size={20} color={colors.primary} />
                  <Text
                    style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 0 }]}
                  >
                    1. Fresh Produce & Main Ingredients
                  </Text>
                </View>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  List all fresh vegetables, dairy, grains, and proteins packed into this kit box.
                </Text>

                {/* Add Fresh Produce Input Form */}
                <View
                  style={[
                    styles.customIngBox,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg, marginTop: 10 },
                  ]}
                >
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                    Add Produce or Base Ingredient:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 2, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Item Name (e.g. Fresh Malai Paneer)"
                      placeholderTextColor={colors.textMuted}
                      value={newFreshName}
                      onChangeText={setNewFreshName}
                    />
                    <TextInput
                      style={[
                        styles.textInput,
                        { flex: 1, backgroundColor: colors.bgSurface, borderColor: colors.border },
                      ]}
                      placeholder="Qty (e.g. 250g)"
                      placeholderTextColor={colors.textMuted}
                      value={newFreshQty}
                      onChangeText={setNewFreshQty}
                    />
                  </View>
                  <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                    <Button
                      title="+ Add Produce Item"
                      size="sm"
                      onPress={handleAddFreshIngredient}
                    />
                  </View>
                </View>

                {/* Fresh Produce Items List */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  Fresh Produce in Kit ({ingredients.length} items):
                </Text>
                {ingredients.length === 0 ? (
                  <View
                    style={{
                      padding: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.md,
                      marginTop: 6,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      No fresh produce added yet. Type an item above to add.
                    </Text>
                  </View>
                ) : (
                  ingredients.map((ing, idx) => (
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
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          Fresh Base Ingredient
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              backgroundColor: colors.bgSurface,
                              borderColor: colors.border,
                              width: 85,
                              height: 32,
                              paddingVertical: 2,
                              paddingHorizontal: 8,
                              fontSize: 12,
                              fontWeight: '800',
                              textAlign: 'center',
                              color: colors.primary,
                            },
                          ]}
                          value={ing.quantity}
                          onChangeText={(newQty) => handleUpdateFreshIngredientQty(idx, newQty)}
                          placeholder="Qty"
                          placeholderTextColor={colors.textMuted}
                        />
                        <TouchableOpacity
                          onPress={() => handleRemoveFreshIngredient(idx)}
                          style={styles.deleteIngBtn}
                        >
                          <Icon name="close" size={14} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* SECTION 2: SEPARATE MASALA SACHETS MIXER */}
              <View
                style={[styles.card, { backgroundColor: colors.bgSurface, borderRadius: radii.xl }]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="sparkles" size={20} color={colors.primary} />
                    <Text
                      style={[
                        styles.sectionHeading,
                        { color: colors.textPrimary, marginBottom: 0 },
                      ]}
                    >
                      2. Pre-Portioned Masala Sachets
                    </Text>
                  </View>
                  <Button
                    title="+ New Sachet"
                    size="sm"
                    variant="outline"
                    onPress={handleAddSachet}
                  />
                </View>

                <Text
                  style={[styles.sectionHint, { color: colors.textSecondary, marginBottom: 12 }]}
                >
                  Curate custom spice sachets. Enter exactly how much of each masala is to be mixed
                  together inside each sachet (multiple sachets supported per dish).
                </Text>

                {sachets.length === 0 ? (
                  <View
                    style={{
                      padding: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Icon name="cube" size={24} color={colors.textMuted} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textMuted,
                        marginTop: 6,
                        textAlign: 'center',
                      }}
                    >
                      No masala sachets created yet. Tap "+ New Sachet" above to add your first
                      spice blend sachet.
                    </Text>
                  </View>
                ) : (
                  sachets.map((sachet) => {
                    const draft = sachetDrafts[sachet.id] || {
                      spiceName: '',
                      quantity: '1 tsp',
                      searchQuery: '',
                    };
                    return (
                      <View
                        key={sachet.id}
                        style={{
                          backgroundColor: colors.bgSubtle,
                          borderRadius: radii.lg,
                          padding: 12,
                          marginBottom: 14,
                          borderWidth: 1.5,
                          borderColor: colors.borderLight,
                        }}
                      >
                        {/* Sachet Header with Name Edit and Delete */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                            gap: 8,
                          }}
                        >
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                flex: 1,
                                fontWeight: '800',
                                fontSize: 14,
                                backgroundColor: colors.bgSurface,
                                borderColor: colors.border,
                                paddingVertical: 6,
                              },
                            ]}
                            value={sachet.name}
                            onChangeText={(text) => handleUpdateSachetName(sachet.id, text)}
                            placeholder="Sachet Name (e.g. Sachet 1: Whole Khada Masala)"
                            placeholderTextColor={colors.textMuted}
                          />
                          <TouchableOpacity
                            onPress={() => handleRemoveSachet(sachet.id)}
                            style={{ padding: 6 }}
                          >
                            <Icon name="trash" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>

                        {/* List of Mixed Spices in this Sachet */}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: colors.primary,
                            marginBottom: 6,
                          }}
                        >
                          Mixed Inside ({sachet.spices.length} masala
                          {sachet.spices.length !== 1 ? 's' : ''}):
                        </Text>
                        {sachet.spices.length === 0 ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.textMuted,
                              fontStyle: 'italic',
                              marginBottom: 8,
                            }}
                          >
                            No masalas mixed yet. Select spices and amounts below to blend into this
                            sachet.
                          </Text>
                        ) : (
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 6,
                              marginBottom: 10,
                            }}
                          >
                            {sachet.spices.map((spice, spIdx) => (
                              <View
                                key={spIdx}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: colors.bgSurface,
                                  borderColor: colors.primary,
                                  borderWidth: 1,
                                  borderRadius: 14,
                                  paddingVertical: 3,
                                  paddingHorizontal: 8,
                                  gap: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '800',
                                    color: colors.textPrimary,
                                  }}
                                >
                                  {spice.name}:
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: colors.primary,
                                  }}
                                >
                                  {spice.quantity}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoveSpiceFromSachet(sachet.id, spIdx)}
                                >
                                  <Icon name="close" size={12} color={colors.danger} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Spice Search & Exact Quantity Selector inside this sachet */}
                        {(() => {
                          const query = (draft.searchQuery || '').trim().toLowerCase();
                          const filteredSpices = query
                            ? MASTER_SPICE_CATALOG.filter(
                                (sp) =>
                                  sp.name.toLowerCase().includes(query) ||
                                  (sp.hindi && sp.hindi.toLowerCase().includes(query)) ||
                                  sp.category.toLowerCase().includes(query),
                              ).slice(0, 12)
                            : [];

                          const exactMatchExists = query
                            ? MASTER_SPICE_CATALOG.some((sp) => sp.name.toLowerCase() === query)
                            : false;

                          return (
                            <View
                              style={{
                                backgroundColor: colors.bgSurface,
                                padding: 12,
                                borderRadius: radii.md,
                                borderWidth: 1,
                                borderColor: colors.borderLight,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: colors.textPrimary,
                                  marginBottom: 6,
                                }}
                              >
                                Search Spice to Add:
                              </Text>

                              {/* Search Bar Input */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: colors.bgSubtle,
                                  borderRadius: radii.md,
                                  borderWidth: 1,
                                  borderColor: draft.spiceName ? colors.primary : colors.border,
                                  paddingHorizontal: 10,
                                  paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                                  marginBottom: 8,
                                }}
                              >
                                <Icon name="search" size={16} color={colors.textMuted} />
                                <TextInput
                                  style={{
                                    flex: 1,
                                    fontSize: 12,
                                    color: colors.textPrimary,
                                    marginLeft: 8,
                                    paddingVertical: 4,
                                  }}
                                  placeholder="Search spice by English or Hindi name (e.g. Cumin, Haldi, Cardamom)..."
                                  placeholderTextColor={colors.textMuted}
                                  value={
                                    draft.searchQuery !== undefined
                                      ? draft.searchQuery
                                      : draft.spiceName
                                  }
                                  onChangeText={(text) =>
                                    handleUpdateSachetDraft(sachet.id, {
                                      searchQuery: text,
                                      spiceName: text.trim() === '' ? '' : draft.spiceName,
                                    })
                                  }
                                />
                                {draft.searchQuery || draft.spiceName ? (
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleUpdateSachetDraft(sachet.id, {
                                        searchQuery: '',
                                        spiceName: '',
                                      })
                                    }
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={{ padding: 2 }}
                                  >
                                    <Icon name="close" size={14} color={colors.textMuted} />
                                  </TouchableOpacity>
                                ) : null}
                              </View>

                              {/* Filtered Spice Suggestions (when typing in search bar) */}
                              {query.length > 0 && (
                                <View
                                  style={{
                                    backgroundColor: colors.bgSubtle,
                                    borderRadius: radii.sm,
                                    padding: 8,
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: colors.borderLight,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      color: colors.textSecondary,
                                      marginBottom: 6,
                                    }}
                                  >
                                    Found Spices ({filteredSpices.length}):
                                  </Text>
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {filteredSpices.map((spice, spIdx) => {
                                      const isSelected = draft.spiceName === spice.name;
                                      return (
                                        <TouchableOpacity
                                          key={spIdx}
                                          onPress={() =>
                                            handleUpdateSachetDraft(sachet.id, {
                                              spiceName: spice.name,
                                              searchQuery: spice.name,
                                              quantity:
                                                draft.quantity || spice.defaultQty || '1 tsp',
                                            })
                                          }
                                          style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: isSelected
                                              ? colors.primary
                                              : colors.bgSurface,
                                            borderColor: isSelected
                                              ? colors.primary
                                              : colors.border,
                                            borderWidth: 1,
                                            borderRadius: 12,
                                            paddingVertical: 4,
                                            paddingHorizontal: 8,
                                            gap: 4,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 10,
                                              fontWeight: '700',
                                              color: isSelected ? '#FFFFFF' : colors.textPrimary,
                                            }}
                                          >
                                            {spice.name}
                                          </Text>
                                          {spice.hindi && (
                                            <Text
                                              style={{
                                                fontSize: 9,
                                                color: isSelected
                                                  ? 'rgba(255,255,255,0.85)'
                                                  : colors.textMuted,
                                              }}
                                            >
                                              ({spice.hindi})
                                            </Text>
                                          )}
                                          <View
                                            style={{
                                              backgroundColor: isSelected
                                                ? 'rgba(255,255,255,0.25)'
                                                : colors.bgSubtle,
                                              borderRadius: 4,
                                              paddingHorizontal: 4,
                                              paddingVertical: 1,
                                            }}
                                          >
                                            <Text
                                              style={{
                                                fontSize: 8,
                                                fontWeight: '700',
                                                color: isSelected
                                                  ? '#FFFFFF'
                                                  : colors.textSecondary,
                                              }}
                                            >
                                              {spice.category}
                                            </Text>
                                          </View>
                                        </TouchableOpacity>
                                      );
                                    })}

                                    {/* Custom spice button if no exact match */}
                                    {!exactMatchExists && draft.searchQuery.trim().length > 0 && (
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleUpdateSachetDraft(sachet.id, {
                                            spiceName: draft.searchQuery.trim(),
                                            searchQuery: draft.searchQuery.trim(),
                                          })
                                        }
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          backgroundColor: colors.primary + '15',
                                          borderColor: colors.primary,
                                          borderWidth: 1,
                                          borderRadius: 12,
                                          paddingVertical: 4,
                                          paddingHorizontal: 8,
                                          gap: 4,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 10,
                                            fontWeight: '700',
                                            color: colors.primary,
                                          }}
                                        >
                                          + Use custom spice: "{draft.searchQuery.trim()}"
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                              )}

                              {/* Popular Quick Suggestions when search is empty and nothing selected */}
                              {!query && !draft.spiceName && (
                                <View style={{ marginBottom: 8 }}>
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: '600',
                                      color: colors.textMuted,
                                      marginBottom: 4,
                                    }}
                                  >
                                    Popular staples (or search 40+ spices above):
                                  </Text>
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                    {[
                                      'Jeera (Cumin Seeds)',
                                      'Haldi (Turmeric Powder)',
                                      'Kashmiri Red Chilli Powder',
                                      'Garam Masala (Chef Blend)',
                                      'Dhaniya Powder (Coriander)',
                                      'Kasuri Methi (Fenugreek Leaves)',
                                    ].map((popName, pIdx) => {
                                      const found = MASTER_SPICE_CATALOG.find(
                                        (s) => s.name === popName,
                                      );
                                      return (
                                        <TouchableOpacity
                                          key={pIdx}
                                          onPress={() =>
                                            handleUpdateSachetDraft(sachet.id, {
                                              spiceName: popName,
                                              searchQuery: popName,
                                              quantity:
                                                draft.quantity || found?.defaultQty || '1 tsp',
                                            })
                                          }
                                          style={{
                                            paddingVertical: 2,
                                            paddingHorizontal: 6,
                                            borderRadius: 8,
                                            backgroundColor: colors.bgSubtle,
                                            borderWidth: 1,
                                            borderColor: colors.borderLight,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 9,
                                              fontWeight: '600',
                                              color: colors.textSecondary,
                                            }}
                                          >
                                            + {(popName.split('(')[0] || popName).trim()}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                </View>
                              )}

                              {/* Selected Spice Indicator Badge */}
                              {draft.spiceName ? (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: colors.primary + '12',
                                    borderColor: colors.primary,
                                    borderWidth: 1,
                                    borderRadius: radii.sm,
                                    paddingVertical: 6,
                                    paddingHorizontal: 10,
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      flex: 1,
                                    }}
                                  >
                                    <Icon name="restaurant" size={13} color={colors.primary} />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: colors.primary,
                                      }}
                                    >
                                      Selected Spice:
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '800',
                                        color: colors.textPrimary,
                                        flexShrink: 1,
                                      }}
                                    >
                                      {draft.spiceName}
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleUpdateSachetDraft(sachet.id, {
                                        spiceName: '',
                                        searchQuery: '',
                                      })
                                    }
                                  >
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: colors.danger,
                                      }}
                                    >
                                      Change
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}

                              {/* Exact Quantity Selection */}
                              <View style={{ marginBottom: 6 }}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      color: colors.textSecondary,
                                    }}
                                  >
                                    Select Exact Quantity:
                                  </Text>
                                  <Text style={{ fontSize: 9, color: colors.textMuted }}>
                                    Tap pill or type custom
                                  </Text>
                                </View>

                                {/* Quantity Input */}
                                <TextInput
                                  style={[
                                    styles.textInput,
                                    {
                                      backgroundColor: colors.bgSubtle,
                                      borderColor: colors.border,
                                      paddingVertical: 6,
                                      fontSize: 11,
                                      marginBottom: 6,
                                    },
                                  ]}
                                  placeholder="Exact Quantity (e.g. 0.5 tsp, 1.5 tsp, 5g, 2 pieces)"
                                  placeholderTextColor={colors.textMuted}
                                  value={draft.quantity}
                                  onChangeText={(quantity) =>
                                    handleUpdateSachetDraft(sachet.id, { quantity })
                                  }
                                />

                                {/* Exact Quantity Preset Pills */}
                                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                                  {SPICE_QUANTITY_PRESETS.map((qtyOption, qIdx) => {
                                    const isQtySelected = draft.quantity === qtyOption;
                                    return (
                                      <TouchableOpacity
                                        key={qIdx}
                                        onPress={() =>
                                          handleUpdateSachetDraft(sachet.id, {
                                            quantity: qtyOption,
                                          })
                                        }
                                        style={{
                                          paddingVertical: 3,
                                          paddingHorizontal: 7,
                                          borderRadius: 6,
                                          backgroundColor: isQtySelected
                                            ? colors.primary
                                            : colors.bgSubtle,
                                          borderWidth: 1,
                                          borderColor: isQtySelected
                                            ? colors.primary
                                            : colors.borderLight,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 9,
                                            fontWeight: isQtySelected ? '800' : '600',
                                            color: isQtySelected ? '#FFFFFF' : colors.textSecondary,
                                          }}
                                        >
                                          {qtyOption}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>

                              {/* Action Buttons */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  justifyContent: 'flex-end',
                                  alignItems: 'center',
                                  marginTop: 8,
                                  gap: 8,
                                }}
                              >
                                <Button
                                  title={
                                    draft.spiceName
                                      ? `+ Add ${(draft.spiceName.split('(')[0] || draft.spiceName).trim()} (${draft.quantity || '1 tsp'})`
                                      : draft.searchQuery.trim()
                                        ? `+ Add "${draft.searchQuery.trim()}" (${draft.quantity || '1 tsp'})`
                                        : '+ Mix into Sachet'
                                  }
                                  size="sm"
                                  onPress={() => handleAddSpiceToSachet(sachet.id)}
                                />
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })
                )}
              </View>

              {/* LIVE REAL-TIME NUTRITIONAL STATUS HUD IN STEP 2 */}
              <View
                style={[
                  styles.liveNutritionHud,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    borderWidth: 1,
                    marginTop: 14,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="sparkles" size={16} color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: colors.textPrimary,
                      }}
                    >
                      Live Total Recipe Nutrition
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#DCFCE7',
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#16A34A',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#15803D',
                        textTransform: 'uppercase',
                      }}
                    >
                      Live Synced
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: colors.bgSubtle,
                    borderRadius: radii.lg,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>
                      {aiBreakdown?.totalRecipe.calories ?? nutrition.calories}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>
                      kcal
                    </Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.borderLight }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                      {aiBreakdown?.totalRecipe.protein ?? nutrition.protein}g
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Protein</Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.borderLight }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                      {aiBreakdown?.totalRecipe.carbs ?? nutrition.carbs}g
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Carbs</Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.borderLight }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                      {aiBreakdown?.totalRecipe.fat ?? nutrition.fat}g
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Fats</Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.borderLight }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                      {aiBreakdown?.totalRecipe.fiber ?? nutrition.fiber}g
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Fiber</Text>
                  </View>
                </View>

                {aiBreakdown?.keyHighlights ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.primary,
                      fontWeight: '700',
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    {aiBreakdown.keyHighlights}
                  </Text>
                ) : null}
              </View>

              {/* Navigation Buttons */}
              <View style={[styles.navBtnRow, { marginTop: 16 }]}>
                <Button
                  title="← Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(1)}
                />
                <Button
                  title="Next: Recipe Steps"
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
                  Recipe Instructions For Home Cooks
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Guide your customers step-by-step to cook like a master chef. Add reference photos
                  to each step or generate them using AI.
                </Text>

                {/* Existing Steps with Photos */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>
                  Steps In This Recipe ({recipeSteps.length} steps):
                </Text>

                {recipeSteps.length === 0 ? (
                  <View
                    style={{
                      padding: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.md,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Icon name="document-text" size={24} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
                      No recipe steps added yet. Use the form below to add cooking steps.
                    </Text>
                  </View>
                ) : (
                  recipeSteps.map((step) => (
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
                          <Icon name="close" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      {/* Step Photo & Details Split */}
                      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 6 }}>
                        {step.imageUrl ? (
                          <View style={styles.stepPhotoThumbWrapper}>
                            <Image
                              source={{ uri: step.imageUrl }}
                              style={styles.stepPhotoThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.stepPhotoBadge}>
                              <Text style={styles.stepPhotoBadgeText}>Step Photo</Text>
                            </View>
                          </View>
                        ) : null}

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recipeStepText, { color: colors.textSecondary }]}>
                            {step.instruction}
                          </Text>

                          {step.tip ? (
                            <View style={styles.tipBox}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.primaryDark,
                                  fontWeight: '600',
                                }}
                              >
                                Chef Tip: {step.tip}
                              </Text>
                            </View>
                          ) : null}

                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 6,
                            }}
                          >
                            {step.timerSeconds ? (
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: colors.primary,
                                }}
                              >
                                Timer: {Math.round(step.timerSeconds / 60)} mins
                              </Text>
                            ) : (
                              <View />
                            )}

                            <TouchableOpacity
                              onPress={() => handleRegenerateExistingStepPhoto(step.stepNumber)}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                backgroundColor: colors.bgSurface,
                                borderWidth: 1,
                                borderColor: colors.borderLight,
                              }}
                            >
                              <Text
                                style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}
                              >
                                Regenerate AI Photo
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {/* Add Step Card */}
                <View
                  style={[
                    styles.addStepBox,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg, marginTop: 14 },
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
                    placeholder="Step Title (e.g. Sauté Onion & Tomato Base)"
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
                    placeholder="What should the home cook do? (e.g. Heat oil, empty Sachet 1, simmer for 3 mins until fragrant)"
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

                  {/* Step Photo Selection (AI, Upload, Presets) */}
                  <View
                    style={{
                      marginTop: 12,
                      padding: 10,
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                        Step Preparation Reference Photo:
                      </Text>
                      {stepAiBadge ? (
                        <Badge label={stepAiBadge} variant="accent" size="sm" />
                      ) : null}
                    </View>

                    {/* Mode Tabs */}
                    <View style={styles.photoModeTabs}>
                      <TouchableOpacity
                        onPress={() => setNewStepPhotoMode('ai')}
                        style={[
                          styles.photoModeTab,
                          newStepPhotoMode === 'ai' && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.photoModeTabText,
                            { color: newStepPhotoMode === 'ai' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Generate with AI
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setNewStepPhotoMode('upload')}
                        style={[
                          styles.photoModeTab,
                          newStepPhotoMode === 'upload' && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.photoModeTabText,
                            { color: newStepPhotoMode === 'upload' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Upload / URL
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setNewStepPhotoMode('presets')}
                        style={[
                          styles.photoModeTab,
                          newStepPhotoMode === 'presets' && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.photoModeTabText,
                            { color: newStepPhotoMode === 'presets' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Presets
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* TAB 1: AI GENERATION */}
                    {newStepPhotoMode === 'ai' && (
                      <View style={{ paddingVertical: 4 }}>
                        <Text
                          style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}
                        >
                          AI analyzes all ingredients ({ingredients.length} items), previous steps (
                          {recipeSteps.length} steps), and this instruction to generate the most
                          realistic preparation photo.
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={handleGenerateStepAiPhoto}
                          style={[styles.aiGenerateBtn, { backgroundColor: colors.primary }]}
                        >
                          {isGeneratingStepPhoto ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.aiGenerateBtnText}>
                              Generate Step Photo with AI
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* TAB 2: UPLOAD / URL */}
                    {newStepPhotoMode === 'upload' && (
                      <View style={{ paddingVertical: 4 }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleUploadStepPhoto}
                          style={[
                            styles.deviceUploadButton,
                            {
                              borderColor: colors.primary,
                              backgroundColor: colors.bgSubtle,
                              paddingVertical: 10,
                            },
                          ]}
                        >
                          <View style={{ marginBottom: 2 }}>
                            <Icon name="folder" size={18} color={colors.primary} />
                          </View>
                          <Text
                            style={[
                              styles.deviceUploadText,
                              { color: colors.primary, fontSize: 12 },
                            ]}
                          >
                            Upload from Device / Files
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                flex: 1,
                                backgroundColor: colors.bgSubtle,
                                borderColor: colors.border,
                              },
                            ]}
                            placeholder="Or paste photo URL (https://...)"
                            placeholderTextColor={colors.textMuted}
                            value={customStepPhotoUrl}
                            onChangeText={setCustomStepPhotoUrl}
                          />
                          <Button title="Apply" size="sm" onPress={handleApplyCustomStepUrl} />
                        </View>
                      </View>
                    )}

                    {/* TAB 3: PRESETS */}
                    {newStepPhotoMode === 'presets' && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginVertical: 6 }}
                      >
                        {AI_STEP_PREPARATION_PRESETS.map((p, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => {
                              setNewStepPhotoUrl(p.url);
                              setStepAiBadge(p.phase);
                            }}
                            style={{
                              marginRight: 8,
                              width: 100,
                              borderRadius: 6,
                              overflow: 'hidden',
                              borderWidth: newStepPhotoUrl === p.url ? 2 : 1,
                              borderColor:
                                newStepPhotoUrl === p.url ? colors.primary : colors.borderLight,
                            }}
                          >
                            <Image
                              source={{ uri: p.url }}
                              style={{ width: 100, height: 60 }}
                              resizeMode="cover"
                            />
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: '700',
                                padding: 3,
                                color: colors.textPrimary,
                              }}
                              numberOfLines={1}
                            >
                              {p.phase}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* Attached Photo Preview */}
                    {newStepPhotoUrl ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.bgSubtle,
                          padding: 8,
                          borderRadius: radii.md,
                          marginTop: 8,
                          borderWidth: 1,
                          borderColor: colors.borderLight,
                        }}
                      >
                        <Image
                          source={{ uri: newStepPhotoUrl }}
                          style={{ width: 60, height: 45, borderRadius: 6, marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                          >
                            Photo Attached
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={1}>
                            {stepAiBadge || 'Reference cooking stage photo'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setNewStepPhotoUrl('');
                            setStepAiBadge('');
                          }}
                          style={{ padding: 6 }}
                        >
                          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>
                            Clear
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  <Button
                    title="+ Append Cooking Step"
                    variant="outline"
                    size="sm"
                    onPress={handleAddStep}
                    style={{ marginTop: 10 }}
                  />
                </View>

                {/* LIVE RECIPE CARD PREVIEW (ON INSTRUCTIONS PAGE) */}
                <View
                  style={{
                    marginTop: 24,
                    padding: 14,
                    backgroundColor: colors.bgSubtle,
                    borderRadius: radii.xl,
                    borderWidth: 1.5,
                    borderColor: colors.borderLight,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>
                        Customer Recipe Card Preview
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        Real-time preview of the printed card that will come with the meal kit
                        package.
                      </Text>
                    </View>

                    <Button
                      title="Print Test Card"
                      variant="primary"
                      size="sm"
                      onPress={() => setPrintModalVisible(true)}
                    />
                  </View>

                  {/* Front / Back Toggle Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setCardPreviewSide('front')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor:
                          cardPreviewSide === 'front' ? colors.primary : colors.bgSurface,
                        borderWidth: 1,
                        borderColor:
                          cardPreviewSide === 'front' ? colors.primary : colors.borderLight,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: cardPreviewSide === 'front' ? '#fff' : colors.textPrimary,
                        }}
                      >
                        Front Side (Ingredients & Nutrition)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setCardPreviewSide('back')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor:
                          cardPreviewSide === 'back' ? colors.primary : colors.bgSurface,
                        borderWidth: 1,
                        borderColor:
                          cardPreviewSide === 'back' ? colors.primary : colors.borderLight,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: cardPreviewSide === 'back' ? '#fff' : colors.textPrimary,
                        }}
                      >
                        Back Side (Steps & Photos)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Visual Card View */}
                  {cardPreviewSide === 'front' ? (
                    <RecipeCardFrontView kit={currentKitForPreview} />
                  ) : (
                    <RecipeCardBackView kit={currentKitForPreview} />
                  )}
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
                  title="Next: AI Nutrition"
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
                  Live Nutritional Information
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Updates in real time automatically based on all ingredients, portions, and sachet
                  spices.
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
                      <Icon name="sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.aiActionText}>Recalculate Real-Time Nutrition</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Macro Results Display */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.textPrimary, marginTop: 8, marginBottom: 0 },
                    ]}
                  >
                    Total Recipe Nutrition
                  </Text>
                  {aiBreakdown && (
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      ÷{parseInt(servings) || 2} servings = per serving below
                    </Text>
                  )}
                </View>
                <View style={styles.macroCardsGrid}>
                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.primary }]}>
                      {aiBreakdown?.totalRecipe.calories ?? nutrition.calories}
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Calories</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      kcal total
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {aiBreakdown?.totalRecipe.protein ?? nutrition.protein}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Protein</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      total recipe
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {aiBreakdown?.totalRecipe.carbs ?? nutrition.carbs}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Carbs</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      total recipe
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {aiBreakdown?.totalRecipe.fat ?? nutrition.fat}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Fats</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      total recipe
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.macroCard,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                    ]}
                  >
                    <Text style={[styles.macroNumber, { color: colors.textPrimary }]}>
                      {aiBreakdown?.totalRecipe.fiber ?? nutrition.fiber}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Fiber</Text>
                    <Text style={[styles.macroSub, { color: colors.textSecondary }]}>
                      total recipe
                    </Text>
                  </View>
                </View>

                {/* Per-Serving Summary Row */}
                {aiBreakdown && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      marginTop: 10,
                      marginBottom: 4,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                        {nutrition.calories}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>kcal</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.borderLight }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                        {nutrition.protein}g
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>protein</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.borderLight }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                        {nutrition.carbs}g
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>carbs</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.borderLight }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                        {nutrition.fat}g
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>fat</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.borderLight }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                        {nutrition.fiber}g
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>fiber</Text>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontStyle: 'italic' }}>
                        per serving
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontStyle: 'italic' }}>
                        (saved to kit)
                      </Text>
                    </View>
                  </View>
                )}

                {/* Chef Manual Adjustments */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  Chef Manual Adjustments (Optional)
                </Text>
                <Text
                  style={[styles.sectionHint, { color: colors.textSecondary, marginBottom: 10 }]}
                >
                  Override any value calculated above. Changes are reflected instantly in the live
                  cards.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {/* Calories */}
                  <View style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Calories (kcal)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="e.g. 420"
                      placeholderTextColor={colors.textMuted}
                      value={nutrition.calories ? String(nutrition.calories) : ''}
                      onChangeText={(t) =>
                        setNutrition((prev) => ({ ...prev, calories: parseInt(t) || 0 }))
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Protein */}
                  <View style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Protein (g)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="e.g. 18"
                      placeholderTextColor={colors.textMuted}
                      value={nutrition.protein ? String(nutrition.protein) : ''}
                      onChangeText={(t) =>
                        setNutrition((prev) => ({ ...prev, protein: parseFloat(t) || 0 }))
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Carbohydrates */}
                  <View style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Carbohydrates (g)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="e.g. 35"
                      placeholderTextColor={colors.textMuted}
                      value={nutrition.carbs ? String(nutrition.carbs) : ''}
                      onChangeText={(t) =>
                        setNutrition((prev) => ({ ...prev, carbs: parseFloat(t) || 0 }))
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Fat */}
                  <View style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Fat (g)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="e.g. 12"
                      placeholderTextColor={colors.textMuted}
                      value={nutrition.fat ? String(nutrition.fat) : ''}
                      onChangeText={(t) =>
                        setNutrition((prev) => ({ ...prev, fat: parseFloat(t) || 0 }))
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Fiber */}
                  <View style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Fiber (g)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                      ]}
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      value={nutrition.fiber ? String(nutrition.fiber) : ''}
                      onChangeText={(t) =>
                        setNutrition((prev) => ({ ...prev, fiber: parseFloat(t) || 0 }))
                      }
                      keyboardType="numeric"
                    />
                  </View>
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
                  title="Next: Preview & Save"
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
                  Customer Preview
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
                  {heroImage ? (
                    <Image source={{ uri: heroImage }} style={styles.previewHeroImg} />
                  ) : (
                    <View
                      style={[
                        styles.previewHeroImg,
                        {
                          backgroundColor: colors.bgSurface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Icon name="image" size={36} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        No image selected
                      </Text>
                    </View>
                  )}
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
                        ₹{price.replace(/[^0-9.]/g, '') || '299'}
                      </Text>
                    </View>

                    {hindiName ? (
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
                        {hindiName}
                      </Text>
                    ) : null}

                    {tagline ? (
                      <Text style={[styles.previewTagline, { color: colors.textSecondary }]}>
                        {tagline}
                      </Text>
                    ) : null}

                    <View style={styles.previewPillsRow}>
                      <Badge label={`${servings || '2'} Servings`} variant="neutral" />
                      <Badge label={`${cookTime || '20'} mins`} variant="neutral" />
                      {(() => {
                        const badge = getDietBadgeInfo(diet);
                        return <Badge label={badge.label} variant={badge.variant} />;
                      })()}
                    </View>

                    {/* Masala Sachets Detailed Breakdown */}
                    {sachets.length > 0 && (
                      <View
                        style={{
                          marginTop: 10,
                          padding: 10,
                          backgroundColor: colors.bgSurface,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderLight,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: colors.primary,
                            marginBottom: 4,
                          }}
                        >
                          {sachets.length} Pre-Portioned Masala Sachet
                          {sachets.length > 1 ? 's' : ''} Included:
                        </Text>
                        {sachets.map((s, idx) => (
                          <View key={s.id || idx} style={{ marginTop: 4 }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.textPrimary,
                              }}
                            >
                              • {s.name}
                            </Text>
                            {s.spices.length > 0 ? (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.textSecondary,
                                  marginLeft: 10,
                                }}
                              >
                                Mixed Masalas:{' '}
                                {s.spices.map((sp) => `${sp.name} (${sp.quantity})`).join(', ')}
                              </Text>
                            ) : (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.textMuted,
                                  marginLeft: 10,
                                  fontStyle: 'italic',
                                }}
                              >
                                Chef custom blend
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Fresh Produce Summary in Preview */}
                    {ingredients.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                          Fresh Base:{' '}
                          {ingredients.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                        </Text>
                      </View>
                    )}

                    {/* Live Real-Time Nutrition Banner */}
                    <View style={styles.previewNutritionRow}>
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}
                      >
                        {nutrition.calories > 0
                          ? `Live Real-Time Nutrition: ${nutrition.calories} kcal • ${nutrition.protein}g protein • ${nutrition.carbs}g carbs • ${nutrition.fat}g fat`
                          : 'Nutrition: 0 kcal (Add produce or spices to calculate in real time)'}
                      </Text>
                    </View>

                    {/* Kit Price Direct Adjustment */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 10,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: colors.borderLight,
                      }}
                    >
                      <View>
                        <Text
                          style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}
                        >
                          Selling Price (₹)
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>Default: ₹299</Text>
                      </View>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.border,
                            width: 100,
                            height: 36,
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                            textAlign: 'center',
                            fontWeight: '800',
                            fontSize: 14,
                            color: colors.primary,
                          },
                        ]}
                        placeholder="299"
                        placeholderTextColor={colors.textMuted}
                        value={price}
                        onChangeText={(val) => setPrice(val.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {step5Error ? (
                <View style={styles.errorAlertBox}>
                  <Icon name="alert-circle" size={18} color="#ef4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorAlertText}>{step5Error}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setStep5Error(null);
                      setCurrentStep(1);
                    }}
                    style={styles.errorFixBtn}
                  >
                    <Text style={styles.errorFixBtnText}>Edit in Step 1</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.navBtnRow}>
                <Button
                  title="Back"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setCurrentStep(4)}
                />
                <Button
                  title="Print Card"
                  variant="outline"
                  size="lg"
                  style={{ flex: 1 }}
                  onPress={() => setPrintModalVisible(true)}
                />
                <Button
                  title={isPublishing ? 'Publishing...' : 'Publish Kit'}
                  size="lg"
                  style={{ flex: 2 }}
                  disabled={isPublishing}
                  onPress={handleFinalPublish}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* 2-Sided Recipe Card Print Modal */}
        <RecipeCardPrintModal
          visible={printModalVisible}
          onClose={() => setPrintModalVisible(false)}
          kit={currentKitForPreview}
        />
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 2,
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  macroCard: {
    flex: 1,
    minWidth: 56,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  liveNutritionHud: {
    padding: 12,
    marginTop: 14,
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
  stepPhotoThumbWrapper: {
    position: 'relative',
    width: 85,
    height: 65,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  stepPhotoBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 3,
    paddingVertical: 1,
    alignItems: 'center',
  },
  stepPhotoBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorFixBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  errorFixBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
