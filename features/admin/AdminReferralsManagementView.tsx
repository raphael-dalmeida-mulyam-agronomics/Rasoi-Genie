import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import {
  getReferralSettings,
  updateReferralSettings,
  ReferralSettings,
} from '../../framework/services/referralService';
import { getSupabaseClient } from '../../framework/supabase/client';

export const AdminReferralsManagementView: React.FC = () => {
  const { colors, radii, shadows, isDark } = useTheme();

  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [referrerReward, setReferrerReward] = useState('300');
  const [referredReward, setReferredReward] = useState('200');
  const [expiryDays, setExpiryDays] = useState('60');
  const [minOrder, setMinOrder] = useState('0');
  const [maxReferrals, setMaxReferrals] = useState('20');
  const [enabled, setEnabled] = useState(true);
  const [qualEvent, setQualEvent] = useState<'FIRST_ORDER_DELIVERED' | 'FIRST_ORDER_PAID'>('FIRST_ORDER_DELIVERED');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getReferralSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setReferrerReward(String(res.data.referrer_reward));
        setReferredReward(String(res.data.referred_reward));
        setExpiryDays(String(res.data.referral_credit_expiry_days));
        setMinOrder(String(res.data.min_qualifying_order_amount));
        setMaxReferrals(res.data.max_referrals_per_customer ? String(res.data.max_referrals_per_customer) : '');
        setEnabled(res.data.programme_enabled);
        setQualEvent(res.data.qualification_event);
      }

      // Fetch recent referrals
      const supabase = getSupabaseClient();
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (refData) {
        setRecentReferrals(refData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await updateReferralSettings({
        referrer_reward: parseFloat(referrerReward) || 300,
        referred_reward: parseFloat(referredReward) || 200,
        referral_credit_expiry_days: parseInt(expiryDays, 10) || 60,
        min_qualifying_order_amount: parseFloat(minOrder) || 0,
        max_referrals_per_customer: maxReferrals ? parseInt(maxReferrals, 10) : null,
        programme_enabled: enabled,
        qualification_event: qualEvent,
      });

      if (res.success) {
        Alert.alert('Settings Saved', 'Referral programme settings updated successfully.');
        setSettings(res.data || null);
      } else {
        Alert.alert('Error', res.error || 'Failed to update referral settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading referral settings...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
            borderColor: colors.primary,
            ...shadows.card,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="gift" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Referral Programme Configuration
              </Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                Control reward incentives, rules, and automatic wallet credit triggers.
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.borderLight, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Settings Form */}
      <View
        style={[
          styles.formCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            ...shadows.card,
          },
        ]}
      >
        <Text style={[styles.formHeading, { color: colors.textPrimary }]}>Reward Amounts</Text>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Referrer Reward (₹)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={referrerReward}
              onChangeText={setReferrerReward}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Credited to existing user on order delivery
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Referred Friend Reward (₹)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={referredReward}
              onChangeText={setReferredReward}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Credited to new user as welcome bonus
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <Text style={[styles.formHeading, { color: colors.textPrimary }]}>Qualification Rules</Text>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Credit Expiry (Days)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Default: 60 days before unused credits expire
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Min Qualifying Order (₹)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={minOrder}
              onChangeText={setMinOrder}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              0 = Any order qualifies
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Max Referrals Allowed Per Customer (Cap)
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderLight, color: colors.textPrimary },
            ]}
            value={maxReferrals}
            onChangeText={setMaxReferrals}
            placeholder="e.g. 20 (leave empty for unlimited)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Trigger Qualification On:
          </Text>
          <View style={styles.qualEventRow}>
            {(['FIRST_ORDER_DELIVERED', 'FIRST_ORDER_PAID'] as const).map((evt) => (
              <TouchableOpacity
                key={evt}
                style={[
                  styles.qualEventBtn,
                  qualEvent === evt && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.borderLight },
                ]}
                onPress={() => setQualEvent(evt)}
              >
                <Text
                  style={[
                    styles.qualEventText,
                    { color: qualEvent === evt ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {evt === 'FIRST_ORDER_DELIVERED' ? 'First Order Delivered' : 'First Order Placed/Paid'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title={isSaving ? 'Saving Changes...' : 'Save Configuration'}
          variant="primary"
          onPress={handleSaveSettings}
          loading={isSaving}
          style={{ marginTop: 14 }}
        />
      </View>

      {/* Recent Referrals List */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            ...shadows.card,
          },
        ]}
      >
        <Text style={[styles.formHeading, { color: colors.textPrimary, marginBottom: 12 }]}>
          Recent Referrals ({recentReferrals.length})
        </Text>

        {recentReferrals.length === 0 ? (
          <Text style={[styles.hint, { color: colors.textMuted, textAlign: 'center', paddingVertical: 14 }]}>
            No referrals recorded in system yet.
          </Text>
        ) : (
          recentReferrals.map((ref) => (
            <View
              key={ref.id}
              style={[styles.refRow, { borderBottomColor: colors.borderLight }]}
            >
              <View>
                <Text style={[styles.refPair, { color: colors.textPrimary }]}>
                  {ref.referrer_id?.slice(0, 12)}... → {ref.referred_id?.slice(0, 12)}...
                </Text>
                <Text style={[styles.refDate, { color: colors.textSecondary }]}>
                  {new Date(ref.created_at).toLocaleDateString('en-IN')}
                  {ref.qualifying_order_id ? ` • Order #${ref.qualifying_order_id.slice(-6)}` : ''}
                </Text>
              </View>
              <Badge
                label={ref.status}
                variant={ref.status === 'REWARDED' ? 'success' : ref.status === 'QUALIFIED' ? 'info' : 'warning'}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  hint: {
    fontSize: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  qualEventRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  qualEventBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  qualEventText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  refPair: {
    fontSize: 13,
    fontWeight: '600',
  },
  refDate: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
});
