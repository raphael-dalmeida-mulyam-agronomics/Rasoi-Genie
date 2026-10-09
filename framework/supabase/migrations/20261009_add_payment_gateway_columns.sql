-- Migration: Add payment gateway columns to public.orders
-- Adds razorpay_order_id, razorpay_payment_id, and razorpay_signature

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_payment_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_signature'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_signature TEXT;
  END IF;
END $$;
