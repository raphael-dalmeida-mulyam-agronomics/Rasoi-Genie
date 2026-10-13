import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { DependentType } from '../../framework/services/familyService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { SegmentedControl } from '../../framework/ui/SegmentedControl';
import { Input } from '../../framework/ui/Input';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Checkbox } from '../../framework/ui/Checkbox';
import { LinkShareCard } from './LinkShareCard';

export interface AddDependentSheetProps {
  visible: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

export const AddDependentSheet: React.FC<AddDependentSheetProps> = ({
  visible,
  onClose,
  onLinkCreated,
}) => {
  const { colors, radii, isDark } = useTheme();
  const { createDependentLink, members, invites } = useFamily();

  const [dependentType, setDependentType] = useState<DependentType>('child');
  const [firstName, setFirstName] = useState('');
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{
    rawToken: string;
    expiresAt?: string;
  } | null>(null);

  const t = familyStrings.addDependent;

  const handleGenerate = async () => {
    const trimmed = firstName.trim();
    if (!trimmed) {
      setErrorMsg(t.errors.nameRequired);
      return;
    }
    if (dependentType === 'child' && !guardianConsent) {
      setErrorMsg(t.errors.guardianConsentRequired);
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
      const res = await createDependentLink(dependentType, trimmed, guardianConsent);
      if (!res.success || !res.rawToken) {
        if (res.error?.includes('limit')) {
          setErrorMsg(t.errors.dailyLimit);
        } else if (res.error?.includes('full')) {
          setErrorMsg(t.errors.familyFull);
        } else {
          setErrorMsg(res.error || 'Failed to generate join link.');
        }
      } else {
        setCreatedLink({
          rawToken: res.rawToken,
          expiresAt: res.expiresAt,
        });
        onLinkCreated?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error generating join link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName('');
    setGuardianConsent(false);
    setCreatedLink(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleReset}
      title={createdLink ? undefined : t.title}
      subtitle={createdLink ? undefined : t.subtitle}
      testID="add-dependent-sheet"
    >
      <View style={styles.container}>
        {createdLink ? (
          <LinkShareCard
            dependentName={firstName.trim()}
            rawToken={createdLink.rawToken}
            expiresAt={createdLink.expiresAt}
            onDone={handleReset}
          />
        ) : (
          <>
            {/* Segmented Control: Child / Senior */}
            <View>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t.typeSelectorLabel}
              </Text>
              <SegmentedControl
                options={[
                  { label: t.childTab, value: 'child' },
                  { label: t.seniorTab, value: 'senior' },
                ]}
                selectedValue={dependentType}
                onSelect={(val) => {
                  setDependentType(val as DependentType);
                  if (errorMsg) setErrorMsg(null);
                }}
              />
            </View>

            {/* First Name Input */}
            <Input
              label={t.nameLabel}
              placeholder={t.namePlaceholder}
              value={firstName}
              onChangeText={(val) => {
                setFirstName(val);
                if (errorMsg) setErrorMsg(null);
              }}
              maxLength={20}
              helperText="Only first name is shared with household members"
              testID="dependent-name-input"
            />

            {/* Child Guardian Consent Checkbox OR Senior Notice */}
            {dependentType === 'child' ? (
              <Checkbox
                card
                checked={guardianConsent}
                onPress={() => {
                  setGuardianConsent(!guardianConsent);
                  if (errorMsg) setErrorMsg(null);
                }}
                label={t.childGuardianConsent}
                accessibilityLabel={t.childGuardianConsent}
                testID="dependent-guardian-consent-check"
              />
            ) : (
              <View
                style={[
                  styles.seniorNoticeBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.bgSubtle,
                    borderColor: colors.borderLight,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <Icon name="info" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.seniorNoticeText, { color: colors.textSecondary }]}>
                  {t.seniorConsentNote}
                </Text>
              </View>
            )}

            {/* Error state */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Generate Action Button */}
            <Button
              title={isSubmitting ? t.generatingBtn : t.generateBtn}
              variant="primary"
              size="lg"
              onPress={handleGenerate}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={{ marginTop: 8 }}
              testID="generate-link-btn"
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  seniorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  seniorNoticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
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
