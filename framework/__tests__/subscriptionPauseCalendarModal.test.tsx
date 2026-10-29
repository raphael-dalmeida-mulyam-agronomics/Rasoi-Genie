import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SubscriptionPauseCalendarModal } from '../../features/subscription/SubscriptionPauseCalendarModal';
import { ThemeProvider } from '../theme/ThemeContext';
import { Subscription } from '../services/subscriptionService';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

const mockSubscription: Subscription = {
  id: 'sub_test_pause_modal',
  owner_user_id: 'user_1',
  family_id: null,
  scope: 'individual',
  plan_type: 'standard',
  standard_plan_key: 'high-protein',
  status: 'active',
  price_per_member_per_week: 1299,
  member_count: 1,
  amount_paid: 1299,
  wallet_credits_applied: 0,
  payment_reference: 'ref_1',
  payment_method: 'UPI',
  period_start: '2026-10-25T00:00:00.000Z',
  period_end: '2026-11-01T00:00:00.000Z',
  auto_renew: true,
  renewal_attempts: 0,
  next_renewal_at: '2026-11-01T00:00:00.000Z',
  cancel_at_period_end: false,
  last_renewed_period_end: null,
  region: 'West',
  created_at: '2026-10-25T00:00:00.000Z',
  updated_at: '2026-10-25T00:00:00.000Z',
};

describe('SubscriptionPauseCalendarModal', () => {
  it('does not render the removed subtitle text and renders next/prev month buttons with working navigation', async () => {
    const handleClose = jest.fn();
    const handleSavePause = jest.fn().mockResolvedValue({ success: true });

    const { getByTestId, queryByText, getByText } = await render(
      <ThemeProvider>
        <SubscriptionPauseCalendarModal
          visible={true}
          onClose={handleClose}
          subscription={mockSubscription}
          pauses={[]}
          onSavePause={handleSavePause}
        />
      </ThemeProvider>,
    );

    // 1. Verify the removed text is NOT in the document
    expect(queryByText(/Highlight days you want to skip/i)).toBeNull();
    expect(queryByText(/even non-contiguous/i)).toBeNull();

    // 2. Verify next month and previous month buttons exist
    const nextBtn = getByTestId('pause-calendar-next-month-btn');
    const prevBtn = getByTestId('pause-calendar-prev-month-btn');
    expect(nextBtn).toBeTruthy();
    expect(prevBtn).toBeTruthy();

    // Initial month should reflect October 2026 (based on period_start)
    expect(getByText(/October 2026/i)).toBeTruthy();

    // 3. Tapping the Next Month button navigates to November 2026
    fireEvent.press(nextBtn);
    await waitFor(() => {
      expect(getByText(/November 2026/i)).toBeTruthy();
    });

    // 4. Tapping the Previous Month button returns to October 2026
    fireEvent.press(prevBtn);
    await waitFor(() => {
      expect(getByText(/October 2026/i)).toBeTruthy();
    });
  });
});
