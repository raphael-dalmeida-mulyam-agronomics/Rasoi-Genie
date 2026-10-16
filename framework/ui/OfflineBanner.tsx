import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface OfflineBannerProps {
  status?: 'connecting' | 'live' | 'reconnecting' | 'offline';
  message?: string;
  onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  status = 'offline',
  message,
  onRetry,
}) => {
  const { colors, radii } = useTheme();

  if (status === 'live') {
    return null;
  }

  const isReconnecting = status === 'reconnecting' || status === 'connecting';
  const defaultMsg = isReconnecting
    ? 'Reconnecting to live kitchen server...'
    : 'Offline mode: Changes saved on this device';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isReconnecting ? '#FEF3C7' : '#FEE2E2',
          borderColor: isReconnecting ? '#F59E0B' : '#EF4444',
          borderRadius: radii.md,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon
          name={isReconnecting ? 'sync' : 'cloud-offline'}
          size={16}
          color={isReconnecting ? '#B45309' : '#B91C1C'}
        />
        <Text
          style={[
            styles.text,
            {
              color: isReconnecting ? '#92400E' : '#991B1B',
            },
          ]}
        >
          {message || defaultMsg}
        </Text>
      </View>

      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.retryBtn}
        >
          <Text style={[styles.retryText, { color: isReconnecting ? '#B45309' : '#B91C1C' }]}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryBtn: {
    paddingLeft: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
