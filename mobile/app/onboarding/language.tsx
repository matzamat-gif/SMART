import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contextAPI } from '../../lib/api';
import { useI18n } from '../../lib/i18n/I18nContext';
import { AnimatedCard } from '../../components/AnimatedCard';
import { haptics } from '../../lib/haptics';

export default function LanguageScreen() {
  const { language, setLanguage, t } = useI18n();
  const [selected, setSelected] = useState<'en' | 'he'>(language);

  const handleLanguageSelect = async (lang: 'en' | 'he') => {
    setSelected(lang);
    await setLanguage(lang);
    await haptics.selection();
  };

  const handleContinue = async () => {
    try {
      await haptics.medium();
      // Only call API if user is authenticated (might be doing this from settings later)
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await contextAPI.updateProfile({ primary_language: selected });
      }
      router.push('/onboarding/location');
    } catch (error) {
      console.error('Failed to update language:', error);
      router.push('/onboarding/location');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.selectLanguage')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.language')}</Text>
      </View>

      <View style={styles.options}>
        <AnimatedCard delay={100} animation="both">
          <TouchableOpacity
            style={[styles.option, selected === 'en' && styles.optionSelected]}
            onPress={() => handleLanguageSelect('en')}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>EN</Text>
            </View>
            <Text style={[styles.optionText, selected === 'en' && styles.optionTextSelected]}>
              {t('onboarding.english')}
            </Text>
            {selected === 'en' && (
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            )}
          </TouchableOpacity>
        </AnimatedCard>

        <AnimatedCard delay={200} animation="both">
          <TouchableOpacity
            style={[styles.option, selected === 'he' && styles.optionSelected]}
            onPress={() => handleLanguageSelect('he')}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>עב</Text>
            </View>
            <Text style={[styles.optionText, selected === 'he' && styles.optionTextSelected]}>
              {t('onboarding.hebrew')}
            </Text>
            {selected === 'he' && (
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            )}
          </TouchableOpacity>
        </AnimatedCard>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>{t('onboarding.continueBtn')}</Text>
      </TouchableOpacity>

      <View style={styles.progress}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
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
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },
  options: {
    gap: 16,
    marginBottom: 48,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  optionSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#059669',
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
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
