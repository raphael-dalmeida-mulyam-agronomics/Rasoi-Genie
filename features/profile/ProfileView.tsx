import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { PaymentMethod } from '../../framework/context/CartContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon, AppIconName } from '../../framework/ui/Icon';
import { AddressBookView } from './AddressBookView';
import { DietaryPreferencesModal } from '../onboarding/DietaryPreferencesModal';
import { NotificationsView } from '../notifications/NotificationsView';
import { SupportView } from '../support/SupportView';
import { SubscriptionPlanView } from '../subscription/SubscriptionPlanView';
import { subscribeToPendingApprovalCount } from '../../framework/services/notificationService';
import { useWallet } from '../../framework/context/WalletContext';
import { WalletView } from '../wallet/WalletView';
import { ReferralView } from '../referral/ReferralView';

export const ProfileView: React.FC = () => {
  const { user, isAdmin, isChef, logout } = useAuth();
  const { colors, radii, shadows, isDark, toggleColorMode } = useTheme();
  const { preferences, defaultAddress, preferredPaymentMethod, setPreferredPaymentMethod } =
    usePreferences();
  const { availableBalance } = useWallet();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);

  React.useEffect(() => {
    const unsub = subscribeToPendingApprovalCount((count) => setPendingApprovalCount(count));
    return () => unsub();
  }, []);

  // Subview navigation states
  const [subView, setSubView] = useState<
    'main' | 'addresses' | 'notifications' | 'support' | 'subscription' | 'wallet' | 'referral'
  >('main');
  const [dietModalVisible, setDietModalVisible] = useState(false);

  const handleReferFriend = () => {
    const code = 'RASOI-FRIEND-50';
    Alert.alert(
      'Refer a Cooking Friend',
      `Share your referral code "${code}" with family and friends. When they order their first chef box, both of you get ₹150 in cooking wallet credits!`,
      [
        { text: 'Copy Code & Share', onPress: () => {} },
        { text: 'Done', style: 'cancel' },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your RasoiGenie profile and order history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            logout();
            Alert.alert('Account Deleted', 'Your profile has been removed.');
          },
        },
      ],
    );
  };

  if (subView === 'addresses') {
    return <AddressBookView onBack={() => setSubView('main')} />;
  }

  if (subView === 'notifications') {
    return <NotificationsView onBack={() => setSubView('main')} />;
  }

  if (subView === 'support') {
    return <SupportView onBack={() => setSubView('main')} />;
  }

  if (subView === 'subscription') {
    return <SubscriptionPlanView onBack={() => setSubView('main')} />;
  }

  if (subView === 'wallet') {
    return (
      <WalletView
        onBack={() => setSubView('main')}
        onNavigateToReferral={() => setSubView('referral')}
      />
    );
  }

  if (subView === 'referral') {
    return (
      <ReferralView
        onBack={() => setSubView('main')}
        onNavigateToWallet={() => setSubView('wallet')}
      />
    );
  }

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Gourmet Home Chef';
  const userContact = user?.email || user?.phoneNumber || '+91 98765 43210';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Account & Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {userDisplayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {userDisplayName}
                </Text>
                <Badge
                  label={isAdmin ? 'Admin' : isChef ? 'Chef' : 'Member'}
                  variant={isAdmin ? 'info' : isChef ? 'warning' : 'primary'}
                  size="sm"
                />
              </View>
              <Text style={[styles.userContact, { color: colors.textSecondary }]}>
                {userContact}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="location" size={13} color={colors.textMuted} />
                <Text style={[styles.userRegion, { color: colors.textMuted, marginTop: 0 }]}>
                  {preferences.currentCity} ({preferences.regionHub} Region)
                </Text>
              </View>
            </View>
          </View>

          {isChef && !isAdmin && (
            <Button
              title="Open Chef Studio — Create & Edit Meal Kits"
              icon={<Icon name="chef" size={16} color="#FFFFFF" />}
              variant="primary"
              size="sm"
              style={{
                marginTop: 14,
                backgroundColor: '#D97706',
              }}
              onPress={() => router.push('/(tabs)/chef' as any)}
            />
          )}

          {isAdmin && (
            <Button
              title={
                pendingApprovalCount > 0
                  ? `Open Admin Panel (${pendingApprovalCount} Awaiting Approval)`
                  : 'Open Company Admin Panel'
              }
              icon={
                <Icon
                  name="settings"
                  size={16}
                  color={pendingApprovalCount > 0 ? '#FFFFFF' : colors.textPrimary}
                />
              }
              variant={pendingApprovalCount > 0 ? 'primary' : 'secondary'}
              size="sm"
              style={{
                marginTop: 8,
                backgroundColor: pendingApprovalCount > 0 ? '#DC2626' : undefined,
              }}
              onPress={() => router.push('/(tabs)/admin' as any)}
            />
          )}
        </View>

        {/* SECTION: Quick Preferences Highlights */}
        <View
          style={[
            styles.prefCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Dietary Profile & Taste Settings
            </Text>
            <TouchableOpacity onPress={() => setDietModalVisible(true)}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.prefTagsWrap}>
            {preferences.dietTypes && preferences.dietTypes.length > 0 ? (
              preferences.dietTypes.map((d) => (
                <Badge key={d} label={`Diet: ${d.toUpperCase()}`} variant="primary" />
              ))
            ) : (
              <Badge label="Diet: Not Set" variant="outline" />
            )}
            <Badge label={`Spice: ${preferences.spiceTolerance}`} variant="warning" />
            <Badge label={`Hub: ${preferences.regionHub}`} variant="accent" />
            <Badge label={`Pay: ${preferredPaymentMethod}`} variant="info" />
            {preferences.preferredCuisines && preferences.preferredCuisines.length > 0 ? (
              preferences.preferredCuisines.map((c) => (
                <Badge key={c} label={c} variant="neutral" />
              ))
            ) : (
              <Badge label="No Cuisines Selected" variant="outline" />
            )}
            {preferences.allergies.map((a) => (
              <Badge key={a} label={`No ${a}`} variant="danger" />
            ))}
          </View>
        </View>

        {/* SECTION: Linked Menu Options */}
        <View
          style={[
            styles.menuList,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <MenuRow
            icon="wallet"
            title="Rasoi Credits Wallet"
            subtitle={`Available: ₹${Math.round(availableBalance).toLocaleString('en-IN')} — View details & ledger`}
            onPress={() => setSubView('wallet')}
          />

          <MenuRow
            icon="gift"
            title="Refer & Earn Rewards"
            subtitle="Give ₹200, Get ₹300 in credits — Invite friends"
            onPress={() => setSubView('referral')}
          />

          <MenuRow
            icon="location"
            title="Saved Delivery Addresses"
            subtitle={`${defaultAddress?.flatAndStreet || 'Manage your delivery locations'}`}
            onPress={() => setSubView('addresses')}
          />

          <MenuRow
            icon="card"
            title="Preferred Payment Method"
            subtitle={`Default: ${preferredPaymentMethod} — Tap to switch`}
            onPress={() => setPaymentModalVisible(true)}
          />

          <MenuRow
            icon="restaurant"
            title="Dietary & Cooking Preferences"
            subtitle="Diet type, spice tolerance, allergies, cuisines"
            onPress={() => setDietModalVisible(true)}
          />

          <MenuRow
            icon={isDark ? 'moon' : 'sun'}
            title={`Appearance: ${isDark ? 'Dark Mode' : 'Light Mode'}`}
            subtitle={`Currently in ${isDark ? 'Dark (Obsidian)' : 'Light (Warm Cream)'} — Tap to switch`}
            onPress={toggleColorMode}
          />

          <MenuRow
            icon="package"
            title="Order History & Live Tracking"
            subtitle="Past boxes, recipes cooked, invoices"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />

          <MenuRow
            icon="heart"
            title="Wishlist / Favorite Kits"
            subtitle="Saved recipes for upcoming meals"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />

          <MenuRow
            icon="refresh"
            title="Recurring Meal Plan (Phase 2)"
            subtitle="Weekly automatic fresh kit box"
            onPress={() => setSubView('subscription')}
          />

          <MenuRow
            icon="bell"
            title="Notification Settings"
            subtitle="Push, SMS & Email communication"
            onPress={() => setSubView('notifications')}
          />

          <MenuRow
            icon="chat"
            title="Help & Support Desk"
            subtitle="FAQs, refund requests, chef assistance"
            onPress={() => setSubView('support')}
            isLast
          />
        </View>

        {/* Logout and Delete */}
        <View style={styles.authButtonsCol}>
          <Button
            title="Logout Session"
            variant="outline"
            size="md"
            onPress={logout}
            style={{ marginBottom: 12 }}
          />

          <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteAccBtn}>
            <Text style={[styles.deleteAccText, { color: colors.danger }]}>
              Permanently Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dietary Preferences Modal */}
      <DietaryPreferencesModal
        visible={dietModalVisible}
        onClose={() => setDietModalVisible(false)}
      />

      {/* Preferred Payment Method Selection Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Choose Preferred Payment Method
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              This will automatically be selected for all upcoming meal kit checkouts.
            </Text>

            {(['UPI', 'Card', 'Cash on Delivery', 'Wallet'] as PaymentMethod[]).map((method) => {
              const isSelected = preferredPaymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  onPress={async () => {
                    await setPreferredPaymentMethod(method);
                    setPaymentModalVisible(false);
                  }}
                  style={[
                    styles.paymentOptionRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon
                      name={
                        method === 'UPI'
                          ? 'flash'
                          : method === 'Card'
                            ? 'card'
                            : method === 'Cash on Delivery'
                              ? 'cash'
                              : 'bank'
                      }
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.paymentOptionName, { color: colors.textPrimary }]}>
                      {method === 'UPI'
                        ? 'UPI (GPay / PhonePe / Paytm)'
                        : method === 'Card'
                          ? 'Credit / Debit Card'
                          : method === 'Cash on Delivery'
                            ? 'Cash on Delivery (Doorstep)'
                            : 'Wallet / Net Banking'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioIndicator,
                      {
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setPaymentModalVisible(false)}
              style={[styles.closeModalBtn, { borderColor: colors.borderLight }]}
            >
              <Text style={[styles.closeModalText, { color: colors.textPrimary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const MenuRow: React.FC<{
  icon: AppIconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}> = ({ icon, title, subtitle, onPress, isLast }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.menuRowItem,
        { borderBottomColor: isLast ? 'transparent' : colors.borderLight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ width: 34, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
  },
  userContact: {
    fontSize: 13,
    marginTop: 2,
  },
  userRegion: {
    fontSize: 12,
    marginTop: 2,
  },
  prefCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  editLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  prefTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuList: {
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 22,
    fontWeight: '600',
  },
  authButtonsCol: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteAccBtn: {
    padding: 8,
  },
  deleteAccText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  paymentMethodIcon: {
    fontSize: 22,
  },
  paymentOptionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  closeModalBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
