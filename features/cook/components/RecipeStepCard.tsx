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
  const { colors, radii, shadows, isDark } = useTheme();

  const isLargeText = textSize === 'large';
  const isCounterText = textSize === 'counter';
  const titleFontSize = isCounterText ? 32 : isLargeText ? 26 : 19;
  const instructionFontSize = isCounterText ? 24 : isLargeText ? 20 : 15;
  const instructionLineHeight = isCounterText ? 34 : isLargeText ? 28 : 22;

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
          ...shadows.card,
        },
      ]}
    >
      {/* Step Header Badge & Step Number */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View
            style={[
              styles.stepNumberBadge,
              { backgroundColor: colors.primary, borderRadius: radii.pill },
            ]}
          >
            <Text style={styles.stepNumberBadgeText}>Step {stepIndex + 1}</Text>
          </View>
          {step.timerSeconds && step.timerSeconds > 0 ? (
            <View
              style={[
                styles.timeBadge,
                {
                  backgroundColor: colors.bgSubtle,
                  borderRadius: radii.pill,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Icon name="time" size={12} color={colors.textSecondary} />
              <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]}>
                {Math.round(step.timerSeconds / 60)} min
              </Text>
            </View>
          ) : null}
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
        <View
          style={[
            styles.photoContainer,
            { borderRadius: radii.lg, borderColor: colors.borderLight },
          ]}
        >
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
              borderColor: colors.primary + '50',
              borderRadius: radii.lg,
              ...shadows.soft,
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
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stepNumberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepsFraction: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  photoContainer: {
    overflow: 'hidden',
    height: 240,
    width: '100%',
    borderWidth: 1,
    marginBottom: 16,
  },
  stepPhoto: {
    width: '100%',
    height: '100%',
  },
  stepInstruction: {
    fontWeight: '400',
    marginBottom: 14,
  },
  tipCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
    gap: 12,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipContent: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
