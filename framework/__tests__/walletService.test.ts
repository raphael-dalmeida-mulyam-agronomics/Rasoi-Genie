import {
  creditSourceLabel,
  transactionTypeLabel,
  isCredit,
  formatINR,
  initializeWallet,
  getWalletBalance,
  getWalletTransactions,
  creditWallet,
  debitWallet,
  reverseWalletDebit,
  adminIssueCredits,
} from '../services/walletService';

// Mock Supabase client
jest.mock('../supabase/client', () => {
  const mockRpc = jest.fn((fnName: string, args: any) => {
    if (fnName === 'create_wallet_for_user') {
      return Promise.resolve({
        data: { success: true, wallet_id: 'mock_wallet_123', already_existed: false },
        error: null,
      });
    }
    if (fnName === 'get_wallet_balance') {
      return Promise.resolve({
        data: {
          wallet_id: 'mock_wallet_123',
          user_id: args.p_user_id,
          available_balance: 450,
          reserved_balance: 0,
          currency: 'INR',
          breakdown: {
            refund_credits: 150,
            referral_credits: 200,
            promotional_credits: 100,
          },
          expiring_soon: [],
          updated_at: '2026-10-05T00:00:00Z',
        },
        error: null,
      });
    }
    if (fnName === 'credit_wallet') {
      return Promise.resolve({
        data: {
          success: true,
          transaction_id: 'mock_credit_txn_1',
          credit_lot_id: 'mock_lot_1',
          new_balance: 600,
        },
        error: null,
      });
    }
    if (fnName === 'debit_wallet') {
      if (args.p_amount > 1000) {
        return Promise.resolve({
          data: { success: false, error: 'Insufficient wallet balance' },
          error: null,
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          transaction_id: 'mock_debit_txn_1',
          amount_debited: args.p_amount,
          new_balance: 450 - args.p_amount,
        },
        error: null,
      });
    }
    if (fnName === 'reverse_wallet_debit') {
      return Promise.resolve({
        data: {
          success: true,
          reversal_transaction_id: 'mock_rev_txn_1',
          refunded_amount: 150,
        },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'txn-1',
          wallet_id: 'mock_wallet_123',
          user_id: 'test_user_1',
          transaction_type: 'CREDIT',
          source: 'REFERRAL',
          amount: 200,
          currency: 'INR',
          status: 'COMPLETED',
          created_at: '2026-10-05T00:00:00Z',
        },
      ],
      error: null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { code: 'RASOI1234', is_active: true },
      error: null,
    }),
  }));

  return {
    getSupabaseClient: () => ({
      rpc: mockRpc,
      from: mockFrom,
    }),
  };
});

describe('walletService', () => {
  describe('Helper formatting & labels', () => {
    it('formats INR amounts cleanly with ₹ prefix', () => {
      expect(formatINR(0)).toBe('₹0');
      expect(formatINR(250)).toBe('₹250');
      expect(formatINR(1250.75)).toBe('₹1,251');
    });

    it('identifies credit vs debit transaction types correctly', () => {
      expect(isCredit('CREDIT')).toBe(true);
      expect(isCredit('REFUND')).toBe(true);
      expect(isCredit('RELEASE')).toBe(true);
      expect(isCredit('DEBIT')).toBe(false);
      expect(isCredit('REVERSAL')).toBe(false);
      expect(isCredit('EXPIRY')).toBe(false);
    });

    it('maps source and type enums to human readable labels', () => {
      expect(creditSourceLabel('ORDER_REFUND')).toBe('Order Refund');
      expect(creditSourceLabel('REFERRAL')).toBe('Referral Reward');
      expect(creditSourceLabel('PROMOTION')).toBe('Promotion');
      expect(transactionTypeLabel('CREDIT')).toBe('Credited');
      expect(transactionTypeLabel('DEBIT')).toBe('Debited');
      expect(transactionTypeLabel('REFUND')).toBe('Refund');
    });
  });

  describe('Wallet RPC operations', () => {
    it('initializes a wallet for a user idempotently', async () => {
      const res = await initializeWallet('test_user_1');
      expect(res.success).toBe(true);
      expect(res.data?.walletId).toBe('mock_wallet_123');
    });

    it('retrieves wallet balance with breakdown', async () => {
      const res = await getWalletBalance('test_user_1');
      expect(res.success).toBe(true);
      expect(res.data?.available_balance).toBe(450);
      expect(res.data?.breakdown.referral_credits).toBe(200);
      expect(res.data?.breakdown.refund_credits).toBe(150);
    });

    it('fetches transaction ledger for a user', async () => {
      const res = await getWalletTransactions('test_user_1');
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data?.length).toBeGreaterThan(0);
      expect(res.data?.[0].amount).toBe(200);
    });

    it('credits wallet successfully', async () => {
      const res = await creditWallet({
        userId: 'test_user_1',
        amount: 150,
        source: 'PROMOTION',
        description: 'Test loyalty credit',
      });
      expect(res.success).toBe(true);
      expect(res.data?.transactionId).toBe('mock_credit_txn_1');
      expect(res.data?.newBalance).toBe(600);
    });

    it('debits wallet with sufficient balance', async () => {
      const res = await debitWallet({
        userId: 'test_user_1',
        amount: 100,
        orderId: 'ORD_101',
      });
      expect(res.success).toBe(true);
      expect(res.data?.amountDebited).toBe(100);
      expect(res.data?.newBalance).toBe(350);
    });

    it('rejects debit when amount exceeds balance', async () => {
      const res = await debitWallet({
        userId: 'test_user_1',
        amount: 5000,
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient');
    });

    it('reverses a previous wallet debit', async () => {
      const res = await reverseWalletDebit({
        originalTransactionId: 'mock_debit_txn_1',
        reason: 'Order cancelled by chef',
      });
      expect(res.success).toBe(true);
      expect(res.data?.reversalTransactionId).toBe('mock_rev_txn_1');
      expect(res.data?.refundedAmount).toBe(150);
    });

    it('allows admin to issue promotional credits', async () => {
      const res = await adminIssueCredits({
        targetUserId: 'customer_99',
        amount: 150,
        source: 'PROMOTION',
        description: 'Customer service compensation',
        adminId: 'admin_raphael',
        expiresInDays: 30,
      });
      expect(res.success).toBe(true);
      expect(res.data?.newBalance).toBe(600);
    });
  });
});
