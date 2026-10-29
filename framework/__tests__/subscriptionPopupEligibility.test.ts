import { checkSubscriptionPopupEligibility } from '../services/subscriptionPopupService';

describe('Post-Order Subscription Popup Eligibility Tests (Pure Evaluator)', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const NOW = 1700000000000; // Fixed epoch for testing

  it('NEVER shows popup if user is already subscribed (own subscription)', () => {
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: true,
      promptCount: 0,
      lastPromptedAt: null,
      now: NOW,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('already_subscribed');
  });

  it('NEVER shows popup if user is covered by their family owner subscription', () => {
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: true,
      promptCount: 1,
      lastPromptedAt: new Date(NOW - 20 * ONE_DAY_MS).toISOString(),
      now: NOW,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('already_subscribed');
  });

  it('NEVER shows popup if user has already been prompted 2 times in total', () => {
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: false,
      promptCount: 2,
      lastPromptedAt: new Date(NOW - 15 * ONE_DAY_MS).toISOString(),
      now: NOW,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('max_prompts_reached');
  });

  it('blocks popup if shown recently within the 7-day spacing period', () => {
    // Prompted 3 days ago
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: false,
      promptCount: 1,
      lastPromptedAt: new Date(NOW - 3 * ONE_DAY_MS).toISOString(),
      now: NOW,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('too_soon');
  });

  it('allows popup if prompted >= 7 days ago and prompt count < 2', () => {
    // Prompted 8 days ago
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: false,
      promptCount: 1,
      lastPromptedAt: new Date(NOW - 8 * ONE_DAY_MS).toISOString(),
      now: NOW,
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('eligible');
  });

  it('allows popup for a new unsubscribed user with 0 previous prompts', () => {
    const result = checkSubscriptionPopupEligibility({
      isSubscribed: false,
      promptCount: 0,
      lastPromptedAt: null,
      now: NOW,
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('eligible');
  });
});
