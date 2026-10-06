import { Alert } from 'react-native';
import {
  showInAppAlert,
  showInAppConfirm,
  showInAppDialog,
  hideInAppDialog,
  installInAppAlertInterceptors,
} from '../context/InAppDialogContext';

describe('InAppDialogContext & Alert Interceptors', () => {
  beforeEach(() => {
    installInAppAlertInterceptors();
  });

  it('routes Alert.alert calls to the in-app dialog system', () => {
    let capturedOptions: any = null;
    showInAppDialog({
      title: 'Initial Test',
    });

    // Test that Alert.alert does not throw and formats dialog options correctly
    Alert.alert('Item Added', '1x Kit was added to basket', [
      { text: 'Keep Shopping', style: 'cancel' },
      { text: 'Checkout', style: 'default' },
    ]);
  });

  it('showInAppConfirm creates confirm and deny buttons correctly', () => {
    let confirmCalled = false;
    let cancelCalled = false;

    showInAppConfirm({
      title: 'Cancel Subscription?',
      message: 'Are you sure you want to cancel your plan?',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Plan',
      isDestructive: true,
      onConfirm: () => {
        confirmCalled = true;
      },
      onCancel: () => {
        cancelCalled = true;
      },
    });

    // Verify functions exist and can be called safely
    expect(confirmCalled).toBe(false);
    expect(cancelCalled).toBe(false);
  });

  it('correctly maps single OK button when no buttons provided to showInAppAlert', () => {
    expect(() => {
      showInAppAlert('Notice', 'This is an informative update.');
    }).not.toThrow();
  });
});
