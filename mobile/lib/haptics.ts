import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Safe haptics wrapper that works on web (no-op) and native (real haptics)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  success: async () => {
    if (!isNative) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  warning: async () => {
    if (!isNative) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  error: async () => {
    if (!isNative) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  light: async () => {
    if (!isNative) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  medium: async () => {
    if (!isNative) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  heavy: async () => {
    if (!isNative) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },

  selection: async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  },
};
