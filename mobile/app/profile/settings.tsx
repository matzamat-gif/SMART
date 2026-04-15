import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { contextAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { AnimatedButton } from '@/components/AnimatedButton';

export default function Settings() {
  const { t, language, setLanguage, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('manual');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    // Load settings from backend if needed
  }, []);

  const handleLanguageChange = async (lang: 'en' | 'he') => {
    try {
      await haptics.selection();
      await setLanguage(lang);
      await contextAPI.updateProfile({ primary_language: lang });
      
      Alert.alert(
        t('success.settingsSaved'),
        t('profile.restartRequired'),
        [{ text: t('common.done') }]
      );
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const handleSave = async () => {
    // Validate city if manual mode
    if (locationMode === 'manual' && !city.trim()) {
      Alert.alert(t('common.error'), t('onboarding.cityRequired'));
      return;
    }

    try {
      setLoading(true);
      await haptics.medium();

      await contextAPI.updateProfile({
        city: city.trim() || undefined,
        location_mode: locationMode,
        preferred_currency: currency,
      });

      await haptics.success();
      Alert.alert(t('success.settingsSaved'), '', [
        { text: t('common.done'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      await haptics.error();
      Alert.alert(t('common.error'), error.response?.data?.error || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          
          <TouchableOpacity
            style={[styles.optionCard, language === 'en' && styles.optionCardSelected]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={styles.flag}>🇺🇸</Text>
            <Text style={[styles.optionText, language === 'en' && styles.optionTextSelected]}>
              {t('onboarding.english')}
            </Text>
            {language === 'en' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, language === 'he' && styles.optionCardSelected]}
            onPress={() => handleLanguageChange('he')}
          >
            <Text style={styles.flag}>🇮🇱</Text>
            <Text style={[styles.optionText, language === 'he' && styles.optionTextSelected]}>
              עברית
            </Text>
            {language === 'he' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.city')}</Text>
          
          <View style={styles.locationModeContainer}>
            <TouchableOpacity
              style={[styles.modeButton, locationMode === 'gps' && styles.modeButtonActive]}
              onPress={() => {
                setLocationMode('gps');
                haptics.selection();
              }}
            >
              <Ionicons
                name="location"
                size={20}
                color={locationMode === 'gps' ? '#fff' : theme.colors.primary}
              />
              <Text style={[styles.modeButtonText, locationMode === 'gps' && styles.modeButtonTextActive]}>
                GPS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, locationMode === 'manual' && styles.modeButtonActive]}
              onPress={() => {
                setLocationMode('manual');
                haptics.selection();
              }}
            >
              <Ionicons
                name="create"
                size={20}
                color={locationMode === 'manual' ? '#fff' : theme.colors.primary}
              />
              <Text style={[styles.modeButtonText, locationMode === 'manual' && styles.modeButtonTextActive]}>
                {t('onboarding.manualCity')}
              </Text>
            </TouchableOpacity>
          </View>

          {locationMode === 'manual' && (
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder={t('onboarding.cityPlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.currency')}</Text>
          
          <View style={styles.currencyGrid}>
            {['USD', 'EUR', 'GBP', 'ILS'].map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[styles.currencyButton, currency === curr && styles.currencyButtonActive]}
                onPress={() => {
                  setCurrency(curr);
                  haptics.selection();
                }}
              >
                <Text style={[styles.currencyText, currency === curr && styles.currencyTextActive]}>
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <AnimatedButton
          title={t('common.save')}
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: theme.spacing.md,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  flag: {
    fontSize: 28,
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  locationModeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modeButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  currencyButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  currencyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currencyText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  currencyTextActive: {
    color: '#fff',
  },
  saveButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});
