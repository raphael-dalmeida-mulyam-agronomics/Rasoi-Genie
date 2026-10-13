import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

export interface LeaveFamilySheetProps {
  visible: boolean;
  onClose: () => void;
  onLeft?: () => void;
}

export const LeaveFamilySheet: React.FC<LeaveFamilySheetProps> = ({ visible, onClose, onLeft }) => {
  const { colors } = useTheme();
  const { leaveCurrentFamily, family } = useFamily();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = familyStrings.leaveFamily;

  const handleLeave = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await leaveCurrentFamily();
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to leave family.');
      } else {
        onClose();
        onLeft?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error leaving family.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.title} testID="leave-family-sheet">
      <View style={styles.container}>
        <View style={styles.warningBox}>
          <Icon name="warning" size={20} color="#DC2626" style={{ marginRight: 10 }} />
          <Text style={styles.warningText}>
            {t.desc} ({family?.name || 'this family'}).
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <Button
          title={isSubmitting ? 'Leaving Family...' : t.confirmBtn}
          variant="danger"
          size="lg"
          onPress={handleLeave}
          disabled={isSubmitting}
          loading={isSubmitting}
          testID="confirm-leave-btn"
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
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 10,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#991B1B',
    flex: 1,
    fontWeight: '500',
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
