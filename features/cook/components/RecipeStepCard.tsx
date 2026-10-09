import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { RecipeStep } from '../../../framework/services/mealKitsService';
import { useCookMode } from '../../../framework/context/CookModeContext';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { StepTimerView } from './StepTimerView';

interface RecipeStepCardProps {
  orderId: string;
  kitId: string;
  step: RecipeStep;
  stepIndex: number;
  totalSteps: number;
  fallbackHeroImage?: string;
}

export const RecipeStepCard: React.FC<RecipeStepCardProps> = ({
  orderId,
  kitId,
  step,
  stepIndex,
  totalSteps,
  fallbackHeroImage,
}) => {
  const { textSize } = useCookMode();
  const { colors, radii, isDark } = useTheme();

  const isLargeText = textSize === 'large';
  const titleFontSize = isLargeText ? 26 : 19;
  const instructionFontSize = isLargeText ? 20 : 15;
  const instructionLineHeight = isLargeText ? 28 : 22;

  const photoUri = step.imageUrl || fallbackHeroImage;

  return (
    <View
      testID={`recipe-step-card-${step.stepNumber}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.xl,
        },
      ]}
    >
      {/* Step Header Badge & Step Number */}
      <View style={styles.headerRow}>
        <View style={[styles.stepNumberBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.stepNumberBadgeText}>Step {stepIndex + 1}</Text>
        </View>
        <Text style={[styles.stepsFraction, { color: colors.textMuted }]}>
          {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      {/* Step Title (scales with kitchen text mode) */}
      <Text
        testID="step-card-title"
        style={[
          styles.stepTitle,
          {
            color: colors.textPrimary,
            fontSize: titleFontSize,
            lineHeight: titleFontSize * 1.3,
          },
        ]}
      >
        {step.title}
      </Text>

      {/* Step Photo (with fallback) */}
      {photoUri && (
        <View style={[styles.photoContainer, { borderRadius: radii.lg }]}>
          <Image
            source={{ uri: photoUri }}
            style={styles.stepPhoto}
            resizeMode="cover"
            accessibilityLabel={`Photo demonstrating step ${step.stepNumber}: ${step.title}`}
          />
        </View>
      )}

      {/* Step Instruction (scales with kitchen text mode) */}
      <Text
        testID="step-card-instruction"
        style={[
          styles.stepInstruction,
          {
            color: colors.textPrimary,
            fontSize: instructionFontSize,
            lineHeight: instructionLineHeight,
          },
        ]}
      >
        {step.instruction}
      </Text>

      {/* Embedded Step Timer (if step has timerSeconds) */}
      {step.timerSeconds && step.timerSeconds > 0 ? (
        <StepTimerView
          orderId={orderId}
          kitId={kitId}
          stepNumber={step.stepNumber}
          stepTitle={step.title}
          timerSeconds={step.timerSeconds}
        />
      ) : null}

      {/* Chef Tip Callout */}
      {step.tip ? (
        <View
          style={[
            styles.tipCallout,
            {
              backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
              borderColor: colors.primary,
              borderRadius: radii.md,
            },
          ]}
        >
          <View style={[styles.tipIconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="chef" size={16} color={colors.primary} />
          </View>
          <View style={styles.tipTextWrap}>
            <Text style={[styles.tipTitle, { color: colors.primary }]}>CHEF'S SECRET TIP</Text>
            <Text style={[styles.tipContent, { color: colors.textPrimary }]}>{step.tip}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepNumberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepsFraction: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepTitle: {
    fontWeight: '800',
    marginBottom: 14,
  },
  photoContainer: {
    overflow: 'hidden',
    height: 200,
    width: '100%',
    marginBottom: 14,
  },
  stepPhoto: {
    width: '100%',
    height: '100%',
  },
  stepInstruction: {
    fontWeight: '400',
    marginBottom: 10,
  },
  tipCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 10,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  tipContent: {
    fontSize: 12,
    lineHeight: 16,
  },
});
