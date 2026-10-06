import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { Icon, SemanticIconName } from '../ui/Icon';

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

export interface DialogButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'ghost';
}

export interface InAppDialogOptions {
  title: string;
  message?: string;
  buttons?: DialogButton[];
  icon?: SemanticIconName;
  type?: DialogVariant;
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: SemanticIconName;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

interface InAppDialogContextValue {
  showDialog: (options: InAppDialogOptions) => void;
  showAlert: (title: string, message?: string, buttons?: DialogButton[]) => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
  hideDialog: () => void;
}

const InAppDialogContext = createContext<InAppDialogContextValue | null>(null);

// Global event bus for non-hook usage (e.g. services or Alert.alert replacement)
type DialogListener = (dialog: InAppDialogOptions | null) => void;
let globalListener: DialogListener | null = null;

export function showInAppDialog(options: InAppDialogOptions) {
  if (globalListener) {
    globalListener(options);
  } else {
    console.warn('[InAppDialog] Dialog requested before provider mounted:', options.title);
  }
}

export function hideInAppDialog() {
  if (globalListener) {
    globalListener(null);
  }
}

/**
 * Shows an in-app alert dialog (replaces browser window.alert and native Alert.alert).
 */
export function showInAppAlert(
  title: string,
  message?: string,
  buttons?: (DialogButton | { text: string; onPress?: () => void; style?: string })[],
) {
  let mappedButtons: DialogButton[];

  if (buttons && buttons.length > 0) {
    mappedButtons = buttons.map((b) => ({
      text: b.text,
      onPress: b.onPress,
      style: (b.style as any) || 'default',
    }));
  } else {
    mappedButtons = [{ text: 'OK', style: 'default' }];
  }

  // Detect icon and type from title or content
  let type: DialogVariant = 'info';
  let icon: SemanticIconName = 'restaurant';

  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();

  if (t.includes('delete') || t.includes('cancel') || t.includes('error') || t.includes('fail')) {
    type = 'danger';
    icon = t.includes('delete') ? 'trash' : 'close-circle';
  } else if (
    t.includes('success') ||
    t.includes('ready') ||
    t.includes('added') ||
    t.includes('confirmed')
  ) {
    type = 'success';
    icon = 'check-circle';
  } else if (
    t.includes('warn') ||
    t.includes('required') ||
    t.includes('notice') ||
    t.includes('limit')
  ) {
    type = 'warning';
    icon = 'alert';
  } else if (t.includes('cart') || t.includes('basket')) {
    type = 'info';
    icon = 'cart';
  }

  showInAppDialog({
    title,
    message,
    buttons: mappedButtons,
    type,
    icon,
    cancelable: true,
  });
}

/**
 * Shows an in-app confirmation dialog with clear confirm and deny/cancel options.
 */
export function showInAppConfirm({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogOptions) {
  const chosenIcon: SemanticIconName = icon || (isDestructive ? 'trash' : 'alert');

  showInAppDialog({
    title,
    message,
    type: isDestructive ? 'danger' : 'confirm',
    icon: chosenIcon,
    cancelable: true,
    onDismiss: onCancel,
    buttons: [
      {
        text: cancelText,
        style: 'cancel',
        variant: 'secondary',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: isDestructive ? 'destructive' : 'default',
        variant: isDestructive ? 'danger' : 'primary',
        onPress: onConfirm,
      },
    ],
  });
}

/**
 * Installs global interceptors for Alert.alert and browser popups.
 */
let isInstalled = false;
export function installInAppAlertInterceptors() {
  if (isInstalled) return;
  isInstalled = true;

  // Intercept React Native's Alert.alert to route all popups into our in-app modal
  Alert.alert = (title: string, message?: string, buttons?: any[]) => {
    showInAppAlert(title, message, buttons);
  };

  // Intercept browser window.alert and window.confirm
  if (typeof window !== 'undefined') {
    (window as any).alert = (msg?: string) => {
      showInAppAlert('Notice', msg ? String(msg) : '');
    };
    (window as any).confirm = (msg?: string) => {
      showInAppAlert('Confirm Action', msg ? String(msg) : '');
      return true;
    };
  }
}

export const InAppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDialog, setActiveDialog] = useState<InAppDialogOptions | null>(null);
  const { colors, radii, shadows } = useTheme();

