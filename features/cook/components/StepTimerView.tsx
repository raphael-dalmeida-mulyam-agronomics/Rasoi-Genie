import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCookMode } from '../../../framework/context/CookModeContext';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';

interface StepTimerViewProps {
  orderId: string;
  kitId: string;
  stepNumber: number;
  stepTitle: string;
  timerSeconds: number;
}

export const StepTimerView: React.FC<StepTimerViewProps> = ({
  orderId,
  kitId,
  stepNumber,
  stepTitle,
  timerSeconds,
}) => {
  const { colors, radii, isDark } = useTheme();
  const { getProgressForOrderKit, startTimer, pauseTimer, resetTimer } = useCookMode();

  const progress = getProgressForOrderKit(orderId, kitId);
  const timer = progress.timer;

  // Determine active remaining seconds
  const isThisStepTimer = timer && timer.stepNumber === stepNumber;
  const isRunning = isThisStepTimer && timer.isRunning;
  const remainingSeconds =
    isThisStepTimer && timer.remainingSeconds !== undefined ? timer.remainingSeconds : timerSeconds;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleTogglePlay = async () => {
    if (isRunning) {
      await pauseTimer(orderId, kitId);
    } else {
      await startTimer(orderId, kitId, stepNumber, timerSeconds, stepTitle);
    }
  };

  const handleReset = async () => {
    await resetTimer(orderId, kitId, timerSeconds);
  };

  return (
    <View
      testID={`step-timer-${stepNumber}`}
      style={[
        styles.container,
        {
          backgroundColor: isRunning
            ? isDark
              ? '#3B1D06'
              : '#FEF3C7'
            : isDark
              ? '#1E293B'
              : colors.bgSubtle,
          borderColor: isRunning ? colors.primary : colors.borderLight,
          borderRadius: radii.lg,
        },
      ]}
    >
      <View style={styles.topInfo}>
        <View style={styles.titleWrap}>
          <Icon
            name={isRunning ? 'flame' : 'time'}
            size={18}
            color={isRunning ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.timerLabel, { color: colors.textPrimary }]}>
            Step Timer ({Math.round(timerSeconds / 60)} min)
          </Text>
        </View>

        {remainingSeconds === 0 && (
          <View style={[styles.doneBadge, { backgroundColor: '#10B981' }]}>
            <Text style={styles.doneText}>Complete ✓</Text>
          </View>
        )}
      </View>

      <View style={styles.timerBody}>
        {/* Large digital countdown */}
        <Text
          testID="timer-digits-display"
          style={[
            styles.digits,
            {
              color: isRunning ? colors.primary : colors.textPrimary,
            },
          ]}
        >
          {formattedTime}
        </Text>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            testID="timer-start-pause-btn"
            style={[
              styles.actionBtn,
              {
                backgroundColor: isRunning ? '#EAB308' : colors.primary,
                borderRadius: radii.md,
              },
            ]}
            onPress={handleTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={
              isRunning ? `Pause timer for step ${stepNumber}` : `Start timer for ${formattedTime}`
            }
          >
            <Icon name={isRunning ? 'pause' : 'play'} size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{isRunning ? 'Pause' : 'Start Timer'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="timer-reset-btn"
            style={[
              styles.resetBtn,
              {
                borderColor: colors.borderLight,
                backgroundColor: colors.bgSurface,
                borderRadius: radii.md,
              },
            ]}
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel={`Reset timer for step ${stepNumber} to ${Math.round(timerSeconds / 60)} minutes`}
          >
            <Icon name="refresh" size={16} color={colors.textSecondary} />
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderWidth: 1.5,
    marginVertical: 12,
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  timerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  digits: {
    fontSize: 38,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
