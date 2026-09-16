import React from 'react';
import { OrderHistoryView } from '../../features/orders/OrderHistoryView';
import { AuthGuard } from '../../features/auth/AuthGuard';

export default function OrdersScreen() {
  return (
    <AuthGuard
      pageTitle="My Orders & Live Tracking"
      pageSubtitle="Sign in to track your fresh ingredient boxes, reorder, and download invoices."
    >
      <OrderHistoryView />
    </AuthGuard>
  );
}
