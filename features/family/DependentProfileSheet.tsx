import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { FamilyMember } from '../../framework/services/familyService';
import { DietTag } from '../../framework/services/mealKitsService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { AddDependentSheet } from './AddDependentSheet';

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
  const { isOwner, isCoOwner, members } = useFamily();

  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

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

  if (!currentMember) return null;

  const isChild = currentMember.dependent_type === 'child';

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

          {/* Recommendations Banner & Home Redirect */}
          <View
            style={[
              styles.recRedirectCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.recHeaderRow}>
              <View
                style={[
                  styles.recIconWrap,
                  {
                    backgroundColor: colors.primaryLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recSectionTitle, { color: colors.textPrimary }]}>
                  Recommended for {currentMember.display_name}
                </Text>
                <Text style={[styles.recSectionSubtitle, { color: colors.textSecondary }]}>
                  {isChild
                    ? 'Child-friendly meals with mild spices & balanced nutrition'
                    : 'Senior nutrition with easy digestion & customized spices'}
                </Text>
              </View>
            </View>

            <Text style={[styles.recCardDesc, { color: colors.textSecondary }]}>
              {currentMember.display_name}’s personalized meal kit recommendations are featured
              directly on your Home Feed.
            </Text>

            <Button
              title={`View ${currentMember.display_name}'s Recommendations`}
              icon={<Icon name="arrow-forward" size={16} color={colors.textInverse} />}
              variant="primary"
              size="md"
              style={{ width: '100%', marginTop: 14 }}
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/(tabs)',
                  params: {
                    targetMemberId: currentMember.user_id,
                    targetMemberName: currentMember.display_name,
                  },
                } as any);
              }}
              testID="view-dependent-recommendations-btn"
            />
          </View>
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
  recRedirectCard: {
    padding: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  recIconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  recCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
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
