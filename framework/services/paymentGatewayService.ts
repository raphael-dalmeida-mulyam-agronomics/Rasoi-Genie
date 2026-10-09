import { Platform } from 'react-native';
import { getSupabaseClient } from '../supabase/client';

export type SupportedPaymentMethod = 'UPI' | 'Card' | 'Wallet' | 'Cash on Delivery';

export interface PaymentCustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface PaymentGatewayOrder {
  id: string; // razorpay_order_id or internal simulated ID
  amount: number; // in paise (e.g. 10000 = Rs 100)
  currency: string;
  receipt: string; // orderId
  status: 'created' | 'paid' | 'failed';
  keyId?: string;
}

export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentProcessResult {
  success: boolean;
  paymentId?: string;
  gatewayOrderId?: string;
  signature?: string;
  error?: string;
  simulated?: boolean;
}

// Public test Razorpay Key ID (or loaded from env/config)
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_RasoiGenieDemo';

/**
 * Creates a payment gateway order record.
 * When a dedicated backend or Supabase Edge function is available, it calls
 * Razorpay Orders API server-side. In development/client mode, creates an order record
 * in public.payment_gateway_orders table.
 */
export async function createGatewayOrder(
  orderId: string,
  amountInRupees: number,
  customer: PaymentCustomerInfo,
): Promise<{ success: boolean; data?: PaymentGatewayOrder; error?: string }> {
  try {
    const amountInPaise = Math.round(amountInRupees * 100);
    const mockRazorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const supabase = getSupabaseClient();
    try {
      await supabase.from('payment_gateway_orders').insert({
        order_id: orderId,
        gateway_order_id: mockRazorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        status: 'created',
        customer_phone: customer.phone,
        customer_email: customer.email,
      });
    } catch {
      // Table may not exist if migration was skipped in pure mock mode; proceed gracefully
    }

    return {
      success: true,
      data: {
        id: mockRazorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        status: 'created',
        keyId: RAZORPAY_KEY_ID,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create payment order' };
  }
}

/**
 * Verifies payment signature.
 * In a full production backend, this validates HMAC SHA256 (order_id + "|" + payment_id, secret).
 * In the client runtime, it validates required fields and idempotently marks order as Paid.
 */
export async function verifyAndRecordPayment(
  orderId: string,
  verification: PaymentVerificationData,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!verification.razorpay_payment_id) {
      return { success: false, error: 'Missing payment ID from payment gateway' };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'Paid',
        transaction_id: verification.razorpay_payment_id || verification.razorpay_order_id,
        razorpay_order_id: verification.razorpay_order_id,
        razorpay_payment_id: verification.razorpay_payment_id,
        razorpay_signature: verification.razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      // If razorpay-specific columns are not yet in Supabase schema cache, gracefully fallback to core columns
      if (
        error.message?.includes('razorpay_order_id') ||
        error.message?.includes('schema cache') ||
        error.code === 'PGRST204'
      ) {
        const { error: fallbackErr } = await supabase
          .from('orders')
          .update({
            payment_status: 'Paid',
            transaction_id: verification.razorpay_payment_id || verification.razorpay_order_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (fallbackErr) {
          console.warn(
            '[PaymentGatewayService] Error recording payment in Supabase:',
            fallbackErr.message,
          );
          return { success: false, error: fallbackErr.message };
        }
        return { success: true };
      }

      console.warn('[PaymentGatewayService] Error recording payment in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Payment verification failed' };
  }
}

// Preset Mock Test Cards for gateway simulation
export interface MockCardPreset {
  id: string;
  label: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  scheme: 'visa' | 'mastercard' | 'rupay';
  outcome: 'success' | 'decline' | 'insufficient_funds';
  description: string;
}

export const MOCK_TEST_CARDS: MockCardPreset[] = [
  {
    id: 'card-success-visa',
    label: 'Test Visa (Auto-Success)',
    cardNumber: '4111 2222 3333 4242',
    expiry: '12/28',
    cvv: '123',
    scheme: 'visa',
    outcome: 'success',
    description: 'Always succeeds without delays or OTP challenge',
  },
  {
    id: 'card-decline-mc',
    label: 'Test MasterCard (Bank Decline)',
    cardNumber: '5555 4444 3333 0002',
    expiry: '08/27',
    cvv: '456',
    scheme: 'mastercard',
    outcome: 'decline',
    description: 'Simulates bank security card decline',
  },
  {
    id: 'card-funds-rupay',
    label: 'Test RuPay (Insufficient Funds)',
    cardNumber: '6071 8293 4012 0004',
    expiry: '11/29',
    cvv: '789',
    scheme: 'rupay',
    outcome: 'insufficient_funds',
    description: 'Simulates insufficient bank balance',
  },
];

export interface MockUpiAppPreset {
  id: string;
  name: string;
  handleSuffix: string;
  iconName: string;
  color: string;
}

export const MOCK_UPI_APPS: MockUpiAppPreset[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    handleSuffix: '@okaxis',
    iconName: 'logo-google',
    color: '#4285F4',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    handleSuffix: '@ybl',
    iconName: 'phone-portrait',
    color: '#5F259F',
  },
  { id: 'paytm', name: 'Paytm UPI', handleSuffix: '@paytm', iconName: 'wallet', color: '#00BAF2' },
  { id: 'bhim', name: 'BHIM UPI', handleSuffix: '@upi', iconName: 'qr-code', color: '#00796B' },
];

export const MOCK_NET_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
  { id: 'sbi', name: 'State Bank of India', code: 'SBIN' },
  { id: 'axis', name: 'Axis Bank', code: 'UTIB' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', code: 'KKBK' },
];

/**
 * Simulates an online payment gateway transaction execution.
 * Allows simulating both success and realistic failure modes.
 */
export async function executeMockGatewayTransaction(params: {
  orderId: string;
  payableAmount: number;
  paymentMethod: SupportedPaymentMethod;
  customer: PaymentCustomerInfo;
  outcome?: 'success' | 'decline' | 'insufficient_funds';
  details?: {
    upiId?: string;
    cardLast4?: string;
    bankName?: string;
  };
}): Promise<PaymentProcessResult> {
  const { orderId, payableAmount, customer, outcome = 'success' } = params;

  if (outcome === 'decline') {
    return {
      success: false,
      error:
        'Bank server declined card authorization (ERR_CARD_DECLINED). Please try another payment method.',
      simulated: true,
    };
  }

  if (outcome === 'insufficient_funds') {
    return {
      success: false,
      error: 'Insufficient account balance for this transaction (ERR_INSUFFICIENT_FUNDS).',
      simulated: true,
    };
  }

  const orderRes = await createGatewayOrder(orderId, payableAmount, customer);
  const gatewayOrderId = orderRes.data?.id || `order_${Date.now()}`;

  const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const mockSignature = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  await verifyAndRecordPayment(orderId, {
    razorpay_order_id: gatewayOrderId,
    razorpay_payment_id: mockPaymentId,
    razorpay_signature: mockSignature,
  });

  return {
    success: true,
    gatewayOrderId,
    paymentId: mockPaymentId,
    signature: mockSignature,
    simulated: true,
  };
}

/**
 * Initiates and executes checkout payment depending on method (UPI, Card, COD, Wallet).
 * Handles both web and mobile environments cleanly.
 */
export async function processCheckoutPayment(params: {
  orderId: string;
  payableAmount: number; // remaining cash amount after wallet deductions
  paymentMethod: SupportedPaymentMethod;
  customer: PaymentCustomerInfo;
  upiId?: string;
}): Promise<PaymentProcessResult> {
  const { orderId, payableAmount, paymentMethod, customer } = params;

  // 1. If payable amount is 0 (fully covered by wallet credits)
  if (payableAmount <= 0) {
    return {
      success: true,
      paymentId: `WALLET_PAID_${Date.now()}`,
      simulated: false,
    };
  }

  // 2. Cash on Delivery
  if (paymentMethod === 'Cash on Delivery') {
    return {
      success: true,
      paymentId: `COD_PENDING_${Date.now()}`,
      simulated: false,
    };
  }

  // 3. Online Payments: UPI or Card
  return executeMockGatewayTransaction({
    orderId,
    payableAmount,
    paymentMethod,
    customer,
    outcome: 'success',
  });
}
