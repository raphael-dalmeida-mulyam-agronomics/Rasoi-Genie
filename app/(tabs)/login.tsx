import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { UnifiedLoginForm } from '../../features/auth/UnifiedLoginForm';
import { ProfileView } from '../../features/profile/ProfileView';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { ThemeSelectorModal } from '../../framework/ui/ThemeSelectorModal';
import { Icon } from '../../framework/ui/Icon';

export default function LoginScreen() {
  const { user, isAdmin } = useAuth();
  const { colors, isDark, palette } = useTheme();
  const [themeModalVisible, setThemeModalVisible] = useState(false);

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
      <View style={styles.topThemeRow}>
        <TouchableOpacity
          testID="login-theme-selector-btn"
          style={[
            styles.themePillBtn,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
          onPress={() => setThemeModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name={isDark ? 'moon' : 'sun'} size={14} color={colors.primary} />
          <Text style={[styles.themePillText, { color: colors.textPrimary }]}>
            {isDark ? 'Dark Mode' : 'Light Mode'} • {palette.name}
          </Text>
        </TouchableOpacity>
      </View>

      <UnifiedLoginForm onSuccess={handleLoginSuccess} />

      <ThemeSelectorModal visible={themeModalVisible} onClose={() => setThemeModalVisible(false)} />
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
    flexGrow: 1,
  },
  topThemeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  themePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
