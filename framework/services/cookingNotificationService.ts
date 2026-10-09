import { Platform, Alert } from 'react-native';
import { playOrderAlertSound } from './notificationService';

// Lazy loader so expo-notifications is not evaluated on web (which causes push token listener warnings)
function getNativeNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS !== 'web') {
    try {
      return require('expo-notifications');
    } catch {
      return null;
    }
  }
  return null;
}

try {
  const nativeNotifications = getNativeNotifications();
  if (nativeNotifications) {
    nativeNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Silent fallback for test environments
}

let hasRequestedPermission = false;

/**
 * Request notification permissions contextually on first timer start.
 */
export async function requestCookingNotificationPermission(): Promise<boolean> {
  if (hasRequestedPermission) {
    return true;
  }
  hasRequestedPermission = true;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        try {
          const res = await Notification.requestPermission();
          return res === 'granted';
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  try {
    const nativeNotifications = getNativeNotifications();
    if (!nativeNotifications) return true;
    const { status: existingStatus } = await nativeNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await nativeNotifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[CookingNotifications] Error requesting permission:', err);
    return false;
  }
}

const activeWebTimeouts = new Map<string, any>();

/**
 * Schedules a local push/system notification for a step timer.
 */
export async function scheduleCookingTimerNotification(params: {
  orderId: string;
  kitId: string;
  stepNumber: number;
  stepTitle: string;
  seconds: number;
}): Promise<string | null> {
  const { stepNumber, stepTitle, seconds } = params;
  if (seconds <= 0) return null;

  await requestCookingNotificationPermission();

  if (Platform.OS === 'web') {
    const key = `web_timer_${params.orderId}_${params.kitId}_${stepNumber}_${Date.now()}`;
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        activeWebTimeouts.delete(key);
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Timer Finished! 🍳`, {
              body: `Step ${stepNumber}: ${stepTitle} is ready!`,
            });
          }
        } catch {}
      }, seconds * 1000);
      activeWebTimeouts.set(key, timeoutId);
    }
    return key;
  }

  try {
    const nativeNotifications = getNativeNotifications();
    if (!nativeNotifications) return `mock_notif_${Date.now()}`;
    const notificationId = await nativeNotifications.scheduleNotificationAsync({
      content: {
        title: 'Timer Complete! 🍳',
        body: `Step ${stepNumber}: ${stepTitle} - time to move to the next step!`,
        sound: true,
        data: {
          orderId: params.orderId,
          kitId: params.kitId,
          stepNumber: params.stepNumber,
        },
      },
      trigger: {
        type: nativeNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
    return notificationId;
  } catch (err) {
    console.warn('[CookingNotifications] Could not schedule notification:', err);
    return `mock_notif_${Date.now()}`;
  }
}

/**
 * Cancels a previously scheduled cooking timer notification.
 */
export async function cancelCookingTimerNotification(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId) return;

  if (notificationId.startsWith('web_timer_')) {
    const timeoutId = activeWebTimeouts.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeWebTimeouts.delete(notificationId);
    }
    return;
  }

  try {
    const nativeNotifications = getNativeNotifications();
    if (nativeNotifications) {
      await nativeNotifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch (err) {
    console.warn('[CookingNotifications] Could not cancel notification:', err);
  }
}

/**
 * Plays foreground alert sound & shows modal/alert when a cooking timer completes.
 */
export function notifyTimerFinishedInForeground(stepNumber: number, stepTitle: string): void {
  try {
    playOrderAlertSound();
  } catch {}

  Alert.alert(
    'Timer Finished! 🍳',
    `Step ${stepNumber}: "${stepTitle}" is ready. Check your pan and move to the next step!`,
    [{ text: 'Got it!' }],
  );
}
