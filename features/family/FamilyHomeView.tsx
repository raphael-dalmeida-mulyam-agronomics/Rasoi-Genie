import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { can } from '../../framework/family/permissions';
import { familyStrings } from '../../framework/family/familyStrings';
import { FamilyMember } from '../../framework/services/familyService';
import { CapacityMeter } from '../../framework/ui/CapacityMeter';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { FamilyMemberRow } from './FamilyMemberRow';
import { CreateFamilySheet } from './CreateFamilySheet';
import { InviteMemberSheet } from './InviteMemberSheet';
import { AddDependentSheet } from './AddDependentSheet';
import { MemberOptionsSheet } from './MemberOptionsSheet';
import { LeaveFamilySheet } from './LeaveFamilySheet';
import { TransferOwnershipSheet } from './TransferOwnershipSheet';

export const FamilyHomeView: React.FC = () => {
  const { colors, radii, shadows, isDark } = useTheme();
  const {
    family,
    members,
    currentMember,
    role,
    invites,
    cartState,
    loading,
    refreshFamily,
    deleteFamily,
  } = useFamily();

  const [refreshing, setRefreshing] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [inviteAdultVisible, setInviteAdultVisible] = useState(false);
  const [addDependentVisible, setAddDependentVisible] = useState(false);
  const [leaveSheetVisible, setLeaveSheetVisible] = useState(false);
  const [transferSheetVisible, setTransferSheetVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [memberOptionsVisible, setMemberOptionsVisible] = useState(false);

  const t = familyStrings.home;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFamily();
    } finally {
      setRefreshing(false);
    }
  };

  // 1. Loading State
  if (loading && !family) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading family hub...
        </Text>
      </View>
    );
  }

  // 2. Empty / Not in Family State
  if (!family) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.notInFamilyCard}>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="people" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {familyStrings.accountCard.title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {familyStrings.accountCard.subtitle}
          </Text>

          <Button
            title={familyStrings.accountCard.createButton}
            variant="primary"
            size="lg"
            onPress={() => setCreateSheetVisible(true)}
            style={{ width: '100%', marginTop: 16 }}
            testID="open-create-family-btn"
          />

          {invites.filter((i) => i.status === 'pending').length > 0 && (
            <Button
              title={`View Pending Invitations (${invites.filter((i) => i.status === 'pending').length})`}
              variant="outline"
              size="md"
              onPress={() => router.push('/family/invites' as any)}
              style={{ width: '100%', marginTop: 8 }}
            />
          )}
        </View>

        <CreateFamilySheet
          visible={createSheetVisible}
          onClose={() => setCreateSheetVisible(false)}
          onCreated={() => refreshFamily()}
        />
      </View>
    );
  }

  // 3. Active Family Management Hub
  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const totalOccupiedSeats = members.length + pendingInvites.length;
  const pendingApprovalsCount = cartState.pendingCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Family Header Card */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.xl,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.familyTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.familyName, { color: colors.textPrimary }]}>{family.name}</Text>
              <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                Your role:{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>{role || 'Member'}</Text>
              </Text>
            </View>

            <TouchableOpacity
              testID="open-family-cart-btn"
              style={[styles.cartBadgeBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push('/(tabs)/cart' as any)}
              accessibilityRole="button"
              accessibilityLabel="Open Family Cart"
            >
              <Icon name="basket" size={18} color={colors.primary} />
              <Text style={[styles.cartBadgeText, { color: colors.primary }]}>
                Cart ({cartState.items.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Co-owner payment privilege notice chip */}
          {role === 'co_owner' && (
            <View style={[styles.infoBanner, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="card" size={16} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.infoBannerText}>{t.coOwnerBanner}</Text>
            </View>
          )}

          {/* Capacity Meter */}
          <View style={{ marginTop: 12 }}>
            <CapacityMeter current={totalOccupiedSeats} max={6} />
          </View>
        </View>

        {/* Owner-Only Action Shortcuts Grid */}
        {can(role, 'manage_members') && (
          <View style={styles.ownerActionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  ...shadows.soft,
                },
              ]}
              onPress={() => setInviteAdultVisible(true)}
              activeOpacity={0.8}
              testID="invite-adult-btn"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Icon name="user-plus" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>
                {t.inviteAdultBtn}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  ...shadows.soft,
                },
              ]}
              onPress={() => setAddDependentVisible(true)}
              activeOpacity={0.8}
              testID="add-dependent-btn"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Icon name="sparkles" size={18} color="#059669" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>
                {t.addDependentBtn}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  ...shadows.soft,
                },
              ]}
              onPress={() => router.push('/family/links' as any)}
              activeOpacity={0.8}
              testID="manage-links-btn"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Icon name="link" size={18} color="#7C3AED" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>
                {t.manageLinksBtn}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  ...shadows.soft,
                },
              ]}
              onPress={() => router.push('/family/approvals' as any)}
              activeOpacity={0.8}
              testID="view-approvals-btn"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="check" size={18} color="#D97706" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>
                  Approvals
                </Text>
                {pendingApprovalsCount > 0 && (
                  <Badge label={String(pendingApprovalsCount)} variant="warning" size="sm" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Family Members Section */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            {t.membersSectionTitle} ({members.length})
          </Text>

          <View style={styles.memberList}>
            {members.map((member) => (
              <FamilyMemberRow
                key={member.user_id}
                member={member}
                canManage={can(role, 'manage_members')}
                isSelf={member.user_id === currentMember?.user_id}
                onPressMenu={() => {
                  setSelectedMember(member);
                  setMemberOptionsVisible(true);
                }}
                testID={`member-row-${member.user_id}`}
              />
            ))}
          </View>
        </View>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              {t.pendingInvitesSectionTitle} ({pendingInvites.length})
            </Text>

            <View style={styles.memberList}>
              {pendingInvites.map((inv) => (
                <FamilyMemberRow key={inv.id} pendingInvite={inv} />
              ))}
            </View>
          </View>
        )}

        {/* Danger / Account Actions Section */}
        {role === 'owner' ? (
          <View style={styles.dangerSection} testID="danger-zone">
            <Text style={[styles.sectionHeading, { color: colors.danger, marginBottom: 8 }]}>
              Danger Zone
            </Text>
            {can(role, 'transfer_ownership') && (
              <Button
                title={t.transferOwnershipBtn}
                variant="outline"
                size="md"
                onPress={() => setTransferSheetVisible(true)}
                style={{ width: '100%', marginBottom: 8 }}
                testID="transfer-ownership-btn"
              />
            )}
            <Button
              title="Delete Family"
              variant="outline"
              size="md"
              onPress={() => {
                Alert.alert(
                  'Delete Family',
                  'Are you sure you want to delete this family? All members and cart items will be removed permanently.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        const res = await deleteFamily();
                        if (res.success) {
                          Alert.alert(
                            'Family Deleted',
                            'The family has been successfully deleted.',
                          );
                          router.replace('/');
                        } else {
                          Alert.alert('Error', res.error || 'Failed to delete family');
                        }
                      },
                    },
                  ],
                );
              }}
              style={{ width: '100%', borderColor: colors.danger }}
              testID="delete-family-btn"
            />
          </View>
        ) : can(role, 'leave_family') ? (
          <View style={styles.dangerSection}>
            <Button
              title={t.leaveButton}
              variant="outline"
              size="md"
              onPress={() => setLeaveSheetVisible(true)}
              style={{ width: '100%' }}
              testID="leave-family-btn"
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Sheets */}
      <InviteMemberSheet
        visible={inviteAdultVisible}
        onClose={() => setInviteAdultVisible(false)}
        onInvited={() => refreshFamily()}
      />

      <AddDependentSheet
        visible={addDependentVisible}
        onClose={() => setAddDependentVisible(false)}
        onLinkCreated={() => refreshFamily()}
      />

      <MemberOptionsSheet
        member={selectedMember}
        visible={memberOptionsVisible}
        onClose={() => {
          setMemberOptionsVisible(false);
          setSelectedMember(null);
        }}
        onActionComplete={() => refreshFamily()}
        onOpenTransfer={() => setTransferSheetVisible(true)}
      />

      <LeaveFamilySheet
        visible={leaveSheetVisible}
        onClose={() => setLeaveSheetVisible(false)}
        onLeft={() => refreshFamily()}
      />

      <TransferOwnershipSheet
        visible={transferSheetVisible}
        onClose={() => setTransferSheetVisible(false)}
        onTransferred={() => refreshFamily()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  notInFamilyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  headerCard: {
    padding: 16,
    borderWidth: 1,
  },
  familyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  familyName: {
    fontSize: 20,
    fontWeight: '800',
  },
  roleSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cartBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  cartBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    flex: 1,
  },
  ownerActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberList: {
    gap: 8,
  },
  dangerSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
});
