/**
 * Centralized Configuration for RasoiGenie Weekly Meal Subscriptions.
 * Single source of truth for pause limits, cutoff windows, auto-renewal policies, and plan pricing.
 */

export const SUBSCRIPTION_PAUSE_CONFIG = {
  /** Maximum cumulative paused days allowed per billing period */
  MAX_PAUSED_DAYS_PER_PERIOD: 14,

  /** Maximum separate pause ranges allowed per billing period */
  MAX_PAUSE_RANGES_PER_PERIOD: 2,

  /** Maximum consecutive days allowed in a single pause range */
  MAX_CONSECUTIVE_PAUSE_DAYS: 7,

  /** Cutoff window in hours before delivery (within which days are locked/disabled) */
  CUTOFF_WINDOW_HOURS: 48,
} as const;

export const SUBSCRIPTION_RENEWAL_CONFIG = {
  /** Default state of auto_renew for new subscriptions (with clear opt-out at checkout) */
  DEFAULT_AUTO_RENEW: true,

  /** Days before period_end to send a renewal reminder notification */
  REMINDER_DAYS_BEFORE_RENEWAL: 3,

  /** Maximum failed renewal attempts allowed before marking subscription expired */
  MAX_RENEWAL_ATTEMPTS: 3,

  /** Interval in hours between retry attempts */
  RETRY_INTERVAL_HOURS: 24,
} as const;

export const SUBSCRIPTION_PLAN_PRICES = {
  'high-protein': 1299,
  keto: 1399,
  vegan: 1199,
  custom: 1299,
} as const;
