import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

let clientInstance: SupabaseClient | null = null;
let currentAuthToken: string | null = null;

/**
 * Sets the active authorization token (e.g. from Firebase or anonymous bridge)
 * and updates Supabase Realtime authorization.
 */
export function setSupabaseAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (clientInstance && token) {
    try {
      clientInstance.realtime.setAuth(token);
    } catch (err) {
      console.warn('[Supabase] Failed to set realtime auth token:', err);
    }
  }
}

/**
 * Returns the currently active custom authorization token.
 */
export function getSupabaseAuthToken(): string | null {
  return currentAuthToken;
}

/**
 * Returns a singleton instance of the Supabase client.
 * Configured with persistSession: false since Firebase handles user authentication.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    const url = CONFIG.supabaseUrl || 'https://duokelhwmmkuoceuweuz.supabase.co';
    const anonKey = CONFIG.supabaseAnonKey || 'sb_publishable_B2eyDzwM3SvTe8P3eJ8MBw_reqZmJCm';

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
      console.warn('[Supabase] Missing Supabase URL or Anon Key. Using sandbox client.');
    } else if (CONFIG.supabaseAnonKey.startsWith('sb_secret_')) {
      console.warn(
        '[Supabase] WARNING: EXPO_PUBLIC_SUPABASE_ANON_KEY is set to a secret/service_role key ("sb_secret_..."). ' +
          'Supabase blocks secret keys in browsers. Please use the "anon" / "public" key from Supabase Dashboard > Project Settings > API.',
      );
    }

    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return clientInstance;
}

export const supabase = getSupabaseClient();
