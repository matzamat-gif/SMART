import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contextAPI } from '../../lib/api';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { setPendingPreferences } from '@/lib/onboarding';
import { logger } from '@/lib/logger';

const COMMON_BRANDS = [
  'Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 
  'Gap', 'Levi\'s', 'Ralph Lauren', 'Calvin Klein', 'Tommy Hilfiger'
];

const COMMON_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#9CA3AF' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Pink', hex: '#EC4899' },
];

export default function PreferencesScreen() {
  const { t } = useI18n();
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customBrand, setCustomBrand] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleBrand = (brand: string) => {
    haptics.light();
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const addCustomBrand = () => {
    if (customBrand.trim() && !selectedBrands.includes(customBrand.trim())) {
      haptics.light();
      setSelectedBrands([...selectedBrands, customBrand.trim()]);
      setCustomBrand('');
    }
  };

  const toggleColor = (colorName: string) => {
    haptics.light();
    if (selectedColors.includes(colorName)) {
      setSelectedColors(selectedColors.filter(c => c !== colorName));
    } else {
      setSelectedColors([...selectedColors, colorName]);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const preferredBrandsJson = JSON.stringify(selectedBrands);
      const preferredColorsJson = JSON.stringify(selectedColors);

      // DEV-007: Always persist locally first so the data survives the
      // registration step. If the user is somehow already authenticated
      // (e.g. they backed into onboarding), also push to the server now.
      await setPendingPreferences({
        preferred_brands: preferredBrandsJson,
        preferred_colors: preferredColorsJson,
      });

      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          await contextAPI.updateProfile({
            preferred_brands: preferredBrandsJson,
            preferred_colors: preferredColorsJson,
          });
        } catch (apiErr) {
          // Server-side save can be retried by register.tsx flow.
          logger.debug('Server preferences sync deferred to post-register');
        }
      }

      await haptics.success();
      router.replace('/auth/register');
    } catch (error) {
      logger.error('Failed to stash preferences');
      // Non-critical - continue anyway
      router.replace('/auth/register');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    haptics.light();
    router.replace('/auth/register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.preferencesTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.preferencesDesc')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brands Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('onboarding.favoriteBrands')}</Text>
          <Text style={styles.sectionSubtitle}>{t('onboarding.selectMultiple')}</Text>
          
          <View style={styles.grid}>
            {COMMON_BRANDS.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.chip,
                  selectedBrands.includes(brand) && styles.chipSelected
                ]}
                onPress={() => toggleBrand(brand)}
              >
                <Text style={[
                  styles.chipText,
                  selectedBrands.includes(brand) && styles.chipTextSelected
                ]}>
                  {brand}
                </Text>
                {selectedBrands.includes(brand) && (
                  <Ionicons name="checkmark-circle" size={16} color="#059669" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Brand Input */}
          <View style={styles.customInput}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.addCustomBrand')}
              value={customBrand}
              onChangeText={setCustomBrand}
              onSubmitEditing={addCustomBrand}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={addCustomBrand}
              disabled={!customBrand.trim()}
            >
              <Ionicons name="add-circle" size={28} color={customBrand.trim() ? '#059669' : '#D1D5DB'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('onboarding.favoriteColors')}</Text>
          <Text style={styles.sectionSubtitle}>{t('onboarding.selectMultiple')}</Text>
          
          <View style={styles.colorGrid}>
            {COMMON_COLORS.map((color) => (
              <TouchableOpacity
                key={color.name}
                style={[
                  styles.colorChip,
                  selectedColors.includes(color.name) && styles.colorChipSelected
                ]}
                onPress={() => toggleColor(color.name)}
              >
                <View style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                  color.hex === '#FFFFFF' && styles.whiteCircle
                ]} />
                <Text style={styles.colorName}>{color.name}</Text>
                {selectedColors.includes(color.name) && (
                  <Ionicons name="checkmark-circle" size={16} color="#059669" style={styles.colorCheckIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? t('common.loading') : t('onboarding.finishSetup')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progress}>
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
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
    marginBottom: 24,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#059669',
  },
  checkIcon: {
    marginLeft: 6,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  addButton: {
    padding: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  colorChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  whiteCircle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  colorCheckIcon: {
    marginLeft: 4,
  },
  footer: {
    paddingTop: 16,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#059669',
    width: 24,
  },
});
