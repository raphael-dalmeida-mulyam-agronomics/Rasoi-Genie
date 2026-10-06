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
        razorpay_order_id: verification.razorpay_order_id,
        razorpay_payment_id: verification.razorpay_payment_id,
        razorpay_signature: verification.razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.warn('[PaymentGatewayService] Error recording payment in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Payment verification failed' };
  }
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
  const { orderId, payableAmount, paymentMethod, customer, upiId } = params;

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
  try {
    const orderRes = await createGatewayOrder(orderId, payableAmount, customer);
    if (!orderRes.success || !orderRes.data) {
      return { success: false, error: orderRes.error || 'Failed to initialize payment gateway' };
    }

    const gatewayOrder = orderRes.data;

    // Simulate instant secure gateway confirmation (or link with Native Razorpay if in ejected build)
    const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockSignature = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const verifyRes = await verifyAndRecordPayment(orderId, {
      razorpay_order_id: gatewayOrder.id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
    });

    if (!verifyRes.success) {
      return { success: false, error: verifyRes.error };
    }

    return {
      success: true,
      gatewayOrderId: gatewayOrder.id,
      paymentId: mockPaymentId,
      signature: mockSignature,
      simulated: true,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Payment processing error' };
  }
}
