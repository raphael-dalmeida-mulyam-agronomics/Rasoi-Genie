import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useCart } from '../../framework/context/CartContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { useWishlist } from '../../framework/context/WishlistContext';
import {
    ensureCitySpecialtiesSeeded,
    isRegionalSpecialtyOfCity,
    rankMealKitsForCityTrending,
} from '../../framework/services/dishOriginService';
import {
    CuisineType,
    DietTag,
    DishCategory,
    getMealKits,
    MealKit,
    SpiceLevel,
    subscribeToMealKits,
    syncMealKitsWithSupabase,
} from '../../framework/services/mealKitsService';
import { subscribeToMealKitsRealtime } from '../../framework/services/supabaseMealKitsService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { ThemeSwitcher } from '../../framework/theme/ThemeSwitcher';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AppIconName, Icon } from '../../framework/ui/Icon';
import { seedKitsForCityIfNeeded } from '../admin/cityKitsSeederService';
import { MealDetailModal } from '../meal-detail/MealDetailModal';
import { DietaryPreferencesModal } from '../onboarding/DietaryPreferencesModal';

const { width } = Dimensions.get('window');

const PROMO_BANNERS = [
  {
    id: 'promo-1',
    title: 'Gourmet Weekend Feast',
    subtitle: 'Flat ₹100 OFF with code RASOI100',
    tag: 'LIMITED OFFER',
    code: 'RASOI100',
    gradientBg: '#C2410C',
    image:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'promo-2',
    title: 'Pure Desi Ghee Roasts',
    subtitle: 'Free Cold-Chain Delivery across South Hub',
    tag: 'NEW LAUNCH',
    code: 'FREEDEL',
    gradientBg: '#0F766E',
    image:
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
  },
];

const DIET_FILTER_OPTIONS: { id: 'all' | DietTag; label: string; icon: AppIconName }[] = [
  { id: 'all', label: 'All Diets', icon: 'restaurant' },
  { id: 'veg', label: 'Pure Veg', icon: 'leaf' },
  { id: 'nonveg', label: 'Non-Veg', icon: 'nutrition' },
  { id: 'vegan', label: 'Vegan', icon: 'leaf' },
  { id: 'keto', label: 'Keto Low-Carb', icon: 'flame' },
  { id: 'jain', label: 'Jain Friendly', icon: 'leaf' },
  { id: 'gluten-free', label: 'Gluten-Free', icon: 'checkmark-circle' },
];

const CUISINE_FILTER_OPTIONS: { id: 'All' | CuisineType; label: string; icon: AppIconName }[] = [
  { id: 'All', label: 'All Cuisines', icon: 'globe' },
  { id: 'North Indian', label: 'North Indian', icon: 'restaurant' },
  { id: 'South Indian', label: 'South Indian', icon: 'cafe' },
  { id: 'Punjabi', label: 'Punjabi', icon: 'flame' },
  { id: 'Hyderabadi', label: 'Hyderabadi', icon: 'sparkles' },
  { id: 'Coastal', label: 'Coastal', icon: 'water' },
  { id: 'Italian', label: 'Italian', icon: 'pizza' },
  { id: 'Mexican', label: 'Mexican', icon: 'flame' },
  { id: 'American', label: 'American', icon: 'fast-food' },
  { id: 'Mughlai', label: 'Mughlai', icon: 'star' },
  { id: 'Gujarati', label: 'Gujarati', icon: 'leaf' },
  { id: 'Maharashtrian', label: 'Maharashtrian', icon: 'restaurant' },
  { id: 'Indo-Chinese', label: 'Indo-Chinese', icon: 'flash' },
  { id: 'Continental', label: 'Continental', icon: 'restaurant' },
  { id: 'European', label: 'European', icon: 'globe' },
  { id: 'Mediterranean', label: 'Mediterranean', icon: 'sun' },
];

const DISH_FILTER_OPTIONS: { id: 'All' | DishCategory; label: string; icon: AppIconName }[] = [
  { id: 'All', label: 'All Dishes', icon: 'restaurant' },
  { id: 'Biryani & Rice', label: 'Biryani & Rice', icon: 'sparkles' },
  { id: 'Curries & Gravies', label: 'Curries & Gravies', icon: 'restaurant' },
  { id: 'Pizzas', label: 'Pizzas', icon: 'pizza' },
  { id: 'Burgers & Sliders', label: 'Burgers & Sliders', icon: 'fast-food' },
  { id: 'Tacos', label: 'Tacos', icon: 'flame' },
  { id: 'Burritos & Bowls', label: 'Burritos & Bowls', icon: 'leaf' },
  { id: 'Pastas', label: 'Pastas', icon: 'restaurant' },
  { id: 'Soups & Stews', label: 'Soups & Stews', icon: 'water' },
  { id: 'Street Food', label: 'Street Food', icon: 'restaurant' },
];

