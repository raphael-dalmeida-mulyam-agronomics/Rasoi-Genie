import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useAuth } from '../../framework/context/AuthContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { respondToInvite } from '../../framework/services/familyService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Icon } from '../../framework/ui/Icon';
import { ConsentNotice } from './ConsentNotice';

export const InviteInboxView: React.FC = () => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { invites, refreshFamily, family } = useFamily();

  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = familyStrings.inviteInbox;

  // Filter for pending invites
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFamily();
    } finally {
      setRefreshing(false);
    }
  };

  const handleResponse = async (inviteId: string, accept: boolean) => {
    setErrorMsg(null);
    setActionId(inviteId);
    try {
      const res = await respondToInvite(inviteId, accept, user?.uid);
      if (!res.success) {
        if (res.error?.includes('expired')) {
          setErrorMsg(t.errors.expired);
        } else if (res.error?.includes('full')) {
          setErrorMsg(t.errors.familyFull);
        } else if (res.error?.includes('already in a family')) {
          setErrorMsg(t.errors.alreadyInFamily);
        } else {
          setErrorMsg(res.error || 'Failed to respond to invitation.');
        }
      } else {
        await refreshFamily();
        if (accept) {
          router.replace('/family' as any);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error responding to invitation.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <Text style={[styles.topTitle, { color: colors.textPrimary }]}>{t.title}</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Icon name="alert" size={16} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      ) : null}

      {pendingInvites.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="mail" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t.emptySubtitle}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {pendingInvites.map((inv) => (
            <View
              key={inv.id}
              style={[
                styles.inviteCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.xl,
                  ...shadows.card,
                },
              ]}
              testID={`invite-card-${inv.id}`}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Icon name="people" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
                    {t.cardHeading('Family Owner', family?.name || 'their Family')}
                  </Text>
                  <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                    Expires in{' '}
                    {Math.max(
                      1,
                      Math.ceil(
                        (new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      ),
                    )}{' '}
                    days
                  </Text>
                </View>
              </View>

              {/* What is shared */}
              <ConsentNotice
                title={t.whatIsSharedTitle}
                items={t.whatIsSharedList}
                note="You can leave the family anytime from your Account tab."
              />

              {/* Actions */}
              <View style={styles.actionsRow}>
                <Button
                  title={t.declineBtn}
                  variant="outline"
                  size="md"
                  onPress={() => handleResponse(inv.id, false)}
                  disabled={actionId === inv.id}
                  style={{ flex: 1 }}
                  testID={`decline-invite-${inv.id}`}
                />

                <Button
                  title={actionId === inv.id ? t.acceptingBtn : t.acceptBtn}
                  variant="primary"
                  size="md"
                  onPress={() => handleResponse(inv.id, true)}
                  disabled={actionId === inv.id}
                  loading={actionId === inv.id}
                  style={{ flex: 1.5 }}
                  testID={`accept-invite-${inv.id}`}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollBody: {
    padding: 16,
    gap: 16,
  },
  inviteCard: {
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  expiryText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});
