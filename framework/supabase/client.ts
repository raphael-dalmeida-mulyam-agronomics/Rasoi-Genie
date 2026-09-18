import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../../src/constants/config';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton instance of the Supabase client.
 * Configured with persistSession: false since Firebase handles user authentication.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    const url = CONFIG.supabaseUrl || 'https://placeholder-project.supabase.co';
    const anonKey = CONFIG.supabaseAnonKey || 'placeholder-anon-key';

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
      console.warn('[Supabase] Missing Supabase URL or Anon Key. Using sandbox client.');
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
