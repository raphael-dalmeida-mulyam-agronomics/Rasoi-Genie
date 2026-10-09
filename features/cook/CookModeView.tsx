import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  BackHandler,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Order } from '../../framework/firebase/ordersService';
import { getMealKitById, MealKit, RecipeStep } from '../../framework/services/mealKitsService';
import { useCookMode } from '../../framework/context/CookModeContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { CookingDeliveryStrip } from './components/CookingDeliveryStrip';
import { WhatsInYourBoxView } from './components/WhatsInYourBoxView';
import { RecipeStepCard } from './components/RecipeStepCard';
import { MultiKitPickerView } from './components/MultiKitPickerView';
import { EnjoyYourMealView } from './components/EnjoyYourMealView';

interface CookModeViewProps {
  orderId: string;
}

export const CookModeView: React.FC<CookModeViewProps> = ({ orderId }) => {
  // Prevent phone from sleeping while reading recipe and cooking
  useKeepAwake();

  const { colors, radii, isDark } = useTheme();
  const {
    activeOrders,
    dismissCookMode,
    textSize,
    toggleTextSize,
    getProgressForOrderKit,
    setKitStep,
  } = useCookMode();

  // Find target order
  const order = useMemo(() => {
    return activeOrders.find((o) => o.id === orderId) || null;
  }, [activeOrders, orderId]);

  // Selected kit inside multi-kit order
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [stepPickerVisible, setStepPickerVisible] = useState(false);

  // Auto-select kit if single kit
  useEffect(() => {
    if (order && order.items && order.items.length === 1 && !selectedKitId) {
      const firstItem = order.items[0];
      const singleKitId = firstItem?.kitId || firstItem?.id || 'kit-1';
      setSelectedKitId(singleKitId);
    }
  }, [order, selectedKitId]);

  // Exit / skip handler
  const handleExit = useCallback(async () => {
    if (orderId) {
      await dismissCookMode(orderId);
    }
    router.replace('/(tabs)' as any);
  }, [orderId, dismissCookMode]);

  // Handle hardware Android back button
  useEffect(() => {
    const onBackPress = () => {
      handleExit();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [handleExit]);

  // Resolve current kit details and recipe steps
  const currentKitInfo = useMemo(() => {
    if (!order) return null;
    const kitItem =
      order.items.find((it) => (it.kitId || it.id) === selectedKitId) || order.items[0];

    if (!kitItem) return null;

    const realKitId = kitItem.kitId || kitItem.id || 'kit-1';
    const catalogKit = getMealKitById(realKitId);

    // Build complete or fallback kit representation
    const fallbackSteps: RecipeStep[] = [
      {
        stepNumber: 1,
        title: 'Mise en Place & Prep',
        instruction:
          'Unbox all pre-portioned ingredients. Rinse fresh vegetables and slice them as indicated on the sachet packets.',
        timerSeconds: 300,
        tip: 'Keep all spice sachets organized in order of cooking.',
      },
      {
        stepNumber: 2,
        title: 'Aromatics & Whole Masalas',
        instruction:
          'Heat 2 tablespoons of oil or ghee in a heavy-bottomed pan. Add the whole masala sachet and allow them to crackle and release fragrant oils.',
        timerSeconds: 180,
        tip: 'Stir constantly on medium heat to avoid scorching delicate whole spices.',
      },
      {
        stepNumber: 3,
        title: 'Simmer & Incorporate Base',
        instruction:
          'Add the main vegetables/proteins and gravy base. Stir well to coat with spices, cover, and let simmer gently until thoroughly cooked.',
        timerSeconds: 600,
        tip: 'Keep flame on low to allow the rich masala flavors to penetrate deep into the proteins.',
      },
      {
        stepNumber: 4,
        title: 'Finishing Touches & Garnish',
        instruction:
          'Sprinkle the finishing garam masala sachet and fresh coriander garnish. Stir once, turn off heat, and let rest covered for 2 minutes before serving.',
        timerSeconds: 120,
        tip: 'Resting allows the aromatic essential oils to settle perfectly.',
      },
    ];

    const effectiveSteps =
      catalogKit?.recipeSteps && catalogKit.recipeSteps.length > 0
        ? catalogKit.recipeSteps
        : fallbackSteps;

    const effectiveKit: MealKit = catalogKit || {
      id: realKitId,
      name: kitItem.name,
      slug: kitItem.name.toLowerCase().replace(/\s+/g, '-'),
      tagline: 'Chef curated meal kit',
      description: 'Authentic gourmet recipe delivered fresh to your door.',
      heroImage:
        kitItem.imageUrl ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
      galleryImages: [],
      price: kitItem.price,
      servings: kitItem.servings || 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      diet: 'veg',
      cuisine: 'North Indian',
      spiceLevel: (kitItem.spiceLevel as any) || 'Medium',
      difficulty: 'Medium',
      dietaryTags: ['veg'],
      availableRegions: ['West', 'South', 'North', 'East'],
      cities: [],
      stockByRegion: { North: 10, South: 10, West: 10, East: 10 },
      rating: 4.8,
      reviewCount: 42,
      nutrition: {
        calories: 450,
        protein: 16,
        carbs: 48,
        fat: 18,
        fiber: 6,
      },
      allergens: ['Dairy'],
      ingredients: (kitItem.masalaSachets || []).map((s) => ({
        name: s,
        quantity: '1 sachet',
        isMasalaSachet: true,
      })),
      masalaSachets: kitItem.masalaSachets || [],
      recipeSteps: effectiveSteps,
      reviews: [],
      salesByRegion: {},
    };

    return {
      kit: effectiveKit,
      steps: effectiveSteps,
      kitId: realKitId,
    };
  }, [order, selectedKitId]);

  // Read saved step index for this kit
  const kitProgress = useMemo(() => {
    if (!order || !currentKitInfo) return null;
    return getProgressForOrderKit(order.id, currentKitInfo.kitId);
  }, [order, currentKitInfo, getProgressForOrderKit]);

  const currentStepIndex = kitProgress?.currentStepIndex || 0;
  const isCompleted = kitProgress?.isCompleted || false;

  const steps = currentKitInfo?.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;

  const handleNextStep = async () => {
    if (!order || !currentKitInfo) return;
    if (currentStepIndex + 1 < totalSteps) {
      await setKitStep(order.id, currentKitInfo.kitId, currentStepIndex + 1);
    } else {
      // Reached the end!
      await setKitStep(order.id, currentKitInfo.kitId, totalSteps);
    }
  };

  const handlePrevStep = async () => {
    if (!order || !currentKitInfo) return;
    if (currentStepIndex > 0) {
      await setKitStep(order.id, currentKitInfo.kitId, currentStepIndex - 1);
    }
  };

  const handleJumpToStep = async (stepIdx: number) => {
    if (!order || !currentKitInfo) return;
    await setKitStep(order.id, currentKitInfo.kitId, stepIdx);
    setStepPickerVisible(false);
  };

  // 1. If order not found, fallback view
  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.errorCenter}>
          <Icon name="restaurant" size={48} color={colors.primary} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            No Active Order Found
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            This order may have completed or is no longer active.
          </Text>
          <Button
            title="Return to Explore"
            variant="primary"
            onPress={() => router.replace('/(tabs)' as any)}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 2. Multi-kit picker: if order has > 1 kits and user hasn't selected one
  if (order.items && order.items.length > 1 && !selectedKitId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <MultiKitPickerView
          order={order}
          onSelectKit={(kitId) => setSelectedKitId(kitId)}
          onClose={handleExit}
        />
      </SafeAreaView>
    );
  }

  if (!currentKitInfo) return null;
  const { kit } = currentKitInfo;

  // 3. Enjoy Your Meal Screen after last step
  const showEnjoyMealScreen = currentStepIndex >= totalSteps || isCompleted;
  if (showEnjoyMealScreen) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            testID="cook-mode-back-btn"
            onPress={() => handleJumpToStep(totalSteps - 1)}
            style={styles.headerIconBtn}
            accessibilityLabel="Back to recipe steps"
          >
            <Icon name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerCenterTitle, { color: colors.textPrimary }]}>
            Cooking Guide Complete
          </Text>
          <TouchableOpacity
            testID="cook-mode-close-btn"
            onPress={handleExit}
            style={styles.headerIconBtn}
            accessibilityLabel="Close Cook Mode"
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <EnjoyYourMealView order={order} kit={kit} onDone={handleExit} />
      </SafeAreaView>
    );
  }

  const progressFraction = (currentStepIndex + 1) / totalSteps;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      {/* Cook Mode Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        {/* Left: Thumbnail & Kit Name */}
        <View style={styles.headerLeftCol}>
          {kit.heroImage ? (
            <Image source={{ uri: kit.heroImage }} style={styles.headerThumb} />
          ) : (
            <View style={[styles.headerThumbPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <Icon name="restaurant" size={16} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerKitName, { color: colors.textPrimary }]} numberOfLines={1}>
              {kit.name}
            </Text>
            <View style={styles.headerMetaRow}>
              <Text style={[styles.headerOrderId, { color: colors.primary }]}>
                #{order.id.slice(-6)}
              </Text>
              <Badge
                label={order.status}
                variant={
                  order.status === 'Confirmed'
                    ? 'success'
                    : order.status === 'Preparing'
                      ? 'warning'
                      : 'accent'
                }
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Right Header Controls: Multi-Kit Switch, Text Size, Close X */}
        <View style={styles.headerRightCol}>
          {order.items.length > 1 && (
            <TouchableOpacity
              testID="switch-kit-btn"
              style={[styles.switchKitBtn, { backgroundColor: colors.bgSubtle }]}
              onPress={() => setSelectedKitId(null)}
              accessibilityLabel="Switch active kit in this order"
            >
              <Icon name="swap-horizontal" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Kitchen Text Size Toggle: A / A+ */}
          <TouchableOpacity
            testID="kitchen-text-size-toggle"
            style={[
              styles.textSizeToggle,
              {
                backgroundColor: textSize === 'large' ? colors.primary : colors.bgSubtle,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={toggleTextSize}
            accessibilityRole="button"
            accessibilityLabel={`Kitchen text size is currently ${textSize}. Tap to toggle.`}
          >
            <Text
              style={[
                styles.textSizeToggleText,
                { color: textSize === 'large' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {textSize === 'large' ? 'A+' : 'A'}
            </Text>
          </TouchableOpacity>

          {/* Close (X) button */}
          <TouchableOpacity
            testID="cook-mode-close-btn"
            style={[styles.closeBtn, { backgroundColor: colors.bgSubtle }]}
            onPress={handleExit}
            accessibilityRole="button"
            accessibilityLabel="Close Cook Mode and return to Explore"
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar & Jump-to-Step Controls */}
      <View
        style={[
          styles.progressContainer,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.progressBarBg}>
          <View
            testID="cooking-progress-fill"
            style={[
              styles.progressBarFill,
              {
                width: `${progressFraction * 100}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <View style={styles.progressTextRow}>
          <TouchableOpacity
            testID="open-steps-overview-btn"
            style={styles.stepOverviewTrigger}
            onPress={() => setStepPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Step ${currentStepIndex + 1} of ${totalSteps}. Tap to jump to another step.`}
          >
            <Text style={[styles.progressStepLabel, { color: colors.textPrimary }]}>
              Step {currentStepIndex + 1} of {totalSteps}
            </Text>
            <Icon name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExit}
            accessibilityRole="button"
            accessibilityLabel="Skip cooking guide for now"
          >
            <Text style={[styles.skipForNowText, { color: colors.textMuted }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Recipe Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Live Delivery Strip (if not delivered) */}
        <CookingDeliveryStrip order={order} />

        {/* 2. What's in your box */}
        <WhatsInYourBoxView kit={kit} />

        {/* 3. Step Card with Instruction, Image, Chef Tip, and Timer */}
        {currentStep && (
          <RecipeStepCard
            orderId={order.id}
            kitId={kit.id}
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={totalSteps}
            fallbackHeroImage={kit.heroImage}
          />
        )}
      </ScrollView>

      {/* Bottom Floating Step Navigation Buttons */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          testID="prev-step-btn"
          disabled={currentStepIndex === 0}
          style={[
            styles.navBtn,
            styles.prevBtn,
            {
              borderColor: colors.borderLight,
              opacity: currentStepIndex === 0 ? 0.4 : 1,
            },
          ]}
          onPress={handlePrevStep}
          accessibilityRole="button"
          accessibilityLabel="Previous cooking step"
        >
          <Icon name="arrow-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.prevBtnText, { color: colors.textPrimary }]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="next-step-btn"
          style={[styles.navBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={handleNextStep}
          accessibilityRole="button"
          accessibilityLabel={currentStepIndex + 1 >= totalSteps ? 'Finish cooking' : 'Next step'}
        >
          <Text style={styles.nextBtnText}>
            {currentStepIndex + 1 >= totalSteps ? 'Finish Cooking 🎉' : 'Next Step'}
          </Text>
          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Step Picker Overview Modal */}
      <Modal
        visible={stepPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStepPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Jump to Recipe Step
              </Text>
              <TouchableOpacity
                onPress={() => setStepPickerVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close step overview"
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {steps.map((st, sIdx) => {
                const isCurrent = sIdx === currentStepIndex;
                return (
                  <TouchableOpacity
                    key={sIdx}
                    testID={`jump-to-step-${sIdx + 1}`}
                    style={[
                      styles.stepOverviewRow,
                      {
                        backgroundColor: isCurrent ? colors.primaryLight : 'transparent',
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => handleJumpToStep(sIdx)}
                  >
                    <View
                      style={[
                        styles.stepBadgeCircle,
                        {
                          backgroundColor: isCurrent ? colors.primary : colors.bgSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepBadgeText,
                          { color: isCurrent ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {sIdx + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.stepOverviewTitle,
                          {
                            color: isCurrent ? colors.primary : colors.textPrimary,
                            fontWeight: isCurrent ? '800' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {st.title}
                      </Text>
                      {st.timerSeconds ? (
                        <Text style={[styles.stepOverviewTimer, { color: colors.textMuted }]}>
                          ⏱ {Math.round(st.timerSeconds / 60)} min timer
                        </Text>
                      ) : null}
                    </View>
                    {isCurrent && <Icon name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  headerThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKitName: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerOrderId: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchKitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeToggleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepOverviewTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressStepLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  skipForNowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 90,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  prevBtn: {
    flex: 1,
    borderWidth: 1,
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1.6,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  stepBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepOverviewTitle: {
    fontSize: 13,
  },
  stepOverviewTimer: {
    fontSize: 11,
    marginTop: 2,
  },
});
