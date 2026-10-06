import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    CreditLot,
    debitWallet,
    getCreditLots,
    getReferralCode,
    getWalletBalance,
    getWalletTransactions,
    initializeWallet,
    reverseWalletDebit,
    subscribeToWalletEvents,
    WalletBalance,
    WalletTransaction,
} from '../services/walletService';
import { getSupabaseClient } from '../supabase/client';
import { useAuth } from './AuthContext';

export interface WalletContextValue {
  balance: WalletBalance | null;
  availableBalance: number;
  reservedBalance: number;
  transactions: WalletTransaction[];
  creditLots: CreditLot[];
  referralCode: string | null;
  isLoading: boolean;
  isTransacting: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshCreditLots: () => Promise<void>;
  refreshAll: () => Promise<void>;
  calculateApplicableCredits: (orderTotal: number) => { creditsToApply: number; remainingPayable: number };
  debitCredits: (params: {
    amount: number;
    orderId?: string;
    description?: string;
  }) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  reverseDebit: (transactionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [creditLots, setCreditLots] = useState<CreditLot[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.uid;

  // ─── Fetch wallet balance ──────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!userId) {
      setBalance(null);
      return;
    }
    const res = await getWalletBalance(userId);
    if (res.success && res.data) {
      setBalance(res.data);
      setError(null);
    } else if (res.error) {
      setError(res.error);
    }
  }, [userId]);

  // ─── Fetch transactions ────────────────────────────────────────────────────
  const refreshTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      return;
    }
    const res = await getWalletTransactions(userId, 50, 0);
    if (res.success && res.data) {
      setTransactions(res.data);
    }
  }, [userId]);

  // ─── Fetch credit lots ─────────────────────────────────────────────────────
  const refreshCreditLots = useCallback(async () => {
    if (!userId) {
      setCreditLots([]);
      return;
    }
    const res = await getCreditLots(userId);
    if (res.success && res.data) {
      setCreditLots(res.data);
    }
  }, [userId]);

  // ─── Fetch referral code ───────────────────────────────────────────────────
  const refreshReferralCode = useCallback(async () => {
    if (!userId) {
      setReferralCode(null);
      return;
    }
    const res = await getReferralCode(userId);
    if (res.success && res.data) {
      setReferralCode(res.data.code);
    }
  }, [userId]);

  // ─── Refresh All ───────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await Promise.all([
        refreshBalance(),
        refreshTransactions(),
        refreshCreditLots(),
        refreshReferralCode(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, refreshBalance, refreshTransactions, refreshCreditLots, refreshReferralCode]);

  // Initial load when user changes
  useEffect(() => {
    if (userId) {
      // Ensure wallet row exists
      initializeWallet(userId).then(() => {
        refreshAll();
      });
    } else {
      setBalance(null);
      setTransactions([]);
      setCreditLots([]);
      setReferralCode(null);
    }
  }, [userId, refreshAll]);

  // ─── Realtime Subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    try {
      const supabase = getSupabaseClient();
      const channel = supabase
        .channel(`wallet_realtime_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshBalance();
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshBalance();
            refreshTransactions();
            refreshCreditLots();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignore
    }
  }, [userId, refreshBalance, refreshTransactions, refreshCreditLots]);

  // Realtime in-app mutation listener
  useEffect(() => {
    return subscribeToWalletEvents(() => {
      refreshAll();
    });
  }, [refreshAll]);

  // Cross-tab localStorage listener — picks up wallet updates written by the
  // admin in another browser tab (e.g. when issuing credits from the admin panel).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === '@rasoi_local_wallets' || e.key === '@rasoi_local_wallet_txs') {
        refreshAll();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshAll]);

  // ─── Helper: Calculate applicable credits for checkout ─────────────────────
  const calculateApplicableCredits = useCallback(
    (orderTotal: number) => {
      const available = (balance as any)?.available_balance ?? (balance as any)?.availableBalance ?? 0;
      if (available <= 0 || orderTotal <= 0) {
        return { creditsToApply: 0, remainingPayable: orderTotal };
      }
      const creditsToApply = Math.min(available, orderTotal);
      const remainingPayable = Math.max(0, orderTotal - creditsToApply);
      return { creditsToApply, remainingPayable };
    },
    [balance],
  );

  // ─── Debit credits ─────────────────────────────────────────────────────────
  const debitCredits = useCallback(
    async (params: {
      amount: number;
      orderId?: string;
      description?: string;
    }): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
      if (!userId) {
        return { success: false, error: 'User is not logged in' };
      }
      setIsTransacting(true);
      try {
        const res = await debitWallet({
          userId,
          amount: params.amount,
          orderId: params.orderId,
          description: params.description,
        });

        if (res.success && res.data) {
          await refreshAll();
          return { success: true, transactionId: res.data.transactionId };
        }
        return { success: false, error: res.error || 'Failed to debit wallet' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Wallet debit error' };
      } finally {
        setIsTransacting(false);
      }
    },
    [userId, refreshAll],
  );

  // ─── Reverse debit (refund to wallet) ──────────────────────────────────────
  const reverseDebit = useCallback(
    async (transactionId: string, reason?: string) => {
      setIsTransacting(true);
      try {
        const res = await reverseWalletDebit({
          originalTransactionId: transactionId,
          reason,
        });
        if (res.success) {
          await refreshAll();
          return { success: true };
        }
        return { success: false, error: res.error || 'Failed to reverse debit' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Wallet reversal error' };
      } finally {
        setIsTransacting(false);
      }
    },
    [refreshAll],
  );

  const availableBalance = (balance as any)?.available_balance ?? (balance as any)?.availableBalance ?? 0;
  const reservedBalance = (balance as any)?.reserved_balance ?? (balance as any)?.reservedBalance ?? 0;

  const value = useMemo<WalletContextValue>(
    () => ({
      balance,
      availableBalance,
      reservedBalance,
      transactions,
      creditLots,
      referralCode,
      isLoading,
      isTransacting,
      error,
      refreshBalance,
      refreshTransactions,
      refreshCreditLots,
      refreshAll,
      calculateApplicableCredits,
      debitCredits,
      reverseDebit,
    }),
    [
      balance,
      transactions,
      creditLots,
      referralCode,
      isLoading,
      isTransacting,
      error,
      refreshBalance,
      refreshTransactions,
      refreshCreditLots,
      refreshAll,
      calculateApplicableCredits,
      debitCredits,
      reverseDebit,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
