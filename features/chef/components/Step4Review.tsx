import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { ChefRecipeFormState, ChefStudioStage, ReadinessCheckItem } from '../types';
import { YouTubeEmbed, extractYouTubeVideoId } from '../../../framework/ui/YouTubeEmbed';

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  const [heroAspect, setHeroAspect] = useState<number>(4 / 3);

  // Measure thumbnail natural aspect ratio dynamically
  useEffect(() => {
    let isMounted = true;
    if (!form.thumbnailUrl) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const img = new (window as any).Image();
      img.onload = () => {
        if (isMounted && img.naturalWidth && img.naturalHeight) {
          setHeroAspect(img.naturalWidth / img.naturalHeight);
        }
      };
      img.src = form.thumbnailUrl;
    } else if (typeof Image.getSize === 'function') {
      try {
        Image.getSize(
          form.thumbnailUrl,
          (w, h) => {
            if (isMounted && w && h) setHeroAspect(w / h);
          },
          () => {},
        );
      } catch {}
    }

    return () => {
      isMounted = false;
    };
  }, [form.thumbnailUrl]);

  const isVideoValid = !!extractYouTubeVideoId(form.videoUrl);

  // Evaluate dynamic Readiness Checklist items
  const baseChecks: ReadinessCheckItem[] = [
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
  ];

  const instructionChecks: ReadinessCheckItem[] = [];
  const hasVideoInput = !!(form.videoUrl && form.videoUrl.trim().length > 0);
  const hasStepsInput =
    form.steps.length > 0 && form.steps.some((s) => s.instruction.trim().length > 0);

  if (hasVideoInput && hasStepsInput) {
    instructionChecks.push(
      {
        key: 'youtubeVideo',
        label: 'Embedded YouTube Video Tutorial Provided',
        stage: 'steps',
        isValid: isVideoValid,
        errorMessage: 'Enter a valid YouTube video link',
      },
      {
        key: 'steps',
        label: 'Cooking Steps Defined with Detailed Instructions',
        stage: 'steps',
        isValid:
          form.steps.length > 0 && form.steps.every((s) => s.instruction.trim().length >= 10),
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
    );
  } else if (hasVideoInput) {
    instructionChecks.push({
      key: 'youtubeVideo',
      label: 'Embedded YouTube Video Tutorial Provided',
      stage: 'steps',
      isValid: isVideoValid,
      errorMessage: 'Enter a valid YouTube video link',
    });
  } else if (hasStepsInput) {
    instructionChecks.push(
      {
        key: 'steps',
        label: 'Cooking Steps Defined with Detailed Instructions',
        stage: 'steps',
        isValid:
          form.steps.length > 0 && form.steps.every((s) => s.instruction.trim().length >= 10),
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
    );
  } else {
    instructionChecks.push({
      key: 'instructions',
      label: 'Cooking Instructions Provided (Video or Steps)',
      stage: 'steps',
      isValid: false,
      errorMessage: 'Provide either an embedded YouTube video or add cooking steps',
    });
  }

  const readinessChecks: ReadinessCheckItem[] = [...baseChecks, ...instructionChecks];
  const allChecksPassed = readinessChecks.every((c) => c.isValid);
  const passedCount = readinessChecks.filter((c) => c.isValid).length;
  const totalChecks = readinessChecks.length;

  const padStepNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Checklist Card Component
  const renderChecklistCard = () => (
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
        <View style={{ flex: 1 }}>
          <View style={styles.checklistTitleRow}>
            <Icon
              name={allChecksPassed ? 'checkmark-circle' : 'shield-checkmark-outline'}
              size={20}
              color={allChecksPassed ? '#15803D' : colors.primary}
            />
            <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>
              Recipe Readiness Checklist
            </Text>
          </View>
          <Text style={[styles.checklistSubtitle, { color: colors.textSecondary }]}>
            {passedCount} of {totalChecks} standards met. All quality checks must pass before
            submission.
          </Text>
        </View>

        <View
          style={[
            styles.scoreBadge,
            {
              backgroundColor: allChecksPassed ? '#DCFCE7' : '#FEF3C7',
              borderColor: allChecksPassed ? '#86EFAC' : '#FDE68A',
            },
          ]}
        >
          <Text style={[styles.scoreBadgeText, { color: allChecksPassed ? '#166534' : '#92400E' }]}>
            {allChecksPassed ? 'Ready for Review ✓' : `${totalChecks - passedCount} Required`}
          </Text>
        </View>
      </View>

      {/* Checklist items list */}
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
                size={17}
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
                  <Text style={styles.fixLinkText}>Fix in {check.stage.toUpperCase()} →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Submit Bar Card Component
  const renderSubmitCard = () => (
    <View
      style={[
        styles.card,
        styles.finalSubmitCard,
        {
          backgroundColor: allChecksPassed ? '#F0FDF4' : colors.bgCard,
          borderColor: allChecksPassed ? '#86EFAC' : colors.borderLight,
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
          <Text style={[styles.submitBarTitle, { color: allChecksPassed ? '#166534' : '#991B1B' }]}>
            {allChecksPassed ? 'Recipe Ready for Submission' : 'Recipe Incomplete - Cannot Submit'}
          </Text>
          <Text style={[styles.submitBarDesc, { color: allChecksPassed ? '#15803D' : '#B91C1C' }]}>
            {allChecksPassed
              ? 'Submitting will send this recipe to the RasoiGenie culinary admin team. Once approved and priced, it will go live in the catalog.'
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
  );

  // Customer Preview Card Component
  const renderCustomerPreview = () => (
    <View
      style={[
        styles.previewContainer,
        { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.previewModeBanner}>
        <Icon name="eye-outline" size={16} color="#4338CA" />
        <Text style={styles.previewModeText}>
          CUSTOMER VIEW PREVIEW • Pricing will be set by admin upon review
        </Text>
      </View>

      {/* Hero Image */}
      {form.thumbnailUrl ? (
        <Image
          source={{ uri: form.thumbnailUrl }}
          style={[
            styles.previewHeroImage,
            {
              aspectRatio: heroAspect,
              height: undefined,
              maxHeight: heroAspect < 1 ? 420 : 360,
            },
          ]}
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
        {/* Meta Strip */}
        <View style={styles.previewMetaStrip}>
          <View style={styles.dietBadge}>
            <Text style={styles.dietBadgeText}>
              {form.dietType ? form.dietType.toUpperCase() : 'VEG'}
            </Text>
          </View>
          <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{form.cuisine}</Text>
          <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {form.dishCategory}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Spice: {form.spiceLevel}
          </Text>

          {/* Instruction Format Badge */}
          {(hasVideoInput || hasStepsInput) && (
            <View
              style={[
                styles.instructionTypeBadge,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Icon
                name={
                  hasVideoInput && hasStepsInput
                    ? 'sparkles'
                    : hasVideoInput
                      ? 'logo-youtube'
                      : 'restaurant'
                }
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.instructionTypeBadgeText, { color: colors.primary }]}>
                {hasVideoInput && hasStepsInput
                  ? 'Video + Steps'
                  : hasVideoInput
                    ? 'YouTube Video'
                    : 'Step-by-Step'}
              </Text>
            </View>
          )}
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
            <Icon name="person-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{chefName}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Chef Author</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Icon name="people-outline" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {form.servings} Servings
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Portion Size</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Icon name="timer-outline" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {form.prepTimeMinutes + form.cookTimeMinutes} min
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Prep {form.prepTimeMinutes}m • Cook {form.cookTimeMinutes}m
            </Text>
          </View>
        </View>

        {/* Culinary Description */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            About This Dish
          </Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {form.description || 'No culinary description provided.'}
          </Text>
        </View>

        {/* Dietary tags & Allergens */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Dietary & Allergen Profile
          </Text>
          <View style={styles.tagChipsWrap}>
            {form.dietaryTags.map((dt) => (
              <View
                key={dt}
                style={[styles.profileTag, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
              >
                <Icon name="leaf" size={12} color="#15803D" />
                <Text style={[styles.profileTagText, { color: '#15803D' }]}>
                  {dt.toUpperCase()}
                </Text>
              </View>
            ))}
            {form.allergens.map((alg) => (
              <View
                key={alg}
                style={[styles.profileTag, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
              >
                <Icon name="warning-outline" size={12} color="#DC2626" />
                <Text style={[styles.profileTagText, { color: '#DC2626' }]}>Contains {alg}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ingredients Checklist */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Fresh Ingredients Included in Meal Kit ({form.ingredients.length} Items)
          </Text>
          <View style={styles.ingredientsGrid}>
            {form.ingredients.map((ing, idx) => (
              <View
                key={ing.id || idx}
                style={[
                  styles.ingItemCard,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                ]}
              >
                <Icon name="cube-outline" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ingName, { color: colors.textPrimary }]}>{ing.name}</Text>
                  <Text style={[styles.ingQty, { color: colors.textMuted }]}>
                    {ing.amount} {ing.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* YouTube Video Section (if 'video' or 'both') */}
        {hasVideoInput && (
          <View style={styles.previewSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Instruction Video Walkthrough
              </Text>
              <View
                style={[
                  styles.videoPlatformBadge,
                  { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                ]}
              >
                <Icon name="logo-youtube" size={13} color="#DC2626" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                  YouTube Player
                </Text>
              </View>
            </View>
            <YouTubeEmbed
              videoUrl={form.videoUrl || ''}
              title={`${form.name} Cooking Video`}
              height={260}
            />
          </View>
        )}

        {/* Step-by-Step Instructions */}
        {form.steps.length > 0 && (
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
                    <View style={styles.stepNumBadge}>
                      <Text style={styles.stepNumBadgeText}>STEP {padStepNumber(i + 1)}</Text>
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

                  {st.imageUrl ? <StepReviewPhoto uri={st.imageUrl} /> : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // Catalog Card Simulation Component
  const renderCatalogSimulation = () => (
    <View
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
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
            <Text style={[styles.catalogCuisine, { color: colors.textMuted }]}>{form.cuisine}</Text>
          </View>

          <Text style={[styles.catalogTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {form.name || 'Recipe Name'}
          </Text>

          <Text style={[styles.catalogTagline, { color: colors.textSecondary }]} numberOfLines={1}>
            {form.tagline || 'Appetizing chef tagline goes here...'}
          </Text>

          <View style={styles.catalogFooter}>
            <Text style={[styles.catalogChef, { color: colors.textMuted }]}>By {chefName}</Text>
            <View style={[styles.catalogPriceTbd, { backgroundColor: colors.bgSubtle }]}>
              <Text style={[styles.catalogPriceTbdText, { color: colors.textMuted }]}>
                Price TBD by Admin
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {isDesktop ? (
        // ── DESKTOP 2-COLUMN WORKSPACE ──
        <View style={styles.desktopLayout}>
          {/* Left Column: Customer Preview + Catalog Card */}
          <View style={styles.desktopLeftCol}>
            {renderCustomerPreview()}
            {renderCatalogSimulation()}
          </View>

          {/* Right Column: Sticky Checklist + Submit Action */}
          <View style={styles.desktopRightCol}>
            {renderChecklistCard()}
            {renderSubmitCard()}
          </View>
        </View>
      ) : (
        // ── MOBILE VERTICAL STACK ──
        <>
          {renderChecklistCard()}
          {renderCustomerPreview()}
          {renderCatalogSimulation()}
          {renderSubmitCard()}
        </>
      )}
    </View>
  );
}

function StepReviewPhoto({ uri }: { uri: string }) {
  const [aspect, setAspect] = useState<number>(16 / 9);

  useEffect(() => {
    let isMounted = true;
    if (!uri) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const img = new (window as any).Image();
      img.onload = () => {
        if (isMounted && img.naturalWidth && img.naturalHeight) {
          setAspect(img.naturalWidth / img.naturalHeight);
        }
      };
      img.src = uri;
    } else if (typeof Image.getSize === 'function') {
      try {
        Image.getSize(
          uri,
          (w, h) => {
            if (isMounted && w && h) setAspect(w / h);
          },
          () => {},
        );
      } catch {}
    }

    return () => {
      isMounted = false;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[
        styles.stepPreviewPhoto,
        {
          aspectRatio: aspect,
          height: undefined,
          maxHeight: aspect < 1 ? 380 : 320,
        },
      ]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
  },
  containerDesktop: {
    maxWidth: 1160,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  desktopLeftCol: {
    flex: 1.25,
    gap: 24,
  },
  desktopRightCol: {
    flex: 0.85,
    gap: 20,
    position: 'sticky' as any,
    top: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 18,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistGrid: {
    gap: 8,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  checkIconWrap: {
    marginTop: 1,
  },
  checkTextCol: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 13,
  },
  fixLink: {
    marginTop: 3,
  },
  fixLinkText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewModeBanner: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewModeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  previewHeroImage: {
    width: '100%',
    height: 280,
  },
  placeholderHero: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderHeroText: {
    fontSize: 13,
  },
  previewBody: {
    padding: 20,
    gap: 20,
  },
  previewMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dietBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  metaDot: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  instructionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  instructionTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  recipeTagline: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  previewSection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  videoPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  tagChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  profileTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 160,
    flex: 1,
  },
  ingName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  ingQty: {
    fontSize: 11,
    marginTop: 1,
  },
  stepsPreviewCol: {
    gap: 12,
  },
  stepPreviewCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  stepPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stepNumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  stepPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepInstructionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  stepPreviewPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 4,
  },
  videoOnlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  catalogCardSim: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catalogThumb: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
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
  },
  dietBadgeMini: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  dietBadgeMiniText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
  },
  catalogCuisine: {
    fontSize: 11,
    fontWeight: '600',
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  catalogTagline: {
    fontSize: 12,
  },
  catalogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogChef: {
    fontSize: 11,
  },
  catalogPriceTbd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catalogPriceTbdText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  finalSubmitCard: {
    gap: 16,
  },
  submitBarInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  submitBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  submitBarDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  finalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  finalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
