import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useSubscription } from '../../framework/context/SubscriptionContext';
import {
  checkSubscriptionPopupEligibility,
  getPersistedPopupState,
  recordSubscriptionPopupShown,
} from '../../framework/services/subscriptionPopupService';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

interface SubscriptionPostOrderPopupProps {
  isFamilyOwner?: boolean;
  onNavigateToPlans?: () => void;
}

export const SubscriptionPostOrderPopup: React.FC<SubscriptionPostOrderPopupProps> = ({
  isFamilyOwner = false,
  onNavigateToPlans,
}) => {
  const { colors, radii, shadows } = useTheme();
  const { user } = useAuth();
  const { role } = useFamily();
  const { isSubscribed } = useSubscription();

  const [visible, setVisible] = useState(false);
  const t = subscriptionStrings.popup;

  const effectiveUserId = user?.uid || null;

  useEffect(() => {
    // Guest or unauthenticated users don't have persisted subscription accounts
    if (!effectiveUserId) return;

    let isMounted = true;

    async function evaluateEligibility() {
      // 1. If user is subscribed (own or family covered), NEVER show
      if (isSubscribed) return;

      const state = await getPersistedPopupState(effectiveUserId!);
      const result = checkSubscriptionPopupEligibility({
        isSubscribed,
        promptCount: state.promptCount,
        lastPromptedAt: state.lastPromptedAt,
      });

      if (result.eligible && isMounted) {
        // Non-blocking presentation: slight delay so the order confirmation renders first
        setTimeout(() => {
          if (isMounted) {
            setVisible(true);
          }
        }, 500);
      }
    }

    evaluateEligibility();

    return () => {
      isMounted = false;
    };
  }, [effectiveUserId, isSubscribed]);

  const handleDismiss = async () => {
    setVisible(false);
    if (effectiveUserId) {
      await recordSubscriptionPopupShown(effectiveUserId);
    }
  };

  const handleViewPlans = async () => {
    setVisible(false);
    if (effectiveUserId) {
      await recordSubscriptionPopupShown(effectiveUserId);
    }

    if (onNavigateToPlans) {
      onNavigateToPlans();
      return;
    }

    const isOwner = isFamilyOwner || role === 'owner';
    if (isOwner) {
      router.push('/(tabs)/family/subscription' as any);
    } else {
      router.push('/(tabs)/profile' as any);
    }
  };

  if (!visible) return null;

  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width - 32, 420);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
      testID="subscription-post-order-popup"
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl || 20,
                ...shadows.card,
              },
            ]}
          >
            {/* Header Badge & Icon */}
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Icon name="calendar" size={28} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>

            {/* Feature Bullets */}
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Icon
                  name="check-circle"
                  size={16}
                  color={colors.success}
                  style={{ marginTop: 2 }}
                />
                <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{t.bullet1}</Text>
              </View>
              <View style={styles.bulletRow}>
                <Icon
                  name="check-circle"
                  size={16}
                  color={colors.success}
                  style={{ marginTop: 2 }}
                />
                <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{t.bullet2}</Text>
              </View>
              <View style={styles.bulletRow}>
                <Icon
                  name="check-circle"
                  size={16}
                  color={colors.success}
                  style={{ marginTop: 2 }}
                />
                <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{t.bullet3}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsWrap}>
              <Button
                title={t.viewPlansBtn}
                variant="primary"
                size="md"
                onPress={handleViewPlans}
                style={{ width: '100%', marginBottom: 8 }}
                testID="sub-popup-view-plans-btn"
              />
              <Button
                title={t.maybeLaterBtn}
                variant="ghost"
                size="sm"
                onPress={handleDismiss}
                style={{ width: '100%' }}
                testID="sub-popup-maybe-later-btn"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
  },
  card: {
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  bulletList: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  actionsWrap: {
    width: '100%',
    alignItems: 'center',
  },
});
