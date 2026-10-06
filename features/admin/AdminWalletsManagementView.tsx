import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import {
  adminGetAllWallets,
  adminGetUserTransactions,
  adminIssueCredits,
  subscribeToWalletsRealtime,
  AdminWalletSummary,
  WalletTransaction,
  creditSourceLabel,
  transactionTypeLabel,
  isCredit,
} from '../../framework/services/walletService';

export const AdminWalletsManagementView: React.FC = () => {
  const { user } = useAuth();
  const { colors, radii, shadows, isDark } = useTheme();

  const [wallets, setWallets] = useState<AdminWalletSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Issue Credits Modal State
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedWalletUser, setSelectedWalletUser] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('150');
  const [creditSource, setCreditSource] = useState<'PROMOTION' | 'ADMIN_ADJUSTMENT' | 'LOYALTY'>('PROMOTION');
  const [creditDescription, setCreditDescription] = useState('Customer appreciation promotion');
  const [creditExpiryDays, setCreditExpiryDays] = useState('30');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // View User Ledger Modal State
  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);
  const [ledgerUser, setLedgerUser] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const adminId = user?.uid || 'super_admin';

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      const res = await adminGetAllWallets(100);
      if (res.success && res.data) {
        setWallets(res.data);
      } else {
        setWallets([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
    const unsub = subscribeToWalletsRealtime(() => {
      loadWallets();
    });
    return () => {
      unsub();
    };
  }, []);

  const handleCopyId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenIssueCredits = (userId: string) => {
    setSelectedWalletUser(userId);
    setCreditAmount('150');
    setCreditDescription('Special customer loyalty bonus');
    setIssueModalVisible(true);
  };

  const handleOpenLedger = async (userId: string) => {
    setLedgerUser(userId);
    setLedgerModalVisible(true);
    setIsLoadingLedger(true);
    try {
      const res = await adminGetUserTransactions(userId, 50);
      if (res.success && res.data) {
        setUserTransactions(res.data);
      } else {
        setUserTransactions([]);
      }
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const handleSubmitIssueCredits = async () => {
    if (!selectedWalletUser) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive credit amount.');
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const expiry = creditExpiryDays ? parseInt(creditExpiryDays, 10) : null;
      const res = await adminIssueCredits({
        targetUserId: selectedWalletUser,
        amount,
        source: creditSource,
        description: creditDescription.trim() || 'Admin manual credit issuance',
        expiresInDays: expiry,
        adminId,
        idempotencyKey: `admin_iss_${selectedWalletUser}_${Date.now()}`,
      });

      if (res.success) {
        Alert.alert('Credits Issued', `Successfully credited ₹${amount} to customer ${selectedWalletUser}.`);
        setIssueModalVisible(false);
        loadWallets();
      } else {
        Alert.alert('Error', res.error || 'Failed to issue credits');
      }
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const filteredWallets = wallets.filter(
    (w) =>
      w.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.customer_name && w.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.customer_phone && w.customer_phone.includes(searchQuery)) ||
      (w.customer_email && w.customer_email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const totalCirculation = wallets.reduce((sum, w) => sum + (w.available_balance || 0), 0);

  return (
    <View style={styles.container}>
      {/* Top Stat Bar */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>{wallets.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Wallets</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            ₹{Math.round(totalCirculation).toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credits in Circulation</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.accent }]}>
            ₹{wallets.length > 0 ? Math.round(totalCirculation / wallets.length) : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Balance</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              color: colors.textPrimary,
              borderRadius: radii.md,
            },
          ]}
          placeholder="Search by customer UID or Phone..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Button title="Refresh" size="sm" variant="outline" onPress={loadWallets} />
      </View>

      {/* Wallets Table */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading customer wallets...
          </Text>
        </View>
      ) : filteredWallets.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            borderWidth: 1,
            borderRadius: radii.xl,
            padding: 28,
            alignItems: 'center',
          }}
        >
          <Icon name="wallet" size={36} color={colors.textMuted} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 12 }}>
            No Customer Wallets Found
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
            Registered customer accounts will appear here automatically with their live wallet balance.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.tableScroll}>
          {filteredWallets.map((wallet) => (
            <View
              key={wallet.user_id}
              style={[
                styles.walletRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <View style={styles.walletRowLeft}>
                <View style={[styles.walletAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Icon name="wallet" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                    {wallet.customer_name || 'Customer'}
                  </Text>
                  
                  {/* Customer ID with 1-click Copy */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <TouchableOpacity
                      onPress={() => handleCopyId(wallet.user_id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.borderLight,
                        borderWidth: 1,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon name="document" size={11} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: '600', color: colors.primary }}>
                        ID: {wallet.user_id}
                      </Text>
                      <Text style={{ fontSize: 10, color: copiedId === wallet.user_id ? '#10B981' : colors.textMuted }}>
                        {copiedId === wallet.user_id ? '✓ Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.walletDate, { color: colors.textSecondary, marginTop: 3 }]}>
                    {wallet.customer_phone !== 'N/A' ? `${wallet.customer_phone} • ` : ''}
                    Updated {new Date(wallet.updated_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceCol}>
                <Text style={[styles.balanceNum, { color: colors.primary }]}>
                  ₹{Math.round(wallet.available_balance).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.balanceSub, { color: colors.textMuted }]}>
                  {wallet.reserved_balance > 0 ? `(₹${wallet.reserved_balance} reserved)` : 'Available'}
                </Text>
              </View>

              <View style={styles.actionsCol}>
                <Button
                  title="+ Issue"
                  size="sm"
                  variant="primary"
                  onPress={() => handleOpenIssueCredits(wallet.user_id)}
                />
                <Button
                  title="Ledger"
                  size="sm"
                  variant="outline"
                  onPress={() => handleOpenLedger(wallet.user_id)}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Issue Credits Modal */}
      <Modal visible={issueModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.bgSurface, borderRadius: radii.xl },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Issue Customer Credits
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Customer UID: {selectedWalletUser}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Amount (₹)</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={creditAmount}
              onChangeText={setCreditAmount}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Reason / Category</Text>
            <View style={styles.categoryRow}>
              {(['PROMOTION', 'ADMIN_ADJUSTMENT', 'LOYALTY'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catBtn,
                    creditSource === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
                    { borderColor: colors.borderLight },
                  ]}
                  onPress={() => setCreditSource(cat)}
                >
                  <Text
                    style={[
                      styles.catBtnText,
                      { color: creditSource === cat ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {cat === 'PROMOTION' ? 'Promo' : cat === 'ADMIN_ADJUSTMENT' ? 'Adjustment' : 'Loyalty'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Description / Audit Note</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={creditDescription}
              onChangeText={setCreditDescription}
              placeholder="e.g. Loyalty gift for 10th recipe box"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Expiry in Days (leave empty for no expiry)</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.borderLight, color: colors.textPrimary },
              ]}
              value={creditExpiryDays}
              onChangeText={setCreditExpiryDays}
              placeholder="e.g. 30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIssueModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={isSubmittingCredit ? 'Crediting...' : 'Confirm Issue'}
                variant="primary"
                onPress={handleSubmitIssueCredits}
                loading={isSubmittingCredit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* User Ledger Modal */}
      <Modal visible={ledgerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.bgSurface, borderRadius: radii.xl, maxHeight: '80%' },
            ]}
          >
            <View style={styles.ledgerHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Customer Ledger Audit
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  UID: {ledgerUser}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLedgerModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {isLoadingLedger ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : userTransactions.length === 0 ? (
              <Text style={[styles.emptyLedgerText, { color: colors.textMuted }]}>
                No transaction records found for this customer.
              </Text>
            ) : (
              <ScrollView style={{ marginTop: 10 }}>
                {userTransactions.map((txn) => {
                  const credit = isCredit(txn.transaction_type);
                  return (
                    <View
                      key={txn.id}
                      style={[
                        styles.ledgerTxnRow,
                        { borderBottomColor: colors.borderLight },
                      ]}
                    >
                      <View>
                        <Text style={[styles.ledgerTxnTitle, { color: colors.textPrimary }]}>
                          {txn.description || creditSourceLabel(txn.source)}
                        </Text>
                        <Text style={[styles.ledgerTxnDate, { color: colors.textSecondary }]}>
                          {new Date(txn.created_at).toLocaleString('en-IN')}
                          {txn.order_id ? ` • Order #${txn.order_id.slice(-6)}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.ledgerTxnAmount,
                          { color: credit ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {credit ? '+' : '-'}₹{Math.round(txn.amount)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  tableScroll: {
    flex: 1,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  walletRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIdText: {
    fontSize: 14,
    fontWeight: '700',
  },
  walletDate: {
    fontSize: 11,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
    marginRight: 14,
  },
  balanceNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  balanceSub: {
    fontSize: 10,
    marginTop: 2,
  },
  actionsCol: {
    alignItems: 'flex-end',
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  catBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  emptyLedgerText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 30,
  },
  ledgerTxnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ledgerTxnTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  ledgerTxnDate: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerTxnAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
