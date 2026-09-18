import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { MealKit } from '../../framework/services/mealKitsService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useCart } from '../../framework/context/CartContext';
import { useWishlist } from '../../framework/context/WishlistContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { RatingStars } from '../../framework/ui/RatingStars';
import { QuantityStepper } from '../../framework/ui/QuantityStepper';
import { SegmentedControl } from '../../framework/ui/SegmentedControl';
import { getReviewsByKit } from '../../framework/services/reviewsService';

export interface MealDetailModalProps {
  kit: MealKit | null;
  visible: boolean;
  onClose: () => void;
  onOpenReviewsModal?: (kit: MealKit) => void;
}

type TabType = 'overview' | 'recipe' | 'ingredients' | 'nutrition' | 'reviews';

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  kit,
  visible,
  onClose,
  onOpenReviewsModal,
}) => {
  const { colors, radii, shadows } = useTheme();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { preferences } = usePreferences();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const [runningTimers, setRunningTimers] = useState<Record<number, boolean>>({});

  // Customization: Serving size and Spice level
  const [selectedServings, setSelectedServings] = useState<number>(kit?.servings || 2);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>(kit?.spiceLevel || 'Medium');

  // Sync state if kit changes
  useEffect(() => {
    if (kit) {
      setSelectedServings(kit.servings || 2);
      setSelectedSpiceLevel(kit.spiceLevel || 'Medium');
    }
  }, [kit?.id]);

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(runningTimers).forEach((stepStr) => {
          const step = Number(stepStr);
          if (runningTimers[step] && (next[step] ?? 0) > 0) {
            next[step] = (next[step] ?? 0) - 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [runningTimers]);

  if (!kit) return null;

  const isFavorite = isInWishlist(kit.id);
  const isAvailableInRegion = kit.availableRegions.includes(preferences.regionHub);

  // Dynamic calculations based on selected servings
  const baseServings = kit.servings || 2;
  const servingRatio = selectedServings / baseServings;
  const effectiveUnitPrice = Math.round((kit.price / baseServings) * selectedServings);

  const scaleQuantity = (quantityStr: string, ratio: number): string => {
    if (ratio === 1) return quantityStr;
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      const unit = match[2] || '';
      const scaled = Math.round(num * ratio * 10) / 10;
      return `${scaled} ${unit}`.trim();
    }
    return `${quantityStr} (x${ratio})`;
  };

  const handleStartTimer = (stepNumber: number, initialSeconds: number) => {
    if (activeTimers[stepNumber] === undefined) {
      setActiveTimers((prev) => ({ ...prev, [stepNumber]: initialSeconds }));
    }
    setRunningTimers((prev) => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const handleAddToCart = () => {
    addItem(kit, quantity, selectedServings, selectedSpiceLevel);
    Alert.alert(
      'Added to Cart! 🛒',
      `${quantity}x ${kit.name} (${selectedServings} Servings, ${selectedSpiceLevel} Spice) added to your basket.`,
    );
    onClose();
  };

  const reviews = getReviewsByKit(kit.id);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Top Floating App Bar */}
        <View
          style={[
            styles.appBar,
            { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: colors.bgSubtle }]}
            onPress={onClose}
          >
            <Text style={[styles.circleButtonText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>

          <Text style={[styles.appBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {kit.name}
          </Text>

          <TouchableOpacity
            style={[
              styles.circleButton,
              { backgroundColor: isFavorite ? colors.primaryLight : colors.bgSubtle },
            ]}
            onPress={() => toggleWishlist(kit.id)}
          >
            <Text style={{ fontSize: 18 }}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Gallery */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: kit.galleryImages[selectedImageIndex] || kit.heroImage }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Diet Pill */}
            <View style={styles.floatingBadge}>
              {(() => {
                const badge = getDietBadgeInfo(kit.diet);
                return <Badge label={badge.label} variant={badge.variant} />;
              })()}
            </View>

            {/* Thumbnail Row */}
            {kit.galleryImages.length > 1 && (
              <View style={styles.thumbRow}>
                {kit.galleryImages.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[
                      styles.thumbTouch,
                      {
                        borderColor: selectedImageIndex === idx ? colors.primary : '#FFFFFF',
                        borderRadius: radii.sm,
                      },
                    ]}
                  >
                    <Image source={{ uri: img }} style={styles.thumbImg} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Title & Headline Info */}
          <View style={[styles.contentSection, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kitName, { color: colors.textPrimary }]}>{kit.name}</Text>
                {kit.hindiName ? (
                  <Text style={[styles.hindiSubtitle, { color: colors.primary }]}>
                    {kit.hindiName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: colors.primary }]}>₹{kit.price}</Text>
                {kit.originalPrice ? (
                  <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                    ₹{kit.originalPrice}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={[styles.tagline, { color: colors.textSecondary }]}>{kit.tagline}</Text>

            {/* Rating & Region Availability */}
            <View style={styles.metaRow}>
              <RatingStars rating={kit.rating} reviewCount={kit.reviewCount} size={15} />

              <View style={styles.regionIndicator}>
                <Text style={{ fontSize: 13 }}>
                  {isAvailableInRegion
                    ? 'In Stock (Same Day Delivery)'
                    : 'Limited Availability in Region'}
                </Text>
              </View>
            </View>

            {/* Spec Chips Bar */}
            <View
              style={[styles.specBar, { backgroundColor: colors.bgSubtle, borderRadius: radii.lg }]}
            >
              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textMuted }]}>PREP & COOK</Text>
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                  {kit.prepTimeMinutes + kit.cookTimeMinutes} mins
                </Text>
              </View>

              <View style={styles.specDivider} />

              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textMuted }]}>SPICE</Text>
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                  {kit.spiceLevel}
                </Text>
              </View>

              <View style={styles.specDivider} />

              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textMuted }]}>SKILL</Text>
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                  {kit.difficulty}
                </Text>
              </View>

              <View style={styles.specDivider} />

              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textMuted }]}>PORTION</Text>
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                  {selectedServings} Servings
                </Text>
              </View>
            </View>

            {/* Interactive Customization: Serving Size & Spice Level */}
            <View
              style={[
                styles.customizationBox,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <View style={styles.customHeaderRow}>
                <Text style={[styles.customHeading, { color: colors.textPrimary }]}>
                  Customize Portion & Taste
                </Text>
                <Badge label={`₹${effectiveUnitPrice}/kit`} variant="accent" />
              </View>

              {/* Serving Size Options */}
              <Text style={[styles.customSectionLabel, { color: colors.textSecondary }]}>
                SERVING SIZE:
              </Text>
              <View style={styles.pillsRow}>
                {[
                  { count: 2, label: '2 Servings', desc: 'Couple' },
                  { count: 4, label: '4 Servings', desc: 'Family' },
                  { count: 6, label: '6 Servings', desc: 'Party' },
                ].map((s) => {
                  const isSelected = selectedServings === s.count;
                  return (
                    <TouchableOpacity
                      key={s.count}
                      activeOpacity={0.7}
                      onPress={() => setSelectedServings(s.count)}
                      style={[
                        styles.portionPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          borderRadius: radii.md,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.portionPillText,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {s.label}
                      </Text>
                      <Text
                        style={[
                          styles.portionPillDesc,
                          { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textMuted },
                        ]}
                      >
                        {s.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Spice Level Options */}
              <View style={{ marginTop: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={[
                      styles.customSectionLabel,
                      { color: colors.textSecondary, marginBottom: 0 },
                    ]}
                  >
                    SPICE LEVEL:
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                    {selectedSpiceLevel === 'Mild' && 'Mild (Kid-friendly)'}
                    {selectedSpiceLevel === 'Medium' && 'Medium (Classic Balance)'}
                    {selectedSpiceLevel === 'Spicy' && 'Spicy (Desi Tadka)'}
                    {selectedSpiceLevel === 'Fiery' && 'Fiery (Extra Hot)'}
                  </Text>
                </View>
                <View style={styles.pillsRow}>
                  {[
                    { level: 'Mild', label: 'Mild' },
                    { level: 'Medium', label: 'Medium' },
                    { level: 'Spicy', label: 'Spicy' },
                    { level: 'Fiery', label: 'Fiery' },
                  ].map((sp) => {
                    const isSelected = selectedSpiceLevel === sp.level;
                    return (
                      <TouchableOpacity
                        key={sp.level}
                        activeOpacity={0.7}
                        onPress={() => setSelectedSpiceLevel(sp.level)}
                        style={[
                          styles.spicePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                            borderColor: isSelected ? colors.primary : colors.borderLight,
                            borderRadius: radii.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.spicePillText,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {sp.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabBarSection}>
            <SegmentedControl<TabType>
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'recipe', label: 'Recipe Guide' },
                { value: 'ingredients', label: 'Masala Box' },
                { value: 'nutrition', label: 'Nutrition' },
                { value: 'reviews', label: 'Reviews', badgeCount: reviews.length },
              ]}
              selectedValue={activeTab}
              onSelect={setActiveTab}
            />
          </View>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <View
              style={[
                styles.cardBlock,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
                About This Meal Kit
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                {kit.description}
              </Text>

              <View style={styles.sachetCallout}>
                <Text style={[styles.sachetCalloutHeading, { color: colors.primary }]}>
                  Pre-Portioned Masala Sachets Included:
                </Text>
                {kit.masalaSachets.map((sachet, idx) => (
                  <View key={idx} style={styles.sachetBullet}>
                    <Text style={[styles.sachetBulletDot, { color: colors.primary }]}>-</Text>
                    <Text style={[styles.sachetBulletText, { color: colors.textPrimary }]}>
                      {sachet}
                    </Text>
                  </View>
                ))}
              </View>

              {kit.allergens.length > 0 && (
                <View
                  style={[
                    styles.allergenBox,
                    { backgroundColor: '#FEF3C7', borderRadius: radii.md },
                  ]}
                >
                  <Text style={styles.allergenTitle}>Allergen Information:</Text>
                  <Text style={styles.allergenText}>{kit.allergens.join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: STEP-BY-STEP RECIPE GUIDE */}
          {activeTab === 'recipe' && (
            <View
              style={[
                styles.cardBlock,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
                Interactive Step-by-Step Cooking Guide
              </Text>
              <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
                Follow each step. Tap the built-in timer to monitor your stovetop cooking!
              </Text>

              {kit.recipeSteps.map((step) => {
                const remainingSeconds =
                  (activeTimers[step.stepNumber] !== undefined
                    ? activeTimers[step.stepNumber]
                    : step.timerSeconds) ?? 0;
                const isRunning = !!runningTimers[step.stepNumber];

                const formatTimer = (secs: number) => {
                  const m = Math.floor(secs / 60);
                  const s = secs % 60;
                  return `${m}:${s < 10 ? '0' : ''}${s}`;
                };

                return (
                  <View
                    key={step.stepNumber}
                    style={[
                      styles.stepCard,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderRadius: radii.lg,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepBadge,
                          { backgroundColor: colors.primary, borderRadius: radii.pill },
                        ]}
                      >
                        <Text style={[styles.stepBadgeText, { color: colors.textInverse }]}>
                          Step {step.stepNumber}
                        </Text>
                      </View>
                      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                        {step.title}
                      </Text>
                    </View>

                    <Text style={[styles.stepInstruction, { color: colors.textSecondary }]}>
                      {step.instruction}
                    </Text>

                    {step.tip ? (
                      <View
                        style={[
                          styles.tipRow,
                          { backgroundColor: colors.bgSurface, borderRadius: radii.sm },
                        ]}
                      >
                        <Text style={styles.tipIcon}>💡</Text>
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                          <Text style={{ fontWeight: '700' }}>Chef Tip: </Text>
                          {step.tip}
                        </Text>
                      </View>
                    ) : null}

                    {step.timerSeconds ? (
                      <TouchableOpacity
                        style={[
                          styles.timerButton,
                          {
                            backgroundColor: isRunning ? colors.primary : colors.bgSurface,
                            borderColor: colors.primary,
                            borderRadius: radii.pill,
                          },
                        ]}
                        onPress={() => handleStartTimer(step.stepNumber, step.timerSeconds!)}
                      >
                        <Text style={{ fontSize: 16 }}>⏱️</Text>
                        <Text
                          style={[
                            styles.timerButtonText,
                            { color: isRunning ? colors.textInverse : colors.primary },
                          ]}
                        >
                          {isRunning ? 'Pause Timer: ' : 'Start Timer: '}
                          {formatTimer(remainingSeconds)}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 3: INGREDIENTS */}
          {activeTab === 'ingredients' && (
            <View
              style={[
                styles.cardBlock,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
                Pre-Portioned Ingredients Checklist
              </Text>
              <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
                Everything comes pre-cleaned and weighed to exact proportions for {kit.servings}{' '}
                people.
              </Text>

              {kit.ingredients.map((ing, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.ingredientRow,
                    {
                      borderBottomColor: colors.borderLight,
                      backgroundColor: ing.isMasalaSachet
                        ? colors.primaryLight + '50'
                        : 'transparent',
                      padding: 10,
                      borderRadius: radii.sm,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.ingredientName,
                        {
                          color: ing.isMasalaSachet ? colors.primary : colors.textPrimary,
                          fontWeight: ing.isMasalaSachet ? '800' : '600',
                        },
                      ]}
                    >
                      {ing.name}
                    </Text>
                  </View>
                  <Badge
                    label={scaleQuantity(ing.quantity, servingRatio)}
                    variant={ing.isMasalaSachet ? 'primary' : 'neutral'}
                  />
                </View>
              ))}
            </View>
          )}

          {/* TAB 4: NUTRITION */}
          {activeTab === 'nutrition' && (
            <View
              style={[
                styles.cardBlock,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
                Nutrition Facts (Per Serving)
              </Text>

              <View style={styles.macroGrid}>
                <View
                  style={[
                    styles.macroCard,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.macroVal, { color: colors.primary }]}>
                    {kit.nutrition.calories}
                  </Text>
                  <Text style={[styles.macroUnit, { color: colors.textMuted }]}>kcal</Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Calories</Text>
                </View>

                <View
                  style={[
                    styles.macroCard,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.protein}g
                  </Text>
                  <Text style={[styles.macroUnit, { color: colors.textMuted }]}>grams</Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
                </View>

                <View
                  style={[
                    styles.macroCard,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.carbs}g
                  </Text>
                  <Text style={[styles.macroUnit, { color: colors.textMuted }]}>grams</Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                    Carbohydrates
                  </Text>
                </View>

                <View
                  style={[
                    styles.macroCard,
                    { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                  ]}
                >
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.fat}g
                  </Text>
                  <Text style={[styles.macroUnit, { color: colors.textMuted }]}>grams</Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fats</Text>
                </View>
              </View>

              <View style={[styles.dietTagsRow, { marginTop: 16 }]}>
                <Text style={[styles.specLabel, { color: colors.textMuted, marginBottom: 8 }]}>
                  DIETARY TAGS:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {kit.dietaryTags.map((tag) => (
                    <Badge key={tag} label={tag.toUpperCase()} variant="accent" />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 5: REVIEWS */}
          {activeTab === 'reviews' && (
            <View
              style={[
                styles.cardBlock,
                { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
              ]}
            >
              <View style={styles.reviewHeaderRow}>
                <View>
                  <Text style={[styles.blockHeading, { color: colors.textPrimary }]}>
                    Verified Buyer Reviews
                  </Text>
                  <RatingStars rating={kit.rating} reviewCount={kit.reviewCount} size={16} />
                </View>
                <Button
                  title="Write Review"
                  variant="outline"
                  size="sm"
                  onPress={() => onOpenReviewsModal?.(kit)}
                />
              </View>

              {reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[styles.reviewItem, { borderBottomColor: colors.borderLight }]}
                >
                  <View style={styles.reviewerMeta}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarLetter}>{rev.userName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewerName, { color: colors.textPrimary }]}>
                        {rev.userName}
                      </Text>
                      <Text style={[styles.reviewerCity, { color: colors.textMuted }]}>
                        {rev.userCity} • {rev.date}
                      </Text>
                    </View>
                    <RatingStars rating={rev.rating} size={13} />
                  </View>

                  <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                    {rev.comment}
                  </Text>

                  {rev.photoUrl && (
                    <Image source={{ uri: rev.photoUrl }} style={styles.reviewPhoto} />
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Checkout CTA Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.bgSurface,
              borderTopColor: colors.borderLight,
              ...shadows.medium,
            },
          ]}
        >
          <View style={styles.bottomQtyCol}>
            <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>QUANTITY</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={10} />
          </View>

          <View style={styles.bottomTotalCol}>
            <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>TOTAL</Text>
            <Text style={[styles.bottomTotal, { color: colors.primary }]}>
              ₹{effectiveUnitPrice * quantity}
            </Text>
          </View>

          <Button
            title="Add to Cart 🛒"
            style={{ flex: 1.4 }}
            size="lg"
            onPress={handleAddToCart}
          />
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    maxWidth: width * 0.6,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  thumbRow: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  thumbTouch: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbImg: {
    width: 44,
    height: 44,
  },
  contentSection: {
    padding: 18,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  kitName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  hindiSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  regionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specIcon: {
    fontSize: 18,
    marginBottom: 3,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  specDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  customizationBox: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
  },
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  customSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portionPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  portionPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  portionPillDesc: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  spicePill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  spicePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBarSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardBlock: {
    marginHorizontal: 16,
    padding: 18,
    marginBottom: 16,
  },
  blockHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  sachetCallout: {
    backgroundColor: '#FFF8F4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE8DE',
  },
  sachetCalloutHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  sachetBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sachetBulletDot: {
    fontWeight: '900',
    marginRight: 6,
  },
  sachetBulletText: {
    fontSize: 13,
    fontWeight: '600',
  },
  allergenBox: {
    padding: 10,
  },
  allergenTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  allergenText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  stepCard: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  stepInstruction: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    marginBottom: 10,
  },
  tipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  timerButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ingredientName: {
    fontSize: 14,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  macroCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  macroUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  dietTagsRow: {},
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewerCity: {
    fontSize: 11,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomQtyCol: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  bottomTotalCol: {
    alignItems: 'flex-start',
    marginRight: 6,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: '900',
  },
});
