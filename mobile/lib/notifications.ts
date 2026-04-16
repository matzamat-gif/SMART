/**
 * Push notification setup (Expo Notifications).
 *
 * This is the #1 missing retention mechanic per the market analysis. The
 * morning push ("Your outfit is ready for today") is what brings users
 * back daily.
 *
 * The actual `expo-notifications` module is loaded lazily — it isn't a
 * required dependency at install time, so we no-op gracefully if it's not
 * present (e.g. on web builds).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { socialFeedAPI } from './api';

const PUSH_TOKEN_KEY = 'expoPushToken';
const PUSH_TOKEN_REGISTERED_KEY = 'expoPushTokenRegistered';

let cachedNotifications: any | null = null;

function getNotificationsModule(): any | null {
  if (cachedNotifications) return cachedNotifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotifications = require('expo-notifications');
    return cachedNotifications;
  } catch {
    return null;
  }
}

/**
 * Request permission and grab an Expo push token. Safe to call repeatedly;
 * cached in AsyncStorage so we don't re-prompt unnecessarily.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    logger.debug('expo-notifications not installed; push disabled');
    return null;
  }
  if (Platform.OS === 'web') return null;

  try {
    // Configure the default Android channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync('daily-outfit', {
        name: 'Daily Outfit',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) {
      logger.debug('Push permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token: string | undefined = tokenData?.data;
    if (!token) return null;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    logger.error('Failed to register for push notifications');
    return null;
  }
}

/**
 * Send the push token to the backend so the server can deliver morning
 * outfit notifications and re-engagement nudges.
 */
export async function syncPushTokenWithBackend(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  const alreadyRegistered = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
  if (alreadyRegistered === token) return;

  try {
    await socialFeedAPI.registerPushToken({
      token,
      platform: Platform.OS as 'ios' | 'android' | 'web',
    });
    await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, token);
  } catch (error) {
    // Backend may not yet implement the endpoint — keep the token cached
    // and try again next launch. Don't surface the failure to the user.
    logger.debug('Push token registration deferred');
  }
}

/**
 * Schedule a local notification for tomorrow morning at the user's chosen
 * hour (default 7am) reminding them their daily outfit is ready. Used as
 * a fallback when the backend cannot deliver a remote push.
 */
export async function scheduleMorningOutfitReminder(hour = 7, minute = 0): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    // Cancel any previously scheduled morning reminder so we don't stack.
    await cancelScheduledNotification('daily-morning-outfit');

    const trigger: any = {
      hour,
      minute,
      repeats: true,
    };
    if (Platform.OS === 'android') {
      trigger.channelId = 'daily-outfit';
    }

    const id = await Notifications.scheduleNotificationAsync({
      identifier: 'daily-morning-outfit',
      content: {
        title: 'Your outfit is ready ☀️',
        body: 'Tap to see what to wear today.',
        data: { route: '/(tabs)/today' },
      },
      trigger,
    });
    return id;
  } catch (error) {
    logger.debug('Could not schedule morning reminder');
    return null;
  }
}

export async function cancelScheduledNotification(identifier: string) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore
  }
}

/**
 * Configure how foreground notifications behave (banner + sound). Safe to
 * call once at app startup.
 */
export function configureNotificationHandler() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // ignore
  }
}

/**
 * Subscribe to "notification tapped" events. Returns an unsubscribe fn.
 * Pass a router/handler that receives the notification's `data.route`.
 */
export function addNotificationResponseListener(
  handler: (data: { route?: string; postId?: string | number; [key: string]: any }) => void
): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => {};
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data ?? {};
      handler(data);
    });
    return () => subscription?.remove?.();
  } catch {
    return () => {};
  }
}

