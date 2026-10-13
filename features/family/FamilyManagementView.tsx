import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useAuth } from '../../framework/context/AuthContext';
import {
  FamilyMember,
  FamilyRole,
  DependentType,
  MAX_FAMILY_MEMBERS,
  MAX_CO_OWNERS,
  maskPhoneNumber,
  formatFamilyName,
} from '../../framework/services/familyService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { Checkbox } from '../../framework/ui/Checkbox';

interface FamilyManagementViewProps {
  onClose?: () => void;
}

export const FamilyManagementView: React.FC<FamilyManagementViewProps> = ({ onClose }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const {
    family,
    members,
    currentMember,
    role,
    isOwner,
    isCoOwner,
    isAdultMember,
    isDependent,
    canInvite,
    canManageMembers,
    invites,
    links,
    loading,
    refreshFamily,
    createNewFamily,
    deleteFamily,
    inviteAdult,
    createDependentLink,
    revokeLink,
    revokeAllLinks,
    reissueLink,
    promoteOrDemoteCoOwner,
    removeFamilyMember,
    leaveCurrentFamily,
    transferFamilyOwnership,
  } = useFamily();

  // Create Family Form
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Invite Adult Modal
  const [inviteAdultModalVisible, setInviteAdultModalVisible] = useState(false);
  const [invitePhoneInput, setInvitePhoneInput] = useState('');
  const [isSubmittingAdultInvite, setIsSubmittingAdultInvite] = useState(false);

  // Add Dependent Link Modal
  const [dependentModalVisible, setDependentModalVisible] = useState(false);
  const [dependentType, setDependentType] = useState<DependentType>('child');
  const [dependentNameInput, setDependentNameInput] = useState('');
  const [guardianConsentChecked, setGuardianConsentChecked] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{
    rawToken: string;
    expiresAt: string;
  } | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Member Action Modal (Promote, Demote, Remove, Transfer)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Capacity calculation (including pending dependent links)
  const pendingInvitesCount = invites.filter((i) => i.status === 'pending').length;
  const pendingLinks = (links || []).filter((l) => l.status === 'pending');
  const pendingLinksCount = pendingLinks.length;
  const totalOccupiedSeats = members.length + pendingInvitesCount + pendingLinksCount;
  const isFamilyFull = totalOccupiedSeats >= MAX_FAMILY_MEMBERS;
  const coOwnerCount = members.filter((m) => m.role === 'co_owner').length;

  // Handler: Create Family
  const handleCreateFamily = async () => {
    if (!familyNameInput.trim()) {
      Alert.alert('Required', 'Please enter a name for your family.');
      return;
    }
    setIsCreatingFamily(true);
    try {
      const formatted = formatFamilyName(familyNameInput.trim());
      const res = await createNewFamily(formatted);
      if (!res.success) {
        Alert.alert('Error', res.error || 'Could not create family.');
      } else {
        setFamilyNameInput('');
      }
    } finally {
      setIsCreatingFamily(false);
    }
  };

  // Handler: Send Adult Phone Invite
  const handleSendAdultInvite = async () => {
    if (!invitePhoneInput.trim()) {
      Alert.alert('Required', 'Please enter a 10-digit mobile number.');
      return;
    }
    setIsSubmittingAdultInvite(true);
    try {
      const res = await inviteAdult(invitePhoneInput.trim());
      if (!res.success) {
        Alert.alert('Invite Note', res.error || 'Could not send invite.');
      } else {
        Alert.alert(
          'Invite Sent',
          'Family invite sent successfully! The member will see it in-app.',
        );
        setInvitePhoneInput('');
        setInviteAdultModalVisible(false);
      }
    } finally {
      setIsSubmittingAdultInvite(false);
    }
  };

  // Handler: Generate Dependent Link
  const handleGenerateDependentLink = async () => {
    const firstName = dependentNameInput.trim().split(' ')[0];
    if (!firstName) {
      Alert.alert('Required', 'Please enter a first name only.');
      return;
    }
    if (dependentType === 'child' && !guardianConsentChecked) {
      Alert.alert('Guardian Consent', 'Please check the guardian consent box to continue.');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const res = await createDependentLink(dependentType, firstName, guardianConsentChecked);
      if (!res.success || !res.rawToken) {
        Alert.alert('Error', res.error || 'Could not generate link.');
      } else {
        setGeneratedLink({ rawToken: res.rawToken, expiresAt: res.expiresAt || '' });
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handler: Share Dependent Link
  const handleShareLink = async () => {
    if (!generatedLink) return;
    const linkUrl = `rasoigenie://join/${generatedLink.rawToken}`;
    const webUrl = `https://rasoigenie.in/join/${generatedLink.rawToken}`;
    const message = `Join our family on RasoiGenie! Tap here to join: ${webUrl}\n(Open in app: ${linkUrl})`;

    try {
      await Share.share({
        message,
        url: webUrl,
        title: 'Join Family on RasoiGenie',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Handler: Re-issue Link for Dependent
  const handleReissueLink = async (member: FamilyMember) => {
    try {
      const res = await reissueLink(member.user_id);
      if (res.success && res.rawToken) {
        setDependentNameInput(member.display_name);
        setDependentType(member.dependent_type || 'child');
        setGeneratedLink({
          rawToken: res.rawToken,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        });
        setDependentModalVisible(true);
      } else {
        Alert.alert('Error', res.error || 'Could not reissue link.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not reissue link');
    }
  };

  // Handler: Leave Family
  const handleLeaveFamily = () => {
    Alert.alert(
      'Leave Family',
      isOwner && members.length > 1
        ? 'As the owner, ownership will be transferred to the next senior adult member. Are you sure?'
        : 'Are you sure you want to leave this family?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const res = await leaveCurrentFamily();
            if (!res.success) {
              Alert.alert('Error', res.error || 'Could not leave family');
            } else {
              Alert.alert('Left Family', 'You have left the family.');
              onClose?.();
            }
          },
        },
      ],
    );
  };

  const handleRevokeLink = (linkId: string, name: string) => {
    Alert.alert(
      'Revoke Join Link',
      `Revoke unredeemed join link for ${name}? This will free up 1 family seat immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            const res = await revokeLink(linkId);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to revoke link');
            } else {
              Alert.alert('Success', 'Join link revoked. Family seat freed.');
            }
          },
        },
      ],
    );
  };

  const handleRevokeAllLinks = () => {
    Alert.alert(
      'Revoke All Pending Links',
      `Revoke all ${pendingLinksCount} unredeemed join links? This will immediately free up ${pendingLinksCount} family seats.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            const res = await revokeAllLinks();
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to revoke links');
            } else {
              Alert.alert(
                'Success',
                `Revoked ${res.count ?? pendingLinksCount} join links. All seats freed!`,
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteFamily = () => {
    Alert.alert(
      'Delete Family',
      'Are you sure you want to permanently delete this family? All members, cart items, and pending links will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteFamily();
            if (!res.success) {
              Alert.alert('Error', res.error || 'Could not delete family');
            } else {
              Alert.alert('Family Deleted', 'The family has been permanently deleted.');
              onClose?.();
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Family...</Text>
      </View>
    );
  }

  // ─── NO FAMILY: CREATE SCREEN ───────────────────────────────────────────────
  if (!family) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Family Hub</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.createBanner}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight + '30' }]}>
            <Icon name="people" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.createTitle, { color: colors.textPrimary }]}>
            Cook & Dine Together
          </Text>
          <Text style={[styles.createSubtitle, { color: colors.textSecondary }]}>
            Create a family of up to 6 members. Add co-owners who can pay, invite children or
            seniors with single-use links, and plan meals in real time.
          </Text>
        </View>

        <Card style={styles.createCard}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Family Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: isDark ? colors.bgSurface : '#F8FAFC',
                color: colors.textPrimary,
              },
            ]}
            placeholder="Enter family name"
            placeholderTextColor={colors.textSecondary}
            value={familyNameInput}
            onChangeText={setFamilyNameInput}
            maxLength={30}
          />

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                No phone verification required to create or join.
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="link" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Link-joined dependents (no login required).
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="card" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Single checkout payer with personal wallet credits.
              </Text>
            </View>
          </View>

          <Button
            title={isCreatingFamily ? 'Creating Family...' : 'Create Family'}
            onPress={handleCreateFamily}
            disabled={isCreatingFamily}
            style={styles.createButton}
          />
        </Card>
      </ScrollView>
    );
  }

  // ─── ACTIVE FAMILY MANAGEMENT SCREEN ─────────────────────────────────────────
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{family.name}</Text>
          <Text style={[styles.subHeader, { color: colors.textSecondary }]}>
            {members.length} member{members.length > 1 ? 's' : ''} • {totalOccupiedSeats}/
            {MAX_FAMILY_MEMBERS} seats reserved
          </Text>
        </View>
        <TouchableOpacity onPress={handleLeaveFamily} style={styles.leaveButton}>
          <Icon name="exit-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Capacity & Role Status Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Your Role</Text>
            <View style={styles.roleBadgeRow}>
              <Badge
                label={
                  isOwner
                    ? '👑 Owner'
                    : isCoOwner
                      ? '⭐ Co-Owner'
                      : isDependent
                        ? '👶 Dependent'
                        : 'Member'
                }
                variant={isOwner ? 'primary' : isCoOwner ? 'accent' : 'neutral'}
                style={styles.badge}
              />
              {isDependent && currentMember?.dependent_type && (
                <Badge
                  label={currentMember.dependent_type === 'child' ? 'Child' : 'Senior'}
                  variant="outline"
                  style={styles.badge}
                />
              )}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Family Capacity
            </Text>
            <Text
              style={[
                styles.capacityNumber,
                { color: isFamilyFull ? colors.danger : colors.primary },
              ]}
            >
              {totalOccupiedSeats} / {MAX_FAMILY_MEMBERS}
            </Text>
          </View>
        </View>

        {/* Permissions summary */}
        <View style={[styles.permissionBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            {isOwner &&
              'You have full management access. You can add/remove members and approve items.'}
            {isCoOwner &&
              'You can PAY for the entire family basket at checkout. You cannot add/remove members.'}
            {isAdultMember &&
              'You can add items directly and customize servings. Only owners & co-owners pay.'}
            {isDependent && 'Items you add will wait for owner approval before being ordered.'}
          </Text>
        </View>
      </Card>

      {/* Action Buttons for Owner */}
      {canInvite && (
        <View style={styles.inviteButtonsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isFamilyFull ? colors.border : colors.primary },
            ]}
            disabled={isFamilyFull}
            onPress={() => setInviteAdultModalVisible(true)}
          >
            <Icon name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Invite Adult</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isFamilyFull ? colors.border : colors.accent },
            ]}
            disabled={isFamilyFull}
            onPress={() => {
              setGeneratedLink(null);
              setGuardianConsentChecked(false);
              setDependentNameInput('');
              setDependentModalVisible(true);
            }}
          >
            <Icon name="link" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add Child / Senior</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members List */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Family Members</Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {members.length} / {MAX_FAMILY_MEMBERS}
        </Text>
      </View>

      {members.map((member) => {
        const isSelf = member.user_id === user?.uid;
        const memberIsOwner = member.role === 'owner';
        const memberIsCoOwner = member.role === 'co_owner';
        const memberIsDependent = member.role === 'dependent';

        return (
          <Card key={member.user_id} style={styles.memberCard}>
            <View style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight + '40' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {member.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {member.display_name} {isSelf && '(You)'}
                  </Text>
                  <Badge
                    label={
                      memberIsOwner
                        ? 'Owner'
                        : memberIsCoOwner
                          ? 'Co-Owner'
                          : memberIsDependent
                            ? 'Dependent'
                            : 'Member'
                    }
                    variant={memberIsOwner ? 'primary' : memberIsCoOwner ? 'accent' : 'neutral'}
                    style={styles.memberBadge}
                  />
                </View>
                <Text style={[styles.joinedText, { color: colors.textSecondary }]}>
                  {memberIsDependent
                    ? `${member.dependent_type === 'child' ? 'Child' : 'Senior'} • Joined via Link`
                    : `Adult • Joined ${new Date(member.joined_at).toLocaleDateString()}`}
                </Text>
              </View>

              {/* Actions Button for Owner on other members */}
              {isOwner && !isSelf && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMember(member);
                    setActionModalVisible(true);
                  }}
                  style={styles.moreButton}
                >
                  <Icon name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}

      {/* Pending Invites Section */}
      {invites.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Pending Phone Invites
            </Text>
            <Badge
              label={String(invites.filter((i) => i.status === 'pending').length)}
              variant="outline"
            />
          </View>

          {invites.map((invite) => (
            <Card key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteRow}>
                <View>
                  <Text style={[styles.invitePhone, { color: colors.textPrimary }]}>
                    {maskPhoneNumber(invite.invited_phone)}
                  </Text>
                  <Text style={[styles.inviteExpiry, { color: colors.textSecondary }]}>
                    Status: {invite.status} • Expires in{' '}
                    {Math.max(
                      0,
                      Math.ceil(
                        (new Date(invite.expires_at).getTime() - Date.now()) / (3600 * 24 * 1000),
                      ),
                    )}{' '}
                    days
                  </Text>
                </View>
                <Badge
                  label={invite.status}
                  variant={invite.status === 'pending' ? 'accent' : 'neutral'}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Pending Dependent Links Section */}
      {pendingLinks.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Pending Join Links
              </Text>
              <Badge label={String(pendingLinks.length)} variant="accent" />
            </View>
            {isOwner && (
              <TouchableOpacity
                onPress={handleRevokeAllLinks}
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>
                  Revoke All
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary, marginBottom: 10 }]}>
            Unredeemed links reserve family capacity seats. Revoke links you no longer need to free
            seats.
          </Text>

          {pendingLinks.map((link) => (
            <Card key={link.id} style={styles.inviteCard}>
              <View style={styles.inviteRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.invitePhone, { color: colors.textPrimary }]}>
                      {link.display_name}
                    </Text>
                    <Badge
                      label={link.dependent_type === 'child' ? 'Child' : 'Senior'}
                      variant={link.dependent_type === 'child' ? 'accent' : 'neutral'}
                    />
                  </View>
                  <Text style={[styles.inviteExpiry, { color: colors.textSecondary }]}>
                    Expires in{' '}
                    {Math.max(
                      0,
                      Math.ceil((new Date(link.expires_at).getTime() - Date.now()) / (3600 * 1000)),
                    )}{' '}
                    hours
                  </Text>
                </View>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleRevokeLink(link.id, link.display_name)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.danger,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.danger }}>
                      Revoke
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Danger Zone: Delete Family */}
      {isOwner && (
        <View style={{ marginTop: 28, marginBottom: 36 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
          </View>
          <Card style={[styles.inviteCard, { borderColor: colors.danger + '40', borderWidth: 1 }]}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Permanently delete this family. All members, cart items, and pending invites will be
                removed immediately.
              </Text>
              <Button
                title="Delete Family"
                variant="outline"
                size="md"
                onPress={handleDeleteFamily}
                style={{ borderColor: colors.danger }}
                testID="management-delete-family-btn"
              />
            </View>
          </Card>
        </View>
      )}

      {/* ─── MODAL: INVITE ADULT BY PHONE ───────────────────────────────────── */}
      <Modal visible={inviteAdultModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Invite Adult Member
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter their registered mobile number. They must have an existing RasoiGenie account.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  color: colors.textPrimary,
                  marginTop: 16,
                },
              ]}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textSecondary}
              value={invitePhoneInput}
              onChangeText={setInvitePhoneInput}
              keyboardType="phone-pad"
            />

            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              • Numbers are masked (+91 98••• ••210) for other members.{'\n'}• Max 10 phone invites
              per day.{'\n'}• No additional verification needed for family.
            </Text>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setInviteAdultModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={isSubmittingAdultInvite ? 'Sending...' : 'Send Invite'}
                onPress={handleSendAdultInvite}
                disabled={isSubmittingAdultInvite}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ─── MODAL: ADD DEPENDENT LINK ──────────────────────────────────────── */}
      <Modal visible={dependentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Add Child or Senior
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Generates a single-use 24-hour join link with NO login required.
            </Text>

            {!generatedLink ? (
              <>
                {/* Dependent Type Selector */}
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      dependentType === 'child' && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight + '20',
                      },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setDependentType('child')}
                  >
                    <Icon
                      name="happy"
                      size={24}
                      color={dependentType === 'child' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.typeText, { color: colors.textPrimary }]}>Child</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      dependentType === 'senior' && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight + '20',
                      },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setDependentType('senior')}
                  >
                    <Icon
                      name="heart"
                      size={24}
                      color={dependentType === 'senior' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.typeText, { color: colors.textPrimary }]}>Senior</Text>
                  </TouchableOpacity>
                </View>

                {/* First Name Input */}
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 12 }]}>
                  First Name Only
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textSecondary}
                  value={dependentNameInput}
                  onChangeText={setDependentNameInput}
                  maxLength={15}
                />

                {/* Guardian Consent for Child (DPDP Act compliance) */}
                {dependentType === 'child' && (
                  <Checkbox
                    card
                    checked={guardianConsentChecked}
                    onPress={() => setGuardianConsentChecked(!guardianConsentChecked)}
                    label="I am this child's parent or legal guardian and I consent to their use of RasoiGenie."
                    containerStyle={{ marginTop: 14 }}
                    testID="guardian-consent-check"
                  />
                )}

                {dependentType === 'senior' && (
                  <Text
                    style={[styles.disclaimerText, { color: colors.textSecondary, marginTop: 8 }]}
                  >
                    Seniors will be presented with a large-text consent screen upon opening the
                    link.
                  </Text>
                )}

                <View style={styles.modalButtonsRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setDependentModalVisible(false)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title={isGeneratingLink ? 'Generating...' : 'Generate Link'}
                    onPress={handleGenerateDependentLink}
                    disabled={isGeneratingLink}
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                </View>
              </>
            ) : (
              /* Link Generated Output */
              <View style={styles.linkGeneratedBox}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.success ? colors.success + '20' : '#10B98120' },
                  ]}
                >
                  <Icon name="checkmark-circle" size={36} color={colors.success || '#10B981'} />
                </View>
                <Text style={[styles.linkSuccessTitle, { color: colors.textPrimary }]}>
                  Join Link Ready!
                </Text>
                <Text style={[styles.linkSuccessSubtitle, { color: colors.textSecondary }]}>
                  Valid for 24 hours. Single-use only. Send this to {dependentNameInput}'s device.
                </Text>

                <View
                  style={[styles.tokenBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <Text style={[styles.tokenText, { color: colors.textPrimary }]}>
                    https://rasoigenie.in/join/{generatedLink.rawToken.slice(0, 16)}...
                  </Text>
                </View>

                <Button
                  title="Share Join Link"
                  onPress={handleShareLink}
                  style={{ width: '100%', marginBottom: 10 }}
                />
                <Button
                  title="Done"
                  variant="outline"
                  onPress={() => setDependentModalVisible(false)}
                  style={{ width: '100%' }}
                />
              </View>
            )}
          </Card>
        </View>
      </Modal>

      {/* ─── MODAL: MEMBER MANAGEMENT ACTIONS ──────────────────────────────── */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Manage {selectedMember?.display_name}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Role: {selectedMember?.role}
            </Text>

            {/* Promote to Co-owner */}
            {selectedMember?.role === 'member' && coOwnerCount < MAX_CO_OWNERS && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={async () => {
                  if (!selectedMember) return;
                  setActionModalVisible(false);
                  const res = await promoteOrDemoteCoOwner(selectedMember.user_id, 'co_owner');
                  if (!res.success) Alert.alert('Error', res.error);
                }}
              >
                <Icon name="star" size={20} color={colors.primary} />
                <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
                  Promote to Co-Owner (Can Pay)
                </Text>
              </TouchableOpacity>
            )}

            {/* Demote from Co-owner */}
            {selectedMember?.role === 'co_owner' && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={async () => {
                  if (!selectedMember) return;
                  setActionModalVisible(false);
                  const res = await promoteOrDemoteCoOwner(selectedMember.user_id, 'member');
                  if (!res.success) Alert.alert('Error', res.error);
                }}
              >
                <Icon name="arrow-down-circle" size={20} color={colors.textSecondary} />
                <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
                  Demote to Member
                </Text>
              </TouchableOpacity>
            )}

            {/* Reissue Link for Dependent */}
            {selectedMember?.role === 'dependent' && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (!selectedMember) return;
                  setActionModalVisible(false);
                  handleReissueLink(selectedMember);
                }}
              >
                <Icon name="refresh" size={20} color={colors.accent} />
                <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
                  Re-issue Join Link (Lost Device)
                </Text>
              </TouchableOpacity>
            )}

            {/* Transfer Ownership */}
            {selectedMember?.role !== 'dependent' && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (!selectedMember) return;
                  const targetMember = selectedMember;
                  setActionModalVisible(false);
                  Alert.alert(
                    'Transfer Ownership',
                    `Transfer family ownership to ${targetMember.display_name}? You will become a regular member.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Transfer',
                        onPress: async () => {
                          const res = await transferFamilyOwnership(targetMember.user_id);
                          if (!res.success) Alert.alert('Error', res.error);
                        },
                      },
                    ],
                  );
                }}
              >
                <Icon name="key" size={20} color={colors.warning || '#F59E0B'} />
                <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
                  Transfer Ownership
                </Text>
              </TouchableOpacity>
            )}

            {/* Remove Member */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                if (!selectedMember) return;
                const targetMember = selectedMember;
                setActionModalVisible(false);
                Alert.alert(
                  'Remove Member',
                  `Remove ${targetMember.display_name} from the family? Their cart items will also be removed.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: async () => {
                        const res = await removeFamilyMember(targetMember.user_id);
                        if (!res.success) Alert.alert('Error', res.error);
                      },
                    },
                  ],
                );
              }}
            >
              <Icon name="trash" size={20} color={colors.danger} />
              <Text style={[styles.actionRowText, { color: colors.danger }]}>
                Remove from Family
              </Text>
            </TouchableOpacity>

            <Button
              title="Close"
              variant="outline"
              onPress={() => setActionModalVisible(false)}
              style={{ marginTop: 12 }}
            />
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  subHeader: {
    fontSize: 13,
    marginTop: 2,
  },
  leaveButton: {
    padding: 8,
  },
  createBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  createSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  createCard: {
    padding: 20,
    borderRadius: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  featuresList: {
    marginVertical: 16,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    flex: 1,
  },
  createButton: {
    marginTop: 8,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  capacityNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  permissionBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
  },
  permissionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },
  memberCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  joinedText: {
    fontSize: 12,
    marginTop: 3,
  },
  moreButton: {
    padding: 8,
  },
  inviteCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitePhone: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  typeOption: {
    flex: 1,
    height: 70,
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  consentText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  linkGeneratedBox: {
    alignItems: 'center',
    paddingTop: 10,
  },
  linkSuccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  linkSuccessSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  tokenBox: {
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
