import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { useWishlist } from '../../framework/context/WishlistContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import {
  getMealKits,
  MealKit,
  searchAndFilterMealKits,
  CuisineType,
  DishCategory,
  SpiceLevel,
  DietTag,
} from '../../framework/services/mealKitsService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { PillTag } from '../../framework/ui/PillTag';
import { RatingStars } from '../../framework/ui/RatingStars';
import { MealDetailModal } from '../meal-detail/MealDetailModal';
import { DietaryPreferencesModal } from '../onboarding/DietaryPreferencesModal';
import { ReviewModal } from '../reviews/ReviewModal';
import { ThemeSwitcher } from '../../framework/theme/ThemeSwitcher';

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

export const HomeScreenView: React.FC = () => {
  const { user } = useAuth();
  const { colors, radii, shadows, isDark, toggleColorMode } = useTheme();
  const { addItem, totalCount } = useCart();
  const { isInWishlist, toggleWishlist, wishlistCount } = useWishlist();
  const { preferences } = usePreferences();

  // Selected filters
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'All'>('All');
  const [selectedDishCategory, setSelectedDishCategory] = useState<DishCategory | 'All'>('All');
  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel | 'All'>('All');
  const [selectedDietTag, setSelectedDietTag] = useState<DietTag | 'all'>('all');
  const [maxPrepTime, setMaxPrepTime] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime'>(
    'popularity',
  );

  // Modals
  const [selectedKit, setSelectedKit] = useState<MealKit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [reviewKit, setReviewKit] = useState<MealKit | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const allKits = useMemo(() => getMealKits(), []);

  // Filtered kits based on current options
  const filteredKits = useMemo(() => {
    return searchAndFilterMealKits({
      diet: dietFilter,
      cuisine: selectedCuisine,
      dishCategory: selectedDishCategory !== 'All' ? selectedDishCategory : undefined,
      spiceLevel: selectedSpice,
      dietaryTags: selectedDietTag !== 'all' ? [selectedDietTag] : undefined,
      maxPrepTime,
      sortBy,
    });
  }, [
    dietFilter,
    selectedCuisine,
    selectedDishCategory,
    selectedSpice,
    selectedDietTag,
    maxPrepTime,
    sortBy,
  ]);

  // "Trending in your region"
  const trendingKits = useMemo(() => {
    return allKits.filter(
      (k) => k.isTrending || k.availableRegions.includes(preferences.regionHub),
    );
  }, [allKits, preferences.regionHub]);

  // "Recommended for you" based on user preferences
  const recommendedKits = useMemo(() => {
    return allKits.filter((k) => {
      if (preferences.dietType === 'veg' && k.diet !== 'veg') return false;
      if (preferences.dietType === 'vegan' && !k.dietaryTags.includes('vegan')) return false;
      if (preferences.dietType === 'jain' && !k.dietaryTags.includes('jain')) return false;
      if (preferences.dietType === 'keto' && !k.dietaryTags.includes('keto')) return false;
      return true;
    });
  }, [allKits, preferences.dietType]);

  // "Global Favorites & Foreign Specials" (Italian Pizzas & Pastas, Mexican Tacos & Burritos, American Burgers)
  const foreignKits = useMemo(() => {
    return allKits.filter((k) =>
      ['Italian', 'Mexican', 'American', 'Continental'].includes(k.cuisine),
    );
  }, [allKits]);

  const handleOpenDetail = (kit: MealKit) => {
    setSelectedKit(kit);
    setDetailModalVisible(true);
  };

  const handleQuickAdd = (kit: MealKit) => {
    addItem(kit, 1);
    Alert.alert('Added to Cart! 🛒', `1x ${kit.name} added to your basket.`);
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
            <Text style={styles.locationIcon}>📍</Text>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.deliveringToText, { color: colors.textMuted }]}>
                  DELIVERING TO
                </Text>
                <Text style={[styles.dropdownArrow, { color: colors.primary }]}> ▼</Text>
              </View>
              <Text style={[styles.locationCity, { color: colors.textPrimary }]}>
                {preferences.currentCity} ({preferences.regionHub} Hub)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right header actions: Dietary badge, Wishlist, Cart */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.prefChip, { backgroundColor: colors.primaryLight }]}
            onPress={() => setPreferencesModalVisible(true)}
          >
            <Text style={[styles.prefChipText, { color: colors.primary }]}>
              {preferences.dietType.toUpperCase()}
            </Text>
          </TouchableOpacity>

          {/* Light / Dark Mode Quick Toggle */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight, borderWidth: 1 },
            ]}
            onPress={toggleColorMode}
            accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.bgSubtle }]}
            onPress={() => router.push('/(tabs)/orders' as any)}
          >
            <Text style={{ fontSize: 17 }}>❤️</Text>
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
            <Text style={{ fontSize: 17 }}>🛒</Text>
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
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
              Search by recipe or ingredient (e.g. Paneer, Biryani, Ghee)...
            </Text>
          </TouchableOpacity>
        </View>

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

        {/* Quick Filter Bar (Veg/Non-Veg, Cuisines, Spice) */}
        <View style={styles.filterSection}>
          <View style={styles.vegToggleRow}>
            <TouchableOpacity
              style={[
                styles.vegTab,
                {
                  backgroundColor: dietFilter === 'all' ? colors.primary : colors.bgSurface,
                  borderColor: dietFilter === 'all' ? colors.primary : colors.border,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setDietFilter('all')}
            >
              <Text
                style={[
                  styles.vegTabText,
                  { color: dietFilter === 'all' ? colors.textInverse : colors.textPrimary },
                ]}
              >
                All Meals ({allKits.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.vegTab,
                {
                  backgroundColor: dietFilter === 'veg' ? colors.veg : colors.bgSurface,
                  borderColor: dietFilter === 'veg' ? colors.veg : colors.border,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setDietFilter('veg')}
            >
              <Text style={{ fontSize: 13, marginRight: 4 }}>🥬</Text>
              <Text
                style={[
                  styles.vegTabText,
                  { color: dietFilter === 'veg' ? '#FFFFFF' : colors.veg },
                ]}
              >
                Pure Veg
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.vegTab,
                {
                  backgroundColor: dietFilter === 'nonveg' ? colors.nonVeg : colors.bgSurface,
                  borderColor: dietFilter === 'nonveg' ? colors.nonVeg : colors.border,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setDietFilter('nonveg')}
            >
              <Text style={{ fontSize: 13, marginRight: 4 }}>🍗</Text>
              <Text
                style={[
                  styles.vegTabText,
                  { color: dietFilter === 'nonveg' ? '#FFFFFF' : colors.nonVeg },
                ]}
              >
                Non-Veg
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cuisine and Dietary Tag Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            <PillTag
              label="All Cuisines"
              selected={selectedCuisine === 'All'}
              onPress={() => setSelectedCuisine('All')}
            />
            {(
              [
                { id: 'Italian', label: 'Italian 🍕🍝' },
                { id: 'Mexican', label: 'Mexican 🌮🌯' },
                { id: 'American', label: 'American 🍔' },
                { id: 'North Indian', label: 'North Indian 🍛' },
                { id: 'Hyderabadi', label: 'Hyderabadi 🍲' },
                { id: 'Punjabi', label: 'Punjabi 🫓' },
                { id: 'Coastal', label: 'Coastal 🦐' },
              ] as { id: CuisineType; label: string }[]
            ).map((c) => (
              <PillTag
                key={c.id}
                label={c.label}
                selected={selectedCuisine === c.id}
                onPress={() => setSelectedCuisine(selectedCuisine === c.id ? 'All' : c.id)}
              />
            ))}
            <PillTag
              label="Jain Friendly"
              selected={selectedDietTag === 'jain'}
              onPress={() => setSelectedDietTag(selectedDietTag === 'jain' ? 'all' : 'jain')}
            />
            <PillTag
              label="Vegan"
              selected={selectedDietTag === 'vegan'}
              onPress={() => setSelectedDietTag(selectedDietTag === 'vegan' ? 'all' : 'vegan')}
            />
            <PillTag
              label="Keto Low-Carb"
              selected={selectedDietTag === 'keto'}
              onPress={() => setSelectedDietTag(selectedDietTag === 'keto' ? 'all' : 'keto')}
            />
            <PillTag
              label="Under 25 mins"
              selected={maxPrepTime === 25}
              onPress={() => setMaxPrepTime(maxPrepTime === 25 ? undefined : 25)}
            />
          </ScrollView>

          {/* Dish Sub-Category Quick Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.pillsScroll, { marginTop: 4 }]}
          >
            <PillTag
              label="All Dishes"
              selected={selectedDishCategory === 'All'}
              onPress={() => setSelectedDishCategory('All')}
              size="sm"
            />
            {(
              [
                { id: 'Pizzas', label: '🍕 Pizzas' },
                { id: 'Burgers & Sliders', label: '🍔 Burgers' },
                { id: 'Tacos', label: '🌮 Tacos' },
                { id: 'Burritos & Bowls', label: '🌯 Burritos' },
                { id: 'Pastas', label: '🍝 Pastas' },
                { id: 'Curries & Gravies', label: '🍛 Curries' },
                { id: 'Biryani & Rice', label: '🍲 Biryani' },
              ] as { id: DishCategory; label: string }[]
            ).map((d) => (
              <PillTag
                key={d.id}
                label={d.label}
                selected={selectedDishCategory === d.id}
                onPress={() =>
                  setSelectedDishCategory(selectedDishCategory === d.id ? 'All' : d.id)
                }
                size="sm"
              />
            ))}
          </ScrollView>

          {/* Sort Selector Bar */}
          <View style={styles.sortRow}>
            <Text style={[styles.resultCount, { color: colors.textMuted }]}>
              Showing {filteredKits.length} Chef Meal Kits
            </Text>
            <View style={styles.sortPills}>
              <TouchableOpacity
                onPress={() => setSortBy(sortBy === 'popularity' ? 'priceLowHigh' : 'popularity')}
                style={[
                  styles.sortBtn,
                  { borderColor: colors.borderLight, backgroundColor: colors.bgSurface },
                ]}
              >
                <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
                  Sort: {sortBy === 'popularity' ? 'Popularity 🔥' : 'Price: Low-High'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 1: Trending in Your Region */}
        {dietFilter === 'all' && selectedCuisine === 'All' && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Trending in {preferences.currentCity} 🔥
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Most ordered pre-portioned kits in your area today
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardRow}
            >
              {trendingKits.map((kit) => (
                <MealKitHorizontalCard
                  key={kit.id}
                  kit={kit}
                  onPress={() => handleOpenDetail(kit)}
                  onQuickAdd={() => handleQuickAdd(kit)}
                  isFavorite={isInWishlist(kit.id)}
                  onToggleFavorite={() => toggleWishlist(kit.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 1.5: Global Favorites & Foreign Specials (Burgers, Pizzas, Tacos, Burritos, Pastas) */}
        {dietFilter === 'all' && selectedCuisine === 'All' && foreignKits.length > 0 && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Global Street Eats & Foreign Specials 🍔🍕🌮
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Smash burgers, fermented sourdough pizzas, Birria tacos, burrito bowls & pastas
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardRow}
            >
              {foreignKits.map((kit) => (
                <MealKitHorizontalCard
                  key={kit.id}
                  kit={kit}
                  onPress={() => handleOpenDetail(kit)}
                  onQuickAdd={() => handleQuickAdd(kit)}
                  isFavorite={isInWishlist(kit.id)}
                  onToggleFavorite={() => toggleWishlist(kit.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 2: Recommended for You */}
        {dietFilter === 'all' && selectedCuisine === 'All' && (
          <View style={styles.catalogSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Recommended for You ✨
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Curated according to your {preferences.dietType.toUpperCase()} profile
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreferencesModalVisible(true)}>
                <Text style={[styles.editPrefLink, { color: colors.primary }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardRow}
            >
              {recommendedKits.map((kit) => (
                <MealKitHorizontalCard
                  key={kit.id}
                  kit={kit}
                  onPress={() => handleOpenDetail(kit)}
                  onQuickAdd={() => handleQuickAdd(kit)}
                  isFavorite={isInWishlist(kit.id)}
                  onToggleFavorite={() => toggleWishlist(kit.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 3: All Available Kits Grid */}
        <View style={styles.catalogSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            All Gourmet Meal Prep Kits
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Includes fresh ingredients, whole spices & authentic masala sachets
          </Text>

          <View style={styles.kitsGrid}>
            {filteredKits.map((kit) => (
              <MealKitCard
                key={kit.id}
                kit={kit}
                onPress={() => handleOpenDetail(kit)}
                onQuickAdd={() => handleQuickAdd(kit)}
                isFavorite={isInWishlist(kit.id)}
                onToggleFavorite={() => toggleWishlist(kit.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Theme Switcher Dev Tool */}
      <ThemeSwitcher />

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

      {/* Review Modal */}
      <ReviewModal
        kit={reviewKit}
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
      />
    </View>
  );
};

// Reusable Meal Kit Vertical Grid Card
const MealKitCard: React.FC<{
  kit: MealKit;
  onPress: () => void;
  onQuickAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ kit, onPress, onQuickAdd, isFavorite, onToggleFavorite }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <TouchableOpacity
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
        <Image source={{ uri: kit.heroImage }} style={styles.cardImg} resizeMode="cover" />
        <View style={styles.cardBadgeRow}>
          <Badge
            label={kit.diet === 'veg' ? 'Veg' : 'Non-Veg'}
            variant={kit.diet === 'veg' ? 'veg' : 'nonveg'}
            size="sm"
          />
          <TouchableOpacity
            style={styles.cardFavBtn}
            onPress={onToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 16 }}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBottomOverlay}>
          <Text style={styles.cardPrepTime}>
            ⏱️ {kit.prepTimeMinutes + kit.cookTimeMinutes}m • {kit.servings} Servings
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {kit.name}
          </Text>
        </View>

        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {kit.description}
        </Text>

        <View style={styles.sachetsPillRow}>
          <Text
            style={[
              styles.sachetsPillText,
              { color: colors.primary, backgroundColor: colors.primaryLight },
            ]}
          >
            ✨ {kit.masalaSachets.length} Fresh Spice Sachets Included
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.cardPrice, { color: colors.primary }]}>₹{kit.price}</Text>
            {kit.originalPrice ? (
              <Text style={[styles.cardOrigPrice, { color: colors.textMuted }]}>
                ₹{kit.originalPrice}
              </Text>
            ) : null}
          </View>

          <Button title="+ Add" size="sm" onPress={onQuickAdd} style={{ paddingHorizontal: 16 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Reusable Meal Kit Horizontal Carousel Card
const MealKitHorizontalCard: React.FC<{
  kit: MealKit;
  onPress: () => void;
  onQuickAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ kit, onPress, onQuickAdd, isFavorite, onToggleFavorite }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.horizontalCard,
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
      <View style={styles.hCardImgContainer}>
        <Image source={{ uri: kit.heroImage }} style={styles.hCardImg} />
        <View style={styles.hCardBadge}>
          <Badge
            label={kit.diet === 'veg' ? 'Veg' : 'Non-Veg'}
            variant={kit.diet === 'veg' ? 'veg' : 'nonveg'}
            size="sm"
          />
        </View>
      </View>

      <View style={styles.hCardContent}>
        <Text style={[styles.hCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {kit.name}
        </Text>
        <Text style={[styles.hCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {kit.tagline}
        </Text>

        <View style={styles.hCardBottomRow}>
          <Text style={[styles.hCardPrice, { color: colors.primary }]}>₹{kit.price}</Text>
          <Button title="+ Add" size="sm" onPress={onQuickAdd} />
        </View>
      </View>
    </TouchableOpacity>
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
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  vegToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vegTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  vegTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillsScroll: {
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortPills: {},
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 11,
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
    gap: 14,
  },
  gridCard: {
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 14,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
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
    padding: 14,
  },
  cardTitleRow: {
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  sachetsPillRow: {
    marginBottom: 12,
  },
  sachetsPillText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardOrigPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
});
