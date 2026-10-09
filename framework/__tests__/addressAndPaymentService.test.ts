import {
  validateAddress,
  formatAddressSingleLine,
  formatAddressMultiLine,
  createDeliveryAddressSnapshot,
} from '../services/addressService';
import {
  createGatewayOrder,
  verifyAndRecordPayment,
  processCheckoutPayment,
  executeMockGatewayTransaction,
  MOCK_TEST_CARDS,
  MOCK_UPI_APPS,
  MOCK_NET_BANKS,
} from '../services/paymentGatewayService';
import { processOrderRefund } from '../services/supabaseOrdersService';

// Mock Supabase
jest.mock('../supabase/client', () => {
  const mockFrom = jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        id: 'ORD_TEST_1',
        user_id: 'user_123',
        total_amount: 500,
        status: 'Delivered',
        payment_status: 'Paid',
      },
      error: null,
    }),
  }));

  const mockRpc = jest.fn().mockResolvedValue({
    data: { success: true, transaction_id: 'txn_123' },
    error: null,
  });

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
    getSupabaseClient: () => ({
      from: mockFrom,
      rpc: mockRpc,
    }),
  };
});

describe('addressService & paymentGatewayService', () => {
  describe('Address validation and formatting', () => {
    it('validates a complete, accurate Indian address', () => {
      const valid = validateAddress({
        name: 'Raphael D',
        phone: '9876543210',
        flatAndStreet: 'Flat 402, Lotus Orchid',
        city: 'Bengaluru',
        pincode: '560103',
      });
      expect(valid.valid).toBe(true);
      expect(Object.keys(valid.errors).length).toBe(0);
    });

    it('rejects address with invalid PIN code or short phone number', () => {
      const invalid = validateAddress({
        name: '',
        phone: '123',
        flatAndStreet: '',
        city: '',
        pincode: '1234',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.name).toBeDefined();
      expect(invalid.errors.phone).toBeDefined();
      expect(invalid.errors.flatAndStreet).toBeDefined();
      expect(invalid.errors.city).toBeDefined();
      expect(invalid.errors.pincode).toBeDefined();
    });

    it('formats single-line and multi-line strings cleanly', () => {
      const addr = {
        name: 'Aarav Sharma',
        phone: '9876543210',
        flatAndStreet: 'Villa 12, Palm Grove',
        areaAndLandmark: 'Near Metro Pillar 42',
        city: 'Pune',
        pincode: '411001',
        tag: 'Home' as const,
        isDefault: true,
      };

      const single = formatAddressSingleLine(addr);
      expect(single).toBe('Villa 12, Palm Grove, Near Metro Pillar 42, Pune, 411001');

      const multi = formatAddressMultiLine(addr);
      expect(multi).toContain('Aarav Sharma (9876543210)');
      expect(multi).toContain('Pune - 411001');
    });

    it('creates immutable delivery address snapshot for orders', () => {
      const addr = {
        id: 'addr_1',
        name: 'Aarav Sharma',
        phone: '9876543210',
        flatAndStreet: 'Villa 12, Palm Grove',
        areaAndLandmark: 'Near Metro',
        city: 'Pune',
        pincode: '411001',
        tag: 'Home' as const,
        isDefault: true,
      };

      const snapshot = createDeliveryAddressSnapshot(addr, 'Leave with guard');
      expect(snapshot.id).toBe('addr_1');
      expect(snapshot.name).toBe('Aarav Sharma');
      expect(snapshot.deliveryInstructions).toBe('Leave with guard');
      expect(snapshot.formattedAddress).toContain('Villa 12');
      expect(snapshot.savedAt).toBeDefined();
    });
  });

  describe('Payment Gateway & Refund Processing', () => {
    it('creates gateway order in paise for Razorpay compatibility', async () => {
      const res = await createGatewayOrder('ORD_555', 450, {
        name: 'Priya K',
        email: 'priya@example.com',
        phone: '9876543210',
      });
      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(45000); // 450 * 100
      expect(res.data?.currency).toBe('INR');
      expect(res.data?.receipt).toBe('ORD_555');
    });

    it('processes 100% wallet paid checkout with zero payable cash', async () => {
      const res = await processCheckoutPayment({
        orderId: 'ORD_100_WALLET',
        payableAmount: 0,
        paymentMethod: 'Wallet',
        customer: { name: 'Priya', email: 'p@ex.com', phone: '9876543210' },
      });
      expect(res.success).toBe(true);
      expect(res.paymentId).toContain('WALLET_PAID');
    });

    it('processes Cash on Delivery checkout', async () => {
      const res = await processCheckoutPayment({
        orderId: 'ORD_COD',
        payableAmount: 500,
        paymentMethod: 'Cash on Delivery',
        customer: { name: 'Priya', email: 'p@ex.com', phone: '9876543210' },
      });
      expect(res.success).toBe(true);
      expect(res.paymentId).toContain('COD_PENDING');
    });

    it('processes online payment via UPI/Card', async () => {
      const res = await processCheckoutPayment({
        orderId: 'ORD_UPI',
        payableAmount: 350,
        paymentMethod: 'UPI',
        customer: { name: 'Priya', email: 'p@ex.com', phone: '9876543210' },
      });
      expect(res.success).toBe(true);
      expect(res.paymentId).toBeDefined();
    });

    it('processes order refund to Rasoi Credits Wallet', async () => {
      const refundRes = await processOrderRefund({
        orderId: 'ORD_TEST_1',
        refundAmount: 300,
        refundMethod: 'WALLET',
        reason: 'Missing herb garnish',
        adminId: 'super_admin',
      });
      expect(refundRes.success).toBe(true);
      expect(refundRes.walletCredited).toBe(true);
    });

    it('simulates mock payment gateway success with realistic tokens', async () => {
      const res = await executeMockGatewayTransaction({
        orderId: 'ORD_SIM_SUCCESS',
        payableAmount: 499,
        paymentMethod: 'Card',
        customer: { name: 'Raphael', email: 'raph@rasoigenie.in', phone: '9876543210' },
        outcome: 'success',
        details: { cardLast4: '4242' },
      });
      expect(res.success).toBe(true);
      expect(res.paymentId).toMatch(/^pay_/);
      expect(res.signature).toMatch(/^sig_/);
      expect(res.simulated).toBe(true);
    });

    it('simulates mock payment gateway bank decline', async () => {
      const res = await executeMockGatewayTransaction({
        orderId: 'ORD_SIM_DECLINE',
        payableAmount: 499,
        paymentMethod: 'Card',
        customer: { name: 'Raphael', email: 'raph@rasoigenie.in', phone: '9876543210' },
        outcome: 'decline',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('ERR_CARD_DECLINED');
      expect(res.simulated).toBe(true);
    });

    it('simulates mock payment gateway insufficient funds error', async () => {
      const res = await executeMockGatewayTransaction({
        orderId: 'ORD_SIM_FUNDS',
        payableAmount: 499,
        paymentMethod: 'UPI',
        customer: { name: 'Raphael', email: 'raph@rasoigenie.in', phone: '9876543210' },
        outcome: 'insufficient_funds',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('ERR_INSUFFICIENT_FUNDS');
      expect(res.simulated).toBe(true);
    });

    it('provides valid presets for cards, UPI apps, and net banking', () => {
      expect(MOCK_TEST_CARDS.length).toBeGreaterThanOrEqual(3);
      expect(MOCK_TEST_CARDS.find((c) => c.outcome === 'success')).toBeDefined();
      expect(MOCK_TEST_CARDS.find((c) => c.outcome === 'decline')).toBeDefined();

      expect(MOCK_UPI_APPS.length).toBeGreaterThanOrEqual(4);
      expect(MOCK_UPI_APPS.map((a) => a.id)).toContain('gpay');

      expect(MOCK_NET_BANKS.length).toBeGreaterThanOrEqual(4);
      expect(MOCK_NET_BANKS.map((b) => b.id)).toContain('hdfc');
    });
  });
});
