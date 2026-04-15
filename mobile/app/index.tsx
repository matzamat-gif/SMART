import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '@/lib/i18n';

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
      const user = await AsyncStorage.getItem('user');
      
      console.log('🔐 Auth Check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        hasUser: !!user,
        timestamp: new Date().toISOString(),
      });
      
      if (token) {
        console.log('✅ Token found, navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('❌ No token found, navigating to onboarding');
        router.replace('/onboarding/welcome');
      }
    } catch (error) {
      console.error('Critical auth check error:', error);
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
