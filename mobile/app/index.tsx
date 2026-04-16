import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '@/lib/i18n';
import { isTokenValid, clearAuthStorage } from '@/lib/api';
import { logger } from '@/lib/logger';

export default function Index() {
  const { t } = useI18n();

  useEffect(() => {
    // Delay to show splash screen briefly
    const timer = setTimeout(() => {
      checkAuth();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // DEV-002: Validate token shape + expiry. Any string previously
      // bypassed auth; an expired/forged token must trigger re-login.
      if (token && isTokenValid(token)) {
        router.replace('/(tabs)');
        return;
      }

      if (token) {
        // Stale or malformed — clear it before redirecting.
        await clearAuthStorage();
      }
      router.replace('/onboarding/welcome');
    } catch (error) {
      logger.error('Auth check failed');
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={styles.text}>{t('common.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#059669',
  },
});
