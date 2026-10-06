import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { ChefStudioStage } from '../types';

interface StepNavigationProps {
  currentStage: ChefStudioStage;
  completedStages: Record<ChefStudioStage, boolean>;
  onSelectStage: (stage: ChefStudioStage) => void;
}

interface StageConfig {
  key: ChefStudioStage;
  label: string;
  subtitle: string;
  icon: string;
}

const STAGES: StageConfig[] = [
  { key: 'details', label: 'Details', subtitle: 'Basic & Dietary', icon: 'document-text-outline' },
  { key: 'ingredients', label: 'Ingredients', subtitle: 'Inventory Items', icon: 'nutrition-outline' },
  { key: 'steps', label: 'Cooking Steps', subtitle: 'Method & Photos', icon: 'restaurant-outline' },
  { key: 'review', label: 'Review', subtitle: 'Readiness Check', icon: 'checkmark-circle-outline' },
];

export function StepNavigation({
  currentStage,
  completedStages,
  onSelectStage,
}: StepNavigationProps) {
  const { colors } = useTheme();

  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.stepsRow}>
        {STAGES.map((s, idx) => {
          const isActive = s.key === currentStage;
          const isCompleted = completedStages[s.key] && !isActive;
          const isPast = idx < currentIndex;
          const canClick = isPast || isCompleted || idx <= currentIndex + 1;

          return (
            <React.Fragment key={s.key}>
              {idx > 0 && (
                <View
                  style={[
                    styles.connectorLine,
                    {
                      backgroundColor:
                        idx <= currentIndex ? colors.primary : colors.borderLight,
                    },
                  ]}
                />
              )}

              <TouchableOpacity
                onPress={() => onSelectStage(s.key)}
                disabled={!canClick}
                activeOpacity={0.7}
                style={[
                  styles.stepItem,
                  {
                    opacity: canClick ? 1 : 0.45,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Step ${idx + 1}: ${s.label}`}
              >
                {/* Step circle / indicator */}
                <View
                  style={[
                    styles.stepBadge,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : isCompleted
                        ? '#10B981'
                        : colors.bgSubtle,
                      borderColor: isActive
                        ? colors.primary
                        : isCompleted
                        ? '#10B981'
                        : colors.borderLight,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepBadgeNumber,
                        {
                          color: isActive ? '#FFFFFF' : colors.textSecondary,
                        },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>

                {/* Text column */}
                <View style={styles.stepTextCol}>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isActive
                          ? colors.primary
                          : isCompleted
                          ? colors.textPrimary
                          : colors.textSecondary,
                        fontWeight: isActive ? '800' : '600',
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                  <Text
                    style={[
                      styles.stepSubtitle,
                      {
                        color: colors.textMuted,
                      },
                    ]}
                  >
                    {s.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    minWidth: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepTextCol: {
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 13,
  },
  stepSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
