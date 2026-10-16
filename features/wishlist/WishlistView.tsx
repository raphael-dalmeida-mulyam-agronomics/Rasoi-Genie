import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useWishlist } from '../../framework/context/WishlistContext';
import { useCart } from '../../framework/context/CartContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { getMealKits, MealKit } from '../../framework/services/mealKitsService';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { EmptyState } from '../../framework/ui/EmptyState';
import { useToast } from '../../framework/ui/Toast';
import { MealDetailModal } from '../meal-detail/MealDetailModal';

export const WishlistView: React.FC = () => {
  const { wishlistIds, removeFromWishlist, addToWishlist } = useWishlist();
  const { addItem, removeItem } = useCart();
  const { colors, radii, shadows } = useTheme();
  const { showToast } = useToast();

  const [selectedKit, setSelectedKit] = useState<MealKit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const allKits = getMealKits();
  const savedKits = allKits.filter((k) => wishlistIds.includes(k.id));

  const handleMoveToCart = (kit: MealKit) => {
    addItem(kit, 1);
    removeFromWishlist(kit.id);
    showToast({
      message: `${kit.name} moved to basket!`,
      type: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        removeItem(kit.id);
        addToWishlist(kit.id);
      },
      secondaryActionLabel: 'View Basket',
      onSecondaryAction: () => {
        router.push('/(tabs)/cart' as any);
      },
    });
  };

  if (savedKits.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]}>
        <EmptyState
          icon="heart-outline"
          title="Your Wishlist is Empty"
          description="Save delicious regional meal kits to plan your home-cooked dinners for the week."
          actionTitle="Browse Meal Kits"
          onAction={() => router.push('/' as any)}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
      <Text style={[styles.heading, { color: colors.textMuted }]}>
        {savedKits.length} Saved Gourmet Kits
      </Text>

      {savedKits.map((kit) => (
        <View
          key={kit.id}
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardTouch}
            onPress={() => {
              setSelectedKit(kit);
              setDetailModalVisible(true);
            }}
          >
            <Image source={{ uri: kit.heroImage }} style={styles.cardImg} />
            <View style={styles.cardInfo}>
              <View style={styles.topRow}>
                {(() => {
                  const badge = getDietBadgeInfo(kit.diet);
                  return <Badge label={badge.label} variant={badge.variant} size="sm" />;
                })()}
                <TouchableOpacity
                  onPress={() => removeFromWishlist(kit.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="trash" size={13} color={colors.textMuted} />
                  <Text style={[styles.removeBtn, { color: colors.textMuted }]}>Remove</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.kitName, { color: colors.textPrimary }]} numberOfLines={1}>
                {kit.name}
              </Text>
              <Text style={[styles.kitTagline, { color: colors.textSecondary }]} numberOfLines={1}>
                {kit.tagline}
              </Text>

              <View style={styles.bottomRow}>
                <Text style={[styles.kitPrice, { color: colors.primary }]}>₹{kit.price}</Text>
                <Button
                  title="Move to Cart"
                  size="sm"
                  onPress={() => handleMoveToCart(kit)}
                  style={{ paddingHorizontal: 12 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ))}

      <MealDetailModal
        kit={selectedKit}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollBody: {
    padding: 16,
    paddingBottom: 110,
  },
  heading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTouch: {
    flexDirection: 'row',
    padding: 12,
  },
  cardImg: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeBtn: {
    fontSize: 12,
    fontWeight: '600',
  },
  kitName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  kitTagline: {
    fontSize: 12,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kitPrice: {
    fontSize: 17,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
