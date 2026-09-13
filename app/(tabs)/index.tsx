import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { HomeScreenView } from '../../features/home/HomeScreenView';
import { UnifiedLoginForm } from '../../features/auth/UnifiedLoginForm';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuth();

  // If user is not logged in, prompt Unified Login first
  if (!user) {
    return (
      <View style={styles.unauthContainer}>
        <UnifiedLoginForm
          onSuccess={() => {
            // Logged in
          }}
        />
      </View>
    );
  }

  return <HomeScreenView />;
}

const styles = StyleSheet.create({
  unauthContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    justifyContent: 'center',
  },
});