  useEffect(() => {
    installInAppAlertInterceptors();
    globalListener = (dialog) => {
      setActiveDialog(dialog);
    };
    return () => {
      globalListener = null;
    };
  }, []);

  const handleClose = useCallback(() => {
    const dialog = activeDialog;
    setActiveDialog(null);
    if (dialog?.onDismiss) {
      dialog.onDismiss();
    }
  }, [activeDialog]);

  const handleButtonPress = useCallback(async (button: DialogButton) => {
    setActiveDialog(null);
    if (button.onPress) {
      try {
        await button.onPress();
      } catch (err) {
        console.error('[InAppDialog] Error in button onPress:', err);
      }
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      showDialog: (opts: InAppDialogOptions) => showInAppDialog(opts),
      showAlert: (title: string, msg?: string, btns?: DialogButton[]) =>
        showInAppAlert(title, msg, btns),
      showConfirm: (opts: ConfirmDialogOptions) => showInAppConfirm(opts),
      hideDialog: () => hideInAppDialog(),
    }),
    [],
  );

  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width - 40, 420);

  // Icon container badge styling based on dialog type
  const getIconContainerStyle = () => {
    switch (activeDialog?.type) {
      case 'danger':
        return {
          backgroundColor: '#FEE2E2',
          borderColor: '#FCA5A5',
          iconColor: '#DC2626',
        };
      case 'success':
        return {
          backgroundColor: '#DCFCE7',
          borderColor: '#86EFAC',
          iconColor: '#16A34A',
        };
      case 'warning':
        return {
          backgroundColor: '#FEF3C7',
          borderColor: '#FCD34D',
          iconColor: '#D97706',
        };
      case 'confirm':
        return {
          backgroundColor: colors.primaryLight || '#FFEDD5',
          borderColor: colors.primary,
          iconColor: colors.primary,
        };
      default:
        return {
          backgroundColor: colors.primaryLight || '#FFEDD5',
          borderColor: colors.borderLight,
          iconColor: colors.primary,
        };
    }
  };

  const iconStyle = activeDialog ? getIconContainerStyle() : null;

  return (
    <InAppDialogContext.Provider value={contextValue}>
      {children}

      {/* Global In-App Dialog Popup */}
      <Modal
        visible={activeDialog !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={activeDialog?.cancelable ? handleClose : undefined}
      >
        <TouchableWithoutFeedback onPress={activeDialog?.cancelable ? handleClose : undefined}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.card,
                  {
                    width: cardWidth,
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.xl || 20,
                    ...shadows.card,
                  },
                ]}
              >
                {/* Header Icon Badge */}
                {activeDialog?.icon && iconStyle ? (
                  <View
                    style={[styles.iconContainer, { backgroundColor: iconStyle.backgroundColor }]}
                  >
                    <Icon name={activeDialog.icon} size={28} color={iconStyle.iconColor} />
                  </View>
                ) : null}

                {/* Title */}
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {activeDialog?.title}
                </Text>

                {/* Message Body */}
                {activeDialog?.message ? (
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {activeDialog.message}
                  </Text>
                ) : null}

                {/* Action Buttons: Confirm or Deny */}
                <View
                  style={[
                    styles.buttonRow,
                    activeDialog?.buttons && activeDialog.buttons.length > 2
                      ? styles.buttonColumn
                      : null,
                  ]}
                >
                  {(activeDialog?.buttons || [{ text: 'OK', style: 'default' }]).map((btn, idx) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    const btnVariant =
                      btn.variant ||
                      (isDestructive ? 'danger' : isCancel ? 'secondary' : 'primary');

                    return (
                      <View
                        key={`dialog-btn-${idx}`}
                        style={
                          activeDialog?.buttons && activeDialog.buttons.length <= 2
                            ? { flex: 1 }
                            : { width: '100%', marginBottom: 6 }
                        }
                      >
                        <Button
                          title={btn.text}
                          variant={btnVariant}
                          size="md"
                          onPress={() => handleButtonPress(btn)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </InAppDialogContext.Provider>
  );
};

export function useInAppDialog(): InAppDialogContextValue {
  const context = useContext(InAppDialogContext);
  if (!context) {
    throw new Error('useInAppDialog must be used within an InAppDialogProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  card: {
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    maxWidth: '100%',
    zIndex: 100000,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: 8,
  },
});
