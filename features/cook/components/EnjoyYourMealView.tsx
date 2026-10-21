import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { MealKit } from '../../../framework/services/mealKitsService';
import { Order } from '../../../framework/firebase/ordersService';
import { useCart } from '../../../framework/context/CartContext';
import { useCookMode } from '../../../framework/context/CookModeContext';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { Button } from '../../../framework/ui/Button';
import { ReviewModal } from '../../reviews/ReviewModal';

interface EnjoyYourMealViewProps {
  order: Order;
  kit: MealKit;
  onDone: () => void;
  onBackToRecipe?: () => void;
  onPrevStep?: () => void;
}

export const EnjoyYourMealView: React.FC<EnjoyYourMealViewProps> = ({
  order,
  kit,
  onDone,
  onBackToRecipe,
  onPrevStep,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { reorderItems } = useCart();
  const { markKitCompleted, dismissCookMode, isKitReviewed, markKitReviewed } = useCookMode();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const isDelivered = order.status === 'Delivered';
  const isReviewed = isKitReviewed(order.id, kit.id);

  // Mark cooking steps completed in progress state (do NOT auto-dismiss until delivered + reviewed)
  React.useEffect(() => {
    markKitCompleted(order.id, kit.id);
  }, [order.id, kit.id, markKitCompleted]);

  const handleReorder = () => {
    reorderItems(order.items);
    Alert.alert('Added to Cart', `${kit.name} meal kit has been added to your basket!`, [
      {
        text: 'View Basket',
        onPress: () => router.push('/(tabs)/cart' as any),
      },
      { text: 'Later' },
    ]);
  };

  const handleFinish = async () => {
    if (!isReviewed) {
      Alert.alert(
        'Please Rate the Meal Kit',
        'You have to review the meal kit to close the instructions. Would you like to rate it now?',
        [
          {
            text: 'Rate Meal Kit',
            onPress: () => setReviewModalVisible(true),
          },
          {
            text: 'Exit for Now',
            style: 'cancel',
            onPress: () => onDone(),
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
            onPress: () => onDone(),
          },
        ],
      );
      return;
    }

    // Both delivered AND reviewed: instructions finally disappear!
    await markKitCompleted(order.id, kit.id);
    await dismissCookMode(order.id);
    Alert.alert(
      'Cooking Guide Complete',
      'Your order has been delivered and reviewed. Instructions are now closed. Bon Appétit!',
      [{ text: 'Close', onPress: () => onDone() }],
    );
  };

  return (
    <>
      <ScrollView
        testID="enjoy-your-meal-screen"
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration Hero */}
        <View style={styles.celebrationHero}>
          <View style={[styles.badgeCircle, { backgroundColor: '#10B981', ...shadows.soft }]}>
            <Icon name="checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Enjoy Your Meal!</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            You’ve mastered the chef steps for {kit.name}. Serve hot and relish authentic home
            gourmet flavors!
          </Text>
        </View>

        {/* Hero Image */}
        {kit.heroImage ? (
          <View
            style={[
              styles.dishImageWrap,
              {
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                borderWidth: 1,
                ...shadows.card,
              },
            ]}
          >
            <Image source={{ uri: kit.heroImage }} style={styles.dishImage} resizeMode="cover" />
          </View>
        ) : null}

        {/* Review Required Notice Card */}
        <View
          testID="meal-kit-review-notice"
          style={[
            styles.reviewRequiredCard,
            {
              backgroundColor: isReviewed
                ? isDark
                  ? '#064E3B'
                  : '#ECFDF5'
                : isDark
                  ? '#451A03'
                  : '#FFFBEB',
              borderColor: isReviewed ? '#10B981' : '#F59E0B',
              borderRadius: radii.xl,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.reviewCardTopRow}>
            <View
              style={[
                styles.reviewIconCircle,
                { backgroundColor: isReviewed ? '#10B981' : '#F59E0B' },
              ]}
            >
              <Icon name={isReviewed ? 'checkmark' : 'star'} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reviewCardTitle, { color: colors.textPrimary }]}>
                {isReviewed ? 'Meal Kit Reviewed' : 'Please Rate The Meal Kit'}
              </Text>
              <Text style={[styles.reviewCardSubtitle, { color: colors.textSecondary }]}>
                {!isReviewed
                  ? 'Please review the meal kit to close the instructions. Instructions will finally disappear once your order has been delivered and reviewed.'
                  : !isDelivered
                    ? 'Review submitted! Cooking instructions will remain available until your order is marked as delivered by the admin.'
                    : 'Order delivered and meal kit reviewed! Instructions can now be closed.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Live Delivery Note if not yet delivered */}
        {!isDelivered && (
          <View
            style={[
              styles.statusNotice,
              {
                backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
                borderColor: colors.primary,
                borderRadius: radii.lg,
                ...shadows.soft,
              },
            ]}
          >
            <Icon name="delivery" size={16} color={colors.primary} />
            <Text style={[styles.statusNoticeText, { color: colors.textPrimary }]}>
              Order status is currently {order.status}. Instructions will only finally disappear
              after the order has been delivered and the meal kit has been reviewed.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {!isReviewed ? (
            <Button
              testID="rate-dish-btn"
              title="Please Rate the Meal Kit to Close"
              icon={<Icon name="star" size={16} color="#FFFFFF" />}
              variant="primary"
              size="lg"
              onPress={() => setReviewModalVisible(true)}
            />
          ) : isDelivered ? (
            <Button
              testID="finish-and-close-btn"
              title="Finish & Close Instructions"
              icon={<Icon name="checkmark-circle" size={16} color="#FFFFFF" />}
              variant="primary"
              size="lg"
              style={{ backgroundColor: '#10B981' }}
              onPress={handleFinish}
            />
          ) : (
            <Button
              testID="rate-dish-btn"
              title="Edit Meal Kit Review"
              icon={<Icon name="star" size={16} color="#FFFFFF" />}
              variant="secondary"
              size="md"
              onPress={() => setReviewModalVisible(true)}
            />
          )}

          {(onBackToRecipe || onPrevStep) && (
            <Button
              testID="back-to-recipe-btn"
              title="Back to Recipe"
              icon={<Icon name="arrow-back" size={16} color={colors.textPrimary} />}
              variant="outline"
              size="md"
              onPress={onBackToRecipe || onPrevStep}
              style={{ marginTop: 8 }}
              accessibilityLabel="Go back to recipe steps"
            />
          )}

          <Button
            testID="reorder-dish-btn"
            title="Reorder This Meal Kit"
            icon={<Icon name="refresh" size={16} color={colors.textPrimary} />}
            variant="outline"
            size="md"
            onPress={handleReorder}
            style={{ marginTop: 8 }}
          />

          <Button
            testID="done-cooking-btn"
            title={isDelivered && isReviewed ? 'Done / Close' : 'Done / Back to Home'}
            variant="secondary"
            size="md"
            onPress={handleFinish}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>

      <ReviewModal
        kit={kit}
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onReviewSubmitted={async () => {
          setReviewModalVisible(false);
          await markKitReviewed(order.id, kit.id);
          await markKitCompleted(order.id, kit.id);
          if (order.status === 'Delivered') {
            await dismissCookMode(order.id);
            Alert.alert(
              'Cooking Guide Completed',
              'Thank you for reviewing! Your order has been delivered and reviewed. Instructions are now closed.',
              [{ text: 'Close', onPress: () => onDone() }],
            );
          } else {
            Alert.alert(
              'Review Submitted!',
              'Thank you for rating! Cooking instructions will remain available until your order is marked as delivered.',
            );
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  celebrationHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  dishImageWrap: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
    marginBottom: 20,
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
    width: '100%',
  },
  statusNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 4,
  },
  reviewRequiredCard: {
    width: '100%',
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  reviewCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  reviewCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
