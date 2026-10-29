import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useAuth } from '../../framework/context/AuthContext';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { Modal } from '../../framework/ui/Modal';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import {
  adminFetchAllSubscriptions,
  adminCancelSubscription,
  AdminSubscriptionRow,
  AdminSubscriptionFilters,
} from '../../framework/services/adminSubscriptionService';
import { STANDARD_SUBSCRIPTION_PLANS } from '../../framework/services/subscriptionPlans';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';

export const AdminSubscriptionsManagementView: React.FC = () => {
  const { colors, radii, shadows } = useTheme();
  const { user } = useAuth();
  const t = subscriptionStrings.admin;

  const adminEmail = user?.email || 'admin@mulyam.in';

  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'individual' | 'family'>('all');
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'active' | 'paused' | 'expired' | 'cancelled'
  >('all');
  const [selectedAutoRenew, setSelectedAutoRenew] = useState<'all' | 'on' | 'off'>('all');
  const [sortAsc, setSortAsc] = useState(true);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [detailSub, setDetailSub] = useState<AdminSubscriptionRow | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const filters: AdminSubscriptionFilters = {
      type: selectedType,
      status: selectedStatus,
      autoRenew: selectedAutoRenew,
      searchQuery,
      sortByRenewal: sortAsc ? 'asc' : 'desc',
    };
    const res = await adminFetchAllSubscriptions(adminEmail, filters);
    if (res.success) {
      setSubscriptions(res.subscriptions);
    }
    setLoading(false);
  }, [adminEmail, selectedType, selectedStatus, selectedAutoRenew, searchQuery, sortAsc]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdminCancel = (sub: AdminSubscriptionRow) => {
    Alert.alert(t.confirmCancelTitle, t.confirmCancelMsg(sub.customer_name), [
      { text: 'Keep Active', style: 'cancel' },
      {
        text: 'Confirm Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(true);
          const res = await adminCancelSubscription(
            sub.id,
            adminEmail,
            'Cancelled by regional admin',
          );
          setIsCancelling(false);
          if (res.success) {
            Alert.alert('Subscription Cancelled', 'The subscription has been marked cancelled.');
            if (detailSub?.id === sub.id) {
              setDetailSub(null);
            }
            loadData();
          } else {
            Alert.alert('Error', res.error || 'Failed to cancel subscription');
          }
        },
      },
    ]);
  };

  const getPlanDisplayName = (sub: AdminSubscriptionRow) => {
    if (sub.scope === 'family') {
      return 'Family Custom Matrix';
    }
    if (sub.plan_type === 'standard' && sub.standard_plan_key) {
      return STANDARD_SUBSCRIPTION_PLANS[sub.standard_plan_key]?.name || 'Standard Plan';
    }
    return 'Custom 7-Day Plan';
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'cancelled':
      case 'expired':
        return 'danger';
      default:
        return 'info';
    }
  };

  // Detail Modal Content
  const renderDetailContent = (sub: AdminSubscriptionRow) => (
    <View style={styles.detailWrap}>
      {/* Overview Stats */}
      <View
        style={[
          styles.detailStatsCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.lg,
          },
        ]}
      >
        <View style={styles.detailStatsRow}>
          <View>
            <Text style={[styles.detailCustName, { color: colors.textPrimary }]}>
              {sub.customer_name}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{sub.customer_email}</Text>
            {sub.customer_phone && (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{sub.customer_phone}</Text>
            )}
          </View>
          <Badge
            label={sub.status.toUpperCase()}
            variant={getStatusVariant(sub.status)}
            size="md"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>SCOPE</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {sub.scope === 'family' ? 'Family Plan' : 'Individual'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>REGION</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {sub.region || 'West'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>AMOUNT PAID</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              ₹{sub.amount_paid.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>AUTO-RENEW</Text>
            <Badge
              label={sub.auto_renew ? 'ON' : 'OFF'}
              variant={sub.auto_renew ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
        </View>
      </View>

      {/* Covered Members & Plans */}
      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
          {t.detailMembersTitle} ({sub.members?.length || 0})
        </Text>
        {sub.members && sub.members.length > 0 ? (
          sub.members.map((m) => (
            <View
              key={m.id}
              style={[
                styles.memberDetailRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.md,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  {m.member_name} {m.is_dependent ? '(Dependent)' : ''}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Plan:{' '}
                  {m.plan_type === 'standard' && m.standard_plan_key
                    ? STANDARD_SUBSCRIPTION_PLANS[m.standard_plan_key]?.name
                    : 'Custom Plan'}
                  {m.plan_group ? ` • Group: ${m.plan_group}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                ₹{m.price_per_week || 1299}/wk
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>
            No individual member breakdown recorded.
          </Text>
        )}
      </View>

      {/* Pause History */}
      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
          {t.detailPausesTitle} ({sub.pauses?.length || 0})
        </Text>
        {sub.pauses && sub.pauses.length > 0 ? (
          sub.pauses.map((p) => (
            <View
              key={p.id}
              style={[
                styles.pauseDetailRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.md,
                },
              ]}
            >
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  {p.start_date} → {p.end_date} ({p.days_count} days)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {p.member_id ? `Target: Member ${p.member_id}` : 'Target: Whole Household'}
                </Text>
              </View>
              <Badge label="PAUSED" variant="warning" size="sm" />
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>
            No pauses applied during this billing period.
          </Text>
        )}
      </View>

      {/* Renewal & Billing Info */}
      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
          {t.detailBillingTitle}
        </Text>
        <View
          style={[
            styles.billingCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.md,
            },
          ]}
        >
          <View style={styles.billingRow}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Period Start:</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {new Date(sub.period_start).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Period End:</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {new Date(sub.period_end).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Next Renewal:</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {sub.next_renewal_at
                ? new Date(sub.next_renewal_at).toLocaleDateString('en-IN')
                : 'None'}
            </Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Failed Retries:</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              {sub.renewal_attempts || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Admin Action: Cancel */}
      {sub.status !== 'cancelled' && (
        <View style={{ marginTop: 20 }}>
          <Button
            title={t.cancelSubBtn}
            variant="danger"
            size="md"
            loading={isCancelling}
            onPress={() => handleAdminCancel(sub)}
            testID="admin-cancel-sub-btn"
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.lg,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t.title}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
        </View>
        <Button
          title="Refresh"
          icon={<Icon name="refresh" size={16} color={colors.textPrimary} />}
          variant="outline"
          size="sm"
          onPress={loadData}
        />
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.md,
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search by customer name, email or phone..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            testID="admin-sub-search-input"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips: Scope */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
          {(['all', 'individual', 'family'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === type ? colors.primary : colors.bgSurface,
                  borderColor: selectedType === type ? colors.primary : colors.borderLight,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: selectedType === type ? colors.textInverse : colors.textPrimary,
                }}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Status Chips */}
          {(['all', 'active', 'paused', 'expired', 'cancelled'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedStatus === st ? colors.primary : colors.bgSurface,
                  borderColor: selectedStatus === st ? colors.primary : colors.borderLight,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setSelectedStatus(st)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: selectedStatus === st ? colors.textInverse : colors.textPrimary,
                }}
              >
                {st.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Sort By Renewal Toggle */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.pill,
              },
            ]}
            onPress={() => setSortAsc(!sortAsc)}
          >
            <Icon name="time" size={14} color={colors.textPrimary} />
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginLeft: 4 }}
            >
              Renewal: {sortAsc ? 'Soonest' : 'Latest'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>
            Loading subscriptions...
          </Text>
        </View>
      ) : subscriptions.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              borderRadius: radii.lg,
            },
          ]}
        >
          <Icon name="restaurant" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No subscriptions found
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            Try clearing filters or search query to see active subscriber accounts.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
          {subscriptions.map((sub) => {
            const isExpanded = Boolean(expandedRows[sub.id]);
            const isFam = sub.scope === 'family';

            return (
              <View
                key={sub.id}
                style={[
                  styles.subCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.lg,
                    ...shadows.card,
                  },
                ]}
                testID={`admin-sub-card-${sub.id}`}
              >
                {/* Header Row */}
                <View style={styles.subCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.subCardCustName, { color: colors.textPrimary }]}>
                        {sub.customer_name}
                      </Text>
                      <Badge
                        label={isFam ? 'FAMILY' : 'INDIVIDUAL'}
                        variant={isFam ? 'info' : 'neutral'}
                        size="sm"
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {sub.customer_email} • {sub.region || 'West'}
                    </Text>
                  </View>

                  <Badge
                    label={sub.status.toUpperCase()}
                    variant={getStatusVariant(sub.status)}
                    size="sm"
                  />
                </View>

                {/* Info Grid */}
                <View style={styles.cardInfoGrid}>
                  <View style={styles.cardInfoCol}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>PLAN</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      {getPlanDisplayName(sub)}
                    </Text>
                  </View>

                  <View style={styles.cardInfoCol}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>MEMBERS</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      {sub.member_count} member{sub.member_count > 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.cardInfoCol}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>AUTO-RENEW</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: sub.auto_renew ? colors.success : colors.textMuted,
                      }}
                    >
                      {sub.auto_renew ? 'ON' : 'OFF'}
                    </Text>
                  </View>

                  <View style={styles.cardInfoCol}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>NEXT RENEWAL</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      {sub.next_renewal_at
                        ? new Date(sub.next_renewal_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : new Date(sub.period_end).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                    </Text>
                  </View>
                </View>

                {/* Expandable Family Breakdown */}
                {isFam && isExpanded && sub.members && sub.members.length > 0 && (
                  <View
                    style={[
                      styles.expandedMembersBox,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.borderLight,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      Household Members ({sub.members.length}):
                    </Text>
                    {sub.members.map((m) => (
                      <View key={m.id} style={styles.expandedMemberRow}>
                        <Text
                          style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}
                        >
                          • {m.member_name} {m.is_dependent ? '(Dependent)' : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                          {m.plan_type === 'standard' && m.standard_plan_key
                            ? STANDARD_SUBSCRIPTION_PLANS[m.standard_plan_key]?.name
                            : 'Custom Plan'}{' '}
                          (₹{m.price_per_week || 1299}/wk)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Card Actions Row */}
                <View style={[styles.subCardActions, { borderTopColor: colors.borderLight }]}>
                  {isFam && (
                    <TouchableOpacity
                      onPress={() => toggleExpand(sub.id)}
                      style={styles.expandBtn}
                      testID={`expand-members-btn-${sub.id}`}
                    >
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: colors.primary,
                          marginLeft: 4,
                        }}
                      >
                        {isExpanded ? 'Hide Members' : 'View Members Breakdown'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ flex: 1 }} />

                  <Button
                    title="View Details"
                    variant="outline"
                    size="sm"
                    onPress={() => setDetailSub(sub)}
                    testID={`view-sub-details-btn-${sub.id}`}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Detail Modal / BottomSheet */}
      {detailSub &&
        (Platform.OS === 'web' ? (
          <Modal
            visible={Boolean(detailSub)}
            onClose={() => setDetailSub(null)}
            title="Subscription Details"
            subtitle={`ID: ${detailSub.id}`}
          >
            <ScrollView style={{ maxHeight: 600 }}>{renderDetailContent(detailSub)}</ScrollView>
          </Modal>
        ) : (
          <BottomSheet
            visible={Boolean(detailSub)}
            onClose={() => setDetailSub(null)}
            title="Subscription Details"
            subtitle={`ID: ${detailSub.id}`}
          >
            {renderDetailContent(detailSub)}
          </BottomSheet>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filtersBar: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  tableScroll: {
    flex: 1,
  },
  subCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subCardCustName: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardInfoCol: {
    flex: 1,
  },
  expandedMembersBox: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  expandedMemberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  subCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailWrap: {
    padding: 16,
  },
  detailStatsCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailCustName: {
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    width: '45%',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  memberDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  pauseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  billingCard: {
    padding: 12,
    borderWidth: 1,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
