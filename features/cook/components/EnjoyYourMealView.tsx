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
}

export const EnjoyYourMealView: React.FC<EnjoyYourMealViewProps> = ({ order, kit, onDone }) => {
  const { colors, radii, isDark } = useTheme();
  const { reorderItems } = useCart();
  const { markKitCompleted } = useCookMode();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

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
    await markKitCompleted(order.id, kit.id);
    onDone();
  };

  const isDelivered = order.status === 'Delivered';

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
          <View style={[styles.badgeCircle, { backgroundColor: '#10B981' }]}>
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
          <View style={[styles.dishImageWrap, { borderRadius: radii.xl }]}>
            <Image source={{ uri: kit.heroImage }} style={styles.dishImage} resizeMode="cover" />
          </View>
        ) : null}

        {/* Live Delivery Note if not yet delivered */}
        {!isDelivered && (
          <View
            style={[
              styles.statusNotice,
              {
                backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
                borderColor: colors.primary,
                borderRadius: radii.md,
              },
            ]}
          >
            <Icon name="delivery" size={16} color={colors.primary} />
            <Text style={[styles.statusNoticeText, { color: colors.textPrimary }]}>
              Order is currently {order.status}. The "Cook now" mini-bar will stay docked above your
              tabs until your kit is marked delivered.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            testID="rate-dish-btn"
            title="Rate This Recipe"
            icon={<Icon name="star" size={16} color="#FFFFFF" />}
            variant="primary"
            size="lg"
            onPress={() => setReviewModalVisible(true)}
          />

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
            title="Done / Back to Explore"
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
        onReviewSubmitted={() => {
          setReviewModalVisible(false);
          Alert.alert('Thank You!', 'Your review has been shared with our culinary team.');
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
});
