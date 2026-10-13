import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { FamilyJoinLink, fetchFamilyJoinLinks } from '../../framework/services/familyService';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { AddDependentSheet } from './AddDependentSheet';

export const JoinLinksView: React.FC = () => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { family, revokeLink, reissueLink, members } = useFamily();

  const [links, setLinks] = useState<FamilyJoinLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const t = familyStrings.linksView;

  const loadLinks = async () => {
    if (!family) return;
    try {
      const data = await fetchFamilyJoinLinks(family.id);
      setLinks(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [family?.id, members?.length]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  const handleRevoke = (link: FamilyJoinLink) => {
    Alert.alert(t.revokeConfirmTitle, t.revokeConfirmDesc, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t.revokeBtn,
        style: 'destructive',
        onPress: async () => {
          setActionLoadingId(link.id);
          try {
            await revokeLink(link.id);
            await loadLinks();
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const handleReissue = (link: FamilyJoinLink) => {
    Alert.alert(t.reissueConfirmTitle, t.reissueConfirmDesc, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t.reissueBtn,
        onPress: async () => {
          setActionLoadingId(link.id);
          try {
            const res = await reissueLink(link.redeemed_by || link.id);
            if (res.success) {
              Alert.alert(
                'Fresh Link Created',
                `A new join link has been generated for ${link.display_name}.`,
              );
            }
            await loadLinks();
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const getStatusBadge = (
    status: FamilyJoinLink['status'],
    expiresAt: string,
    isJoined?: boolean,
  ) => {
    const isExpired = new Date(expiresAt).getTime() <= Date.now();
    if (isJoined || status === 'redeemed') {
      return <Badge label={t.statusUsed} variant="success" size="sm" />;
    }
    if (status === 'revoked') {
      return <Badge label={t.statusRevoked} variant="accent" size="sm" />;
    }
    if (status === 'expired' || isExpired) {
      return <Badge label={t.statusExpired} variant="accent" size="sm" />;
    }
    return <Badge label={t.statusPending} variant="warning" size="sm" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Action Bar */}
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
        <Button
          title="+ Add Link"
          variant="primary"
          size="sm"
          onPress={() => setAddSheetVisible(true)}
          testID="open-add-dependent-btn"
        />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : links.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="link" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t.emptySubtitle}
          </Text>
          <Button
            title="+ Generate Dependent Link"
            variant="primary"
            size="md"
            onPress={() => setAddSheetVisible(true)}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {(() => {
            const joinedDependentNames = new Set(
              (members || [])
                .filter((m) => m.role === 'dependent' || m.dependent_type)
                .map((m) => m.display_name?.trim().toLowerCase()),
            );

            // Filter out duplicate revoked links if the member has already joined
            const displayLinks = links.filter((link, idx) => {
              const nameLower = link.display_name?.trim().toLowerCase();
              const isJoined =
                joinedDependentNames.has(nameLower) ||
                (link.redeemed_by
                  ? (members || []).some((m) => m.user_id === link.redeemed_by)
                  : false);

              if (link.status === 'revoked' && isJoined) {
                const hasRedeemed = links.some(
                  (other, oIdx) =>
                    oIdx !== idx &&
                    other.display_name?.trim().toLowerCase() === nameLower &&
                    other.status === 'redeemed',
                );
                if (hasRedeemed) return false;
              }
              return true;
            });

            return displayLinks.map((link) => {
              const nameLower = link.display_name?.trim().toLowerCase();
              const isMemberJoined =
                joinedDependentNames.has(nameLower) ||
                (link.redeemed_by
                  ? (members || []).some((m) => m.user_id === link.redeemed_by)
                  : false);

              const expiresDate = new Date(link.expires_at);
              const diffHours = Math.max(
                0,
                Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60)),
              );
              const effectiveStatus = isMemberJoined ? 'redeemed' : link.status;
              const isPending = effectiveStatus === 'pending' && diffHours > 0;

              return (
                <View
                  key={link.id}
                  style={[
                    styles.linkCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                      borderRadius: radii.xl,
                      ...shadows.card,
                    },
                  ]}
                  testID={`join-link-item-${link.id}`}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]}>
                          {link.display_name}
                        </Text>
                        <RoleBadge role="dependent" dependentType={link.dependent_type} size="sm" />
                        {getStatusBadge(effectiveStatus, link.expires_at, isMemberJoined)}
                      </View>
                      <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                        {isMemberJoined || effectiveStatus === 'redeemed'
                          ? `Redeemed on ${new Date(link.redeemed_at || link.created_at).toLocaleDateString('en-IN')}`
                          : isPending
                            ? `Valid for another ${diffHours} hours`
                            : `Created on ${new Date(link.created_at).toLocaleDateString('en-IN')}`}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    {isPending && !isMemberJoined && (
                      <Button
                        title={t.revokeBtn}
                        variant="outline"
                        size="sm"
                        onPress={() => handleRevoke(link)}
                        disabled={actionLoadingId === link.id}
                        loading={actionLoadingId === link.id}
                        testID={`revoke-link-${link.id}`}
                      />
                    )}

                    {!isMemberJoined &&
                      (effectiveStatus === 'expired' || effectiveStatus === 'revoked') && (
                        <Button
                          title={t.reissueBtn}
                          variant="secondary"
                          size="sm"
                          onPress={() => handleReissue(link)}
                          disabled={actionLoadingId === link.id}
                          loading={actionLoadingId === link.id}
                          testID={`reissue-link-${link.id}`}
                        />
                      )}
                  </View>
                </View>
              );
            });
          })()}
        </ScrollView>
      )}

      <AddDependentSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onLinkCreated={() => loadLinks()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    gap: 12,
  },
  linkCard: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  expiryText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
