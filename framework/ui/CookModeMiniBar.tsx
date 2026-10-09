import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useCookMode } from '../context/CookModeContext';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { ActiveOrdersSelectorModal } from './ActiveOrdersSelectorModal';

export const CookModeMiniBar: React.FC = () => {
  const { activeOrders, getProgressForOrderKit, activeOrderWithTimer } = useCookMode();
  const { colors, radii, shadows, isDark } = useTheme();
  const pathname = usePathname();
  const [selectorVisible, setSelectorVisible] = useState(false);

  // If currently inside the full-screen cook mode route, hide the docked mini-bar
  if (pathname && pathname.startsWith('/cook')) {
    return null;
  }

  // Hide if there are no active orders
  if (!activeOrders || activeOrders.length === 0) {
    return null;
  }

  // The primary order to show: if any order has an active running timer, prioritize that, else most recent active order
  const primaryOrder = activeOrderWithTimer?.order || activeOrders[0];
  if (!primaryOrder) {
    return null;
  }
  const moreCount = activeOrders.length - 1;

  const firstKit = primaryOrder.items?.[0];
  const kitId = activeOrderWithTimer?.kitId || firstKit?.kitId || firstKit?.id || 'kit-1';
  const kitName = firstKit?.name || 'Meal Kit Recipe';

  const progress = getProgressForOrderKit(primaryOrder.id, kitId);
  const currentStepDisplay = progress.isCompleted
    ? 'Completed ✓'
    : `Step ${(progress.currentStepIndex || 0) + 1}`;

  // Running timer format mm:ss
  const runningTimer = activeOrderWithTimer?.timer?.isRunning
    ? activeOrderWithTimer.timer
    : progress.timer?.isRunning
      ? progress.timer
      : null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBarPress = () => {
    if (moreCount > 0) {
      setSelectorVisible(true);
    } else {
      router.push({
        pathname: '/cook/[orderId]' as any,
        params: { orderId: primaryOrder.id },
      });
    }
  };

  const handleOpenDirectly = (e: any) => {
    e.stopPropagation();
    router.push({
      pathname: '/cook/[orderId]' as any,
      params: { orderId: primaryOrder.id },
    });
  };

  return (
    <>
      <View
        testID="cook-mode-mini-bar"
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
            borderColor: colors.primary,
            borderRadius: radii.xl,
            ...shadows.card,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchArea}
          onPress={handleBarPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Resume cooking ${kitName}, ${currentStepDisplay}. Tapping reopens the cooking guide.`}
        >
          {/* Chef Hat / Timer Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Icon name={runningTimer ? 'time' : 'restaurant'} size={18} color="#FFFFFF" />
          </View>

          {/* Details */}
          <View style={styles.textWrap}>
            <View style={styles.topRow}>
              <Text style={[styles.kitTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {kitName}
              </Text>
              {moreCount > 0 && (
                <TouchableOpacity
                  style={[styles.moreChip, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setSelectorVisible(true)}
                  accessibilityLabel={`${moreCount} more active orders`}
                >
                  <Text style={[styles.moreChipText, { color: colors.primary }]}>
                    +{moreCount} more
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bottomRow}>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                {currentStepDisplay}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>•</Text>
              <Badge
                label={primaryOrder.status}
                variant={
                  primaryOrder.status === 'Confirmed'
                    ? 'success'
                    : primaryOrder.status === 'Preparing'
                      ? 'warning'
                      : 'accent'
                }
                size="sm"
              />
              {runningTimer && runningTimer.remainingSeconds > 0 && (
                <View style={[styles.liveTimerPill, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="flame" size={12} color="#DC2626" />
                  <Text style={styles.liveTimerText}>
                    {formatTimer(runningTimer.remainingSeconds)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.resumeBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenDirectly}
            accessibilityLabel="Cook now"
          >
            <Text style={styles.resumeBtnText}>Cook now</Text>
            <Icon name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <ActiveOrdersSelectorModal
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        activeOrders={activeOrders}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 70 : 62,
    left: 12,
    right: 12,
    zIndex: 9999,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  touchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kitTitle: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  moreChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  moreChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveTimerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
