import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { FamilyMember } from '../../framework/services/familyService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Icon } from '../../framework/ui/Icon';
import { Button } from '../../framework/ui/Button';

export interface MemberOptionsSheetProps {
  member: FamilyMember | null;
  visible: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
  onOpenTransfer?: () => void;
}

export const MemberOptionsSheet: React.FC<MemberOptionsSheetProps> = ({
  member,
  visible,
  onClose,
  onActionComplete,
  onOpenTransfer,
}) => {
  const { colors, radii, isDark } = useTheme();
  const { promoteOrDemoteCoOwner, removeFamilyMember, reissueLink, members } = useFamily();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!member) return null;

  const t = familyStrings.memberOptions;
  const isCoOwner = member.role === 'co_owner';
  const isAdultMember = member.role === 'member';
  const isDependent = member.role === 'dependent';

  const coOwnerCount = members.filter((m) => m.role === 'co_owner').length;

  const handleToggleCoOwner = async () => {
    if (!isCoOwner && coOwnerCount >= 2) {
      setErrorMsg('Maximum 2 co-owners allowed per family.');
      return;
    }

    setErrorMsg(null);
    setLoadingAction('co_owner');
    try {
      const res = await promoteOrDemoteCoOwner(member.user_id, isCoOwner ? 'member' : 'co_owner');
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update co-owner role.');
      } else {
        onClose();
        onActionComplete?.();
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReissue = async () => {
    setErrorMsg(null);
    setLoadingAction('reissue');
    try {
      const res = await reissueLink(member.user_id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to re-issue join link.');
      } else {
        Alert.alert(
          'Fresh Link Created',
          `A new 24-hour join link has been generated for ${member.display_name}.`,
          [{ text: 'OK', onPress: onClose }],
        );
        onActionComplete?.();
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemove = () => {
    Alert.alert(t.removeConfirmTitle(member.display_name), t.removeConfirmDesc, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setLoadingAction('remove');
          try {
            const res = await removeFamilyMember(member.user_id);
            if (!res.success) {
              setErrorMsg(res.error || 'Failed to remove member.');
            } else {
              onClose();
              onActionComplete?.();
            }
          } finally {
            setLoadingAction(null);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.title} testID="member-options-sheet">
      <View style={styles.container}>
        {/* Member Header Card */}
        <View
          style={[
            styles.memberCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.bgSubtle,
              borderColor: colors.borderLight,
              borderRadius: radii.lg,
            },
          ]}
        >
          <Avatar name={member.display_name} id={member.user_id} size="lg" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {member.display_name}
            </Text>
            <View style={{ marginTop: 4 }}>
              <RoleBadge role={member.role} dependentType={member.dependent_type} size="sm" />
            </View>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Option 1: Promote / Demote Co-owner */}
        {(isAdultMember || isCoOwner) && (
          <TouchableOpacity
            style={[
              styles.actionRow,
              {
                borderColor: colors.borderLight,
                borderRadius: radii.md,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : colors.bgSurface,
              },
            ]}
            onPress={handleToggleCoOwner}
            disabled={loadingAction !== null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isCoOwner ? t.removeCoOwner : t.makeCoOwner}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="card" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                {isCoOwner ? t.removeCoOwner : t.makeCoOwner}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                {isCoOwner ? t.removeCoOwnerDesc : t.makeCoOwnerDesc}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Option 2: Re-issue Join Link (Dependents) */}
        {isDependent && (
          <TouchableOpacity
            style={[
              styles.actionRow,
              {
                borderColor: colors.borderLight,
                borderRadius: radii.md,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : colors.bgSurface,
              },
            ]}
            onPress={handleReissue}
            disabled={loadingAction !== null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t.reissueLink}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Icon name="link" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                {t.reissueLink}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                {t.reissueLinkDesc}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Option 3: Transfer Ownership (Adults) */}
        {(isAdultMember || isCoOwner) && onOpenTransfer && (
          <TouchableOpacity
            style={[
              styles.actionRow,
              {
                borderColor: colors.borderLight,
                borderRadius: radii.md,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : colors.bgSurface,
              },
            ]}
            onPress={() => {
              onClose();
              onOpenTransfer();
            }}
            disabled={loadingAction !== null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Transfer ownership"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="shield" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                Transfer Ownership
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                Make {member.display_name} the family owner.
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Option 4: Danger - Remove from family */}
        <TouchableOpacity
          style={[
            styles.actionRow,
            {
              borderColor: '#FCA5A5',
              borderRadius: radii.md,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : '#FEF2F2',
            },
          ]}
          onPress={handleRemove}
          disabled={loadingAction !== null}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.removeFromFamily}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="trash" size={18} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>{t.removeFromFamily}</Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t.removeFromFamilyDesc}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    minHeight: 56,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
