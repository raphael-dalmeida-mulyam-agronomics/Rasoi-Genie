import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useCookMode } from '../../../framework/context/CookModeContext';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { Badge } from '../../../framework/ui/Badge';

export const ResumeCookingBanner: React.FC = () => {
  const { activeOrders, isOrderDismissed, dismissCookMode, getProgressForOrderKit } = useCookMode();
  const { colors, radii, shadows, isDark } = useTheme();

  // Find the first active order that has NOT been dismissed
  const undismissedOrder = activeOrders.find((o) => !isOrderDismissed(o.id));

  if (!undismissedOrder) {
    return null;
  }

  const firstKit = undismissedOrder.items?.[0];
  const kitId = firstKit?.kitId || firstKit?.id || 'kit-1';
  const kitName = firstKit?.name || 'Meal Kit';
  const progress = getProgressForOrderKit(undismissedOrder.id, kitId);
  const stepLabel = progress.isCompleted
    ? 'Recipe completed ✓'
    : `Step ${(progress.currentStepIndex || 0) + 1}`;

  const handleResume = () => {
    router.push({
      pathname: '/cook/[orderId]' as any,
      params: { orderId: undismissedOrder.id },
    });
  };

  const handleDismiss = async () => {
    await dismissCookMode(undismissedOrder.id);
  };

  return (
    <View
      testID="resume-cooking-banner"
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
          borderColor: colors.primary,
          borderRadius: radii.xl,
          ...shadows.card,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Icon name="restaurant" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Resume Cooking Guide
              </Text>
              <Badge
                label={undismissedOrder.status}
                variant={undismissedOrder.status === 'Preparing' ? 'warning' : 'accent'}
                size="sm"
              />
            </View>
            <Text style={[styles.kitSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {kitName} • {stepLabel}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="dismiss-resume-banner-btn"
          style={styles.closeBtn}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss cooking resume banner"
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Your recipe is ready to cook step-by-step
        </Text>
        <TouchableOpacity
          testID="resume-recipe-cta-btn"
          style={[styles.resumeBtn, { backgroundColor: colors.primary }]}
          onPress={handleResume}
          accessibilityRole="button"
          accessibilityLabel={`Resume cooking ${kitName}`}
        >
          <Text style={styles.resumeBtnText}>Start cooking</Text>
          <Icon name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  kitSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 11,
    flex: 1,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
