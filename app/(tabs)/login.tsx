import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { UnifiedLoginForm } from '../../features/auth/UnifiedLoginForm';
import { ProfileView } from '../../features/profile/ProfileView';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';

export default function LoginScreen() {
  const { user, isAdmin } = useAuth();
  const { colors } = useTheme();

  const handleLoginSuccess = () => {
    if (isAdmin) {
      router.push('/admin' as any);
    } else {
      router.push('/' as any);
    }
  };

  if (user) {
    return <ProfileView />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.content}
    >
      <UnifiedLoginForm onSuccess={handleLoginSuccess} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    justifyContent: 'center',
  },
});
