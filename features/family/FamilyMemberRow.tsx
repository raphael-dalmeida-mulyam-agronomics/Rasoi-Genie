import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import {
  FamilyMember,
  FamilyInvite,
  FamilyJoinLink,
  maskPhoneNumber,
  extractFirstName,
} from '../../framework/services/familyService';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';

export interface FamilyMemberRowProps {
  member?: FamilyMember;
  pendingInvite?: FamilyInvite;
  pendingLink?: FamilyJoinLink;
  canManage?: boolean;
  isSelf?: boolean;
  onPressMenu?: () => void;
  testID?: string;
}

export const FamilyMemberRow: React.FC<FamilyMemberRowProps> = ({
  member,
  pendingInvite,
  pendingLink,
  canManage = false,
  isSelf = false,
  onPressMenu,
  testID,
}) => {
  const { colors, radii, isDark } = useTheme();

  // 1. Pending Phone Invite Row
  if (pendingInvite) {
    const masked = maskPhoneNumber(pendingInvite.invited_phone);
    const expiresDate = new Date(pendingInvite.expires_at);
    const diffHours = Math.max(
      0,
      Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60)),
    );

    return (
      <View
        testID={testID}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.lg,
          },
        ]}
      >
        <Avatar name={masked} size="md" />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {masked}
            </Text>
            <Badge label="Pending Invite" variant="warning" size="sm" />
          </View>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            {diffHours > 0 ? `Expires in ${diffHours}h` : 'Expired'}
          </Text>
        </View>
      </View>
    );
  }

  // 2. Pending Join Link Row
  if (pendingLink) {
    const expiresDate = new Date(pendingLink.expires_at);
    const diffHours = Math.max(
      0,
      Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60)),
    );

    return (
      <View
        testID={testID}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.lg,
          },
        ]}
      >
        <Avatar name={pendingLink.display_name} size="md" />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {pendingLink.display_name}
            </Text>
            <RoleBadge role="dependent" dependentType={pendingLink.dependent_type} size="sm" />
          </View>
          <Text style={[styles.subtext, { color: colors.textSecondary }]}>
            Link not used yet • {diffHours > 0 ? `Expires in ${diffHours}h` : 'Expired'}
          </Text>
        </View>
      </View>
    );
  }

  // 3. Active Member Row
  if (!member) return null;

  const joinedFormatted = member.joined_at
    ? new Date(member.joined_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.lg,
        },
      ]}
    >
      <Avatar name={member.display_name} id={member.user_id} size="md" />
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {extractFirstName(member.display_name)}
            {isSelf ? ' (You)' : ''}
          </Text>
          <RoleBadge role={member.role} dependentType={member.dependent_type} size="sm" />
        </View>
        <Text style={[styles.subtext, { color: colors.textMuted }]}>
          {joinedFormatted ? `Joined ${joinedFormatted}` : 'Active Member'}
        </Text>
      </View>

      {/* Owner Menu Trigger (don't show menu on self) */}
      {canManage && !isSelf && onPressMenu ? (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onPressMenu}
          accessibilityRole="button"
          accessibilityLabel={`Manage ${member.display_name}`}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 58,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 12,
  },
  menuBtn: {
    padding: 8,
    borderRadius: 20,
  },
});
