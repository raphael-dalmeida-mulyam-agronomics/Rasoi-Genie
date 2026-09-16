import React from 'react';
import { CartView } from '../../features/cart/CartView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function CartScreen() {
  return (
    <AuthGuard
      pageTitle="Your Cooking Basket"
      pageSubtitle="Sign in to customize your box, apply discount coupons, and choose delivery slots."
    >
      <CartView />
    </AuthGuard>
  );
}
