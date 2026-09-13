import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { createOrder, OrderItem } from '../../framework/firebase/ordersService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Modal } from '../../framework/ui/Modal';
import { Input } from '../../framework/ui/Input';

interface RecipeKit {
  id: string;
  name: string;
  cuisine: string;
  prepTime: string;
  servings: number;
  price: number;
  description: string;
  masalaSachets: string[];
}

const RECIPE_KITS: RecipeKit[] = [
  {
    id: 'kit-101',
    name: 'Paneer Butter Masala Kit',
    cuisine: 'North Indian',
    prepTime: '20 mins',
    servings: 2,
    price: 299,
    description: 'Pre-portioned fresh paneer cubes with 3 pre-mixed authentic masala sachets.',
    masalaSachets: [
      'Whole Spices (Khadamasala)',
      'Shahi Gravy Premix',
      'Kasoori Methi & Garam Masala',
    ],
  },
  {
    id: 'kit-102',
    name: 'Hyderabadi Chicken Biryani Kit',
    cuisine: 'Hyderabadi',
    prepTime: '35 mins',
    servings: 3,
    price: 399,
    description: 'Pre-marinated chicken, aged basmati rice & signature 4-sachet dum spice blend.',
    masalaSachets: [
      'Biryani Marinade Mix',
      'Rice Spice Pot',
      'Brown Onion Paste',
      'Dum Spice Sachets',
    ],
  },
  {
    id: 'kit-103',
    name: 'Slow-Brew Dal Makhani Kit',
    cuisine: 'Punjabi',
    prepTime: '25 mins',
    servings: 2,
    price: 249,
    description: 'Pre-soaked black lentils with rich butter gravy mix and slow-roast spice blend.',
    masalaSachets: ['Rajma & Dal Slow Brew Mix', 'Butter Gravy Essence', 'Smoked Chilli Powder'],
  },
  {
    id: 'kit-104',
    name: 'Kadhai Veg Special Kit',
    cuisine: 'North Indian',
    prepTime: '15 mins',
    servings: 2,
    price: 229,
    description: 'Fresh chopped bell peppers, veggies & coarse-ground kadhai spice sachets.',
    masalaSachets: ['Kadhai Roast Spice Blend', 'Tangy Tomato Powder', 'Fresh Herb Pack'],
  },
];

export const HomeScreenView: React.FC = () => {
  const { user, phoneNumber, logout } = useAuth();
  const [selectedKit, setSelectedKit] = useState<RecipeKit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState<string | null>(null);

  const handleOpenOrderModal = (kit: RecipeKit) => {
    setSelectedKit(kit);
    setQuantity(1);
    setOrderModalVisible(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedKit) return;
    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address to place an order.');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderItem: OrderItem = {
        id: selectedKit.id,
        name: selectedKit.name,
        quantity: quantity,
        price: selectedKit.price,
        masalaSachets: selectedKit.masalaSachets,
      };

      const customerPhone = user?.phoneNumber || phoneNumber || '+91 9876543210';
      const userId = user?.uid || `guest_${Date.now()}`;

      const created = await createOrder(
        userId,
        customerPhone,
        deliveryAddress,
        [orderItem],
        selectedKit.price * quantity,
        user?.displayName || 'RasoiGenie Customer',
      );

      setLastPlacedOrderId(created.id);
      setOrderModalVisible(false);
      Alert.alert(
        '🎉 Order Placed Successfully!',
        `Your Order ID is ${created.id}. Pre-portioned meal kits will be delivered shortly!`,
      );
    } catch (err: any) {
      Alert.alert('Order Failed', err?.message || 'Unable to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>RasoiGenie 🧞‍♂️</Text>
          <Text style={styles.brandSubtitle}>
            Chef-crafted recipes with pre-portioned masala sachets
          </Text>
        </View>

        {user ? (
          <TouchableOpacity onPress={logout} style={styles.profileBadge}>
            <Text style={styles.profilePhone}>📱 {user.phoneNumber || user.email || 'User'}</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* User Session Banner */}
      {user ? (
        <Card style={styles.userBanner} variant="outlined">
          <View style={styles.userBannerRow}>
            <View>
              <Text style={styles.userBannerTitle}>Logged In Customer</Text>
              <Text style={styles.userBannerDetail}>
                Phone: {user.phoneNumber || 'Authenticated'}
              </Text>
            </View>
            <Badge label="Authenticated" variant="success" />
          </View>
        </Card>
      ) : null}

      {lastPlacedOrderId ? (
        <Card style={styles.successBanner}>
          <Text style={styles.successTitle}>✅ Active Order Placed!</Text>
          <Text style={styles.successText}>
            Order <Text style={{ fontWeight: '800' }}>#{lastPlacedOrderId}</Text> is currently being
            prepared by our kitchen. Track order status anytime!
          </Text>
        </Card>
      ) : null}

      {/* Catalog Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Curated Meal Kits</Text>
        <Text style={styles.sectionSubtitle}>
          Select a dish to receive exact ingredients & sachets
        </Text>
      </View>

      {/* Recipe List Grid */}
      <View style={styles.grid}>
        {RECIPE_KITS.map((kit) => (
          <Card key={kit.id} style={styles.recipeCard}>
            <View style={styles.cardHeader}>
              <Badge label={kit.cuisine} variant="info" />
              <Text style={styles.priceText}>₹{kit.price}</Text>
            </View>

            <Text style={styles.recipeName}>{kit.name}</Text>
            <Text style={styles.recipeMeta}>
              ⏱️ {kit.prepTime} • 👥 Serves {kit.servings}
            </Text>
            <Text style={styles.recipeDesc}>{kit.description}</Text>

            {/* Masala Sachets Section */}
            <View style={styles.sachetsContainer}>
              <Text style={styles.sachetHeading}>📦 Included Spice Sachets:</Text>
              {kit.masalaSachets.map((sachet, idx) => (
                <View key={idx} style={styles.sachetPill}>
                  <Text style={styles.sachetText}>• {sachet}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Order Meal Kit"
              onPress={() => handleOpenOrderModal(kit)}
              style={styles.orderBtn}
            />
          </Card>
        ))}
      </View>

      {/* Order Placement Modal */}
      <Modal
        visible={orderModalVisible}
        onClose={() => setOrderModalVisible(false)}
        title="Checkout Meal Kit"
      >
        {selectedKit ? (
          <View>
            <Text style={styles.modalKitTitle}>{selectedKit.name}</Text>
            <Text style={styles.modalKitPrice}>Price: ₹{selectedKit.price} per kit</Text>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity:</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Input
              label="Delivery Address"
              placeholder="House/Flat No., Street, Landmark, City"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              style={{ height: 70 }}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable:</Text>
              <Text style={styles.totalAmount}>₹{selectedKit.price * quantity}</Text>
            </View>

            <Button
              title="Confirm Order"
              onPress={handleConfirmOrder}
              loading={placingOrder}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : null}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF6B00',
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  profileBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profilePhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  logoutText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },
  userBanner: {
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  userBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  userBannerDetail: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  successBanner: {
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  successText: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  grid: {
    gap: 16,
  },
  recipeCard: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B00',
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  recipeMeta: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  recipeDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 12,
  },
  sachetsContainer: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  sachetHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 6,
  },
  sachetPill: {
    marginTop: 2,
  },
  sachetText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '500',
  },
  orderBtn: {
    marginTop: 4,
  },
  modalKitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalKitPrice: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 16,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  qtyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  qtyVal: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF6B00',
  },
});
