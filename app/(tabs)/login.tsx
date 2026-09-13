import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { UnifiedLoginForm } from '../../features/auth/UnifiedLoginForm';
import { useAuth } from '../../framework/context/AuthContext';
import { Card } from '../../framework/ui/Card';
import { Button } from '../../framework/ui/Button';
import { Badge } from '../../framework/ui/Badge';

export default function LoginScreen() {
  const { user, isAdmin, logout } = useAuth();

  const handleLoginSuccess = () => {
    if (isAdmin) {
      router.push('/admin' as any);
    } else {
      router.push('/' as any);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logged In Session State */}
      {user ? (
        <Card style={styles.userBanner}>
          <View style={styles.bannerHeader}>
            <Text style={styles.userBannerTitle}>Active User Session</Text>
            <Badge
              label={isAdmin ? 'Admin (@mulyam.in)' : 'Customer'}
              variant={isAdmin ? 'info' : 'success'}
            />
          </View>

          <Text style={styles.userBannerDetail}>
            User: {user.email || user.phoneNumber || user.displayName || 'Authenticated'}
          </Text>

          <View style={styles.bannerActions}>
            <Button
              title="Go to Home Catalog"
              onPress={() => router.push('/' as any)}
              style={{ flex: 1, marginRight: 8 }}
            />
            {isAdmin ? (
              <Button
                title="Admin Dashboard"
                variant="secondary"
                onPress={() => router.push('/admin' as any)}
                style={{ flex: 1, marginRight: 8 }}
              />
            ) : null}
            <Button
              title="Logout"
              variant="outline"
              onPress={logout}
              style={{ paddingHorizontal: 12 }}
            />
          </View>
        </Card>
      ) : (
        <UnifiedLoginForm onSuccess={handleLoginSuccess} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  userBanner: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  userBannerDetail: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
