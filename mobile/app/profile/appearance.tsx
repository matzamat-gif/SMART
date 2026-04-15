import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';

export default function AppearanceScreen() {
  const { themeMode, setThemeMode } = useTheme();
  const { isRTL, t } = useI18n();

  const options = [
    {
      id: 'system',
      label: t('profile.systemTheme'),
      description: t('profile.systemThemeDesc'),
      icon: 'settings-outline',
    },
    {
      id: 'light',
      label: t('profile.lightTheme'),
      description: t('profile.lightThemeDesc'),
      icon: 'sunny-outline',
    },
    {
      id: 'dark',
      label: t('profile.darkTheme'),
      description: t('profile.darkThemeDesc'),
      icon: 'moon-outline',
    },
  ];

  const handleSelect = async (mode: 'system' | 'light' | 'dark') => {
    await haptics.selection();
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>{t('profile.appearance')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          {t('profile.themeMode')}
        </Text>

        <View style={styles.optionsContainer}>
          {options.map((option, index) => {
            const isSelected = themeMode === option.id;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  { backgroundColor: theme.colors.surface },
                  isSelected && [styles.optionSelected, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }],
                ]}
                onPress={() => handleSelect(option.id as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={isSelected ? theme.colors.primary : theme.colors.text.secondary} 
                  />
                </View>
                
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.text.tertiary }]}>
                    {option.description}
                  </Text>
                </View>

                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.text.tertiary} />
          <Text style={[styles.infoText, { color: theme.colors.text.tertiary }]}>
            {t('profile.themeInfo')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  optionSelected: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
