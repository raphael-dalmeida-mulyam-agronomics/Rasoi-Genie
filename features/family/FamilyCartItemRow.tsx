import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { FamilyCartItem } from '../../framework/services/familyService';
import { MealKit, getMealKitById } from '../../framework/services/mealKitsService';
import { QuantityStepper } from '../../framework/ui/QuantityStepper';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

export interface FamilyCartItemRowProps {
  item: FamilyCartItem;
  canEdit?: boolean;
  canRemove?: boolean;
  canApprove?: boolean;
  canMoveToPersonal?: boolean;
  isCityUnavailable?: boolean;
  onQuantityChange?: (newQuantity: number) => void;
  onRemove?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onMoveToPersonal?: () => void;
  testID?: string;
}

export const FamilyCartItemRow: React.FC<FamilyCartItemRowProps> = ({
  item,
  canEdit = false,
  canRemove = false,
  canApprove = false,
  canMoveToPersonal = false,
  isCityUnavailable = false,
  onQuantityChange,
  onRemove,
  onApprove,
  onReject,
  onMoveToPersonal,
  testID,
}) => {
  const { colors, radii, isDark } = useTheme();

  const kit: MealKit | undefined = getMealKitById(item.kit_id);
  const kitName = kit?.name || 'Gourmet Meal Kit';
  const kitImage = kit?.heroImage;
  const isRejected = item.status === 'rejected';
  const isPending = item.status === 'pending_approval';

  const totalPrice = item.unit_price * item.quantity;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.bgSurface,
          borderColor: isCityUnavailable ? '#EF4444' : isPending ? '#F59E0B' : colors.borderLight,
          borderRadius: radii.xl,
          opacity: isRejected ? 0.5 : 1,
        },
      ]}
    >
      {/* Top Details Row */}
      <View style={styles.topRow}>
        {/* Kit Image */}
        {kitImage ? (
          <Image
            source={{ uri: kitImage }}
            style={[styles.dishImage, { borderRadius: radii.md }]}
          />
        ) : (
          <View
            style={[
              styles.dishImageFallback,
              { backgroundColor: colors.primaryLight, borderRadius: radii.md },
            ]}
          >
            <Icon name="restaurant" size={20} color={colors.primary} />
          </View>
        )}

        <View style={styles.detailsCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.kitName, { color: colors.textPrimary }]} numberOfLines={2}>
              {kitName}
            </Text>

            {canRemove && onRemove && (
              <TouchableOpacity
                onPress={onRemove}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${kitName} from basket`}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                testID={`remove-family-item-${item.id}`}
              >
                <Icon name="trash" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Chips Row: Servings, Spice Level, Status */}
          <View style={styles.chipsRow}>
            <View
              style={[styles.chip, { backgroundColor: colors.bgSubtle, borderRadius: radii.sm }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {item.servings} Servings
              </Text>
            </View>

            {item.spice_level ? (
              <View
                style={[styles.chip, { backgroundColor: colors.bgSubtle, borderRadius: radii.sm }]}
              >
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                  {item.spice_level}
                </Text>
              </View>
            ) : null}

            {isPending ? (
              <Badge label="Needs Approval" variant="warning" size="sm" />
            ) : isRejected ? (
              <Badge label="Not Included" variant="accent" size="sm" />
            ) : (
              <Badge label="Approved" variant="success" size="sm" />
            )}
          </View>

          {/* City Unavailable Warning */}
          {isCityUnavailable && (
            <View style={styles.warningRow}>
              <Icon name="warning" size={12} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.warningText}>
                Unavailable in selected city • Remove to proceed
              </Text>
            </View>
          )}

          {/* Price and Quantity Stepper */}
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: colors.primary }]}>₹{totalPrice}</Text>

            {canEdit && onQuantityChange ? (
              <QuantityStepper
                value={item.quantity}
                onChange={(q) => onQuantityChange(q)}
                min={1}
                max={10}
              />
            ) : (
              <Text style={[styles.qtyStatic, { color: colors.textSecondary }]}>
                Qty: {item.quantity}
              </Text>
            )}
          </View>

          {/* Move to Personal Basket Action */}
          {canMoveToPersonal && onMoveToPersonal && (
            <View style={[styles.moveRow, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={[
                  styles.moveBasketBtn,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary + '30',
                    borderRadius: radii.pill,
                  },
                ]}
                onPress={onMoveToPersonal}
                activeOpacity={0.7}
                testID={`move-to-personal-cart-${item.id}`}
              >
                <Icon name="swap-horizontal" size={13} color={colors.primary} />
                <Text style={[styles.moveBasketBtnText, { color: colors.primary }]}>
                  Move to Personal Basket
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Owner Approval Actions for Pending Items */}
      {isPending && canApprove && onApprove && onReject && (
        <View style={[styles.approvalActionsRow, { borderTopColor: colors.borderLight }]}>
          <Button
            title="Reject"
            variant="outline"
            size="sm"
            onPress={onReject}
            style={{ flex: 1 }}
            testID={`reject-item-${item.id}`}
          />
          <Button
            title="Approve"
            variant="primary"
            size="sm"
            onPress={onApprove}
            style={{ flex: 1.5 }}
            testID={`approve-item-${item.id}`}
          />
        </View>
      )}

      {/* Rejection Note if Rejected */}
      {isRejected && item.rejection_reason ? (
        <View style={styles.rejectionReasonBox}>
          <Text style={styles.rejectionReasonText}>Note: {item.rejection_reason}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dishImage: {
    width: 72,
    height: 72,
    resizeMode: 'cover',
  },
  dishImageFallback: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  kitName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  removeBtn: {
    padding: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  warningText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
  qtyStatic: {
    fontSize: 13,
    fontWeight: '600',
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  rejectionReasonBox: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
  },
  rejectionReasonText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '500',
  },
  moveRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  moveBasketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  moveBasketBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
