import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Order } from '../../../framework/firebase/ordersService';
import { useCookMode } from '../../../framework/context/CookModeContext';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Badge } from '../../../framework/ui/Badge';
import { Icon } from '../../../framework/ui/Icon';
import { Button } from '../../../framework/ui/Button';

interface MultiKitPickerViewProps {
  order: Order;
  onSelectKit: (kitId: string) => void;
  onClose: () => void;
}

export const MultiKitPickerView: React.FC<MultiKitPickerViewProps> = ({
  order,
  onSelectKit,
  onClose,
}) => {
  const { colors, radii, shadows } = useTheme();
  const { getProgressForOrderKit } = useCookMode();

  return (
    <View
      testID="multi-kit-picker"
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
        >
          <Icon name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Choose Kit to Cook</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroTextWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Your Order Has {order.items.length} Meal Kits
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select which kit recipe you'd like to cook right now. Each kit saves its own step
            progress.
          </Text>
        </View>

        <View style={styles.kitsList}>
          {order.items.map((item, idx) => {
            const kitId = item.kitId || item.id || `kit-${idx}`;
            const progress = getProgressForOrderKit(order.id, kitId);
            const statusText = progress.isCompleted
              ? 'Completed ✓'
              : progress.currentStepIndex > 0
                ? `Step ${progress.currentStepIndex + 1}`
                : 'Not started';

            return (
              <TouchableOpacity
                key={idx}
                testID={`kit-picker-item-${kitId}`}
                style={[
                  styles.kitCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.xl,
                    ...shadows.card,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => onSelectKit(kitId)}
                accessibilityRole="button"
                accessibilityLabel={`Cook ${item.name}, ${statusText}`}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.kitImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryLight }]}>
                    <Icon name="restaurant" size={32} color={colors.primary} />
                  </View>
                )}

                <View style={styles.kitDetails}>
                  <View style={styles.cardTopRow}>
                    <Badge
                      label={statusText}
                      variant={
                        progress.isCompleted
                          ? 'success'
                          : progress.currentStepIndex > 0
                            ? 'warning'
                            : 'neutral'
                      }
                      size="sm"
                    />
                    <Text style={[styles.kitQty, { color: colors.textMuted }]}>
                      Qty: {item.quantity}
                    </Text>
                  </View>

                  <Text style={[styles.kitName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text style={[styles.kitMeta, { color: colors.textSecondary }]}>
                    {item.servings || 2} Servings • {item.spiceLevel || 'Medium'} Spice
                  </Text>

                  <View style={styles.btnRow}>
                    <Button
                      title="Cook This Dish"
                      size="sm"
                      variant="primary"
                      onPress={() => onSelectKit(kitId)}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroTextWrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  kitsList: {
    gap: 14,
  },
  kitCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  kitImage: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitDetails: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kitQty: {
    fontSize: 12,
    fontWeight: '600',
  },
  kitName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  kitMeta: {
    fontSize: 12,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
