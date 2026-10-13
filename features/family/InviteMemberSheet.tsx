import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Input } from '../../framework/ui/Input';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { ConsentNotice } from './ConsentNotice';

export interface InviteMemberSheetProps {
  visible: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

export const InviteMemberSheet: React.FC<InviteMemberSheetProps> = ({
  visible,
  onClose,
  onInvited,
}) => {
  const { colors } = useTheme();
  const { inviteAdult, members, invites } = useFamily();

  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = familyStrings.inviteMember;

  const handleSend = async () => {
    const raw = phone.trim().replace(/\D/g, '');
    const cleanDigits = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw;

    if (cleanDigits.length !== 10) {
      setErrorMsg(t.errors.invalidPhone);
      return;
    }

    const occupiedSeats = members.length + invites.filter((i) => i.status === 'pending').length;
    if (occupiedSeats >= 6) {
      setErrorMsg(t.errors.familyFull);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await inviteAdult(cleanDigits);
      if (!res.success) {
        if (res.error?.includes('registered') || res.error?.includes('sign up')) {
          setErrorMsg(t.errors.notRegistered);
        } else if (res.error?.includes('already in a family')) {
          setErrorMsg(t.errors.alreadyInFamily);
        } else if (res.error?.includes('daily limit')) {
          setErrorMsg(t.errors.dailyLimit);
        } else if (res.error?.includes('full')) {
          setErrorMsg(t.errors.familyFull);
        } else {
          setErrorMsg(res.error || 'Failed to send invite.');
        }
      } else {
        setPhone('');
        onClose();
        onInvited?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error sending invitation.');
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
      testID="invite-member-sheet"
    >
      <View style={styles.container}>
        {/* +91 Phone Input */}
        <View>
          <Input
            label={t.phoneLabel}
            placeholder={t.phonePlaceholder}
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              if (errorMsg) setErrorMsg(null);
            }}
            keyboardType="phone-pad"
            maxLength={14}
            prefixText="+91 "
            helperText="10-digit Indian mobile number"
            testID="invite-phone-input"
          />
        </View>

        {/* Consent Note */}
        <ConsentNotice
          title="Privacy Notice"
          items={[t.consentNotice]}
          note="They can accept or decline the invitation anytime from their Account tab."
        />

        {/* Error State */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Button
          title={isSubmitting ? t.sendingButton : t.submitButton}
          variant="primary"
          size="lg"
          onPress={handleSend}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={{ marginTop: 8 }}
          testID="send-invite-btn"
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 4,
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
