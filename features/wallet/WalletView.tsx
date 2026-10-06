import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../../framework/context/WalletContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import {
  WalletTransaction,
  creditSourceLabel,
  transactionTypeLabel,
  isCredit,
  formatINR,
} from '../../framework/services/walletService';

interface WalletViewProps {
  onBack?: () => void;
  onNavigateToReferral?: () => void;
}

type FilterTab = 'ALL' | 'CREDIT' | 'DEBIT' | 'REFUND';

export const WalletView: React.FC<WalletViewProps> = ({ onBack, onNavigateToReferral }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const {
    balance,
    availableBalance,
    reservedBalance,
    transactions,
    isLoading,
    refreshAll,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CREDIT') return txn.transaction_type === 'CREDIT';
    if (activeTab === 'DEBIT') return txn.transaction_type === 'DEBIT';
    if (activeTab === 'REFUND') return txn.transaction_type === 'REFUND' || txn.source === 'ORDER_REFUND';
    return true;
  });

  const expiringLots = balance?.expiring_soon || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Rasoi Credits</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Balance Card */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
              borderColor: colors.primary,
              ...shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgeRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="wallet" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>
                AVAILABLE BALANCE
              </Text>
            </View>
            <Badge label="Active" variant="success" />
          </View>

          <View style={styles.balanceRow}>
            <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
            <Text style={[styles.balanceAmount, { color: colors.textPrimary }]}>
              {Math.round(availableBalance).toLocaleString('en-IN')}
            </Text>
          </View>

          {reservedBalance > 0 && (
            <View style={styles.reservedRow}>
              <Icon name="time" size={14} color={colors.textMuted} />
              <Text style={[styles.reservedText, { color: colors.textMuted }]}>
                ₹{Math.round(reservedBalance)} reserved for in-progress orders
              </Text>
            </View>
          )}

          {/* Breakdown Pills */}
          <View style={[styles.breakdownContainer, { borderTopColor: colors.borderLight }]}>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                ₹{Math.round(balance?.breakdown?.refund_credits || 0)}
              </Text>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                Refunds (No Expiry)
              </Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                ₹{Math.round(balance?.breakdown?.referral_credits || 0)}
              </Text>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                Referrals
              </Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                ₹{Math.round(balance?.breakdown?.promotional_credits || 0)}
              </Text>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                Promos
              </Text>
            </View>
          </View>
        </View>

        {/* Expiring Soon Alert */}
        {expiringLots.length > 0 && (
          <View
            style={[
              styles.expiringAlert,
              {
                backgroundColor: isDark ? '#422006' : '#FEF3C7',
                borderColor: '#F59E0B',
              },
            ]}
          >
            <Icon name="alert-circle" size={20} color="#D97706" />
            <View style={styles.expiringTextWrap}>
              <Text style={[styles.expiringTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                Credits Expiring Soon
              </Text>
              {expiringLots.map((lot) => (
                <Text
                  key={lot.id}
                  style={[styles.expiringSub, { color: isDark ? '#FCD34D' : '#B45309' }]}
                >
                  ₹{Math.round(lot.remaining_amount)} expires on{' '}
                  {new Date(lot.expires_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Refer Friends Banner */}
        {onNavigateToReferral && (
          <TouchableOpacity
            style={[
              styles.referBanner,
              {
                backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                borderColor: '#10B981',
              },
            ]}
            onPress={onNavigateToReferral}
            activeOpacity={0.8}
          >
            <View style={styles.referBannerLeft}>
              <View style={[styles.giftCircle, { backgroundColor: '#10B981' }]}>
                <Icon name="gift" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.referBannerTitle, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
                  Earn ₹300 Free Credits
                </Text>
                <Text style={[styles.referBannerSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  Invite friends to cook with RasoiGenie. Tap to share your code.
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color="#10B981" />
          </TouchableOpacity>
        )}

        {/* How It Works Accordion */}
        <TouchableOpacity
          style={[
            styles.faqToggle,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
          onPress={() => setShowFaq(!showFaq)}
        >
          <View style={styles.faqToggleLeft}>
            <Icon name="information-circle" size={18} color={colors.primary} />
            <Text style={[styles.faqToggleText, { color: colors.textPrimary }]}>
              How do Rasoi Credits work?
            </Text>
          </View>
          <Icon
            name={showFaq ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showFaq && (
          <View
            style={[
              styles.faqBody,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.faqBullet, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Automatic Application:</Text>{' '}
              Use credits at checkout to instantly pay for up to 100% of your meal kits.
            </Text>
            <Text style={[styles.faqBullet, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Refund Credits:</Text>{' '}
              Refunded credits never expire and are consumed after promotional credits.
            </Text>
            <Text style={[styles.faqBullet, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Smart Deductions:</Text>{' '}
              Credits expiring earliest are automatically used first to protect your savings.
            </Text>
          </View>
        )}

        {/* Transaction History Section */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
            Transaction History
          </Text>
          <Text style={[styles.historyCount, { color: colors.textSecondary }]}>
            {filteredTransactions.length} records
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.tabsRow, { backgroundColor: colors.bgSurface }]}>
          {(['ALL', 'CREDIT', 'DEBIT', 'REFUND'] as FilterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                activeTab === tab && {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === tab ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: activeTab === tab ? '700' : '500',
                  },
                ]}
              >
                {tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Credits' : tab === 'DEBIT' ? 'Debits' : 'Refunds'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading wallet history...
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
            ]}
          >
            <Icon name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Transactions Found
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {activeTab === 'ALL'
                ? 'Your wallet ledger is currently empty. Earn credits by referring friends!'
                : `No ${activeTab.toLowerCase()} transactions found.`}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((txn) => {
              const credit = isCredit(txn.transaction_type);
              const formattedDate = new Date(txn.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View
                  key={txn.id}
                  style={[
                    styles.txnCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <View style={styles.txnLeft}>
                    <View
                      style={[
                        styles.txnIconWrap,
                        {
                          backgroundColor: credit
                            ? isDark
                              ? '#064E3B'
                              : '#DEF7EC'
                            : isDark
                            ? '#7F1D1D'
                            : '#FDE8E8',
                        },
                      ]}
                    >
                      <Icon
                        name={credit ? 'arrow-down' : 'arrow-up'}
                        size={18}
                        color={credit ? '#0E9F6E' : '#E02424'}
                      />
                    </View>
                    <View style={styles.txnDetails}>
                      <Text style={[styles.txnTitle, { color: colors.textPrimary }]}>
                        {txn.description || creditSourceLabel(txn.source)}
                      </Text>
                      <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
                        {formattedDate}
                        {txn.order_id ? ` • Order #${txn.order_id.slice(-6)}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txnRight}>
                    <Text
                      style={[
                        styles.txnAmount,
                        {
                          color: credit ? '#0E9F6E' : '#E02424',
                        },
                      ]}
                    >
                      {credit ? '+' : '-'}₹{Math.round(txn.amount).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.txnTypeLabel, { color: colors.textMuted }]}>
                      {transactionTypeLabel(txn.transaction_type)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  refreshButton: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 4,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
  },
  reservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  reservedText: {
    fontSize: 12,
  },
  breakdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 6,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 28,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  expiringAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  expiringTextWrap: {
    flex: 1,
  },
  expiringTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  expiringSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  referBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  referBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  giftCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  referBannerSub: {
    fontSize: 12,
  },
  faqToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  faqToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  faqBody: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  faqBullet: {
    fontSize: 12,
    lineHeight: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyCount: {
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 12,
  },
  transactionsList: {
    gap: 10,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnDetails: {
    flex: 1,
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  txnDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txnRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txnTypeLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
