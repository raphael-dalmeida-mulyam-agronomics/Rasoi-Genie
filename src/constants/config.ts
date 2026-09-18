import Constants from 'expo-constants';

interface AppConfig {
  apiBaseUrl: string;
  env: 'development' | 'staging' | 'production';
  enableMockApi: boolean;
  analyticsEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const getEnvVar = (key: string, defaultValue: string): string => {
  const value = process.env[key] || Constants.expoConfig?.extra?.[key];
  if (!value && !defaultValue) {
    console.warn(`[Config] Missing environment variable: ${key}`);
  }
  return value || defaultValue;
};

export const CONFIG: AppConfig = {
  apiBaseUrl: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:3000/api/v1'),
  env: getEnvVar('EXPO_PUBLIC_ENV', 'development') as AppConfig['env'],
  enableMockApi: getEnvVar('EXPO_PUBLIC_ENABLE_MOCK_API', 'true') === 'true',
  analyticsEnabled: getEnvVar('EXPO_PUBLIC_ANALYTICS_ENABLED', 'false') === 'true',
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', ''),
  supabaseAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
};
