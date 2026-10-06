import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { ChefRecipeFormState, ChefStudioStage, ReadinessCheckItem } from '../types';

interface Step4ReviewProps {
  form: ChefRecipeFormState;
  chefName: string;
  isEditing: boolean;
  submitting: boolean;
  onNavigateStage: (stage: ChefStudioStage) => void;
  onSubmit: () => void;
}

export function Step4Review({
  form,
  chefName,
  isEditing,
  submitting,
  onNavigateStage,
  onSubmit,
}: Step4ReviewProps) {
  const { colors } = useTheme();

  // Evaluate 12 Readiness Checklist items
  const readinessChecks: ReadinessCheckItem[] = [
    {
      key: 'thumbnail',
      label: 'Recipe Thumbnail Image Uploaded',
      stage: 'details',
      isValid: !!form.thumbnailUrl && form.thumbnailUrl.trim().length > 0,
      errorMessage: 'Upload a 4:3 hero photo',
    },
    {
      key: 'name',
      label: 'Recipe Name Provided (min 3 chars)',
      stage: 'details',
      isValid: !!form.name && form.name.trim().length >= 3,
      errorMessage: 'Enter a valid recipe title',
    },
    {
      key: 'tagline',
      label: 'Appetizing Tagline / Subtitle',
      stage: 'details',
      isValid: !!form.tagline && form.tagline.trim().length >= 5,
      errorMessage: 'Add a short subtitle for the catalog',
    },
    {
      key: 'description',
      label: 'Culinary Description (min 15 chars)',
      stage: 'details',
      isValid: !!form.description && form.description.trim().length >= 15,
      errorMessage: 'Add detailed culinary description',
    },
    {
      key: 'diet',
      label: 'Dietary Category Selected',
      stage: 'details',
      isValid: !!form.dietType,
      errorMessage: 'Select Vegetarian, Non-Veg, Vegan, etc.',
    },
    {
      key: 'cuisine',
      label: 'Regional Cuisine Specified',
      stage: 'details',
      isValid: !!form.cuisine && form.cuisine.trim().length > 0,
      errorMessage: 'Select regional cuisine classification',
    },
    {
      key: 'category',
      label: 'Dish Category Specified',
      stage: 'details',
      isValid: !!form.dishCategory && form.dishCategory.trim().length > 0,
      errorMessage: 'Select dish category',
    },
    {
      key: 'spice',
      label: 'Spice Heat Level Specified',
      stage: 'details',
      isValid: !!form.spiceLevel,
      errorMessage: 'Select Mild, Medium, Spicy, or Fiery',
    },
    {
      key: 'timings',
      label: 'Portion Servings & Prep/Cook Times',
      stage: 'details',
      isValid: form.servings >= 1 && form.prepTimeMinutes > 0 && form.cookTimeMinutes > 0,
      errorMessage: 'Set servings, prep time, and cook time',
    },
    {
      key: 'ingredients',
      label: 'Inventory Ingredients Added with Valid Units',
      stage: 'ingredients',
      isValid:
        form.ingredients.length > 0 &&
        form.ingredients.every((ing) => ing.name.trim().length > 0 && ing.amount > 0),
      errorMessage: 'Add at least 1 ingredient with quantity and unit',
    },
    {
      key: 'steps',
      label: 'Cooking Steps Defined with Detailed Instructions',
      stage: 'steps',
      isValid:
        form.steps.length > 0 &&
        form.steps.every((s) => s.instruction.trim().length >= 10),
      errorMessage: 'Add at least 1 cooking step with instructions',
    },
    {
      key: 'stepImages',
      label: 'Photos Provided for Every Cooking Step',
      stage: 'steps',
      isValid:
        form.steps.length > 0 &&
        form.steps.every((s) => !!s.imageUrl && s.imageUrl.trim().length > 0),
      errorMessage: 'Upload a photo for each cooking step',
    },
  ];

  const allChecksPassed = readinessChecks.every((c) => c.isValid);
  const passedCount = readinessChecks.filter((c) => c.isValid).length;

  const padStepNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <View style={styles.container}>
      {/* ── SECTION 1: Recipe Readiness Checklist ── */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: allChecksPassed ? '#F0FDF4' : colors.bgCard,
            borderColor: allChecksPassed ? '#BBF7D0' : colors.borderLight,
          },
        ]}
      >
        <View style={styles.checklistHeaderRow}>
          <View>
            <View style={styles.checklistTitleRow}>
              <Icon
                name={allChecksPassed ? 'checkmark-circle' : 'shield-checkmark-outline'}
                size={22}
                color={allChecksPassed ? '#15803D' : colors.primary}
              />
              <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>
                Recipe Readiness Checklist
              </Text>
            </View>
            <Text style={[styles.checklistSubtitle, { color: colors.textSecondary }]}>
              {passedCount} of 12 standards met. Every recipe must pass all 12 quality checks
              before submission to the admin kitchen.
            </Text>
          </View>

          <View
            style={[
              styles.scorePill,
              {
                backgroundColor: allChecksPassed ? '#DCFCE7' : '#FEF3C7',
                borderColor: allChecksPassed ? '#86EFAC' : '#FDE68A',
              },
            ]}
          >
            <Text
              style={[
                styles.scorePillText,
                { color: allChecksPassed ? '#166534' : '#92400E' },
              ]}
            >
              {allChecksPassed ? 'Ready for Review ✓' : `${12 - passedCount} Attention Needed`}
            </Text>
          </View>
        </View>

        {/* Checklist items 2-column grid */}
        <View style={styles.checklistGrid}>
          {readinessChecks.map((check) => (
            <View
              key={check.key}
              style={[
                styles.checkItemRow,
                {
                  backgroundColor: check.isValid ? 'transparent' : '#FEF2F2',
                  borderColor: check.isValid ? '#E5E7EB' : '#FECACA',
                },
              ]}
            >
              <View style={styles.checkIconWrap}>
                <Icon
                  name={check.isValid ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={check.isValid ? '#10B981' : '#EF4444'}
                />
              </View>

              <View style={styles.checkTextCol}>
                <Text
                  style={[
                    styles.checkLabel,
                    {
                      color: check.isValid ? colors.textPrimary : '#991B1B',
                      fontWeight: check.isValid ? '500' : '700',
                    },
                  ]}
                >
                  {check.label}
                </Text>
                {!check.isValid && (
                  <TouchableOpacity
                    onPress={() => onNavigateStage(check.stage)}
                    style={styles.fixLink}
                  >
                    <Text style={styles.fixLinkText}>
                      Fix in {check.stage.toUpperCase()} →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── SECTION 2: Customer-Facing Recipe Preview (NO PRICE, NO ADMIN CONTROLS) ── */}
      <View
        style={[
          styles.previewContainer,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.previewModeBanner}>
          <Icon name="eye-outline" size={16} color="#4338CA" />
          <Text style={styles.previewModeText}>
            CUSTOMER VIEW PREVIEW • Pricing will be set by admin upon quality review
          </Text>
        </View>

        {/* Hero Image & Headline */}
        {form.thumbnailUrl ? (
          <Image
            source={{ uri: form.thumbnailUrl }}
            style={styles.previewHeroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderHero, { backgroundColor: colors.bgSubtle }]}>
            <Icon name="image-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.placeholderHeroText, { color: colors.textMuted }]}>
              No thumbnail uploaded
            </Text>
          </View>
        )}

        <View style={styles.previewBody}>
          {/* Header Row */}
          <View style={styles.previewMetaStrip}>
            <View style={styles.dietBadge}>
              <Text style={styles.dietBadgeText}>
                {form.dietType ? form.dietType.toUpperCase() : 'VEG'}
              </Text>
            </View>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {form.cuisine}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {form.dishCategory}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Spice: {form.spiceLevel}
            </Text>
          </View>

          <Text style={[styles.recipeTitle, { color: colors.textPrimary }]}>
            {form.name || 'Untitled Recipe'}
          </Text>

          {form.tagline ? (
            <Text style={[styles.recipeTagline, { color: colors.textSecondary }]}>
              {form.tagline}
            </Text>
          ) : null}

          {/* Chef Attribution & Key Stats */}
          <View
            style={[
              styles.statsBanner,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.statBox}>
              <Icon name="person-circle-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{chefName}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Curated by Chef</Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <Icon name="people-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {form.servings} Servings
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Meal Kit Size</Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <Icon name="time-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {form.prepTimeMinutes + form.cookTimeMinutes} mins
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {form.prepTimeMinutes}m prep • {form.cookTimeMinutes}m cook
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {form.description ? (
            <View style={styles.descBox}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                About this Recipe
              </Text>
              <Text style={[styles.descText, { color: colors.textSecondary }]}>
                {form.description}
              </Text>
            </View>
          ) : null}

          {/* Dietary Badges & Allergens */}
          <View style={styles.tagsSection}>
            {form.dietaryTags.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={[styles.tagGroupTitle, { color: colors.textMuted }]}>
                  Dietary Highlights:
                </Text>
                <View style={styles.tagsWrap}>
                  {form.dietaryTags.map((tag) => (
                    <View key={tag} style={styles.dietaryPill}>
                      <Text style={styles.dietaryPillText}>{tag.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {form.allergens.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={[styles.tagGroupTitle, { color: '#DC2626' }]}>
                  Allergen Notice:
                </Text>
                <View style={styles.tagsWrap}>
                  {form.allergens.map((alg) => (
                    <View key={alg} style={styles.allergenPill}>
                      <Icon name="alert-circle" size={12} color="#DC2626" />
                      <Text style={styles.allergenPillText}>{alg}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Customer-Facing Ingredients Breakdown */}
          <View style={styles.previewSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Ingredients in Meal Kit ({form.ingredients.length})
            </Text>
            <Text style={[styles.sectionSubHeading, { color: colors.textMuted }]}>
              Pre-portioned, packaged, and labeled in your RasoiGenie kit
            </Text>

            <View style={styles.ingredientsGrid}>
              {form.ingredients.map((ing, i) => (
                <View
                  key={ing.id || i}
                  style={[
                    styles.ingredientCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <Icon name="leaf-outline" size={16} color={colors.primary} />
                  <View style={styles.ingredientCardContent}>
                    <Text style={[styles.ingName, { color: colors.textPrimary }]}>
                      {ing.name}
                    </Text>
                    <Text style={[styles.ingQty, { color: colors.textMuted }]}>
                      {ing.amount} {ing.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Customer-Facing Step-by-Step Instructions */}
          <View style={styles.previewSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Step-by-Step Culinary Method ({form.steps.length} Steps)
            </Text>

            <View style={styles.stepsPreviewCol}>
              {form.steps.map((st, i) => (
                <View
                  key={st.id || i}
                  style={[
                    styles.stepPreviewCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                  ]}
                >
                  <View style={styles.stepPreviewHeader}>
                    <View style={styles.stepNumPill}>
                      <Text style={styles.stepNumPillText}>STEP {padStepNumber(i + 1)}</Text>
                    </View>
                    {st.title ? (
                      <Text style={[styles.stepPreviewTitle, { color: colors.textPrimary }]}>
                        {st.title}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={[styles.stepInstructionText, { color: colors.textSecondary }]}>
                    {st.instruction}
                  </Text>

                  {st.imageUrl ? (
                    <Image source={{ uri: st.imageUrl }} style={styles.stepPreviewPhoto} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── SECTION 3: Catalog Card Simulation (Customer View) ── */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 4 }]}>
          Catalog Listing Preview
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>
          How this meal kit appears when customers browse the RasoiGenie home menu.
        </Text>

        <View
          style={[
            styles.catalogCardSim,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          {form.thumbnailUrl ? (
            <Image source={{ uri: form.thumbnailUrl }} style={styles.catalogThumb} />
          ) : (
            <View style={[styles.catalogThumb, { backgroundColor: colors.bgSubtle }]} />
          )}

          <View style={styles.catalogCardContent}>
            <View style={styles.catalogTopRow}>
              <View style={styles.dietBadgeMini}>
                <Text style={styles.dietBadgeMiniText}>
                  {form.dietType ? form.dietType.toUpperCase() : 'VEG'}
                </Text>
              </View>
              <Text style={[styles.catalogCuisine, { color: colors.textMuted }]}>
                {form.cuisine}
              </Text>
            </View>

            <Text style={[styles.catalogTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {form.name || 'Recipe Name'}
            </Text>

            <Text
              style={[styles.catalogTagline, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {form.tagline || form.description || 'Delicious home meal kit.'}
            </Text>

            <View style={styles.catalogBottomRow}>
              <Text style={[styles.catalogChef, { color: colors.textMuted }]}>
                By Chef {chefName}
              </Text>
              <View style={styles.adminPriceNotice}>
                <Text style={styles.adminPriceNoticeText}>Price set on review</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── SECTION 4: Submission Action Bar ── */}
      <View
        style={[
          styles.submitBarCard,
          {
            backgroundColor: allChecksPassed ? '#F0FDF4' : '#FEF2F2',
            borderColor: allChecksPassed ? '#BBF7D0' : '#FECACA',
          },
        ]}
      >
        <View style={styles.submitBarInfo}>
          <Icon
            name={allChecksPassed ? 'checkmark-done-circle' : 'alert-circle'}
            size={24}
            color={allChecksPassed ? '#15803D' : '#DC2626'}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.submitBarTitle,
                { color: allChecksPassed ? '#166534' : '#991B1B' },
              ]}
            >
              {allChecksPassed
                ? 'Recipe Ready for Submission'
                : 'Recipe Incomplete - Cannot Submit'}
            </Text>
            <Text
              style={[
                styles.submitBarDesc,
                { color: allChecksPassed ? '#15803D' : '#B91C1C' },
              ]}
            >
              {allChecksPassed
                ? 'Submitting will send this recipe to the RasoiGenie culinary admin team. Once approved and priced, it will be published to the catalog.'
                : 'Please resolve the remaining checklist items above before submitting to admin.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="chef-submit-recipe-btn"
          id="chef-submit-recipe-btn"
          style={[
            styles.finalSubmitBtn,
            {
              backgroundColor: allChecksPassed ? colors.primary : '#9CA3AF',
              opacity: submitting ? 0.7 : 1,
            },
          ]}
          onPress={onSubmit}
          disabled={!allChecksPassed || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="paper-plane-outline" size={18} color="#FFFFFF" />
              <Text style={styles.finalSubmitBtnText}>
                {isEditing ? 'Update & Submit for Review' : 'Submit for Admin Review'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  checklistSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checkItemRow: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkIconWrap: {
    justifyContent: 'center',
  },
  checkTextCol: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 12,
  },
  fixLink: {
    marginTop: 2,
  },
  fixLinkText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewModeBanner: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  previewModeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewHeroImage: {
    width: '100%',
    height: 320,
  },
  placeholderHero: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHeroText: {
    fontSize: 13,
    marginTop: 6,
  },
  previewBody: {
    padding: 24,
    gap: 20,
  },
  previewMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dietBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dietBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  metaDot: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recipeTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  recipeTagline: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  descBox: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubHeading: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },
  tagsSection: {
    gap: 10,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagsWrap: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dietaryPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dietaryPillText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  allergenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allergenPillText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },
  previewSection: {
    gap: 8,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  ingredientCard: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ingredientCardContent: {
    flex: 1,
  },
  ingName: {
    fontSize: 13,
    fontWeight: '700',
  },
  ingQty: {
    fontSize: 11,
    marginTop: 2,
  },
  stepsPreviewCol: {
    gap: 14,
    marginTop: 6,
  },
  stepPreviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  stepPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumPill: {
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepNumPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepInstructionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  stepPreviewPhoto: {
    width: '100%',
    maxWidth: 400,
    height: 180,
    borderRadius: 10,
  },
  catalogCardSim: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    maxWidth: 480,
  },
  catalogThumb: {
    width: 140,
    height: '100%',
    minHeight: 120,
  },
  catalogCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  catalogTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dietBadgeMini: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dietBadgeMiniText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  catalogCuisine: {
    fontSize: 11,
  },
  catalogTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  catalogTagline: {
    fontSize: 11,
    marginTop: 2,
  },
  catalogBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  catalogChef: {
    fontSize: 10,
  },
  adminPriceNotice: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminPriceNoticeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '700',
  },
  submitBarCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  submitBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 280,
  },
  submitBarTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  submitBarDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  finalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  finalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
