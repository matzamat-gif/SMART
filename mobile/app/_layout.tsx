import '../lib/polyfills';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nProvider } from '../lib/i18n/I18nContext';
import { ThemeProvider } from '../lib/ThemeContext';
import { AuthProvider } from '../lib/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { configureNotificationHandler } from '../lib/notifications';
import { logger } from '../lib/logger';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure foreground notification behaviour once at module load.
configureNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after layout mounts
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        logger.warn('Failed to hide splash screen');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
