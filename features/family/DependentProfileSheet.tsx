import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { FamilyMember } from '../../framework/services/familyService';
import {
  getMealKits,
  MealKit,
  DietTag,
  subscribeToMealKits,
} from '../../framework/services/mealKitsService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { AddDependentSheet } from './AddDependentSheet';
import { MealDetailModal } from '../meal-detail/MealDetailModal';
import { UserDietaryPreferences } from '../../framework/context/PreferencesContext';

const { width } = Dimensions.get('window');

export interface DependentProfileSheetProps {
  visible: boolean;
  member: FamilyMember | null;
  onClose: () => void;
  onOpenPreferencesModal?: () => void;
}

export const DependentProfileSheet: React.FC<DependentProfileSheetProps> = ({
  visible,
  member,
  onClose,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { updateDependentPreferences, addFamilyItem, isOwner, isCoOwner, members } = useFamily();

  const [allKits, setAllKits] = useState<MealKit[]>([]);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [selectedKitForDetail, setSelectedKitForDetail] = useState<MealKit | null>(null);
  const [addedKitIds, setAddedKitIds] = useState<Set<string>>(new Set());
  const [isAddingId, setIsAddingId] = useState<string | null>(null);

  // Sync catalog
  useEffect(() => {
    setAllKits(getMealKits());
    const unsub = subscribeToMealKits((updated) => setAllKits(updated));
    return unsub;
  }, []);

  // Sync latest member object from family context
  const currentMember = useMemo(() => {
    if (!member) return null;
    return members.find((m) => m.user_id === member.user_id) || member;
  }, [members, member]);

  // Current preferences of the dependent
  const memberPrefs = currentMember?.preferences || {};
  const age = currentMember?.age ?? memberPrefs.age;
  const gender = currentMember?.gender ?? memberPrefs.gender;
  const dietTypes: DietTag[] = memberPrefs.dietTypes || ['veg'];
  const allergies: string[] = memberPrefs.allergies || [];
  const spiceTolerance: string =
    memberPrefs.spiceTolerance || (currentMember?.dependent_type === 'child' ? 'Mild' : 'Medium');
  const preferredCuisines: string[] =
    memberPrefs.preferredCuisines && memberPrefs.preferredCuisines.length > 0
      ? memberPrefs.preferredCuisines
      : currentMember?.dependent_type === 'child'
        ? ['Italian', 'North Indian']
        : ['North Indian', 'South Indian'];

  // Allergen matching
  const matchesAllergens = (kit: MealKit): boolean => {
    if (!allergies || allergies.length === 0) return true;
    const kitAllergens = (kit.allergens || []).map((a) => a.toLowerCase().trim());
    return !allergies.some((userAllergy) => {
      const u = userAllergy.toLowerCase().trim();
      return kitAllergens.some((a) => a.includes(u) || u.includes(a));
    });
  };

  // Diet matching
  const matchesDiet = (kit: MealKit): boolean => {
    if (!dietTypes || dietTypes.length === 0) return true;
    return dietTypes.some((diet) => {
      if (diet === 'veg') {
        return (
          kit.diet === 'veg' || (Array.isArray(kit.dietaryTags) && kit.dietaryTags.includes('veg'))
        );
      }
      if (diet === 'nonveg') return kit.diet === 'nonveg';
      return Array.isArray(kit.dietaryTags) && kit.dietaryTags.includes(diet);
    });
  };

  // Recommended meal kits matching personal preferences
  const recommendedKits = useMemo(() => {
    if (!currentMember) return [];

    const preferredSet = new Set(preferredCuisines.map((c) => c.toLowerCase().trim()));

    const filtered = allKits
      .filter((k): k is MealKit => Boolean(k && k.id))
      // 1. Strict Allergen Filtering
      .filter((k) => matchesAllergens(k))
      // 2. Strict Diet Matching
      .filter((k) => matchesDiet(k))
      // 3. Strict Cuisine Matching (ONLY show meal kits that suit the user's cuisine preferences)
      .filter((k) => {
        if (!k.cuisine) return false;
        if (preferredSet.size === 0) return true;
        return preferredSet.has(k.cuisine.toLowerCase().trim());
      })
      // 4. Score & Sort: kid/senior friendly spice & rating
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Spice level matching
        if (currentMember.dependent_type === 'child') {
          if (a.spiceLevel === 'Mild') scoreA += 8;
          if (b.spiceLevel === 'Mild') scoreB += 8;
        } else if (currentMember.dependent_type === 'senior') {
          if (a.spiceLevel === 'Mild' || a.spiceLevel === 'Medium') scoreA += 6;
          if (b.spiceLevel === 'Mild' || b.spiceLevel === 'Medium') scoreB += 6;
        }

        // Popularity / Rating
        scoreA += a.rating || 0;
        scoreB += b.rating || 0;

        return scoreB - scoreA;
      });

    return filtered;
  }, [allKits, currentMember, dietTypes, allergies, spiceTolerance, preferredCuisines]);

  if (!currentMember) return null;

  const isChild = currentMember.dependent_type === 'child';
  const roleTitle = isChild ? 'Child Profile' : 'Senior Citizen Profile';

  const handleAddToCart = async (kit: MealKit) => {
    setIsAddingId(kit.id);
    try {
      const res = await addFamilyItem(
        kit,
        1,
        kit.servings || 2,
        (spiceTolerance as any) || 'Mild',
        currentMember.user_id,
      );
      if (res.success) {
        setAddedKitIds((prev) => new Set([...prev, kit.id]));
      }
    } finally {
      setIsAddingId(null);
    }
  };

  const handleSaveUpdatedPreferences = async (updated: UserDietaryPreferences) => {
    if (member) {
      await updateDependentPreferences(member.user_id, updated);
      setPreferencesModalVisible(false);
    }
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={`${currentMember.display_name}'s Taste Profile`}
        subtitle={`Personal preferences and recommended meal kits managed by you.`}
        testID="dependent-profile-sheet"
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View
            style={[
              styles.profileHeaderCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.headerTop}>
              <Avatar name={currentMember.display_name} id={currentMember.user_id} size="lg" />
              <View style={styles.headerInfo}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.profileName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {currentMember.display_name}
                  </Text>
                  <RoleBadge
                    role="dependent"
                    dependentType={currentMember.dependent_type}
                    size="sm"
                  />
                </View>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {age ? `${age} yrs • ` : ''}
                  {gender ? `${gender} • ` : ''}
                  {isChild
                    ? 'Child Profile • Mild, nutritious options'
                    : 'Senior Citizen Profile • Balanced spices and easy digestion'}
                </Text>
              </View>
            </View>

            {/* Preference Chips */}
            <View
              style={[
                styles.preferenceSummaryBox,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : colors.bgSubtle,
                  borderRadius: radii.lg,
                },
              ]}
            >
              {age ? (
                <View style={styles.prefRow}>
                  <Text style={[styles.prefKey, { color: colors.textSecondary }]}>Age:</Text>
                  <Text style={[styles.prefVal, { color: colors.textPrimary }]}>
                    {age} years old
                  </Text>
                </View>
              ) : null}
              {gender ? (
                <View style={styles.prefRow}>
                  <Text style={[styles.prefKey, { color: colors.textSecondary }]}>Gender:</Text>
                  <Text style={[styles.prefVal, { color: colors.textPrimary }]}>{gender}</Text>
                </View>
              ) : null}
              <View style={styles.prefRow}>
                <Text style={[styles.prefKey, { color: colors.textSecondary }]}>Diet:</Text>
                <Text style={[styles.prefVal, { color: colors.textPrimary }]}>
                  {dietTypes.join(', ').toUpperCase() || 'ALL DIETS'}
                </Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={[styles.prefKey, { color: colors.textSecondary }]}>
                  Spice Tolerance:
                </Text>
                <Text style={[styles.prefVal, { color: colors.textPrimary }]}>
                  {spiceTolerance}
                </Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={[styles.prefKey, { color: colors.textSecondary }]}>Allergies:</Text>
                <Text
                  style={[
                    styles.prefVal,
                    { color: allergies.length > 0 ? '#DC2626' : colors.textPrimary },
                  ]}
                >
                  {allergies.length > 0 ? allergies.join(', ') : 'None specified'}
                </Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={[styles.prefKey, { color: colors.textSecondary }]}>
                  Favorite Cuisines:
                </Text>
                <Text style={[styles.prefVal, { color: colors.textPrimary }]}>
                  {preferredCuisines.join(', ') || 'Any cuisine'}
                </Text>
              </View>

              {/* Edit Preferences Button */}
              {(isOwner || isCoOwner) && (
                <TouchableOpacity
                  style={[
                    styles.editPrefButton,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                      borderRadius: radii.md,
                    },
                  ]}
                  onPress={() => setPreferencesModalVisible(true)}
                  activeOpacity={0.8}
                  testID="edit-dependent-preferences-btn"
                >
                  <Icon name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.editPrefButtonText, { color: colors.primary }]}>
                    Edit Taste Preferences
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recommendations Header */}
          <View style={styles.recHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkles" size={18} color="#059669" />
                <Text style={[styles.recSectionTitle, { color: colors.textPrimary }]}>
                  Recommended For {currentMember.display_name}
                </Text>
              </View>
              <Text style={[styles.recSectionSubtitle, { color: colors.textSecondary }]}>
                {recommendedKits.length} meals matching dietary restrictions & taste
              </Text>
            </View>
            <View
              style={[styles.countBadge, { backgroundColor: '#D1FAE5', borderRadius: radii.pill }]}
            >
              <Text style={styles.countBadgeText}>{recommendedKits.length}</Text>
            </View>
          </View>

          {/* Meal Kits List */}
          {recommendedKits.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.xl,
                },
              ]}
            >
              <Icon name="restaurant-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Exact Matches
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                We couldn't find meal kits strictly matching your cuisine, allergy, and diet
                preferences.
              </Text>
              <Button
                title="Adjust Preferences"
                variant="outline"
                size="md"
                onPress={() => setPreferencesModalVisible(true)}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <View style={styles.kitsGrid}>
              {recommendedKits.map((kit) => {
                const dietBadge = getDietBadgeInfo(kit.diet);
                const isAdded = addedKitIds.has(kit.id);
                const isAdding = isAddingId === kit.id;

                return (
                  <TouchableOpacity
                    key={kit.id}
                    style={[
                      styles.kitCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        borderRadius: radii.xl,
                        ...shadows.card,
                      },
                    ]}
                    onPress={() => setSelectedKitForDetail(kit)}
                    activeOpacity={0.85}
                  >
                    {/* Kit Image */}
                    <View style={styles.imageWrap}>
                      <Image
                        source={{
                          uri:
                            kit.heroImage ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
                        }}
                        style={styles.kitImage}
                        resizeMode="cover"
                      />
                      {/* Diet Tag */}
                      <View style={styles.dietBadgeWrap}>
                        <Badge
                          label={dietBadge.label}
                          variant={kit.diet === 'veg' ? 'success' : 'danger'}
                          size="sm"
                        />
                      </View>
                      {/* Rating */}
                      <View
                        style={[
                          styles.ratingWrap,
                          { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: radii.pill },
                        ]}
                      >
                        <Icon name="star" size={12} color="#FBBF24" />
                        <Text style={styles.ratingText}>{(kit.rating || 4.8).toFixed(1)}</Text>
                      </View>
                    </View>

                    {/* Kit Content */}
                    <View style={styles.kitContent}>
                      <View style={styles.kitMetaRow}>
                        <Text style={[styles.cuisineTag, { color: colors.primary }]}>
                          {kit.cuisine || 'Specialty'}
                        </Text>
                        <Text style={[styles.prepTime, { color: colors.textMuted }]}>
                          {kit.prepTimeMinutes ? `${kit.prepTimeMinutes} mins` : '20 mins'}
                        </Text>
                      </View>

                      <Text
                        style={[styles.kitTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {kit.name}
                      </Text>

                      <Text
                        style={[styles.kitDesc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {kit.description}
                      </Text>

                      {/* Spice and Servings Row */}
                      <View style={styles.tagPillRow}>
                        <View style={[styles.miniPill, { backgroundColor: colors.bgSubtle }]}>
                          <Text style={[styles.miniPillText, { color: colors.textSecondary }]}>
                            🌶️ {kit.spiceLevel || 'Mild'}
                          </Text>
                        </View>
                        <View style={[styles.miniPill, { backgroundColor: colors.bgSubtle }]}>
                          <Text style={[styles.miniPillText, { color: colors.textSecondary }]}>
                            👥 {kit.servings || 2} Servings
                          </Text>
                        </View>
                      </View>

                      {/* Price & Add to Family Cart */}
                      <View style={styles.kitBottomRow}>
                        <View>
                          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
                            Price
                          </Text>
                          <Text style={[styles.kitPrice, { color: colors.textPrimary }]}>
                            ₹{kit.price}
                          </Text>
                        </View>

                        <Button
                          title={isAdded ? '✓ Added' : '+ Family Basket'}
                          variant={isAdded ? 'secondary' : 'primary'}
                          size="sm"
                          loading={isAdding}
                          onPress={() => handleAddToCart(kit)}
                          disabled={isAdded}
                          testID={`add-kit-to-family-basket-${kit.id}`}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Taste Preferences Editor (Uses the exact same menu as setting up preferences) */}
      <AddDependentSheet
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
        mode="edit"
        initialMember={currentMember}
        onDependentAdded={() => {
          setPreferencesModalVisible(false);
          onClose();
        }}
      />

      {/* Meal Detail Modal */}
      {selectedKitForDetail && (
        <MealDetailModal
          visible={Boolean(selectedKitForDetail)}
          kit={selectedKitForDetail}
          onClose={() => setSelectedKitForDetail(null)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileHeaderCard: {
    padding: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  preferenceSummaryBox: {
    padding: 12,
    gap: 8,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefKey: {
    fontSize: 13,
    fontWeight: '500',
  },
  prefVal: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  editPrefButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  editPrefButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  recSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  kitsGrid: {
    gap: 14,
  },
  kitCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  kitImage: {
    width: '100%',
    height: '100%',
  },
  dietBadgeWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  ratingWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  kitContent: {
    padding: 14,
    gap: 8,
  },
  kitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cuisineTag: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prepTime: {
    fontSize: 12,
  },
  kitTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  kitDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  tagPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kitBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  priceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  kitPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
});
