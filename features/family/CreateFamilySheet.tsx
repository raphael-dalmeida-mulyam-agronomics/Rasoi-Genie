import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { formatFamilyName } from '../../framework/services/familyService';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Input } from '../../framework/ui/Input';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Checkbox } from '../../framework/ui/Checkbox';

export interface CreateFamilySheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateFamilySheet: React.FC<CreateFamilySheetProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const { colors, radii, isDark } = useTheme();
  const { createNewFamily } = useFamily();

  const [familyName, setFamilyName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = familyStrings.createFamily;

  const handleCreate = async () => {
    const trimmed = familyName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a family name.');
      return;
    }
    if (trimmed.length > 30) {
      setErrorMsg('Family name must be 30 characters or fewer.');
      return;
    }
    if (!ageConfirmed) {
      setErrorMsg('You must confirm that you are 18 years of age or older.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const formatted = formatFamilyName(trimmed);
      const res = await createNewFamily(formatted);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create family. Please try again.');
      } else {
        setFamilyName('');
        setAgeConfirmed(false);
        onClose();
        onCreated?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error creating family.');
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
      testID="create-family-sheet"
    >
      <View style={styles.container}>
        {/* Name Input */}
        <Input
          label={t.nameLabel}
          placeholder={t.namePlaceholder}
          value={familyName}
          onChangeText={(val) => {
            setFamilyName(val);
            if (errorMsg) setErrorMsg(null);
          }}
          maxLength={30}
          helperText={`${familyName.length}/30 characters`}
          testID="family-name-input"
        />

        {/* 3-Point Explainer */}
        <View style={styles.explainersBox}>
          {t.explainers.map((exp, idx) => (
            <View key={idx} style={styles.explainerRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                <Icon name={exp.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.explainerTextWrap}>
                <Text style={[styles.explainerTitle, { color: colors.textPrimary }]}>
                  {exp.title}
                </Text>
                <Text style={[styles.explainerDesc, { color: colors.textSecondary }]}>
                  {exp.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 18+ Confirmation Checkbox */}
        <Checkbox
          card
          checked={ageConfirmed}
          onPress={() => {
            setAgeConfirmed(!ageConfirmed);
            if (errorMsg) setErrorMsg(null);
          }}
          label={t.ageConfirmation}
          accessibilityLabel={t.ageConfirmation}
          testID="age-confirmation-check"
        />

        {/* Error message */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Primary Action Button */}
        <Button
          title={isSubmitting ? t.creatingButton : t.submitButton}
          variant="primary"
          size="lg"
          onPress={handleCreate}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={{ marginTop: 16 }}
          testID="submit-create-family-btn"
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  explainersBox: {
    gap: 12,
    marginVertical: 4,
  },
  explainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  explainerTextWrap: {
    flex: 1,
  },
  explainerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  explainerDesc: {
    fontSize: 12,
    lineHeight: 16,
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
    fontSize: 13,
    fontWeight: '500',
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
