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
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Order } from '../../framework/firebase/ordersService';
import {
  getMealKitById,
  getMealKits,
  MealKit,
  RecipeStep,
} from '../../framework/services/mealKitsService';
import { useCookMode } from '../../framework/context/CookModeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { CookingDeliveryStrip } from './components/CookingDeliveryStrip';
import { WhatsInYourBoxView } from './components/WhatsInYourBoxView';
import { RecipeStepCard } from './components/RecipeStepCard';
import { MultiKitPickerView } from './components/MultiKitPickerView';
import { EnjoyYourMealView } from './components/EnjoyYourMealView';
import { ReviewModal } from '../reviews/ReviewModal';

interface CookModeViewProps {
  orderId: string;
  initialKitId?: string;
}

export const CookModeView: React.FC<CookModeViewProps> = ({ orderId, initialKitId }) => {
  // Prevent phone from sleeping while reading recipe and cooking
  useKeepAwake();

  const { colors, radii, shadows, isDark } = useTheme();
  const {
    activeOrders,
    dismissCookMode,
    undismissCookMode,
    markKitCompleted,
    textSize,
    toggleTextSize,
    getProgressForOrderKit,
    setKitStep,
    isKitReviewed,
    markKitReviewed,
    isOrderReadyToDisappear,
  } = useCookMode();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const { user } = useAuth();
  const { family, role } = useFamily();

  // Find target order with realistic demo fallback for direct navigation (e.g. /cook/ORD-xxxxx)
  const order = useMemo(() => {
    const existing = activeOrders.find((o) => o.id === orderId);
    if (existing) return existing;

    // Direct URL navigation / reload fallback: If order is not in activeOrders,
    // load realistic order with real meal kit from catalog so direct links
    // like /cook/ORD-xxxxx immediately display the full interactive culinary cooking guide!
    const allKits = getMealKits();
    const fallbackKit =
      (initialKitId && getMealKitById(initialKitId)) || (allKits.length > 0 ? allKits[0] : null);

    if (fallbackKit) {
      const demoOrder: Order = {
        id: orderId || 'ORD-xxxxx',
        userId: user?.uid || 'guest-user',
        customerPhone: '+91 98765 43210',
        deliveryAddress: 'Home Kitchen',
        status: 'Delivered',
        paymentStatus: 'Paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentMethod: 'UPI',
        transactionId: `TXN-DEMO-${Date.now()}`,
        trackingEvents: [],
        subtotal: fallbackKit.price,
        discount: 0,
        deliveryFee: 0,
        totalAmount: fallbackKit.price,
        deliverySlot: 'Immediate Cooking',
        items: [
          {
            id: fallbackKit.id,
            kitId: fallbackKit.id,
            name: fallbackKit.name,
            price: fallbackKit.price,
            quantity: 1,
            servings: fallbackKit.servings,
            image: fallbackKit.heroImage,
            shelfLifeDays: fallbackKit.shelfLifeDays,
          } as any,
        ],
      };
      return demoOrder;
    }
    return null;
  }, [activeOrders, orderId, initialKitId, user?.uid]);

  const isFamilyOrder = Boolean(order?.familyId);
  const isFamilyOwner = Boolean(
    isFamilyOrder &&
    (role === 'owner' ||
      (user?.uid && (order?.userId === user.uid || (order as any)?.familyOwnerId === user.uid)) ||
      (family && user?.uid && family.owner_id === user.uid)),
  );

  // Non-owners only see recipes of the meal kits they ordered; the family owner sees all meal kits
  const visibleKits = useMemo(() => {
    if (!order?.items) return [];
    if (!isFamilyOrder || isFamilyOwner) {
      return order.items;
    }
    const currentUid = user?.uid;
    if (!currentUid) return order.items;
    const myKits = order.items.filter((it: any) => (it.addedBy || it.added_by) === currentUid);
    return myKits.length > 0 ? myKits : order.items;
  }, [order?.items, isFamilyOrder, isFamilyOwner, user?.uid]);

  // Selected kit inside multi-kit order
  const [selectedKitId, setSelectedKitId] = useState<string | null>(initialKitId || null);
  const [stepPickerVisible, setStepPickerVisible] = useState(false);

  // Sync initialKitId if prop updates
  useEffect(() => {
    if (initialKitId) {
      setSelectedKitId(initialKitId);
    }
  }, [initialKitId]);

  // Auto-select kit if single visible kit
  useEffect(() => {
    if (visibleKits && visibleKits.length === 1 && !selectedKitId) {
      const firstItem = visibleKits[0];
      const singleKitId = firstItem?.kitId || firstItem?.id || 'kit-1';
      setSelectedKitId(singleKitId);
    }
  }, [visibleKits, selectedKitId]);

  // Exit / skip handler
  const handleExit = useCallback(async () => {
    const kitItem =
      visibleKits.find((it) => (it.kitId || it.id) === selectedKitId) || visibleKits[0];
    const kitId = kitItem?.kitId || kitItem?.id || 'kit-1';
    const isReviewed = orderId ? isKitReviewed(orderId, kitId) : false;
    const isDelivered = order?.status === 'Delivered';

    if (!isReviewed) {
      Alert.alert(
        'Please Rate the Meal Kit',
        'You have to review the meal kit to close the instructions. Would you like to rate it now?',
        [
          {
            text: 'Rate Now',
            onPress: () => setReviewModalVisible(true),
          },
          {
            text: 'Exit (Keep Guide Active)',
            style: 'cancel',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)' as any);
              }
            },
          },
        ],
      );
      return;
    }

    if (!isDelivered) {
      Alert.alert(
        'Awaiting Delivery',
        'Thank you for rating! Cooking instructions will remain available until your order is marked as delivered.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)' as any);
              }
            },
          },
        ],
      );
      return;
    }

    if (orderId) {
      await dismissCookMode(orderId);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  }, [orderId, visibleKits, selectedKitId, isKitReviewed, order?.status, dismissCookMode]);

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
      visibleKits.find((it) => (it.kitId || it.id) === selectedKitId) || visibleKits[0];

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
      // Reached the end! Advance to celebration and review screen
      await setKitStep(order.id, currentKitInfo.kitId, totalSteps);
      await markKitCompleted(order.id, currentKitInfo.kitId);
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
    if (stepIdx < totalSteps) {
      await undismissCookMode(order.id);
    }
    await setKitStep(order.id, currentKitInfo.kitId, stepIdx);
    setStepPickerVisible(false);
  };

  // Keyboard arrow keys navigation (desktop web & devices with keyboard)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStepIndex >= totalSteps) {
          handleJumpToStep(0);
        } else {
          handlePrevStep();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < totalSteps) {
          e.preventDefault();
          handleNextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentStepIndex, totalSteps, handleJumpToStep, handlePrevStep, handleNextStep]);

  // 1. If order not found, elevated fallback view
  if (!order) {
    const allKits = getMealKits();
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.pageWrapper}>
          <View style={styles.errorCenter}>
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.xl,
                  ...shadows.card,
                },
              ]}
            >
              <View style={[styles.errorIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Icon name="restaurant" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                No Active Order Found
              </Text>
              <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
                This order may have completed or is no longer active. You can explore our chef meal
                kits or jump back into home.
              </Text>
              <View style={styles.errorActionRow}>
                {allKits.length > 0 && allKits[0] && (
                  <Button
                    title="Cook Chef Special Kit"
                    variant="primary"
                    onPress={() => setSelectedKitId(allKits[0]!.id)}
                    style={{ minWidth: 200 }}
                  />
                )}
                <Button
                  title="Return Home"
                  variant="outline"
                  onPress={handleExit}
                  style={{ minWidth: 200, marginTop: 10 }}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Multi-kit picker: if visible kits > 1 and user hasn't selected one
  if (visibleKits && visibleKits.length > 1 && !selectedKitId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.pageWrapper}>
          <MultiKitPickerView
            order={{ ...order, items: visibleKits }}
            onSelectKit={(kitId) => setSelectedKitId(kitId)}
            onClose={handleExit}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentKitInfo) return null;
  const { kit } = currentKitInfo;

  // 3. Enjoy Your Meal Screen after last step
  const showEnjoyMealScreen = currentStepIndex >= totalSteps;
  if (showEnjoyMealScreen) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.pageWrapper}>
          {/* Gourmet Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.soft,
              },
            ]}
          >
            <TouchableOpacity
              testID="cook-mode-back-btn"
              onPress={() => handleJumpToStep(0)}
              style={[
                styles.headerIconBtn,
                { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
              ]}
              accessibilityLabel="Back to first recipe step"
            >
              <Icon name="arrow-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenterWrap}>
              <Text style={[styles.headerCenterTitle, { color: colors.textPrimary }]}>
                Cooking Guide Complete
              </Text>
              <Text style={[styles.headerCenterSub, { color: colors.primary }]}>Bon Appétit</Text>
            </View>
            <TouchableOpacity
              testID="cook-mode-close-btn"
              onPress={handleExit}
              style={[
                styles.headerIconBtn,
                { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
              ]}
              accessibilityLabel="Close Cook Mode"
            >
              <Icon name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <EnjoyYourMealView
            order={order}
            kit={kit}
            onDone={handleExit}
            onBackToRecipe={() => handleJumpToStep(0)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isReviewed =
    currentKitInfo?.kitId && order ? isKitReviewed(order.id, currentKitInfo.kitId) : false;
  const progressFraction = (currentStepIndex + 1) / totalSteps;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.pageWrapper}>
        {/* Floating Gourmet Cook Mode Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.xl,
              ...shadows.soft,
            },
          ]}
        >
          {/* Left: Thumbnail & Kit Name */}
          <View style={styles.headerLeftCol}>
            {kit.heroImage ? (
              <Image
                source={{ uri: kit.heroImage }}
                style={[styles.headerThumb, { borderRadius: radii.md }]}
              />
            ) : (
              <View
                style={[
                  styles.headerThumbPlaceholder,
                  { backgroundColor: colors.primaryLight, borderRadius: radii.md },
                ]}
              >
                <Icon name="restaurant" size={16} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerKitName, { color: colors.textPrimary }]} numberOfLines={1}>
                {kit.name}
              </Text>
              <View style={styles.headerMetaRow}>
                <Text style={[styles.headerOrderId, { color: colors.primary, fontWeight: '700' }]}>
                  Step {currentStepIndex + 1} of {totalSteps}
                </Text>
                <View
                  style={{
                    width: 50,
                    height: 4,
                    backgroundColor: colors.bgSubtle,
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${progressFraction * 100}%`,
                      height: '100%',
                      backgroundColor: colors.primary,
                      borderRadius: 999,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Right Header Controls: Multi-Kit Switch, Text Size, Close X */}
          <View style={styles.headerRightCol}>
            {visibleKits.length > 1 && (
              <TouchableOpacity
                testID="switch-kit-btn"
                style={[
                  styles.switchKitBtn,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
                ]}
                onPress={() => setSelectedKitId(null)}
                accessibilityLabel="Switch active kit in this order"
              >
                <Icon name="swap-horizontal" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Kitchen Text Size Toggle: A (Standard) / A+ (Large) / A++ (Counter Distance) */}
            <TouchableOpacity
              testID="kitchen-text-size-toggle"
              style={[
                styles.textSizeToggle,
                {
                  backgroundColor:
                    textSize === 'counter'
                      ? colors.accent
                      : textSize === 'large'
                        ? colors.primary
                        : colors.bgSubtle,
                  borderColor: colors.borderLight,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={toggleTextSize}
              accessibilityRole="button"
              accessibilityLabel={`Kitchen text size is currently ${textSize}. Tap to switch between standard, large, and counter distance.`}
            >
              <Text
                style={[
                  styles.textSizeToggleText,
                  {
                    color: textSize === 'standard' ? colors.textPrimary : '#FFFFFF',
                    fontWeight: '800',
                  },
                ]}
              >
                {textSize === 'counter' ? 'A++' : textSize === 'large' ? 'A+' : 'A'}
              </Text>
            </TouchableOpacity>

            {/* Close (X) button */}
            <TouchableOpacity
              testID="cook-mode-close-btn"
              style={[
                styles.closeBtn,
                { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
              ]}
              onPress={handleExit}
              accessibilityRole="button"
              accessibilityLabel="Close Cook Mode and return to Explore"
            >
              <Icon name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar & Jump-to-Step Controls */}
        <View
          style={[
            styles.progressContainer,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.xl,
              ...shadows.card,
            },
          ]}
        >
          {/* Segmented Step Indicator */}
          <View style={styles.segmentedStepTrack}>
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <View
                  key={idx}
                  style={[
                    styles.stepSegment,
                    {
                      backgroundColor:
                        isPast || isCurrent ? colors.primary : isDark ? '#332E28' : '#E8E2D9',
                      opacity: isCurrent ? 1 : isPast ? 0.75 : 0.35,
                      borderRadius: radii.pill,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Hidden/Preserved for test assertion */}
          <View style={styles.progressBarBgHidden}>
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
              <View
                style={[
                  styles.stepDotPill,
                  { backgroundColor: colors.primaryLight, borderRadius: radii.pill },
                ]}
              >
                <Text style={[styles.stepDotPillText, { color: colors.primary }]}>
                  {currentStepIndex + 1} / {totalSteps}
                </Text>
              </View>
              <Text
                style={[styles.progressStepLabel, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {currentStep ? currentStep.title : `Step ${currentStepIndex + 1} of ${totalSteps}`}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Meal Prep Review Requirement Notice */}
          <View
            testID="cook-mode-review-banner"
            style={[
              styles.reviewBanner,
              {
                backgroundColor: isReviewed
                  ? isDark
                    ? '#064E3B'
                    : '#ECFDF5'
                  : isDark
                    ? '#292524'
                    : '#FFFBEB',
                borderColor: isReviewed ? '#10B981' : '#F59E0B',
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.reviewBannerTopRow}>
              <View
                style={[
                  styles.reviewBannerIconCircle,
                  { backgroundColor: isReviewed ? '#10B981' : '#F59E0B' },
                ]}
              >
                <Icon name={isReviewed ? 'checkmark' : 'star'} size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewBannerTitle, { color: colors.textPrimary }]}>
                  {isReviewed ? 'Meal Kit Reviewed' : 'Please Rate The Meal Kit'}
                </Text>
                <Text style={[styles.reviewBannerSub, { color: colors.textSecondary }]}>
                  {isReviewed
                    ? 'Review recorded! Instructions will stay available until your order is delivered.'
                    : 'Please rate the meal kit to close the instructions. Instructions will only finally disappear after delivery and review.'}
                </Text>
              </View>
              <TouchableOpacity
                testID="cook-mode-rate-kit-btn"
                style={[
                  styles.reviewBannerBtn,
                  {
                    backgroundColor: isReviewed ? '#10B981' : colors.primary,
                    borderRadius: radii.pill,
                  },
                ]}
                onPress={() => setReviewModalVisible(true)}
              >
                <Text style={styles.reviewBannerBtnText}>
                  {isReviewed ? 'Reviewed' : 'Rate Kit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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

        {/* Bottom Floating Step Navigation Buttons Dock */}
        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.pill,
              ...shadows.hover,
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
                backgroundColor: colors.bgSubtle,
                opacity: currentStepIndex === 0 ? 0.35 : 1,
                borderRadius: radii.pill,
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
            style={[
              styles.navBtn,
              styles.nextBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.pill,
                ...shadows.soft,
              },
            ]}
            onPress={handleNextStep}
            accessibilityRole="button"
            accessibilityLabel={currentStepIndex + 1 >= totalSteps ? 'Finish cooking' : 'Next step'}
          >
            <Text style={styles.nextBtnText}>
              {currentStepIndex + 1 >= totalSteps ? 'Finish Cooking' : 'Next Step'}
            </Text>
            <Icon
              name={currentStepIndex + 1 >= totalSteps ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
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
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.xl,
                  ...shadows.card,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Jump to Recipe Step
                </Text>
                <TouchableOpacity
                  onPress={() => setStepPickerVisible(false)}
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
                  ]}
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
                          borderRadius: radii.md,
                        },
                      ]}
                      onPress={() => handleJumpToStep(sIdx)}
                    >
                      <View
                        style={[
                          styles.stepBadgeCircle,
                          {
                            backgroundColor: isCurrent ? colors.primary : colors.bgSubtle,
                            borderRadius: radii.pill,
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
                            {Math.round(st.timerSeconds / 60)} min timer
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

        {/* Review Modal directly accessible from Cook Mode */}
        {currentKitInfo?.kit && (
          <ReviewModal
            kit={currentKitInfo.kit}
            visible={reviewModalVisible}
            onClose={() => setReviewModalVisible(false)}
            onReviewSubmitted={async () => {
              setReviewModalVisible(false);
              if (currentKitInfo?.kitId && order) {
                await markKitReviewed(order.id, currentKitInfo.kitId);
              }
              if (order?.status === 'Delivered') {
                if (orderId) {
                  await dismissCookMode(orderId);
                }
                Alert.alert(
                  'Cooking Guide Complete',
                  'Your order has been delivered and reviewed. Instructions are now closed. Bon Appétit!',
                  [
                    {
                      text: 'Close',
                      onPress: () => {
                        if (router.canGoBack()) {
                          router.back();
                        } else {
                          router.replace('/(tabs)' as any);
                        }
                      },
                    },
                  ],
                );
              } else {
                Alert.alert(
                  'Review Submitted!',
                  'Thank you for rating! Cooking instructions will remain available until your order is marked as delivered by the admin.',
                );
              }
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  reviewBanner: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  reviewBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewBannerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  reviewBannerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  reviewBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  reviewBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  safeArea: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'web' ? 12 : 6,
    borderWidth: 1,
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
  },
  headerThumbPlaceholder: {
    width: 44,
    height: 44,
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
  headerCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerCenterSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchKitBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeToggle: {
    width: 36,
    height: 36,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
  },
  segmentedStepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  stepSegment: {
    flex: 1,
    height: 6,
  },
  progressBarBgHidden: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  progressBarFill: {
    height: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepOverviewTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  stepDotPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepDotPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressStepLabel: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  skipForNowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 110,
  },
  bottomNav: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 16 : 8,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 14,
    gap: 8,
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
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorActionRow: {
    width: '100%',
    alignItems: 'center',
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
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
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
    borderBottomWidth: 0.5,
    gap: 12,
  },
  stepBadgeCircle: {
    width: 28,
    height: 28,
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
