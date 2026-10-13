import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { FamilyCartItem, extractFirstName } from '../../framework/services/familyService';
import { MealKit, getMealKitById } from '../../framework/services/mealKitsService';
import { Avatar } from '../../framework/ui/Avatar';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

export interface ApprovalRowProps {
  item: FamilyCartItem;
  addedByName: string;
  onApprove: () => void;
  onReject: () => void;
  actionLoading?: boolean;
  testID?: string;
}

export const ApprovalRow: React.FC<ApprovalRowProps> = ({
  item,
  addedByName,
  onApprove,
  onReject,
  actionLoading = false,
  testID,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();

  const kit: MealKit | undefined = getMealKitById(item.kit_id);
  const kitName = kit?.name || 'Gourmet Meal Kit';
  const kitImage = kit?.heroImage;
  const totalPrice = item.unit_price * item.quantity;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: '#F59E0B',
          borderRadius: radii.xl,
          ...shadows.card,
        },
      ]}
    >
      {/* Dependent Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <Avatar name={addedByName} id={item.added_by} size="xs" />
        <Text style={[styles.dependentName, { color: colors.textPrimary }]}>
          Requested by {extractFirstName(addedByName)}
        </Text>
        <Badge label="Needs Approval" variant="warning" size="sm" />
      </View>

      {/* Item Body */}
      <View style={styles.body}>
        {kitImage ? (
          <Image
            source={{ uri: kitImage }}
            style={[styles.dishImage, { borderRadius: radii.md }]}
          />
        ) : (
          <View
            style={[
              styles.dishFallback,
              { backgroundColor: colors.primaryLight, borderRadius: radii.md },
            ]}
          >
            <Icon name="restaurant" size={20} color={colors.primary} />
          </View>
        )}

        <View style={styles.detailsCol}>
          <Text style={[styles.kitName, { color: colors.textPrimary }]} numberOfLines={2}>
            {kitName}
          </Text>

          <View style={styles.chipsRow}>
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>
              Qty: {item.quantity} • {item.servings} Servings
              {item.spice_level ? ` • ${item.spice_level}` : ''}
            </Text>
          </View>

          <Text style={[styles.priceText, { color: colors.primary }]}>₹{totalPrice}</Text>
        </View>
      </View>

      {/* Approve & Reject Actions */}
      <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
        <Button
          title="Reject"
          variant="outline"
          size="sm"
          onPress={onReject}
          disabled={actionLoading}
          style={{ flex: 1 }}
          testID={`reject-approval-${item.id}`}
        />

        <Button
          title="Approve"
          variant="primary"
          size="sm"
          onPress={onApprove}
          disabled={actionLoading}
          loading={actionLoading}
          style={{ flex: 1.5 }}
          testID={`approve-approval-${item.id}`}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  dependentName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dishImage: {
    width: 60,
    height: 60,
    resizeMode: 'cover',
  },
  dishFallback: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  kitName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 12,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
