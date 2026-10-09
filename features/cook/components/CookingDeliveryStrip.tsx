import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../../../framework/firebase/ordersService';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Badge } from '../../../framework/ui/Badge';
import { Icon } from '../../../framework/ui/Icon';
import { LiveTrackingModal } from '../../orders/LiveTrackingModal';

interface CookingDeliveryStripProps {
  order: Order;
}

export const CookingDeliveryStrip: React.FC<CookingDeliveryStripProps> = ({ order }) => {
  const { colors, radii, isDark } = useTheme();
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  // Strip disappears when the kit is delivered
  if (order.status === 'Delivered') {
    return null;
  }

  const slot = order.deliverySlot || 'today within scheduled slot';

  return (
    <>
      <View
        testID="cooking-delivery-strip"
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
            borderColor: colors.primary,
            borderRadius: radii.md,
          },
        ]}
      >
        <View style={styles.leftCol}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="delivery" size={16} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <View style={styles.statusRow}>
              <Badge
                label={order.status}
                variant={order.status === 'Preparing' ? 'warning' : 'accent'}
                size="sm"
              />
              <Text style={[styles.heading, { color: colors.textPrimary }]}>
                Kit arrives {slot}
              </Text>
            </View>
            <Text style={[styles.subtext, { color: colors.textSecondary }]}>
              You can read ahead and cook once it's here.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="track-delivery-btn"
          style={[styles.trackBtn, { borderColor: colors.primary }]}
          onPress={() => setTrackingModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Track kit delivery status"
        >
          <Text style={[styles.trackBtnText, { color: colors.primary }]}>Track delivery</Text>
          <Icon name="chevron-forward" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <LiveTrackingModal
        order={order}
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    gap: 8,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 11,
    lineHeight: 14,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 2,
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
