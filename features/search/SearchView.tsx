import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { useWishlist } from '../../framework/context/WishlistContext';
import {
  searchAndFilterMealKits,
  MealKit,
  CuisineType,
  SpiceLevel,
  DietTag,
} from '../../framework/services/mealKitsService';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { PillTag } from '../../framework/ui/PillTag';
import { MealDetailModal } from '../meal-detail/MealDetailModal';

const TRENDING_SEARCHES = [
  'Smash Burger',
  'Sourdough Pizza',
  'Birria Tacos',
  'Burrito Bowl',
  'Fettuccine Pasta',
  'Dum Biryani',
  'Paneer Butter Masala',
  'Pepperoni & Hot Honey',
  'Dal Makhani',
  'Truffle Aioli',
  'Ghee Roast Prawns',
  'Keto Cauliflower',
  'Jain Friendly',
];

export const SearchView: React.FC = () => {
  const { colors, radii, shadows } = useTheme();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Paneer Makhani',
    'Basmati Rice',
    'Low Carb',
  ]);

  // Filters
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'All'>('All');
  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel | 'All'>('All');
  const [selectedDietTag, setSelectedDietTag] = useState<DietTag | 'all'>('all');

  // Modal
  const [selectedKit, setSelectedKit] = useState<MealKit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const results = useMemo(() => {
    return searchAndFilterMealKits({
      searchQuery,
      diet: dietFilter,
      cuisine: selectedCuisine,
      spiceLevel: selectedSpice,
      dietaryTags: selectedDietTag !== 'all' ? [selectedDietTag] : undefined,
      sortBy: 'popularity',
    });
  }, [searchQuery, dietFilter, selectedCuisine, selectedSpice, selectedDietTag]);

  const handleSelectQuery = (q: string) => {
    setSearchQuery(q);
    if (!recentSearches.includes(q)) {
      setRecentSearches((prev) => [q, ...prev.slice(0, 5)]);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleQuickAdd = (kit: MealKit) => {
    addItem(kit, 1);
    Alert.alert('Added to Cart! 🛒', `1x ${kit.name} added to your basket.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Search Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.bgSubtle,
              borderColor: colors.border,
              borderRadius: radii.xl,
            },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by meal name or ingredient..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <PillTag
            label="All Diets"
            selected={dietFilter === 'all'}
            onPress={() => setDietFilter('all')}
            size="sm"
          />
          <PillTag
            label="🥬 Veg"
            selected={dietFilter === 'veg'}
            onPress={() => setDietFilter('veg')}
            size="sm"
          />
          <PillTag
            label="🍗 Non-Veg"
            selected={dietFilter === 'nonveg'}
            onPress={() => setDietFilter('nonveg')}
            size="sm"
          />
          <PillTag
            label="Italian 🍕🍝"
            selected={selectedCuisine === 'Italian'}
            onPress={() => setSelectedCuisine(selectedCuisine === 'Italian' ? 'All' : 'Italian')}
            size="sm"
          />
          <PillTag
            label="Mexican 🌮🌯"
            selected={selectedCuisine === 'Mexican'}
            onPress={() => setSelectedCuisine(selectedCuisine === 'Mexican' ? 'All' : 'Mexican')}
            size="sm"
          />
          <PillTag
            label="American 🍔"
            selected={selectedCuisine === 'American'}
            onPress={() => setSelectedCuisine(selectedCuisine === 'American' ? 'All' : 'American')}
            size="sm"
          />
          <PillTag
            label="North Indian 🍛"
            selected={selectedCuisine === 'North Indian'}
            onPress={() =>
              setSelectedCuisine(selectedCuisine === 'North Indian' ? 'All' : 'North Indian')
            }
            size="sm"
          />
          <PillTag
            label="Hyderabadi 🍲"
            selected={selectedCuisine === 'Hyderabadi'}
            onPress={() =>
              setSelectedCuisine(selectedCuisine === 'Hyderabadi' ? 'All' : 'Hyderabadi')
            }
            size="sm"
          />
          <PillTag
            label="Coastal 🦐"
            selected={selectedCuisine === 'Coastal'}
            onPress={() => setSelectedCuisine(selectedCuisine === 'Coastal' ? 'All' : 'Coastal')}
            size="sm"
          />
          <PillTag
            label="Jain Friendly"
            selected={selectedDietTag === 'jain'}
            onPress={() => setSelectedDietTag(selectedDietTag === 'jain' ? 'all' : 'jain')}
            size="sm"
          />
          <PillTag
            label="Keto"
            selected={selectedDietTag === 'keto'}
            onPress={() => setSelectedDietTag(selectedDietTag === 'keto' ? 'all' : 'keto')}
            size="sm"
          />
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Trending & Recent Searches (Shown when query is empty) */}
        {searchQuery.trim().length === 0 && (
          <View style={styles.discoverySection}>
            {recentSearches.length > 0 && (
              <View style={styles.block}>
                <View style={styles.blockHeader}>
                  <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>
                    🕒 Recent Searches
                  </Text>
                  <TouchableOpacity onPress={handleClearRecent}>
                    <Text style={[styles.clearLink, { color: colors.textMuted }]}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tagWrap}>
                  {recentSearches.map((rec, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.tagChip,
                        { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                      ]}
                      onPress={() => handleSelectQuery(rec)}
                    >
                      <Text style={[styles.tagChipText, { color: colors.textPrimary }]}>{rec}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>
                🔥 Trending Searches
              </Text>
              <View style={styles.tagWrap}>
                {TRENDING_SEARCHES.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.tagChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                    ]}
                    onPress={() => handleSelectQuery(item)}
                  >
                    <Text style={[styles.tagChipText, { color: colors.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Search Results List */}
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsHeader, { color: colors.textMuted }]}>
            {searchQuery
              ? `Search Results for "${searchQuery}" (${results.length})`
              : `All Meal Kits (${results.length})`}
          </Text>

          {results.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={styles.emptyIcon}>🍳</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Meal Kits Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try searching for ingredients like "Paneer", "Ghee", "Cashew", or clear filters.
              </Text>
              <Button
                title="Clear Filters"
                variant="outline"
                style={{ marginTop: 14 }}
                onPress={() => {
                  setSearchQuery('');
                  setDietFilter('all');
                  setSelectedCuisine('All');
                  setSelectedDietTag('all');
                }}
              />
            </View>
          ) : (
            results.map((kit) => (
              <TouchableOpacity
                key={kit.id}
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
                onPress={() => {
                  setSelectedKit(kit);
                  setDetailModalVisible(true);
                }}
                activeOpacity={0.88}
              >
                <Image source={{ uri: kit.heroImage }} style={styles.resultImg} />
                <View style={styles.resultDetails}>
                  <View style={styles.resultTopRow}>
                    <Badge
                      label={kit.diet === 'veg' ? 'Veg' : 'Non-Veg'}
                      variant={kit.diet === 'veg' ? 'veg' : 'nonveg'}
                      size="sm"
                    />
                    <TouchableOpacity
                      onPress={() => toggleWishlist(kit.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 16 }}>{isInWishlist(kit.id) ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[styles.resultName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {kit.name}
                  </Text>
                  <Text
                    style={[styles.resultTagline, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {kit.tagline}
                  </Text>

                  <View style={styles.resultMetaRow}>
                    <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                      ⏱️ {kit.prepTimeMinutes + kit.cookTimeMinutes}m • {kit.servings} Servings
                    </Text>
                  </View>

                  <View style={styles.resultFooter}>
                    <Text style={[styles.resultPrice, { color: colors.primary }]}>
                      ₹{kit.price}
                    </Text>
                    <Button
                      title="+ Add"
                      size="sm"
                      onPress={() => handleQuickAdd(kit)}
                      style={{ paddingHorizontal: 14 }}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <MealDetailModal
        kit={selectedKit}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 16,
    fontWeight: '700',
  },
  filterRow: {
    paddingBottom: 4,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 100,
  },
  discoverySection: {
    marginBottom: 20,
  },
  block: {
    marginBottom: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  clearLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {},
  resultsHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  resultImg: {
    width: 120,
    height: 125,
  },
  resultDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  resultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '800',
  },
  resultTagline: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  resultMetaRow: {
    marginBottom: 6,
  },
  resultMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultPrice: {
    fontSize: 17,
    fontWeight: '900',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
