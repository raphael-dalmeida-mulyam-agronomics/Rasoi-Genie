import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

export interface TransferOwnershipSheetProps {
  visible: boolean;
  onClose: () => void;
  onTransferred?: () => void;
}

export const TransferOwnershipSheet: React.FC<TransferOwnershipSheetProps> = ({
  visible,
  onClose,
  onTransferred,
}) => {
  const { colors, radii, isDark } = useTheme();
  const { members, currentMember, transferFamilyOwnership } = useFamily();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = familyStrings.transferOwnership;

  // Eligible successors must be adult members (member or co_owner), not current owner
  const eligibleMembers = members.filter(
    (m) => m.user_id !== currentMember?.user_id && m.role !== 'dependent',
  );

  const handleTransfer = async () => {
    if (!selectedUserId) {
      setErrorMsg('Please select an adult family member to transfer ownership to.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await transferFamilyOwnership(selectedUserId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to transfer ownership.');
      } else {
        onClose();
        onTransferred?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error transferring ownership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t.title}
      subtitle={t.subtitle}
      testID="transfer-ownership-sheet"
    >
      <View style={styles.container}>
        <View style={styles.warningBox}>
          <Icon name="warning" size={18} color="#92400E" style={{ marginRight: 8 }} />
          <Text style={styles.warningText}>{t.warning}</Text>
        </View>

        {eligibleMembers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No other adult members in the family. Invite an adult family member first before
              transferring ownership.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {eligibleMembers.map((m) => {
              const isSelected = selectedUserId === m.user_id;
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={[
                    styles.memberRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : isDark
                          ? 'rgba(255, 255, 255, 0.02)'
                          : colors.bgSurface,
                      borderRadius: radii.md,
                    },
                  ]}
                  onPress={() => {
                    setSelectedUserId(m.user_id);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Avatar name={m.display_name} id={m.user_id} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                      {m.display_name}
                    </Text>
                    <RoleBadge role={m.role} dependentType={m.dependent_type} size="sm" />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <Button
          title={isSubmitting ? 'Transferring...' : t.confirmBtn}
          variant="primary"
          size="lg"
          onPress={handleTransfer}
          disabled={isSubmitting || eligibleMembers.length === 0 || !selectedUserId}
          loading={isSubmitting}
          style={{ marginTop: 8 }}
          testID="confirm-transfer-btn"
        />

        <Button
          title={t.cancelBtn}
          variant="secondary"
          size="md"
          onPress={onClose}
          disabled={isSubmitting}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    gap: 12,
    minHeight: 56,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
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
