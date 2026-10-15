import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { MealKit } from '../../framework/services/mealKitsService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';

export interface CartDestinationModalProps {
  visible: boolean;
  kit: MealKit | null;
  quantity?: number;
  servings?: number;
  spiceLevel?: string;
  onClose: () => void;
  onSelectDestination: (destination: 'personal' | 'family') => void;
}

export const CartDestinationModal: React.FC<CartDestinationModalProps> = ({
  visible,
  kit,
  quantity = 1,
  servings,
  spiceLevel,
  onClose,
  onSelectDestination,
}) => {
  const { colors, radii, shadows } = useTheme();
  const { isCartLocked, isOwner } = useFamily();

  if (!kit) return null;

  const effectiveServings = servings || kit.servings || 2;
  const effectiveSpice = spiceLevel || kit.spiceLevel || 'Medium';
  const unitPrice = Math.round((kit.price / (kit.servings || 2)) * effectiveServings);
  const totalPrice = unitPrice * quantity;

  const isFamilyLocked = isCartLocked && !isOwner;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add to Basket"
      subtitle="Choose which basket you want to add this dish to"
      testID="cart-destination-modal"
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Kit Summary Card */}
        <View
          style={[
            styles.kitSummary,
            {
              backgroundColor: colors.bgSubtle,
              borderRadius: radii.lg,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {kit.heroImage ? (
            <Image
              source={{ uri: kit.heroImage }}
              style={[styles.kitImg, { borderRadius: radii.md }]}
            />
          ) : (
            <View
              style={[
                styles.kitImgFallback,
                { backgroundColor: colors.primaryLight, borderRadius: radii.md },
              ]}
            >
              <Icon name="restaurant" size={20} color={colors.primary} />
            </View>
          )}

          <View style={styles.kitInfoCol}>
            <Text style={[styles.kitName, { color: colors.textPrimary }]} numberOfLines={1}>
              {kit.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {effectiveServings} Servings • {effectiveSpice}
              </Text>
              <Text style={[styles.priceText, { color: colors.primary }]}>
                ₹{totalPrice} {quantity > 1 ? `(Qty: ${quantity})` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Destination Options */}
        <View style={styles.optionsList}>
          {/* Option 1: Personal Basket */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
            ]}
            onPress={() => onSelectDestination('personal')}
            activeOpacity={0.82}
            testID="destination-personal-basket-btn"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Icon name="person" size={24} color={colors.primary} />
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionTitleRow}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Personal Basket
                </Text>
                <Badge label="Private" variant="neutral" size="sm" />
              </View>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Just for you. You checkout, customize and pay on your own.
              </Text>
            </View>

            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Option 2: Family Basket */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: isFamilyLocked ? colors.borderLight : colors.borderLight,
                opacity: isFamilyLocked ? 0.6 : 1,
                ...shadows.card,
              },
            ]}
            onPress={() => {
              if (!isFamilyLocked) {
                onSelectDestination('family');
              }
            }}
            disabled={isFamilyLocked}
            activeOpacity={0.82}
            testID="destination-family-basket-btn"
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isFamilyLocked ? colors.bgSubtle : colors.primaryLight },
              ]}
            >
              <Icon
                name="people"
                size={24}
                color={isFamilyLocked ? colors.textMuted : colors.primary}
              />
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionTitleRow}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Family Basket
                </Text>
                <Badge
                  label={isFamilyLocked ? 'Locked' : 'Shared Basket'}
                  variant={isFamilyLocked ? 'danger' : 'accent'}
                  size="sm"
                />
              </View>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                {isFamilyLocked
                  ? 'Basket is locked by the owner. Cannot add new dishes right now.'
                  : 'Pooled with all family members for combined delivery and checkout.'}
              </Text>
            </View>

            {!isFamilyLocked && <Icon name="chevron-forward" size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  kitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  kitImg: {
    width: 52,
    height: 52,
  },
  kitImgFallback: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kitInfoCol: {
    flex: 1,
  },
  kitName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionDetails: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
