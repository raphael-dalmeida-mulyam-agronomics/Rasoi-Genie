import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { Order } from '../firebase/ordersService';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { Button } from './Button';

interface ActiveOrdersSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  activeOrders: Order[];
}

export const ActiveOrdersSelectorModal: React.FC<ActiveOrdersSelectorModalProps> = ({
  visible,
  onClose,
  activeOrders,
}) => {
  const { colors, radii, shadows } = useTheme();

  const handleSelectOrder = (orderId: string) => {
    onClose();
    router.push({
      pathname: '/cook/[orderId]' as any,
      params: { orderId },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  ...shadows.card,
                },
              ]}
            >
              <View style={styles.dragHandle} />

              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <Icon name="restaurant" size={20} color={colors.primary} />
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Active Meal Kit Recipes
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.bgSubtle }]}
                  accessibilityLabel="Close active orders picker"
                >
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select an ongoing order to open its interactive cooking guide:
              </Text>

              <ScrollView
                style={styles.ordersList}
                contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {activeOrders.map((order) => {
                  const firstKit = order.items?.[0];
                  const kitCount = order.items?.length || 0;
                  const kitNames = order.items.map((i) => i.name).join(', ');

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={[
                        styles.orderCard,
                        {
                          backgroundColor: colors.bgPrimary,
                          borderColor: colors.borderLight,
                          borderRadius: radii.lg,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectOrder(order.id)}
                    >
                      <View style={styles.orderCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.orderNumber, { color: colors.primary }]}>
                            Order #{order.id.slice(-6)}
                          </Text>
                          <Text
                            style={[styles.kitNames, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {firstKit?.name || 'Meal Kit'}
                            {kitCount > 1 ? ` (+${kitCount - 1} more)` : ''}
                          </Text>
                        </View>
                        <Badge
                          label={order.status}
                          variant={
                            order.status === 'Confirmed'
                              ? 'success'
                              : order.status === 'Preparing'
                                ? 'warning'
                                : 'accent'
                          }
                          size="sm"
                        />
                      </View>

                      <View style={styles.orderCardBottom}>
                        <Text style={[styles.slotText, { color: colors.textMuted }]}>
                          Arrival: {order.deliverySlot || 'Today'}
                        </Text>
                        <Button
                          title="Cook Recipe"
                          size="sm"
                          variant="primary"
                          onPress={() => handleSelectOrder(order.id)}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  ordersList: {
    maxHeight: 380,
  },
  orderCard: {
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kitNames: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  orderCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotText: {
    fontSize: 12,
  },
});
