import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppLoadingCoverScreen } from '../features/splash/AppLoadingCoverScreen';
import { AuthProvider } from '../framework/context/AuthContext';
import { ThemeProvider as RasoiThemeProvider, useTheme } from '../framework/theme/ThemeContext';
import { PreferencesProvider } from '../framework/context/PreferencesContext';
import { WishlistProvider } from '../framework/context/WishlistContext';
import { CartProvider } from '../framework/context/CartContext';
import { InAppDialogProvider } from '../framework/context/InAppDialogContext';
import { WalletProvider } from '../framework/context/WalletContext';
import { CookModeProvider } from '../framework/context/CookModeContext';
import { FamilyProvider } from '../framework/context/FamilyContext';
import { SubscriptionProvider } from '../framework/context/SubscriptionContext';
import { ToastProvider } from '../framework/ui/Toast';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...Ionicons.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const initialMetrics =
    Platform.OS === 'web'
      ? {
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }
      : initialWindowMetrics;

  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <RasoiThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <FamilyProvider>
              <SubscriptionProvider>
                <PreferencesProvider>
                  <WishlistProvider>
                    <WalletProvider>
                      <CartProvider>
                        <InAppDialogProvider>
                          <CookModeProvider>
                            <NavigationWithTheme />
                          </CookModeProvider>
                        </InAppDialogProvider>
                      </CartProvider>
                    </WalletProvider>
                  </WishlistProvider>
                </PreferencesProvider>
              </SubscriptionProvider>
            </FamilyProvider>
          </AuthProvider>
        </ToastProvider>
      </RasoiThemeProvider>
    </SafeAreaProvider>
  );
}

function NavigationWithTheme() {
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bgPrimary,
        card: colors.bgSurface,
        text: colors.textPrimary,
        border: colors.borderLight,
        primary: colors.primary,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bgPrimary },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="cook/[orderId]"
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="join/[token]"
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
        </Stack>
        <AppLoadingCoverScreen />
      </View>
    </NavigationThemeProvider>
  );
}
