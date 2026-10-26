/**
 * Chef Studio View
 * Dedicated full-page workspace for approved chefs to create and manage their
 * meal kit recipe submissions. Built as a structured 4-stage recipe authoring tool:
 * Stage 1: Details (Thumbnail, Basic info, Diet, Cuisine, Category, Spice, Timings, Tags)
 * Stage 2: Ingredients (Inventory search, strict units, duplicate prevention, reordering)
 * Stage 3: Cooking Steps (Title, instructions, required step images, reordering)
 * Stage 4: Review (Customer-facing preview without price, 12-item readiness checklist, admin submission)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { Icon } from '../../framework/ui/Icon';
import {
  ChefSubmissionRecord,
  ChefRecipeSubmission,
  fetchChefSubmissions,
  subscribeToChefSubmissions,
  initChefSubmissionsRealtime,
  createChefSubmission,
  updateChefSubmission,
  deleteChefSubmission,
} from '../../framework/services/chefMealKitsService';
import { ChefProfile, fetchAllChefProfiles } from '../../framework/services/adminRbacService';

import {
  ChefRecipeFormState,
  ChefStudioStage,
  StructuredIngredient,
  StructuredStep,
} from './types';
import { useChefDraft } from './useChefDraft';
import { ChefStudioHeader } from './components/ChefStudioHeader';
import { StepNavigation } from './components/StepNavigation';
import { Step1Details } from './components/Step1Details';
import { Step2Ingredients } from './components/Step2Ingredients';
import { Step3CookingSteps } from './components/Step3CookingSteps';
import { Step4Review } from './components/Step4Review';
import { StickyBottomBar } from './components/StickyBottomBar';
import { ChefSubmissionsList } from './ChefSubmissionsList';
import { SAMPLE_RECIPE_THUMBNAILS, SAMPLE_STEP_IMAGES } from './sampleImages';
import { extractYouTubeVideoId } from '../../framework/ui/YouTubeEmbed';

const DEFAULT_FORM_STATE: ChefRecipeFormState = {
  name: '',
  tagline: '',
  description: '',
  thumbnailUrl: SAMPLE_RECIPE_THUMBNAILS[0]?.url || '',
  dietType: 'veg',
  cuisine: 'North Indian',
  dishCategory: 'Curries & Gravies',
  spiceLevel: 'Medium',
  servings: 2,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  dietaryTags: ['veg'],
  allergens: [],
  ingredients: [
    {
      id: 'default-ing-1',
      ingredientId: 'inv-001',
      name: 'Paneer (Fresh Malai)',
      amount: 250,
      unit: 'g',
      quantityStr: '250 g',
    },
  ],
  instructionType: 'steps',
  videoUrl: '',
  steps: [
    {
      id: 'default-step-1',
      stepNumber: 1,
      title: 'Prep & Marinate Ingredients',
      instruction:
        'Dice the fresh paneer into 1-inch cubes. Gently toss with turmeric, Kashmiri chili powder, and a pinch of salt.',
      imageUrl: SAMPLE_STEP_IMAGES[0]?.url || '',
    },
  ],
};

export function ChefStudioView() {
  const { colors } = useTheme();
  const { user, isChef, isAdmin } = useAuth();

  // Submissions list state
  const [submissions, setSubmissions] = useState<ChefSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvedChefs, setApprovedChefs] = useState<ChefProfile[]>([]);
  const [activeChefUid, setActiveChefUid] = useState<string>('');

  // Full-page Builder state
  const [isBuilderActive, setIsBuilderActive] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<ChefSubmissionRecord | null>(null);
  const [currentStage, setCurrentStage] = useState<ChefStudioStage>('details');
  const [form, setForm] = useState<ChefRecipeFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);

  const chefId = activeChefUid || user?.uid || '';
  const activeChefProfile = approvedChefs.find((c) => c.uid === chefId);
  const chefDisplayName = activeChefProfile?.displayName || user?.displayName || 'Chef';

  // Draft auto-saving hook
  const { saveStatus, lastSavedTime, loadDraft, saveDraftNow, scheduleDraftSave, clearDraft } =
    useChefDraft(chefId);

  // Load approved chefs & active chef UID
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const chefs = await fetchAllChefProfiles();
        if (mounted && chefs.length > 0) {
          setApprovedChefs(chefs);
          setActiveChefUid((prev) => {
            if (prev) return prev;
            const currentIsChef = chefs.find((c) => c.uid === user?.uid);
            return currentIsChef ? currentIsChef.uid : user?.uid || '';
          });
        } else if (mounted && user?.uid) {
          setActiveChefUid((prev) => prev || user.uid);
        }
      } catch {
        if (mounted && user?.uid) setActiveChefUid((prev) => prev || user.uid);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Load submissions
  const loadSubmissions = useCallback(async () => {
    if (!chefId) return;
    setLoading(true);
    const result = await fetchChefSubmissions(chefId);
    setSubmissions(result);
    setLoading(false);
  }, [chefId]);

  useEffect(() => {
    loadSubmissions();
    const unsubRealtime = initChefSubmissionsRealtime();
    const unsubChef = subscribeToChefSubmissions(chefId, (updated) => {
      setSubmissions(updated);
    });
    return () => {
      unsubRealtime();
      unsubChef();
    };
  }, [chefId, loadSubmissions]);

  // Handle Form changes with auto-save scheduling
  const handleFormChange = (updates: Partial<ChefRecipeFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      const hasVid = !!extractYouTubeVideoId(next.videoUrl);
      const hasStp =
        next.steps.length > 0 && next.steps.some((s) => s.instruction.trim().length > 0);
      if (hasVid && hasStp) {
        next.instructionType = 'both';
      } else if (hasVid) {
        next.instructionType = 'video';
      } else {
        next.instructionType = 'steps';
      }
      scheduleDraftSave(next);
      return next;
    });
  };

  // Stage completion calculation
  const completedStages = useMemo(() => {
    const detailsValid =
      !!form.thumbnailUrl &&
      form.name.trim().length >= 3 &&
      form.description.trim().length >= 10 &&
      !!form.dietType &&
      !!form.cuisine &&
      !!form.dishCategory &&
      form.servings >= 1;

    const ingredientsValid =
      form.ingredients.length > 0 &&
      form.ingredients.every((i) => i.name.trim().length > 0 && i.amount > 0);

    const hasVideo = !!extractYouTubeVideoId(form.videoUrl);
    const hasSteps =
      form.steps.length > 0 &&
      form.steps.every((s) => s.instruction.trim().length >= 10 && !!s.imageUrl);

    let stepsValid = false;
    if (hasVideo && form.steps.length > 0) {
      stepsValid = hasVideo && hasSteps;
    } else if (hasVideo) {
      stepsValid = true;
    } else if (hasSteps) {
      stepsValid = true;
    }

    return {
      details: detailsValid,
      ingredients: ingredientsValid,
      steps: stepsValid,
      review: detailsValid && ingredientsValid && stepsValid,
    };
  }, [form]);

  // Can proceed on current stage
  const canProceed = useMemo(() => {
    if (currentStage === 'details') {
      return form.name.trim().length > 0 && form.description.trim().length > 0;
    }
    if (currentStage === 'ingredients') {
      return form.ingredients.length > 0 && form.ingredients.some((i) => i.name.trim().length > 0);
    }
    if (currentStage === 'steps') {
      const hasVideo = !!extractYouTubeVideoId(form.videoUrl);
      const hasSomeSteps =
        form.steps.length > 0 && form.steps.some((s) => s.instruction.trim().length > 0);
      return hasVideo || hasSomeSteps;
    }
    if (currentStage === 'review') {
      return completedStages.details && completedStages.ingredients && completedStages.steps;
    }
    return true;
  }, [currentStage, form, completedStages]);

  // Start new recipe
  const handleStartNewRecipe = async () => {
    setEditingRecipe(null);
    setCurrentStage('details');

    // Attempt to load existing draft
    const draft = await loadDraft();
    if (draft && draft.name) {
      setForm({
        ...DEFAULT_FORM_STATE,
        ...draft,
      });
    } else {
      setForm(DEFAULT_FORM_STATE);
    }

    setIsBuilderActive(true);
  };

  // Start editing existing recipe
  const handleEditRecipe = (recipe: ChefSubmissionRecord) => {
    setEditingRecipe(recipe);
    setCurrentStage('details');

    // Map existing recipe record into structured form state
    const mappedIngredients: StructuredIngredient[] = (recipe.ingredients || []).map((ing, idx) => {
      const qtyStr = ing.quantity || '100 g';
      const match = qtyStr.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
      const amount = match ? parseFloat(match[1] || '100') || 100 : 100;
      const unit = (match && match[2] ? match[2] : 'g') as any;
      return {
        id: `ing-${idx}-${Date.now()}`,
        ingredientId: (ing as any).ingredientId,
        name: ing.name,
        amount,
        unit: ['g', 'kg', 'ml', 'L', 'piece', 'packet', 'sachet', 'bunch', 'clove'].includes(unit)
          ? unit
          : 'g',
        quantityStr: qtyStr,
      };
    });

    const mappedSteps: StructuredStep[] = (recipe.recipeSteps || []).map((st, idx) => ({
      id: `step-${idx}-${Date.now()}`,
      stepNumber: st.stepNumber || idx + 1,
      title: st.title || '',
      instruction: st.instruction || '',
      imageUrl: st.imageUrl || SAMPLE_STEP_IMAGES[idx % SAMPLE_STEP_IMAGES.length]?.url || '',
      originalImageUrl:
        (st as any).originalImageUrl ||
        st.imageUrl ||
        SAMPLE_STEP_IMAGES[idx % SAMPLE_STEP_IMAGES.length]?.url ||
        '',
    }));

    setForm({
      name: recipe.name || '',
      tagline: recipe.tagline || '',
      description: recipe.description || '',
      thumbnailUrl: recipe.heroImage || SAMPLE_RECIPE_THUMBNAILS[0]?.url || '',
      originalThumbnailUrl:
        (recipe as any).originalHeroImage ||
        recipe.heroImage ||
        SAMPLE_RECIPE_THUMBNAILS[0]?.url ||
        '',
      dietType: recipe.diet || 'veg',
      cuisine: recipe.cuisine || 'North Indian',
      dishCategory: recipe.dishCategory || 'Curries & Gravies',
      spiceLevel: recipe.spiceLevel || 'Medium',
      servings: recipe.servings || 2,
      prepTimeMinutes: recipe.prepTimeMinutes || 15,
      cookTimeMinutes: recipe.cookTimeMinutes || 30,
      dietaryTags: recipe.dietaryTags || ['veg'],
      allergens: recipe.allergens || [],
      ingredients:
        mappedIngredients.length > 0 ? mappedIngredients : DEFAULT_FORM_STATE.ingredients,
      instructionType:
        recipe.instructionType ||
        (recipe.videoUrl ? (recipe.recipeSteps?.length ? 'both' : 'video') : 'steps'),
      videoUrl: recipe.videoUrl || '',
      steps: mappedSteps.length > 0 ? mappedSteps : DEFAULT_FORM_STATE.steps,
    });

    setIsBuilderActive(true);
  };

  // Exit builder back to submissions list
  const handleBackToList = () => {
    setIsBuilderActive(false);
    setEditingRecipe(null);
  };

  // Navigation between stages
  const handleNextStage = () => {
    if (currentStage === 'details') setCurrentStage('ingredients');
    else if (currentStage === 'ingredients') setCurrentStage('steps');
    else if (currentStage === 'steps') setCurrentStage('review');
  };

  const handlePrevStage = () => {
    if (currentStage === 'review') setCurrentStage('steps');
    else if (currentStage === 'steps') setCurrentStage('ingredients');
    else if (currentStage === 'ingredients') setCurrentStage('details');
    else if (currentStage === 'details') handleBackToList();
  };

  // Handle recipe submission to backend
  const handleSubmitRecipe = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter a recipe name.');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Required', 'Please add a recipe description.');
      return;
    }

    setSubmitting(true);

    const submissionPayload: ChefRecipeSubmission = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      heroImage: form.thumbnailUrl.trim() || SAMPLE_RECIPE_THUMBNAILS[0]!.url,
      originalHeroImage:
        form.originalThumbnailUrl || form.thumbnailUrl.trim() || SAMPLE_RECIPE_THUMBNAILS[0]!.url,
      galleryImages: form.thumbnailUrl.trim() ? [form.thumbnailUrl.trim()] : [],
      diet: form.dietType,
      cuisine: form.cuisine,
      dishCategory: form.dishCategory,
      spiceLevel: form.spiceLevel,
      servings: form.servings,
      prepTimeMinutes: form.prepTimeMinutes,
      cookTimeMinutes: form.cookTimeMinutes,
      dietaryTags: form.dietaryTags,
      allergens: form.allergens,
      ingredients: form.ingredients.map((ing) => ({
        name: ing.name.trim(),
        quantity: `${ing.amount} ${ing.unit}`,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        unit: ing.unit,
      })),
      recipeSteps: form.steps.map((st) => ({
        stepNumber: st.stepNumber,
        title: st.title.trim(),
        instruction: st.instruction.trim(),
        imageUrl: st.imageUrl.trim() || SAMPLE_STEP_IMAGES[0]!.url,
        originalImageUrl: st.originalImageUrl || st.imageUrl.trim() || SAMPLE_STEP_IMAGES[0]!.url,
      })),
      instructionType: form.instructionType,
      videoUrl: form.videoUrl?.trim() || '',
      chefId,
      chefName: chefDisplayName,
    };

    const isEdit = !!editingRecipe;

    // Return to list immediately so user knows submission was placed
    setIsBuilderActive(false);
    await clearDraft();

    try {
      let result;
      if (isEdit) {
        result = await updateChefSubmission(editingRecipe.id, submissionPayload, chefId);
      } else {
        result = await createChefSubmission(submissionPayload);
      }

      await loadSubmissions();

      if (result.success) {
        Alert.alert(
          isEdit ? 'Recipe Updated' : 'Recipe Submitted for Review',
          isEdit
            ? 'Your updated recipe has been submitted to the admin team for quality review.'
            : 'Your recipe has been sent to the admin team for review. You will be notified once published.',
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit recipe. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit recipe. Please try again.');
    } finally {
      setSubmitting(false);
      setEditingRecipe(null);
    }
  };

  // Delete submission
  const handleDeleteSubmission = (id: string, name: string) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            setDeletingId(id);
            await deleteChefSubmission(id, user.uid, false);
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
            setDeletingId(null);
          },
        },
      ],
    );
  };

  // If user is not an approved chef, show access denied prompt
  if (!isChef) {
    return (
      <View style={[styles.deniedRoot, { backgroundColor: colors.bgPrimary }]}>
        <View
          style={[
            styles.deniedCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <View style={[styles.deniedIconCircle, { backgroundColor: colors.bgSubtle }]}>
            <Icon name="chef" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.deniedTitle, { color: colors.textPrimary }]}>
            Chef Studio Access Required
          </Text>
          <Text style={[styles.deniedSubtitle, { color: colors.textSecondary }]}>
            {isAdmin
              ? 'You are signed in as an administrator. To create and manage recipes in Chef Studio, assign the Chef role to your account in the Admin Panel.'
              : 'You need an approved chef profile to access Chef Studio and create meal kit recipes.'}
          </Text>
        </View>
      </View>
    );
  }

  // If in Builder Mode, render full-page multi-stage recipe builder
  if (isBuilderActive) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
        {/* Sticky Header with breadcrumb and draft status */}
        <ChefStudioHeader
          isEditing={!!editingRecipe}
          draftStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          onBack={handleBackToList}
          onSaveDraftNow={() => saveDraftNow(form)}
          onDiscardDraft={async () => {
            await clearDraft();
            setForm(DEFAULT_FORM_STATE);
          }}
        />

        {/* Persistent 4-step Stage Navigation */}
        <StepNavigation
          currentStage={currentStage}
          completedStages={completedStages}
          onSelectStage={(stage) => setCurrentStage(stage)}
        />

        {/* Main Stage Content ScrollView */}
        <ScrollView
          style={styles.builderScroll}
          contentContainerStyle={styles.builderContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStage === 'details' && <Step1Details form={form} onChange={handleFormChange} />}

          {currentStage === 'ingredients' && (
            <Step2Ingredients
              ingredients={form.ingredients}
              onChange={(ings) => handleFormChange({ ingredients: ings })}
            />
          )}

          {currentStage === 'steps' && (
            <Step3CookingSteps
              steps={form.steps}
              instructionType={form.instructionType}
              videoUrl={form.videoUrl || ''}
              onStepsChange={(steps) => handleFormChange({ steps })}
              onInstructionTypeChange={(instructionType) => handleFormChange({ instructionType })}
              onVideoUrlChange={(videoUrl) => handleFormChange({ videoUrl })}
            />
          )}

          {currentStage === 'review' && (
            <Step4Review
              form={form}
              chefName={chefDisplayName}
              isEditing={!!editingRecipe}
              submitting={submitting}
              onNavigateStage={(stg) => setCurrentStage(stg)}
              onSubmit={handleSubmitRecipe}
            />
          )}
        </ScrollView>

        {/* Sticky Bottom Bar */}
        <StickyBottomBar
          currentStage={currentStage}
          canProceed={canProceed}
          submitting={submitting}
          isEditing={!!editingRecipe}
          onBack={handlePrevStage}
          onNext={handleNextStage}
          onSubmit={handleSubmitRecipe}
        />
      </View>
    );
  }

  // Otherwise, render Chef Submissions List View
  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <ChefSubmissionsList
        submissions={submissions}
        loading={loading}
        activeChefProfile={activeChefProfile}
        fallbackChefName={chefDisplayName}
        deletingId={deletingId}
        onNewRecipe={handleStartNewRecipe}
        onEditRecipe={handleEditRecipe}
        onDeleteRecipe={handleDeleteSubmission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  builderScroll: {
    flex: 1,
  },
  builderContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
  },
  deniedRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deniedCard: {
    maxWidth: 480,
    width: '100%',
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  deniedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  deniedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
