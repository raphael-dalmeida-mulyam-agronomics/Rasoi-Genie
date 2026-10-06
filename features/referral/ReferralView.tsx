import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useWallet } from '../../framework/context/WalletContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import {
  getCustomerReferralStats,
  getCustomerReferralsList,
  registerReferralCode,
  buildReferralShareMessage,
  ReferralItem,
  ReferralStats,
} from '../../framework/services/referralService';

interface ReferralViewProps {
  onBack?: () => void;
  onNavigateToWallet?: () => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ onBack, onNavigateToWallet }) => {
  const { user } = useAuth();
  const { colors, radii, shadows, isDark } = useTheme();
  const { referralCode: walletCode, refreshAll } = useWallet();

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Redeem friend's code input
  const [inputCode, setInputCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const userId = user?.uid;
  const activeCode = stats?.currentCode || walletCode || 'RASOI' + (userId ? userId.slice(-4).toUpperCase() : 'APP');

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        getCustomerReferralStats(userId),
        getCustomerReferralsList(userId),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (listRes.success && listRes.data) {
        setReferralsList(listRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleCopyCode = async () => {
    try {
      // In web or RN environments
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(activeCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareNative = async () => {
    const friendReward = stats?.referredFriendReward || 200;
    const shareInfo = buildReferralShareMessage(activeCode, friendReward);
    try {
      await Share.share({
        title: shareInfo.title,
        message: shareInfo.message,
      });
    } catch (err: any) {
      console.warn('Error sharing:', err?.message);
    }
  };

  const handleShareWhatsApp = async () => {
    const friendReward = stats?.referredFriendReward || 200;
    const shareInfo = buildReferralShareMessage(activeCode, friendReward);
    const encoded = encodeURIComponent(shareInfo.message);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp or native share
        const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;
        await Linking.openURL(webUrl);
      }
    } catch {
      handleShareNative();
    }
  };

  const handleApplyFriendCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Code Required', 'Please enter a referral code.');
      return;
    }
    if (!userId) {
      Alert.alert('Login Required', 'Please sign in to apply a referral code.');
      return;
    }

    setIsApplying(true);
    try {
      const res = await registerReferralCode(inputCode.trim(), userId);
      if (res.success) {
        setAppliedSuccess(`Success! Code ${inputCode.toUpperCase()} applied. You'll get ₹${res.data?.referredReward || 200} on your first order!`);
        setInputCode('');
        await refreshAll();
        Alert.alert('Referral Applied!', `You will receive ₹${res.data?.referredReward || 200} credits upon completing your first order.`);
      } else {
        Alert.alert('Invalid Code', res.error || 'Failed to apply referral code');
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Bar */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Refer & Earn
        </Text>
        {onNavigateToWallet && (
          <TouchableOpacity onPress={onNavigateToWallet} style={styles.walletButton}>
            <Icon name="wallet" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
              borderColor: colors.primary,
              ...shadows.card,
            },
          ]}
        >
          <View style={[styles.giftBadge, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="gift" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Give ₹{stats?.referredFriendReward || 200}, Get ₹{stats?.rewardPerReferral || 300}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Invite your friends to Rasoi-Genie. When they place their first chef-crafted meal kit order, both of you earn credits!
          </Text>

          {/* Referral Code Box */}
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.codeTextCol}>
              <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                YOUR REFERRAL CODE
              </Text>
              <Text style={[styles.codeValue, { color: colors.primary }]}>{activeCode}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.copyBtn,
                { backgroundColor: copied ? '#10B981' : colors.primary },
              ]}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Icon
                name={copied ? 'checkmark' : 'copy'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.copyBtnText}>{copied ? 'COPIED!' : 'COPY'}</Text>
            </TouchableOpacity>
          </View>

          {/* Social Share Buttons */}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareWhatsAppBtn, { backgroundColor: '#25D366' }]}
              onPress={handleShareWhatsApp}
              activeOpacity={0.8}
            >
              <Icon name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shareOtherBtn,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
              ]}
              onPress={handleShareNative}
              activeOpacity={0.8}
            >
              <Icon name="share-social" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Steps: How It Works */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How It Works</Text>
        </View>

        <View style={styles.stepsContainer}>
          <View
            style={[
              styles.stepCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <View style={[styles.stepNumberCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                Share Your Code
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Send your unique code or link to friends, family, and cooking enthusiasts.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.stepCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <View style={[styles.stepNumberCircle, { backgroundColor: colors.accent }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                They Get ₹{stats?.referredFriendReward || 200} Off
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Your friend applies your code and unlocks instant wallet credits on their first gourmet box.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.stepCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <View style={[styles.stepNumberCircle, { backgroundColor: '#10B981' }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                You Earn ₹{stats?.rewardPerReferral || 300}
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Once their first meal kit is delivered, ₹{stats?.rewardPerReferral || 300} credits are credited directly to your Rasoi Wallet.
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Your Referral Rewards
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats?.totalReferrals || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invited</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats?.successfulReferrals || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.accent }]}>
              ₹{Math.round(stats?.totalEarnings || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Earned</Text>
          </View>
        </View>

        {/* Enter Friend's Referral Code Section */}
        <View
          style={[
            styles.redeemCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.redeemTitle, { color: colors.textPrimary }]}>
            Have a friend's referral code?
          </Text>
          <Text style={[styles.redeemSubtitle, { color: colors.textSecondary }]}>
            Enter their code to get ₹{stats?.referredFriendReward || 200} in credits on your first order.
          </Text>

          {appliedSuccess ? (
            <View style={[styles.successBanner, { backgroundColor: '#DEF7EC' }]}>
              <Icon name="checkmark-circle" size={18} color="#0E9F6E" />
              <Text style={[styles.successText, { color: '#03543F' }]}>{appliedSuccess}</Text>
            </View>
          ) : (
            <View style={styles.redeemInputRow}>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.bgPrimary,
                  },
                ]}
                placeholder="e.g. RASOI4821"
                placeholderTextColor={colors.textMuted}
                value={inputCode}
                onChangeText={setInputCode}
                autoCapitalize="characters"
              />
              <Button
                title={isApplying ? 'Applying...' : 'Apply'}
                size="sm"
                onPress={handleApplyFriendCode}
                loading={isApplying}
                disabled={isApplying || !inputCode.trim()}
              />
            </View>
          )}
        </View>

        {/* Recent Referrals List */}
        {referralsList.length > 0 && (
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Recent Referrals
              </Text>
            </View>

            <View style={styles.referralsList}>
              {referralsList.map((ref) => {
                const isRewarded = ref.status === 'REWARDED';
                const isQualified = ref.status === 'QUALIFIED';
                return (
                  <View
                    key={ref.id}
                    style={[
                      styles.refItem,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.refItemLeft}>
                      <Icon
                        name={isRewarded ? 'checkmark-circle' : 'time'}
                        size={20}
                        color={isRewarded ? '#10B981' : colors.primary}
                      />
                      <View>
                        <Text style={[styles.refItemName, { color: colors.textPrimary }]}>
                          Friend (ID: ...{ref.referred_id.slice(-6)})
                        </Text>
                        <Text style={[styles.refItemDate, { color: colors.textSecondary }]}>
                          {new Date(ref.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                    </View>

                    <Badge
                      label={isRewarded ? '₹' + (ref.referrer_reward_amount || 300) + ' Rewarded' : ref.status}
                      variant={isRewarded ? 'success' : isQualified ? 'info' : 'warning'}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  walletButton: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  giftBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  codeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  shareWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareOtherBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  redeemCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  redeemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  redeemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  redeemInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  activitySection: {
    marginTop: 6,
  },
  referralsList: {
    gap: 8,
  },
  refItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  refItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  refItemDate: {
    fontSize: 11,
    marginTop: 2,
  },
});
