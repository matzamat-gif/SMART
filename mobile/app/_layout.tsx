import '../lib/polyfills';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nProvider } from '../lib/i18n/I18nContext';
import { ThemeProvider } from '../lib/ThemeContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after layout mounts
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Failed to hide splash screen:', e);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </ThemeProvider>
  );
}
