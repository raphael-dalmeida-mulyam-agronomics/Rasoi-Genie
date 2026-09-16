import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { getMealKits, MealKit } from '../../framework/services/mealKitsService';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

interface PlanOption {
  id: string;
  name: string;
  mealsPerWeek: number;
  servingsPerMeal: number;
  weeklyPrice: number;
  originalWeeklyPrice: number;
  discountBadge: string;
}

const PLANS: PlanOption[] = [
  {
    id: 'plan-3-meal',
    name: '3 Meals Weekly Box',
    mealsPerWeek: 3,
    servingsPerMeal: 2,
    weeklyPrice: 799,
    originalWeeklyPrice: 999,
    discountBadge: '20% OFF',
  },
  {
    id: 'plan-5-meal',
    name: '5 Meals Weekday Plan',
    mealsPerWeek: 5,
    servingsPerMeal: 2,
    weeklyPrice: 1249,
    originalWeeklyPrice: 1599,
    discountBadge: 'MOST POPULAR • 25% OFF',
  },
  {
    id: 'plan-family',
    name: 'Family Feast Box',
    mealsPerWeek: 4,
    servingsPerMeal: 4,
    weeklyPrice: 1899,
    originalWeeklyPrice: 2499,
    discountBadge: 'BEST VALUE • 30% OFF',
  },
];

export const SubscriptionPlanView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors, radii, shadows } = useTheme();
  const allKits = getMealKits();

  const [selectedPlanId, setSelectedPlanId] = useState('plan-5-meal');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [chosenMealIds, setChosenMealIds] = useState<string[]>(['kit-101', 'kit-102', 'kit-103']);

  const activePlan: PlanOption = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1]!;

  const toggleChooseMeal = (kitId: string) => {
    if (chosenMealIds.includes(kitId)) {
      setChosenMealIds(chosenMealIds.filter((id) => id !== kitId));
    } else {
      if (chosenMealIds.length >= activePlan.mealsPerWeek) {
        Alert.alert(
          'Weekly Limit Reached',
          `Your selected plan includes ${activePlan.mealsPerWeek} meals per week. Unselect one to swap.`,
        );
        return;
      }
      setChosenMealIds([...chosenMealIds, kitId]);
    }
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    Alert.alert(
      'Subscribed to RasoiGenie Plan! 🎉',
      `Your recurring ${activePlan.name} is active. Recurring delivery every Monday morning!`,
    );
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    Alert.alert(
      isPaused ? 'Subscription Resumed' : 'Subscription Paused',
      isPaused
        ? 'Your weekly boxes will resume next Monday.'
        : 'Deliveries paused. You will not be billed while paused.',
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Recurring Meal Plans (Phase 2)
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.primaryDark }]}>
            Never Worry About "What to Cook Tonight"
          </Text>
          <Text style={[styles.bannerSub, { color: colors.primaryDark }]}>
            Pick fresh chef kits every week. Enjoy free delivery, exclusive member discounts, and
            pause or cancel anytime.
          </Text>
        </View>

        {/* Current Subscription Status */}
        {isSubscribed && (
          <View
            style={[
              styles.activeSubCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: isPaused ? colors.warning : colors.success,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.subStatusRow}>
              <Text style={[styles.subPlanName, { color: colors.textPrimary }]}>
                {activePlan.name}
              </Text>
              <Badge
                label={isPaused ? 'PAUSED' : 'ACTIVE RECURRING'}
                variant={isPaused ? 'warning' : 'success'}
              />
            </View>
            <Text style={[styles.nextDeliveryText, { color: colors.textSecondary }]}>
              {isPaused
                ? 'Subscription currently on hold.'
                : 'Next Box: Monday Morning 9:00 AM • ₹' + activePlan.weeklyPrice + '/week'}
            </Text>

            <View style={styles.subActionsRow}>
              <Button
                title={isPaused ? 'Resume Plan ▶️' : 'Pause Next Week ⏸️'}
                variant="outline"
                size="sm"
                onPress={handleTogglePause}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Cancel Plan"
                variant="danger"
                size="sm"
                onPress={() => {
                  setIsSubscribed(false);
                  Alert.alert('Subscription Cancelled', 'You can re-join anytime.');
                }}
              />
            </View>
          </View>
        )}

        {/* SECTION 1: Select Plan */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          1. Choose Your Weekly Plan
        </Text>

        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                  borderWidth: isSelected ? 2 : 1,
                  ...shadows.card,
                },
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
              activeOpacity={0.88}
            >
              <View style={styles.planTopRow}>
                <View>
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{plan.name}</Text>
                  <Text style={[styles.planSub, { color: colors.textSecondary }]}>
                    {plan.mealsPerWeek} Meals / Week • {plan.servingsPerMeal} Servings each
                  </Text>
                </View>
                <Badge label={plan.discountBadge} variant="primary" size="sm" />
              </View>

              <View style={styles.planPricingRow}>
                <Text style={[styles.weeklyPrice, { color: colors.primary }]}>
                  ₹{plan.weeklyPrice}
                  <Text style={{ fontSize: 13, color: colors.textMuted }}> / week</Text>
                </Text>
                <Text style={[styles.origWeeklyPrice, { color: colors.textMuted }]}>
                  ₹{plan.originalWeeklyPrice}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* SECTION 2: Choose Upcoming Meals */}
        <View style={styles.mealPickerSection}>
          <View style={styles.mealPickerHeader}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              2. Select Meals for Upcoming Week
            </Text>
            <Text style={[styles.counterText, { color: colors.primary }]}>
              {chosenMealIds.length} of {activePlan.mealsPerWeek} chosen
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap to select or swap meals for your Monday delivery box.
          </Text>

          {allKits.map((kit) => {
            const isChosen = chosenMealIds.includes(kit.id);
            return (
              <TouchableOpacity
                key={kit.id}
                style={[
                  styles.mealChoiceRow,
                  {
                    backgroundColor: isChosen ? colors.primaryLight + '35' : colors.bgSurface,
                    borderRadius: radii.lg,
                    borderColor: isChosen ? colors.primary : colors.borderLight,
                    borderWidth: isChosen ? 2 : 1,
                  },
                ]}
                onPress={() => toggleChooseMeal(kit.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mealChoiceName, { color: colors.textPrimary }]}>
                    {kit.name}
                  </Text>
                  <Text style={[styles.mealChoiceCuisine, { color: colors.textSecondary }]}>
                    {kit.cuisine} • {kit.spiceLevel} Spice
                  </Text>
                </View>
                <Badge
                  label={isChosen ? 'SELECTED ✓' : '+ ADD TO PLAN'}
                  variant={isChosen ? 'primary' : 'neutral'}
                  size="sm"
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {!isSubscribed && (
          <Button
            title={`Start ${activePlan.name} (₹${activePlan.weeklyPrice}/wk) 🚀`}
            size="lg"
            style={{ marginTop: 20 }}
            onPress={handleSubscribe}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  banner: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  activeSubCard: {
    padding: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  subStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subPlanName: {
    fontSize: 16,
    fontWeight: '800',
  },
  nextDeliveryText: {
    fontSize: 13,
    marginBottom: 12,
  },
  subActionsRow: {
    flexDirection: 'row',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    marginBottom: 12,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  planSub: {
    fontSize: 12,
    marginTop: 2,
  },
  planPricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 8,
  },
  weeklyPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  origWeeklyPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  mealPickerSection: {
    marginTop: 16,
  },
  mealPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mealChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  mealChoiceName: {
    fontSize: 14,
    fontWeight: '700',
  },
  mealChoiceCuisine: {
    fontSize: 12,
    marginTop: 2,
  },
});
