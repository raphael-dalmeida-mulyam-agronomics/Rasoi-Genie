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
import { useHeaderTopPadding } from '../../framework/ui/ScreenHeader';
import { AddressBookView } from './AddressBookView';
import { DietaryPreferencesModal } from '../onboarding/DietaryPreferencesModal';
import { NotificationsView } from '../notifications/NotificationsView';
import { SupportView } from '../support/SupportView';
import { SubscriptionPlanView } from '../subscription/SubscriptionPlanView';
import { subscribeToPendingApprovalCount } from '../../framework/services/notificationService';
import { useWallet } from '../../framework/context/WalletContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Avatar } from '../../framework/ui/Avatar';
import { CreateFamilySheet } from '../family/CreateFamilySheet';
import { WalletView } from '../wallet/WalletView';
import { ReferralView } from '../referral/ReferralView';
import { WishlistView } from '../wishlist/WishlistView';
import { ScreenHeader } from '../../framework/ui/ScreenHeader';

export const ProfileView: React.FC = () => {
  const { user, isAdmin, isChef, logout } = useAuth();
  const { colors, radii, shadows, isDark, toggleColorMode } = useTheme();
  const { preferences, defaultAddress, preferredPaymentMethod, setPreferredPaymentMethod } =
    usePreferences();
  const { availableBalance } = useWallet();
  const { family, role, members, invites, refreshFamily } = useFamily();
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
  const [createFamilySheetVisible, setCreateFamilySheetVisible] = useState<boolean>(false);

  React.useEffect(() => {
    const unsub = subscribeToPendingApprovalCount((count) => setPendingApprovalCount(count));
    return () => unsub();
  }, []);

  // Subview navigation states
  const [subView, setSubView] = useState<
    | 'main'
    | 'addresses'
    | 'notifications'
    | 'support'
    | 'subscription'
    | 'wallet'
    | 'referral'
    | 'wishlist'
  >('main');
  const [dietModalVisible, setDietModalVisible] = useState(false);

  const handleReferFriend = () => {
    setSubView('referral');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Permanent Account Deletion',
      'This action is irreversible. All your past orders, culinary preferences, family settings, and Rasoi credits will be permanently deleted.\n\nDo you wish to proceed?',
      [
        { text: 'Keep My Account', style: 'cancel' },
        {
          text: 'Proceed with Deletion',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Please confirm that you want to delete your RasoiGenie account now.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
                  style: 'destructive',
                  onPress: () => {
                    logout();
                    Alert.alert(
                      'Account Deleted',
                      'Your profile and associated data have been removed.',
                    );
                  },
                },
              ],
            );
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

  if (subView === 'wishlist') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <ScreenHeader title="Saved Meal Kits" onBack={() => setSubView('main')} />
        <WishlistView />
      </View>
    );
  }

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Gourmet Home Chef';
  const userContact = user?.email || user?.phoneNumber || '+91 98765 43210';

  const headerPaddingTop = useHeaderTopPadding(6);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderLight,
            paddingTop: headerPaddingTop,
          },
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
                  {preferences.currentCity || 'India'}
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

        {/* Top Shortcut Tiles: Wallet Balance & Order History */}
        <View style={styles.topShortcutRow}>
          <TouchableOpacity
            style={[
              styles.shortcutTile,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.soft,
              },
            ]}
            onPress={() => setSubView('wallet')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Icon name="wallet" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.shortcutValue, { color: colors.primary }]}>
              ₹{Math.round(availableBalance).toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.shortcutLabel, { color: colors.textSecondary }]}>
              Rasoi Credits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shortcutTile,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: colors.borderLight,
                ...shadows.soft,
              },
            ]}
            onPress={() => router.push('/(tabs)/orders' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: colors.accentLight }]}>
              <Icon name="package" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.shortcutValue, { color: colors.accent }]}>Orders</Text>
            <Text style={[styles.shortcutLabel, { color: colors.textSecondary }]}>
              Track & History
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: Family Card (Screen A) */}
        {!family ? (
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
            testID="profile-family-card"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="people" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Family</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  Order together. Pay once.
                </Text>
              </View>
            </View>

            <Button
              title="Create your family"
              variant="primary"
              size="md"
              onPress={() => setCreateFamilySheetVisible(true)}
              style={{ marginTop: 14 }}
              testID="create-family-profile-btn"
            />
          </View>
        ) : (
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
            testID="profile-family-card"
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {family.name}
                </Text>
                <View style={{ marginTop: 4 }}>
                  <RoleBadge role={role || 'member'} size="sm" />
                </View>
              </View>

              {/* Overlapping Member Avatars (max 6) */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {members.slice(0, 6).map((m, idx) => (
                  <View
                    key={m.user_id}
                    style={{
                      marginLeft: idx > 0 ? -10 : 0,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: colors.bgSurface,
                    }}
                  >
                    <Avatar name={m.display_name} id={m.user_id} size="sm" />
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                title="Open family"
                variant="primary"
                size="sm"
                onPress={() => router.push('/family' as any)}
                style={{ flex: 1 }}
                testID="open-family-profile-btn"
              />

              {invites.filter((i) => i.status === 'pending').length > 0 && (
                <Button
                  title={`Invites (${invites.filter((i) => i.status === 'pending').length})`}
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/family/invites' as any)}
                  style={{ flex: 1 }}
                  testID="open-invites-profile-btn"
                />
              )}
            </View>
          </View>
        )}

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

        {/* GROUP 1: Wallet & Payments */}
        <Text style={[styles.groupSectionTitle, { color: colors.textMuted }]}>
          WALLET & PAYMENTS
        </Text>
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
            onPress={handleReferFriend}
          />
          <MenuRow
            icon="card"
            title="Preferred Payment Method"
            subtitle={`Default: ${preferredPaymentMethod} — Tap to switch`}
            onPress={() => setPaymentModalVisible(true)}
            isLast
          />
        </View>

        {/* GROUP 2: Kitchen & Delivery Settings */}
        <Text style={[styles.groupSectionTitle, { color: colors.textMuted }]}>
          KITCHEN & PREFERENCES
        </Text>
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
            icon="restaurant"
            title="Dietary & Cooking Preferences"
            subtitle="Diet type, spice tolerance, allergies, cuisines"
            onPress={() => setDietModalVisible(true)}
          />
          <MenuRow
            icon="location"
            title="Saved Delivery Addresses"
            subtitle={`${defaultAddress?.flatAndStreet || 'Manage your delivery locations'}`}
            onPress={() => setSubView('addresses')}
          />
          <MenuRow
            icon="bell"
            title="Notification Settings"
            subtitle="Push, SMS & Email communication"
            onPress={() => setSubView('notifications')}
          />
          <MenuRow
            icon={isDark ? 'moon' : 'sun'}
            title={`Appearance: ${isDark ? 'Dark Mode' : 'Light Mode'}`}
            subtitle={`Currently in ${isDark ? 'Dark (Obsidian)' : 'Light (Warm Cream)'} — Tap to switch`}
            onPress={toggleColorMode}
            isLast
          />
        </View>

        {/* GROUP 3: Orders, Plans & Support */}
        <Text style={[styles.groupSectionTitle, { color: colors.textMuted }]}>
          ORDERS & SUPPORT
        </Text>
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
            icon="package"
            title="Order History & Live Tracking"
            subtitle="Past boxes, recipes cooked, invoices"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />
          <MenuRow
            icon="heart"
            title="Wishlist / Favorite Kits"
            subtitle="Saved recipes for upcoming meals"
            onPress={() => setSubView('wishlist')}
          />
          <MenuRow
            icon="refresh"
            title="Recurring Meal Plan"
            subtitle="Weekly automatic fresh kit box"
            onPress={() => setSubView('subscription')}
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

      <CreateFamilySheet
        visible={createFamilySheetVisible}
        onClose={() => setCreateFamilySheetVisible(false)}
        onCreated={() => refreshFamily()}
      />
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topShortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shortcutTile: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  shortcutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 6,
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
