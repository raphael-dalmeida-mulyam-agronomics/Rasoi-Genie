// Safely handle expo-constants across Web, Native, and pure Node environments
let Constants: any = null;
try {
  Constants = require('expo-constants')?.default || require('expo-constants');
} catch {
  // Pure Node / Playwright fallback
}

interface AppConfig {
  apiBaseUrl: string;
  env: 'development' | 'staging' | 'production';
  enableMockApi: boolean;
  analyticsEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://duokelhwmmkuoceuweuz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_B2eyDzwM3SvTe8P3eJ8MBw_reqZmJCm';

export const CONFIG: AppConfig = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
    'http://localhost:3000/api/v1',
  env: (process.env.EXPO_PUBLIC_ENV ||
    Constants?.expoConfig?.extra?.EXPO_PUBLIC_ENV ||
    'development') as AppConfig['env'],
  enableMockApi:
    (process.env.EXPO_PUBLIC_ENABLE_MOCK_API ??
      Constants?.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_MOCK_API ??
      'true') === 'true',
  analyticsEnabled:
    (process.env.EXPO_PUBLIC_ANALYTICS_ENABLED ??
      Constants?.expoConfig?.extra?.EXPO_PUBLIC_ANALYTICS_ENABLED ??
      'false') === 'true',
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL,
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY,
};