const SORT_OPTIONS: {
  id: 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime';
  label: string;
  icon: AppIconName;
}[] = [
  { id: 'popularity', label: 'Most Popular', icon: 'flame' },
  { id: 'priceLowHigh', label: 'Price: Low to High', icon: 'arrow-down' },
  { id: 'priceHighLow', label: 'Price: High to Low', icon: 'arrow-up' },
  { id: 'prepTime', label: 'Fastest Prep Time', icon: 'flash' },
];

// Reusable Meal Kit Vertical Grid Card
function MealKitCard({
  kit,
  onPress,
  onQuickAdd,
  isFavorite,
  onToggleFavorite,
}: {
  kit: MealKit;
  onPress: () => void;
  onQuickAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const { colors, radii, shadows } = useTheme();

  if (!kit || !kit.id) return null;

  const prepTime = (kit.prepTimeMinutes || 0) + (kit.cookTimeMinutes || 0);
  const servings = kit.servings || 2;
  const sachetsCount = Array.isArray(kit.masalaSachets) ? kit.masalaSachets.length : 0;
  const dietBadge = getDietBadgeInfo(kit.diet);

  return (
    <TouchableOpacity
      testID={`meal-kit-card-${kit.id}`}
      style={[
        styles.gridCard,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radii.xl,
          borderColor: colors.borderLight,
          ...shadows.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        {kit.heroImage ? (
          <Image source={{ uri: kit.heroImage }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, { backgroundColor: colors.bgSubtle }]} />
        )}
        <View style={styles.cardBadgeRow}>
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            <Badge label={dietBadge.label} variant={dietBadge.variant} size="sm" />
            {kit.isTrending ? <Badge label="TRENDING" variant="warning" size="sm" /> : null}
            {kit.isOutOfStock ? <Badge label="OUT OF STOCK" variant="danger" size="sm" /> : null}
          </View>
          <TouchableOpacity
            style={styles.cardFavBtn}
            onPress={onToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#EF4444' : '#64748B'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBottomOverlay}>
          <Text style={styles.cardPrepTime}>
            {prepTime} mins • {servings} Servings
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {kit.name || 'Unnamed Kit'}
          </Text>
        </View>

        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {kit.description || kit.tagline || ''}
        </Text>

        <View style={styles.sachetsPillRow}>
          <Text
            style={[
              styles.sachetsPillText,
              { color: colors.primary, backgroundColor: colors.primaryLight },
            ]}
          >
            {sachetsCount} Fresh Spice Sachets Included
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.cardPrice, { color: colors.primary }]}>₹{kit.price ?? 0}</Text>
            {kit.originalPrice ? (
              <Text style={[styles.cardOrigPrice, { color: colors.textMuted }]}>
                ₹{kit.originalPrice}
              </Text>
            ) : null}
          </View>

          {kit.isOutOfStock ? (
            <Button
              title="Out of Stock"
              size="sm"
              disabled
              variant="secondary"
              style={{ paddingHorizontal: 12, opacity: 0.6 }}
            />
          ) : (
            <Button
              title="+ Add"
              size="sm"
              onPress={onQuickAdd}
              style={{ paddingHorizontal: 16 }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Reusable Meal Kit Horizontal Carousel Card
function MealKitHorizontalCard({
  kit,
  currentCity,
  onPress,
  onQuickAdd,
  isFavorite,
  onToggleFavorite,
}: {
  kit: MealKit;
  currentCity?: string;
  onPress: () => void;
  onQuickAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const { colors, radii, shadows } = useTheme();

  if (!kit || !kit.id) return null;

  const isSpecialty = currentCity ? isRegionalSpecialtyOfCity(kit, currentCity) : false;
  const dietBadge = getDietBadgeInfo(kit.diet);

  return (
    <TouchableOpacity
      style={[
        styles.horizontalCard,
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radii.xl,
          borderColor: isSpecialty ? colors.primary : colors.borderLight,
          borderWidth: isSpecialty ? 1.5 : 1,
          ...shadows.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.hCardImgContainer}>
        {kit.heroImage ? (
          <Image source={{ uri: kit.heroImage }} style={styles.hCardImg} />
        ) : (
          <View style={[styles.hCardImg, { backgroundColor: colors.bgSubtle }]} />
        )}
        <View style={styles.hCardBadge}>
          <Badge label={dietBadge.label} variant={dietBadge.variant} size="sm" />
          {kit.isTrending ? (
            <Badge label="TRENDING" variant="warning" size="sm" style={{ marginTop: 2 }} />
          ) : null}
          {isSpecialty ? (
            <Badge
              label={`${kit.originCity || currentCity} Special`}
              variant="accent"
              size="sm"
              style={{ marginTop: 2 }}
            />
          ) : null}
          {kit.isOutOfStock ? (
            <Badge label="OUT OF STOCK" variant="danger" size="sm" style={{ marginTop: 2 }} />
          ) : null}
        </View>
      </View>

      <View style={styles.hCardContent}>
        <Text style={[styles.hCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {kit.name || 'Unnamed Kit'}
        </Text>
        <Text style={[styles.hCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {kit.tagline || ''}
        </Text>

        <View style={styles.hCardBottomRow}>
          <Text style={[styles.hCardPrice, { color: colors.primary }]}>₹{kit.price ?? 0}</Text>
          {kit.isOutOfStock ? (
            <Button
              title="Out of Stock"
              size="sm"
              disabled
              variant="secondary"
              style={{ opacity: 0.6 }}
            />
          ) : (
            <Button title="+ Add" size="sm" onPress={onQuickAdd} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const HomeScreenView: React.FC = () => {
  const { user, isAdmin, isChef } = useAuth();
  const { colors, radii, shadows, isDark, toggleColorMode } = useTheme();
  const { addItem, totalCount } = useCart();
  const { isInWishlist, toggleWishlist, wishlistCount } = useWishlist();
  const { preferences } = usePreferences();

  // Selected filters
  const [dietFilterTags, setDietFilterTags] = useState<Set<DietTag>>(new Set());
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'All'>('All');
  const [selectedDishCategory, setSelectedDishCategory] = useState<DishCategory | 'All'>('All');
  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel | 'All'>('All');
  const [selectedDietTag, setSelectedDietTag] = useState<DietTag | 'all'>('all');
  const [maxPrepTime, setMaxPrepTime] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime'>(
    'popularity',
  );

  // Minimalist Filter & Sort Dropdown states
  const [activeFilterModal, setActiveFilterModal] = useState<'diet' | 'cuisine' | 'dish' | null>(
    null,
  );
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Modals
  const [selectedKit, setSelectedKit] = useState<MealKit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [reviewKit, setReviewKit] = useState<MealKit | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [allKits, setAllKits] = useState<MealKit[]>(() => getMealKits());
  const [isSeedingCity, setIsSeedingCity] = useState(false);

  // Seed city-specific kits when the user's city is known and no city kits exist yet
  const runCitySeederIfNeeded = useCallback(async (city: string) => {
    if (!city || !city.trim()) return;
    setIsSeedingCity(true);
    try {
      await ensureCitySpecialtiesSeeded(city);
      await seedKitsForCityIfNeeded(city);
      // subscribeToMealKits listener will pick up the new kits automatically
    } finally {
      setIsSeedingCity(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch from Supabase to load any newly published admin kits
    syncMealKitsWithSupabase().then((kits) => {
      if (kits && kits.length > 0) {
        setAllKits(kits);
      }
    });

    // Real-time catalog subscription (local in-memory broadcasts)
    const unsubscribeLocal = subscribeToMealKits(() => {
      setAllKits(getMealKits());
    });

    // Real-time database subscription (cloud broadcasts for trending & catalog updates)
    const unsubscribeRealtime = subscribeToMealKitsRealtime(() => {
      setAllKits(getMealKits());
    });

    return () => {
      unsubscribeLocal();
      unsubscribeRealtime();
    };
  }, []);

  // Seed city-specific kits whenever the user's city changes
  useEffect(() => {
    if (preferences.currentCity && preferences.currentCity.trim()) {
      runCitySeederIfNeeded(preferences.currentCity);
    }
  }, [preferences.currentCity]);

  // Helper to check if a kit contains allergens configured in user preferences
  const matchesUserAllergens = (kit: MealKit): boolean => {
    if (!preferences.allergies || preferences.allergies.length === 0) return true;
    const kitAllergens = (kit.allergens || []).map((a) => a.toLowerCase().trim());
    return !preferences.allergies.some((userAllergy) => {
      const u = userAllergy.toLowerCase().trim();
      return kitAllergens.some((a) => a.includes(u) || u.includes(a));
    });
  };

  // Helper to check if a kit matches user's preferred diet types
  const matchesUserDiet = (kit: MealKit): boolean => {
    const userDiets = preferences.dietTypes || [];
    if (userDiets.length === 0) return true;
    return userDiets.some((diet) => {
      if (diet === 'veg')
        return (
          kit.diet === 'veg' || (Array.isArray(kit.dietaryTags) && kit.dietaryTags.includes('veg'))
        );
      if (diet === 'nonveg') return kit.diet === 'nonveg';
      return Array.isArray(kit.dietaryTags) && kit.dietaryTags.includes(diet);
    });
  };

  // Effective diet: used only as a fallback label; actual filtering uses dietFilterTags set
  const effectiveDiet = dietFilterTags.size === 1 ? [...dietFilterTags][0] : 'all';

  // Filtered kits based on current options
  const filteredKits = useMemo(() => {
    // Filter directly on allKits (React state) so this memo is always reactive to catalog changes.
    let results = (allKits || []).filter((k): k is MealKit => Boolean(k && k.id));

    // City filter — kits with cities:[] are hub-wide, else must match currentCity
    if (preferences.currentCity && preferences.currentCity.trim()) {
      const targetCity = preferences.currentCity.trim().toLowerCase();
      results = results.filter(
        (kit) =>
          !kit.cities ||
          kit.cities.length === 0 ||
          kit.cities.some((c) => c && c.toLowerCase() === targetCity),
      );
    }

    // Diet filter — match kits that satisfy ANY of the selected diet tags
    if (dietFilterTags.size > 0) {
      results = results.filter((k) =>
        [...dietFilterTags].some((tag) => {
          if (tag === 'veg')
            return (
              k.diet === 'veg' || (Array.isArray(k.dietaryTags) && k.dietaryTags.includes('veg'))
            );
          if (tag === 'nonveg') return k.diet === 'nonveg';
          return Array.isArray(k.dietaryTags) && k.dietaryTags.includes(tag);
        }),
      );
    }

    // Cuisine filter
    if (selectedCuisine && selectedCuisine !== 'All') {
      results = results.filter((k) => k.cuisine === selectedCuisine);
    }

    // Dish category filter
    if (selectedDishCategory && selectedDishCategory !== 'All') {
      results = results.filter((k) => k.dishCategory === selectedDishCategory);
    }

    // Spice level filter
    if (selectedSpice && selectedSpice !== 'All') {
      results = results.filter((k) => k.spiceLevel === selectedSpice);
    }

    // Dietary tags filter
    if (selectedDietTag && selectedDietTag !== 'all') {
      results = results.filter(
        (k) => Array.isArray(k.dietaryTags) && k.dietaryTags.includes(selectedDietTag as DietTag),
      );
    }

    // Max prep time filter
    if (maxPrepTime) {
      results = results.filter(
        (k) => (k.prepTimeMinutes || 0) + (k.cookTimeMinutes || 0) <= maxPrepTime,
      );
    }

    // Sort
    switch (sortBy) {
      case 'priceLowHigh':
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'priceHighLow':
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'prepTime':
        results.sort(
          (a, b) =>
            (a.prepTimeMinutes || 0) +
            (a.cookTimeMinutes || 0) -
            ((b.prepTimeMinutes || 0) + (b.cookTimeMinutes || 0)),
        );
        break;
      case 'popularity':
      default:
        results.sort(
          (a, b) => (b.rating || 0) * (b.reviewCount || 0) - (a.rating || 0) * (a.reviewCount || 0),
        );
        break;
    }

    // Deduplicate by ID to guarantee unique keys across catalog/seeder updates
    const seenIds = new Set<string>();
    results = results.filter((k) => {
      if (seenIds.has(k.id)) return false;
      seenIds.add(k.id);
      return true;
    });

    return results;
  }, [
    dietFilterTags,
    selectedCuisine,
    selectedDishCategory,
    selectedSpice,
    selectedDietTag,
    maxPrepTime,
    sortBy,
    preferences.currentCity,
    allKits,
  ]);

  // "Trending in your region" ranked by admin trending dishes & regional specialties
  const trendingKits = useMemo(() => {
    const ranked = rankMealKitsForCityTrending(
      allKits,
      preferences.currentCity,
      preferences.regionHub,
    );
    const seen = new Set<string>();
    return ranked.filter((k) => {
      if (!k?.id || seen.has(k.id)) return false;
      seen.add(k.id);
      return true;
    });
  }, [allKits, preferences.currentCity, preferences.regionHub]);

  // "Recommended for you" strictly shows user foods from their preferred categories & signup profile
  const recommendedKits = useMemo(() => {
    const seen = new Set<string>();
    const userPreferredCuisines = preferences?.preferredCuisines || [];

    // If user has not configured preferred cuisines, return empty so prompt guides them to select
    if (!userPreferredCuisines || userPreferredCuisines.length === 0) {
      return [];
    }

    const preferredSet = new Set(userPreferredCuisines.map((c) => c.toLowerCase().trim()));

    return (
      allKits
        .filter((k): k is MealKit => Boolean(k && k.id))
        .filter((k) => {
          if (seen.has(k.id)) return false;
          seen.add(k.id);
          return true;
        })
        // 1. Must match user's diet preference from profile
        .filter((k) => matchesUserDiet(k))
        // 2. Must not contain user's allergies
        .filter((k) => matchesUserAllergens(k))
        // 3. Strictly show ONLY foods from user's preferred categories / cuisines
        .filter((k) => {
          if (!k.cuisine) return false;
          return preferredSet.has(k.cuisine.toLowerCase().trim());
        })
        // 4. Sort by rating & popularity
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    );
  }, [allKits, preferences?.dietTypes, preferences?.allergies, preferences?.preferredCuisines]);

  // "Global Favorites & Foreign Specials"
  const foreignKits = useMemo(() => {
    const seen = new Set<string>();
    return allKits
      .filter((k): k is MealKit => Boolean(k && k.id))
      .filter((k) => {
        if (seen.has(k.id)) return false;
        seen.add(k.id);
        return true;
      })
      .filter((k) =>
        ['Italian', 'Mexican', 'American', 'Continental', 'European', 'Mediterranean'].includes(
          k.cuisine,
        ),
      );
  }, [allKits]);

  const handleOpenDetail = (kit: MealKit) => {
    setSelectedKit(kit);
    setDetailModalVisible(true);
  };

  const handleQuickAdd = (kit: MealKit) => {
    // Open meal kit detail modal so user can customize servings, spice level, etc.
    handleOpenDetail(kit);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top HelloFresh-style Food-Forward Header */}
      <View
        style={[
          styles.topHeader,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setPreferencesModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={{ marginRight: 6 }}>
              <Icon name="location" size={18} color={colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[styles.deliveringToText, { color: colors.textMuted }]}>
                  DELIVERING TO
                </Text>
                <Icon name="chevron-down" size={12} color={colors.primary} />
              </View>
              <Text style={[styles.locationCity, { color: colors.textPrimary }]}>
                {preferences.city || preferences.currentCity}
                {preferences.subRegion ? `, ${preferences.subRegion.split('-').pop()}` : ''}
                {preferences.state ? `, ${preferences.state}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Theme switcher with culinary color schemes & light/dark mode */}
          <ThemeSwitcher variant="header" />
        </View>

        {/* Right header actions: Dietary badge, Wishlist, Cart */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.prefChip, { backgroundColor: colors.primaryLight }]}
            onPress={() => setPreferencesModalVisible(true)}
          >
            <Text style={[styles.prefChipText, { color: colors.primary }]}>
              {preferences.dietTypes && preferences.dietTypes.length > 0
                ? preferences.dietTypes.join(', ').toUpperCase()
                : 'ALL DIETS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.bgSubtle }]}
            onPress={() => router.push('/(tabs)/orders' as any)}
          >
            <Icon name="heart" size={18} color={colors.textPrimary} />
            {wishlistCount > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.counterBadgeText}>{wishlistCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.bgSubtle }]}
            onPress={() => router.push('/(tabs)/cart' as any)}
          >
            <Icon name="cart" size={18} color={colors.textPrimary} />
            {totalCount > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.counterBadgeText}>{totalCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Search Bar Banner Link */}
        <View style={styles.searchBarWrapper}>
          <TouchableOpacity
            style={[
              styles.fakeSearchBar,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
                borderRadius: radii.xl,
                ...shadows.soft,
              },
            ]}
            onPress={() => router.push('/(tabs)/search' as any)}
            activeOpacity={0.85}
          >
            <View style={{ marginRight: 8 }}>
              <Icon name="search" size={18} color={colors.textMuted} />
            </View>
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
              Search by recipe or ingredient (e.g. Paneer, Biryani, Ghee)...
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chef Studio Quick Launcher for Chefs */}
        {isChef && !isAdmin && (
          <View style={{ marginHorizontal: 20, marginBottom: 14 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/chef' as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#D97706',
                borderRadius: radii.xl,
                paddingHorizontal: 16,
                paddingVertical: 12,
                ...shadows.soft,
              }}
              activeOpacity={0.88}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  marginRight: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="chef" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    Chef Studio — Author Meal Kits
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                    Create and edit signature recipes for admin review
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                }}
              >
                <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '800' }}>
                  Open Studio →
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Promotional Offers Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoCarousel}
        >
          {PROMO_BANNERS.map((promo) => (
            <View
              key={promo.id}
              style={[
                styles.promoCard,
                { backgroundColor: promo.gradientBg, borderRadius: radii.xl, ...shadows.medium },
              ]}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoTagBadge}>
                  <Text style={styles.promoTagText}>{promo.tag}</Text>
                </View>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
                <TouchableOpacity
                  style={styles.promoButton}
                  onPress={() => router.push('/(tabs)/cart' as any)}
                >
                  <Text style={styles.promoButtonText}>Apply Code {promo.code}</Text>
                </TouchableOpacity>
              </View>
              <Image source={{ uri: promo.image }} style={styles.promoImg} resizeMode="cover" />
            </View>
          ))}
        </ScrollView>

        {/* Minimalist 3-Filter Buttons Bar */}
        <View style={styles.minimalistFilterBar}>
          <TouchableOpacity
            style={[
              styles.minimalistFilterBtn,
              {
                backgroundColor: dietFilterTags.size > 0 ? colors.primary + '18' : colors.bgSurface,
                borderColor: dietFilterTags.size > 0 ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setActiveFilterModal('diet')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon
                name="restaurant"
                size={14}
                color={dietFilterTags.size > 0 ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.minimalistFilterBtnText,
                  {
                    color: dietFilterTags.size > 0 ? colors.primary : colors.textPrimary,
                  },
                ]}
                numberOfLines={1}
              >
                {dietFilterTags.size === 0
                  ? 'Diets'
                  : dietFilterTags.size === 1
                    ? [...dietFilterTags][0]!.toUpperCase()
                    : `${dietFilterTags.size} Diets`}
              </Text>
              <Icon name="chevron-down" size={12} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.minimalistFilterBtn,
              {
                backgroundColor:
                  selectedCuisine !== 'All' ? colors.primary + '18' : colors.bgSurface,
                borderColor: selectedCuisine !== 'All' ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setActiveFilterModal('cuisine')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon
                name="globe"
                size={14}
                color={selectedCuisine !== 'All' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.minimalistFilterBtnText,
                  { color: selectedCuisine !== 'All' ? colors.primary : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {selectedCuisine === 'All' ? 'Cuisines' : selectedCuisine}
              </Text>
              <Icon name="chevron-down" size={12} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.minimalistFilterBtn,
              {
                backgroundColor:
                  selectedDishCategory !== 'All' ? colors.primary + '18' : colors.bgSurface,
                borderColor: selectedDishCategory !== 'All' ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setActiveFilterModal('dish')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon
                name="fast-food"
                size={14}
                color={selectedDishCategory !== 'All' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.minimalistFilterBtnText,
                  { color: selectedDishCategory !== 'All' ? colors.primary : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {selectedDishCategory === 'All' ? 'Dishes' : selectedDishCategory}
              </Text>
              <Icon name="chevron-down" size={12} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sort Bar with Dropdown List */}
        <View style={styles.sortRow}>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            Showing {filteredKits.length} Chef Meal Kits
          </Text>
          <View style={{ position: 'relative', zIndex: 10 }}>
            <TouchableOpacity
              onPress={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              style={[
                styles.sortBtn,
                {
                  borderColor: isSortDropdownOpen ? colors.primary : colors.borderLight,
                  backgroundColor: colors.bgSurface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
              activeOpacity={0.8}
            >
              <Icon
                name={SORT_OPTIONS.find((s) => s.id === sortBy)?.icon || 'flame'}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.sortBtnText, { color: colors.textPrimary }]}>
                Sort: {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
              </Text>
              <Icon
                name={isSortDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Sort Dropdown List */}
            {isSortDropdownOpen && (
              <View
                style={[
                  styles.sortDropdownMenu,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    ...shadows.medium,
                  },
                ]}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.sortDropdownItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSortBy(opt.id);
                        setIsSortDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ marginRight: 8 }}>
                        <Icon
                          name={opt.icon}
                          size={15}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.sortDropdownItemText,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={{ marginLeft: 'auto' }}>
                          <Icon name="check" size={14} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* SECTION 3 — PROMOTED: when a dish category is active, show the grid first */}
        {selectedDishCategory !== 'All' && (
          <View style={styles.catalogSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              {selectedDishCategory}{' '}
              {preferences.currentCity ? `in ${preferences.currentCity}` : ''}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Includes fresh ingredients, whole spices & authentic masala sachets
            </Text>

            {filteredKits.length === 0 ? (
              <View
                style={[
                  styles.emptyKitsContainer,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                ]}
              >
                <View style={{ marginBottom: 12 }}>
                  <Icon name="restaurant" size={40} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyKitsTitle, { color: colors.textPrimary }]}>
                  No {selectedDishCategory} kits found
                </Text>
                <Text style={[styles.emptyKitsSubtitle, { color: colors.textSecondary }]}>
                  Try loosening your dietary filters or clearing allergen exclusions to see more
                  dishes.
                </Text>
                <TouchableOpacity
                  style={[styles.resetPrefBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedDishCategory('All');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetPrefBtnText}>Show All Dishes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.kitsGrid}>
                {filteredKits
                  .filter((k): k is MealKit => Boolean(k && k.id))
                  .map((kit) => (
                    <MealKitCard
                      key={kit.id}
                      kit={kit}
                      onPress={() => handleOpenDetail(kit)}
                      onQuickAdd={() => handleQuickAdd(kit)}
                      isFavorite={kit?.id ? (isInWishlist?.(kit.id) ?? false) : false}
                      onToggleFavorite={() => kit?.id && toggleWishlist?.(kit.id)}
                    />
                  ))}
              </View>
            )}
          </View>
        )}

        {/* CITY SEEDING INDICATOR */}
        {isSeedingCity && preferences.currentCity ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Discovering local recipes for {preferences.currentCity}…
            </Text>
          </View>
        ) : null}

        {/* SECTION 1: Trending in Your Region */}
        {dietFilterTags.size === 0 && selectedCuisine === 'All' && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Trending in {preferences.currentCity}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {preferences.currentCity} regional specialties & popular kits in your area today
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardRow}
            >
              {trendingKits
                .filter((k): k is MealKit => Boolean(k && k.id))
                .map((kit) => (
                  <MealKitHorizontalCard
                    key={kit.id}
                    kit={kit}
                    currentCity={preferences.currentCity}
                    onPress={() => handleOpenDetail(kit)}
                    onQuickAdd={() => handleQuickAdd(kit)}
                    isFavorite={kit?.id ? (isInWishlist?.(kit.id) ?? false) : false}
                    onToggleFavorite={() => kit?.id && toggleWishlist?.(kit.id)}
                  />
                ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 1.5: Global Favorites & Foreign Specials (Burgers, Pizzas, Tacos, Burritos, Pastas) */}
        {dietFilterTags.size === 0 && selectedCuisine === 'All' && foreignKits.length > 0 && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Global Street Eats & Foreign Specials
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Smash burgers, fermented sourdough pizzas, Birria tacos, burrito bowls, pastas,
                  European & Mediterranean classics
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardRow}
            >
              {foreignKits
                .filter((k): k is MealKit => Boolean(k && k.id))
                .map((kit) => (
                  <MealKitHorizontalCard
                    key={kit.id}
                    kit={kit}
                    onPress={() => handleOpenDetail(kit)}
                    onQuickAdd={() => handleQuickAdd(kit)}
                    isFavorite={kit?.id ? (isInWishlist?.(kit.id) ?? false) : false}
                    onToggleFavorite={() => kit?.id && toggleWishlist?.(kit.id)}
                  />
                ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 2: Recommended for You (Strictly from user's preferred categories & signup profile) */}
        {dietFilterTags.size === 0 && selectedCuisine === 'All' && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Recommended for You
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {preferences.dietTypes && preferences.dietTypes.length > 0
                    ? `Curated for your ${preferences.dietTypes.join(', ').toUpperCase()} profile`
                    : 'Curated for your profile'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreferencesModalVisible(true)}>
                <Text style={[styles.editPrefLink, { color: colors.primary }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {recommendedKits.length === 0 ? (
              <View
                style={{
                  padding: 20,
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.lg,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  alignItems: 'center',
                  marginHorizontal: 16,
                  marginTop: 8,
                }}
              >
                <Icon name="restaurant" size={28} color={colors.textMuted} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginTop: 8,
                  }}
                >
                  No Dishes in Preferred Categories
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 12,
                  }}
                >
                  {preferences.preferredCuisines && preferences.preferredCuisines.length > 0
                    ? `No meal kits found matching your preferred cuisines in the ${(preferences.dietTypes || []).join(', ').toUpperCase()} category.`
                    : 'Set your favorite cuisines in your profile to discover personalized chef recommendations.'}
                </Text>
                <Button
                  title="Update Taste Preferences"
                  variant="primary"
                  size="sm"
                  onPress={() => setPreferencesModalVisible(true)}
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardRow}
              >
                {recommendedKits
                  .filter((k): k is MealKit => Boolean(k && k.id))
                  .map((kit) => (
                    <MealKitHorizontalCard
                      key={kit.id}
                      kit={kit}
                      currentCity={preferences.currentCity}
                      onPress={() => handleOpenDetail(kit)}
                      onQuickAdd={() => handleQuickAdd(kit)}
                      isFavorite={kit?.id ? (isInWishlist?.(kit.id) ?? false) : false}
                      onToggleFavorite={() => kit?.id && toggleWishlist?.(kit.id)}
                    />
                  ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* SECTION 3: All Available Kits Grid — shown at bottom when no dish category filter active */}
        {selectedDishCategory === 'All' && (
          <View style={styles.catalogSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              {preferences.currentCity
                ? `All Kits in ${preferences.currentCity}`
                : 'All Gourmet Meal Prep Kits'}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Includes fresh ingredients, whole spices & authentic masala sachets
            </Text>

            {filteredKits.length === 0 ? (
              <View
                style={[
                  styles.emptyKitsContainer,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                ]}
              >
                <View style={{ marginBottom: 12 }}>
                  <Icon name="restaurant" size={40} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyKitsTitle, { color: colors.textPrimary }]}>
                  No dishes match your active filters
                </Text>
                <Text style={[styles.emptyKitsSubtitle, { color: colors.textSecondary }]}>
                  Try loosening your dietary filters or clearing allergen exclusions to see more
                  dishes.
                </Text>
                <TouchableOpacity
                  style={[styles.resetPrefBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setDietFilterTags(new Set());
                    setSelectedCuisine('All');
                    setSelectedDishCategory('All');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetPrefBtnText}>Show All Dishes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.kitsGrid}>
                {filteredKits
                  .filter((k): k is MealKit => Boolean(k && k.id))
                  .map((kit) => (
                    <MealKitCard
                      key={kit.id}
                      kit={kit}
                      onPress={() => handleOpenDetail(kit)}
                      onQuickAdd={() => handleQuickAdd(kit)}
                      isFavorite={kit?.id ? (isInWishlist?.(kit.id) ?? false) : false}
                      onToggleFavorite={() => kit?.id && toggleWishlist?.(kit.id)}
                    />
                  ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Meal Detail Modal */}
      <MealDetailModal
        kit={selectedKit}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onOpenReviewsModal={(kit) => {
          setReviewKit(kit);
          setReviewModalVisible(true);
        }}
      />

      {/* Dietary Preferences Modal */}
      <DietaryPreferencesModal
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
      />

      {/* Minimalist Filter Selection Modal (Diets / Cuisines / Dishes) */}
      <Modal
        visible={activeFilterModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveFilterModal(null)}
      >
        <View style={styles.filterModalOverlay}>
          <View
            style={[
              styles.filterModalCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
              shadows.card,
            ]}
          >
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: colors.textPrimary }]}>
                {activeFilterModal === 'diet' && 'Select Dietary Preference'}
                {activeFilterModal === 'cuisine' && 'Select Preferred Cuisine'}
                {activeFilterModal === 'dish' && 'Select Dish Category'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (activeFilterModal === 'diet') setDietFilterTags(new Set());
                  if (activeFilterModal === 'cuisine') setSelectedCuisine('All');
                  if (activeFilterModal === 'dish') setSelectedDishCategory('All');
                  setActiveFilterModal(null);
                }}
              >
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
                  Reset to All
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {activeFilterModal === 'diet' &&
                DIET_FILTER_OPTIONS.map((opt) => {
                  const isAllOption = opt.id === 'all';
                  const isSelected = isAllOption
                    ? dietFilterTags.size === 0
                    : dietFilterTags.has(opt.id as DietTag);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.filterModalRow,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        if (isAllOption) {
                          setDietFilterTags(new Set());
                        } else {
                          setDietFilterTags((prev) => {
                            const next = new Set(prev);
                            if (next.has(opt.id as DietTag)) {
                              next.delete(opt.id as DietTag);
                            } else {
                              next.add(opt.id as DietTag);
                            }
                            return next;
                          });
                        }
                        // Don't auto-close — let user pick multiple, close via Done button
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ marginRight: 10 }}>
                        <Icon
                          name={opt.icon}
                          size={20}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.filterModalRowText,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={{ marginLeft: 'auto' }}>
                          <Icon name="check" size={16} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              {activeFilterModal === 'diet' && (
                <TouchableOpacity
                  style={[
                    styles.filterModalRow,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      justifyContent: 'center',
                      marginTop: 4,
                    },
                  ]}
                  onPress={() => setActiveFilterModal(null)}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                    Done — Apply{' '}
                    {dietFilterTags.size > 0 ? `(${dietFilterTags.size} selected)` : '(All Diets)'}
                  </Text>
                </TouchableOpacity>
              )}

              {activeFilterModal === 'cuisine' &&
                CUISINE_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedCuisine === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.filterModalRow,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCuisine(opt.id);
                        setActiveFilterModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ marginRight: 10 }}>
                        <Icon
                          name={opt.icon}
                          size={20}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.filterModalRowText,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={{ marginLeft: 'auto' }}>
                          <Icon name="check" size={16} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              {activeFilterModal === 'dish' &&
                DISH_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedDishCategory === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.filterModalRow,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        setSelectedDishCategory(opt.id);
                        setActiveFilterModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ marginRight: 10 }}>
                        <Icon
                          name={opt.icon}
                          size={20}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.filterModalRowText,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={{ marginLeft: 'auto' }}>
                          <Icon name="check" size={16} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveFilterModal(null)}
              style={[styles.filterModalCloseBtn, { borderColor: colors.borderLight }]}
            >
              <Text style={[styles.filterModalCloseText, { color: colors.textPrimary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  deliveringToText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownArrow: {
    fontSize: 9,
    fontWeight: '800',
  },
  locationCity: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  prefChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  counterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollBody: {
    paddingBottom: 110,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  fakeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 13,
    flex: 1,
  },
  promoCarousel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  promoCard: {
    width: width * 0.82,
    maxWidth: 340,
    height: 140,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1.2,
    padding: 14,
    justifyContent: 'center',
  },
  promoTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  promoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  promoButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  promoButtonText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  promoImg: {
    flex: 0.8,
    height: '100%',
  },
  prefBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  prefBannerIcon: {
    fontSize: 18,
  },
  prefBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  prefBannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  prefToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  prefToggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  prefSettingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKitsContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyKitsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyKitsSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  resetPrefBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetPrefBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  minimalistFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  minimalistFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  minimalistFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortDropdownMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 9999,
  },
  sortDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortDropdownItemText: {
    fontSize: 12,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  filterModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  filterModalRowText: {
    fontSize: 14,
  },
  filterModalCloseBtn: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterModalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
  catalogSection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  editPrefLink: {
    fontSize: 12,
    fontWeight: '800',
  },
  horizontalCardRow: {
    gap: 12,
    paddingBottom: 4,
  },
  horizontalCard: {
    width: 220,
    overflow: 'hidden',
    borderWidth: 1,
  },
  hCardImgContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  hCardImg: {
    width: '100%',
    height: '100%',
  },
  hCardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  hCardContent: {
    padding: 12,
  },
  hCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  hCardSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  hCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hCardPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  kitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    overflow: 'hidden',
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '49%',
    marginBottom: 4,
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  cardBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFavBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardPrepTime: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetails: {
    padding: 10,
  },
  cardTitleRow: {
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  sachetsPillRow: {
    marginBottom: 8,
  },
  sachetsPillText: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardOrigPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
});
