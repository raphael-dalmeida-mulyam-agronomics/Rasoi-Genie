import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface ToastOptions {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  if (SafeAreaInsetsContext) {
    try {
      const ctxInsets = React.useContext(SafeAreaInsetsContext);
      if (ctxInsets) insets = ctxInsets;
    } catch {
      // fallback to zeros
    }
  } else if (typeof useSafeAreaInsets === 'function') {
    try {
      const hookInsets = useSafeAreaInsets();
      if (hookInsets) insets = hookInsets;
    } catch {
      // fallback to zeros
    }
  }
  const { width } = useWindowDimensions();

  const [toast, setToast] = useState<ToastOptions | null>(null);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(options);

      slideAnim.setValue(80);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const duration = options.duration ?? 4000;
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [slideAnim, opacityAnim, hideToast],
  );

  const getIcon = () => {
    switch (toast?.type) {
      case 'warning':
        return <Icon name="alert-circle" size={20} color="#F59E0B" />;
      case 'error':
        return <Icon name="close-circle" size={20} color="#EF4444" />;
      case 'info':
        return <Icon name="information-circle" size={20} color="#3B82F6" />;
      case 'success':
      default:
        return <Icon name="checkmark-circle" size={20} color="#10B981" />;
    }
  };

  const bottomOffset = Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 24 : 70);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              bottom: bottomOffset,
              maxWidth: Math.min(width - 32, 520),
              backgroundColor: isDark ? '#1F1E1D' : '#18181B',
              borderRadius: radii.xl,
              ...shadows.card,
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.toastContent}>
            <View style={styles.iconWrap}>{getIcon()}</View>
            <Text style={styles.messageText} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>

          <View style={styles.actionsWrap}>
            {toast.actionLabel && (
              <TouchableOpacity
                onPress={() => {
                  toast.onAction?.();
                  hideToast();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionBtn}
              >
                <Text style={[styles.actionBtnText, { color: colors.primaryLight }]}>
                  {toast.actionLabel}
                </Text>
              </TouchableOpacity>
            )}

            {toast.secondaryActionLabel && (
              <TouchableOpacity
                onPress={() => {
                  toast.onSecondaryAction?.();
                  hideToast();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.secondaryActionBtn}
              >
                <Text style={styles.secondaryActionBtnText}>{toast.secondaryActionLabel}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={hideToast}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.dismissBtn}
            >
              <Icon name="close" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      hideToast: () => {},
    };
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99999,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryActionBtnText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
