import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { UnifiedLoginForm } from './UnifiedLoginForm';
import { ThemeSwitcher } from '../../framework/theme/ThemeSwitcher';

export interface AuthGuardProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  isRootGate?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  pageTitle,
  pageSubtitle,
  isRootGate,
}) => {
  const { user } = useAuth();
  const { colors, radii, shadows } = useTheme();

  if (user) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Banner */}
        <View style={styles.bannerContainer}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: colors.primaryLight, borderRadius: radii.pill },
            ]}
          >
            <Text style={styles.logoEmoji}>🥘</Text>
          </View>

          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>RasoiGenie</Text>
          <Text style={[styles.brandTagline, { color: colors.primary }]}>
            Authentic Indian Meal Prep Kits & Masalas
          </Text>

          {!isRootGate && pageTitle && (
            <View
              style={[
                styles.guardNotice,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  ...shadows.soft,
                },
              ]}
            >
              <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
                🔒 Sign In Required
              </Text>
              <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
                {pageSubtitle ||
                  `Please sign in to your RasoiGenie account to access ${pageTitle}.`}
              </Text>
            </View>
          )}
        </View>

        {/* Login Form */}
        <View style={styles.formWrapper}>
          <UnifiedLoginForm />
        </View>
      </ScrollView>

      {/* Floating Theme Switcher */}
      <ThemeSwitcher />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 440,
  },
  logoCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
  },
  guardNotice: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 440,
  },
});
