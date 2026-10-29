import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionPopupEligibilityParams {
  isSubscribed: boolean; // Own subscription or covered by active family subscription
  promptCount: number; // Persisted count of times shown
  lastPromptedAt: string | null; // ISO timestamp of last prompt
  now?: number; // Current epoch ms for testing
  minSpacingDays?: number; // Default 7 days
  maxPrompts?: number; // Default 2 prompts max
}

export interface SubscriptionPopupEligibilityResult {
  eligible: boolean;
  reason?: 'already_subscribed' | 'max_prompts_reached' | 'too_soon' | 'eligible';
}

const DEFAULT_MIN_SPACING_DAYS = 7;
const DEFAULT_MAX_PROMPTS = 2;

/**
 * Pure function: determines if a user is eligible to receive the post-order
 * subscription informational popup.
 *
 * Rules:
 * 1. If user is already subscribed (own or covered by family), NEVER show (eligible = false).
 * 2. If user was already prompted >= maxPrompts (2 times in total), NEVER show (eligible = false).
 * 3. If user was prompted within minSpacingDays (7 days), DO NOT show (eligible = false).
 * 4. Otherwise, user is eligible (eligible = true).
 */
export function checkSubscriptionPopupEligibility(
  params: SubscriptionPopupEligibilityParams,
): SubscriptionPopupEligibilityResult {
  const {
    isSubscribed,
    promptCount,
    lastPromptedAt,
    now = Date.now(),
    minSpacingDays = DEFAULT_MIN_SPACING_DAYS,
    maxPrompts = DEFAULT_MAX_PROMPTS,
  } = params;

  // Rule 1: Never show if already subscribed
  if (isSubscribed) {
    return { eligible: false, reason: 'already_subscribed' };
  }

  // Rule 2: At most 2 times in total
  if (promptCount >= maxPrompts) {
    return { eligible: false, reason: 'max_prompts_reached' };
  }

  // Rule 3: Spaced apart by at least 7 days
  if (lastPromptedAt) {
    const lastTime = new Date(lastPromptedAt).getTime();
    if (!isNaN(lastTime)) {
      const minSpacingMs = minSpacingDays * 24 * 60 * 60 * 1000;
      if (now - lastTime < minSpacingMs) {
        return { eligible: false, reason: 'too_soon' };
      }
    }
  }

  return { eligible: true, reason: 'eligible' };
}

const POPUP_STORAGE_KEY_PREFIX = '@rasoi_subscription_popup_state_';

export interface PersistedPopupState {
  promptCount: number;
  lastPromptedAt: string | null;
}

export async function getPersistedPopupState(userId: string): Promise<PersistedPopupState> {
  if (!userId) {
    return { promptCount: 0, lastPromptedAt: null };
  }
  try {
    const raw = await AsyncStorage.getItem(`${POPUP_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore
  }
  return { promptCount: 0, lastPromptedAt: null };
}

export async function recordSubscriptionPopupShown(userId: string): Promise<PersistedPopupState> {
  const current = await getPersistedPopupState(userId);
  const updated: PersistedPopupState = {
    promptCount: current.promptCount + 1,
    lastPromptedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(`${POPUP_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}
