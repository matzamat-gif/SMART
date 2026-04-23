import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contextAPI } from '../../lib/api';
import { useI18n } from '../../lib/i18n/I18nContext';
import { setPendingPreferences } from '../../lib/onboarding';
import { logger } from '../../lib/logger';

export default function LocationScreen() {
  const { t } = useI18n();
  const [city, setCity] = useState('');
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);

  const handleGPS = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('onboarding.locationPermissionDenied') || 'Please enable location permissions');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode[0]) {
        const detectedCity = geocode[0].city || geocode[0].region || '';
        setCity(detectedCity);
        setLocationMode('gps');

        // DEV-007: persist locally so it survives until registration.
        await setPendingPreferences({ city: detectedCity });

        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          contextAPI
            .updateProfile({ city: detectedCity, location_mode: 'gps' })
            .catch(() => logger.debug('GPS city sync deferred'));
        }

        router.push('/onboarding/preferences');
      }
    } catch (error) {
      logger.error('GPS lookup failed');
      Alert.alert(t('common.error'), t('onboarding.locationError') || 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async () => {
    if (!city.trim()) {
      Alert.alert(t('common.error'), t('onboarding.cityRequired') || 'Please enter your city');
      return;
    }

    try {
      setLoading(true);
      // DEV-007: stash locally first so registration can replay it.
      await setPendingPreferences({ city: city.trim() });

      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await contextAPI.updateProfile({
          city: city.trim(),
          location_mode: 'manual',
        });
      }
      router.push('/onboarding/preferences');
    } catch (error) {
      logger.error('Failed to save city');
      Alert.alert(
        t('common.error'),
        t('onboarding.failedToSaveCity') || 'Failed to save city',
        [
          { text: t('common.retry'), onPress: handleManual },
          { 
            text: t('onboarding.skipForNow'), 
            onPress: () => router.push('/onboarding/preferences'),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.locationTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.locationDesc')}
        </Text>
      </View>

      <View style={styles.content}>
        {/* GPS Option */}
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleGPS}
          disabled={loading}
        >
          <Ionicons name="location" size={32} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.gpsTitle}>{t('onboarding.useGPS')}</Text>
            <Text style={styles.gpsSubtitle}>{t('onboarding.gpsAutomatic')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Manual Entry */}
        <View style={styles.manualSection}>
          <Text style={styles.manualLabel}>{t('onboarding.enterCityManually')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('onboarding.cityPlaceholder')}
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleManual}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !city.trim() && styles.buttonDisabled]}
          onPress={handleManual}
          disabled={!city.trim()}
        >
          <Text style={styles.buttonText}>{t('onboarding.continueBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/onboarding/preferences')}>
          <Text style={styles.skipText}>{t('onboarding.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progress}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  gpsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  gpsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  manualSection: {
    gap: 12,
  },
  manualLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  footer: {
    gap: 16,
    paddingTop: 24,
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  progressDotActive: {
    backgroundColor: '#059669',
    width: 24,
  },
});
