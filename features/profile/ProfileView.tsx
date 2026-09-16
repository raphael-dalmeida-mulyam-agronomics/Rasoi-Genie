import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AddressBookView } from './AddressBookView';
import { DietaryPreferencesModal } from '../onboarding/DietaryPreferencesModal';
import { NotificationsView } from '../notifications/NotificationsView';
import { SupportView } from '../support/SupportView';
import { SubscriptionPlanView } from '../subscription/SubscriptionPlanView';

export const ProfileView: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { colors, radii, shadows, isDark, toggleColorMode } = useTheme();
  const { preferences, defaultAddress } = usePreferences();

  // Subview navigation states
  const [subView, setSubView] = useState<
    'main' | 'addresses' | 'notifications' | 'support' | 'subscription'
  >('main');

  const [dietModalVisible, setDietModalVisible] = useState(false);

  const handleReferFriend = () => {
    Alert.alert(
      'Refer a Cooking Friend 🎁',
      'Share your unique code: RASOI-FRIEND-50\n\nYour friend gets ₹150 OFF their first box, and you get ₹150 wallet credits when they cook!',
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
                  label={isAdmin ? 'Admin' : 'Member'}
                  variant={isAdmin ? 'info' : 'primary'}
                  size="sm"
                />
              </View>
              <Text style={[styles.userContact, { color: colors.textSecondary }]}>
                {userContact}
              </Text>
              <Text style={[styles.userRegion, { color: colors.textMuted }]}>
                📍 {preferences.currentCity} ({preferences.regionHub} Region)
              </Text>
            </View>
          </View>

          {isAdmin && (
            <Button
              title="Open Company Admin Panel ⚙️"
              variant="secondary"
              size="sm"
              style={{ marginTop: 14 }}
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
            <Badge label={`Diet: ${preferences.dietType.toUpperCase()}`} variant="primary" />
            <Badge label={`Spice: ${preferences.spiceTolerance}`} variant="warning" />
            <Badge label={`Hub: ${preferences.regionHub}`} variant="accent" />
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
            icon="📍"
            title="Saved Delivery Addresses"
            subtitle={`${defaultAddress?.flatAndStreet || 'Manage your addresses'}`}
            onPress={() => setSubView('addresses')}
          />

          <MenuRow
            icon="🥗"
            title="Dietary & Cooking Preferences"
            subtitle="Diet type, spice tolerance, allergies, cuisines"
            onPress={() => setDietModalVisible(true)}
          />

          <MenuRow
            icon={isDark ? '🌙' : '☀️'}
            title={`Appearance: ${isDark ? 'Dark Mode' : 'Light Mode'}`}
            subtitle={`Currently in ${isDark ? 'Dark (Obsidian)' : 'Light (Warm Cream)'} — Tap to switch`}
            onPress={toggleColorMode}
          />

          <MenuRow
            icon="📦"
            title="Order History & Live Tracking"
            subtitle="Past boxes, recipes cooked, invoices"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />

          <MenuRow
            icon="❤️"
            title="Wishlist / Favorite Kits"
            subtitle="Saved recipes for upcoming meals"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />

          <MenuRow
            icon="🔄"
            title="Recurring Meal Plan (Phase 2)"
            subtitle="Weekly automatic fresh kit box"
            onPress={() => setSubView('subscription')}
          />

          <MenuRow
            icon="🔔"
            title="Notification Settings"
            subtitle="Push, SMS & Email communication"
            onPress={() => setSubView('notifications')}
          />

          <MenuRow
            icon="🎁"
            title="Refer a Friend (Earn ₹150)"
            subtitle="Give ₹150, Get ₹150 cooking credits"
            onPress={handleReferFriend}
          />

          <MenuRow
            icon="💬"
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
    </View>
  );
};

const MenuRow: React.FC<{
  icon: string;
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
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.menuChevron, { color: colors.textMuted }]}>›</Text>
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
});
