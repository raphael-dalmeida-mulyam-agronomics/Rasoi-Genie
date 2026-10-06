import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
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
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AppIconName, Icon } from '../../framework/ui/Icon';
import { MealDetailModal } from '../meal-detail/MealDetailModal';

const DIET_OPTIONS: { id: 'all' | DietTag; label: string; icon: AppIconName }[] = [
  { id: 'all', label: 'All Diets', icon: 'restaurant' },
  { id: 'veg', label: 'Pure Veg', icon: 'leaf' },
  { id: 'nonveg', label: 'Non-Veg', icon: 'nutrition' },
  { id: 'vegan', label: 'Vegan', icon: 'leaf' },
  { id: 'keto', label: 'Keto Low-Carb', icon: 'flame' },
  { id: 'jain', label: 'Jain Friendly', icon: 'leaf' },
  { id: 'gluten-free', label: 'Gluten-Free', icon: 'checkmark-circle' },
];

const CUISINE_OPTIONS: { id: 'All' | CuisineType; label: string; icon: AppIconName }[] = [
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

const SPICE_OPTIONS: { id: 'All' | SpiceLevel; label: string; icon: AppIconName }[] = [
  { id: 'All', label: 'All Spices', icon: 'options' },
  { id: 'Mild', label: 'Mild (Kid Friendly)', icon: 'leaf' },
  { id: 'Medium', label: 'Medium Spice', icon: 'flame' },
  { id: 'Spicy', label: 'Spicy Masala', icon: 'flame' },
  { id: 'Fiery', label: 'Fiery Hot', icon: 'flame' },
];

const SORT_OPTIONS: {
  id: 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime';
  label: string;
  icon: AppIconName;
}[] = [
  { id: 'popularity', label: 'Most Popular', icon: 'flame' },
  { id: 'priceLowHigh', label: 'Price: Low to High', icon: 'arrow-down' },
  { id: 'priceHighLow', label: 'Price: High to Low', icon: 'arrow-up' },
  { id: 'prepTime', label: 'Fastest Prep Time', icon: 'time' },
];

type ActiveDropdownType = 'diet' | 'cuisine' | 'spice' | 'sort' | null;

export const SearchView: React.FC = () => {
  const { colors, radii, shadows } = useTheme();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown filter states
  const [dietFilter, setDietFilter] = useState<'all' | DietTag>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'All'>('All');
  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel | 'All'>('All');
  const [sortBy, setSortBy] = useState<'popularity' | 'priceLowHigh' | 'priceHighLow' | 'prepTime'>(
    'popularity',
  );

  // Active dropdown modal
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdownType>(null);

  // Modal
  const [selectedKit, setSelectedKit] = useState<MealKit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const results = useMemo(() => {
    return searchAndFilterMealKits({
      searchQuery,
      diet: dietFilter,
      cuisine: selectedCuisine,
      spiceLevel: selectedSpice,
      sortBy,
    });
  }, [searchQuery, dietFilter, selectedCuisine, selectedSpice, sortBy]);

  const hasActiveFilters =
    dietFilter !== 'all' ||
    selectedCuisine !== 'All' ||
    selectedSpice !== 'All' ||
    sortBy !== 'popularity' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSearchQuery('');
    setDietFilter('all');
    setSelectedCuisine('All');
    setSelectedSpice('All');
    setSortBy('popularity');
    setActiveDropdown(null);
  };

  const handleQuickAdd = (kit: MealKit) => {
    addItem(kit, 1);
    Alert.alert('Added to Cart', `1x ${kit.name} added to your basket.`);
  };

  const renderDropdownOptions = () => {
    switch (activeDropdown) {
      case 'diet':
        return DIET_OPTIONS.map((opt) => {
          const isSelected = dietFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.dropdownOptionRow,
                {
                  backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={() => {
                setDietFilter(opt.id);
                setActiveDropdown(null);
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 12 }}>
                <Icon
                  name={opt.icon}
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.dropdownOptionText,
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
        });

      case 'cuisine':
        return CUISINE_OPTIONS.map((opt) => {
          const isSelected = selectedCuisine === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.dropdownOptionRow,
                {
                  backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={() => {
                setSelectedCuisine(opt.id);
                setActiveDropdown(null);
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 12 }}>
                <Icon
                  name={opt.icon}
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.dropdownOptionText,
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
        });

      case 'spice':
        return SPICE_OPTIONS.map((opt) => {
          const isSelected = selectedSpice === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.dropdownOptionRow,
                {
                  backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={() => {
                setSelectedSpice(opt.id);
                setActiveDropdown(null);
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 12 }}>
                <Icon
                  name={opt.icon}
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.dropdownOptionText,
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
        });

      case 'sort':
        return SORT_OPTIONS.map((opt) => {
          const isSelected = sortBy === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.dropdownOptionRow,
                {
                  backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={() => {
                setSortBy(opt.id);
                setActiveDropdown(null);
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 12 }}>
                <Icon
                  name={opt.icon}
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.dropdownOptionText,
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
        });

      default:
        return null;
    }
  };

  const getDropdownModalTitle = () => {
    switch (activeDropdown) {
      case 'diet':
        return 'Filter by Diet';
      case 'cuisine':
        return 'Filter by Cuisine';
      case 'spice':
        return 'Filter by Spice Level';
      case 'sort':
        return 'Sort Meal Kits';
      default:
        return '';
    }
  };

  const getDropdownModalIcon = (): AppIconName => {
    switch (activeDropdown) {
      case 'diet':
        return 'restaurant';
      case 'cuisine':
        return 'globe';
      case 'spice':
        return 'flame';
      case 'sort':
        return 'options';
      default:
        return 'filter';
    }
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
        {/* Search Input Bar */}
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
          <View style={{ marginRight: 8 }}>
            <Icon name="search" size={18} color={colors.textMuted} />
          </View>
          <TextInput
            testID="search-input"
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by meal name or ingredient..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown Filters Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dropdownBarContainer}
        >
          {/* Diet Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor: dietFilter !== 'all' ? colors.primary + '18' : colors.bgSubtle,
                borderColor: dietFilter !== 'all' ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
            onPress={() => setActiveDropdown('diet')}
            activeOpacity={0.75}
          >
            <Icon
              name="restaurant"
              size={13}
              color={dietFilter !== 'all' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownTriggerText,
                { color: dietFilter !== 'all' ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {dietFilter === 'all'
                ? 'Diets'
                : DIET_OPTIONS.find((d) => d.id === dietFilter)?.label || 'Diet'}
            </Text>
            <Icon
              name="chevron-down"
              size={12}
              color={dietFilter !== 'all' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Cuisine Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor:
                  selectedCuisine !== 'All' ? colors.primary + '18' : colors.bgSubtle,
                borderColor: selectedCuisine !== 'All' ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
            onPress={() => setActiveDropdown('cuisine')}
            activeOpacity={0.75}
          >
            <Icon
              name="globe"
              size={13}
              color={selectedCuisine !== 'All' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownTriggerText,
                { color: selectedCuisine !== 'All' ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {selectedCuisine === 'All' ? 'Cuisines' : selectedCuisine}
            </Text>
            <Icon
              name="chevron-down"
              size={12}
              color={selectedCuisine !== 'All' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Spice Level Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor: selectedSpice !== 'All' ? colors.primary + '18' : colors.bgSubtle,
                borderColor: selectedSpice !== 'All' ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
            onPress={() => setActiveDropdown('spice')}
            activeOpacity={0.75}
          >
            <Icon
              name="flame"
              size={13}
              color={selectedSpice !== 'All' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownTriggerText,
                { color: selectedSpice !== 'All' ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {selectedSpice === 'All' ? 'Spice Level' : selectedSpice}
            </Text>
            <Icon
              name="chevron-down"
              size={12}
              color={selectedSpice !== 'All' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Sort Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor: sortBy !== 'popularity' ? colors.primary + '18' : colors.bgSubtle,
                borderColor: sortBy !== 'popularity' ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
            onPress={() => setActiveDropdown('sort')}
            activeOpacity={0.75}
          >
            <Icon
              name={SORT_OPTIONS.find((s) => s.id === sortBy)?.icon || 'flame'}
              size={13}
              color={sortBy !== 'popularity' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownTriggerText,
                { color: sortBy !== 'popularity' ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Sort'}
            </Text>
            <Icon
              name="chevron-down"
              size={12}
              color={sortBy !== 'popularity' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <TouchableOpacity
              style={[
                styles.resetTrigger,
                {
                  backgroundColor: colors.danger + '14',
                  borderColor: colors.danger + '40',
                  borderRadius: radii.pill,
                },
              ]}
              onPress={handleResetFilters}
              activeOpacity={0.75}
            >
              <Icon name="close" size={12} color={colors.danger} />
              <Text style={[styles.resetTriggerText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main Results Scroll */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Results Count Header */}
        <View style={styles.resultsHeaderRow}>
          <Text style={[styles.resultsHeader, { color: colors.textSecondary }]}>
            {searchQuery
              ? `Results for "${searchQuery}" (${results.length})`
              : `All Meal Kits (${results.length})`}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={[styles.resetLink, { color: colors.primary }]}>Reset All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          {results.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <View style={{ marginBottom: 12 }}>
                <Icon name="search" size={48} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Meal Kits Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try adjusting your search term or clearing dropdown filters to see available dishes.
              </Text>
              <Button
                title="Reset Filters"
                variant="outline"
                style={{ marginTop: 14 }}
                onPress={handleResetFilters}
              />
            </View>
          ) : (
            results.map((kit) => (
              <TouchableOpacity
                key={kit.id}
                testID={`search-result-card-${kit.id}`}
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
                <Image
                  source={{ uri: kit.heroImage }}
                  style={styles.resultImg}
                  resizeMode="cover"
                />
                <View style={styles.resultDetails}>
                  <View style={styles.resultTopRow}>
                    {(() => {
                      const badge = getDietBadgeInfo(kit.diet);
                      return <Badge label={badge.label} variant={badge.variant} size="sm" />;
                    })()}
                    <TouchableOpacity
                      onPress={() => toggleWishlist(kit.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon
                        name={isInWishlist && isInWishlist(kit.id) ? 'heart' : 'heart-outline'}
                        size={18}
                        color={
                          isInWishlist && isInWishlist(kit.id) ? colors.primary : colors.textMuted
                        }
                      />
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="time" size={13} color={colors.textMuted} />
                      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                        {(kit.prepTimeMinutes || 0) + (kit.cookTimeMinutes || 0)}m •{' '}
                        {kit.servings || 2} Servings
                      </Text>
                    </View>
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

      {/* Dropdown Options Modal Overlay */}
      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View
            style={[
              styles.dropdownModalCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={getDropdownModalIcon()} size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {getDropdownModalTitle()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveDropdown(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {renderDropdownOptions()}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveDropdown(null)}
              style={[styles.dropdownModalCloseBtn, { borderColor: colors.borderLight }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropdownModalCloseText, { color: colors.textPrimary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
  },
  dropdownBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  resetTriggerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 100,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsHeader: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resetLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsContainer: {},
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dropdownOptionText: {
    fontSize: 14,
  },
  dropdownModalCloseBtn: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dropdownModalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
