import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { contextAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { AnimatedButton } from '@/components/AnimatedButton';

export default function Privacy() {
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [personalizedAds, setPersonalizedAds] = useState(false);
  const [contextualAdsOnly, setContextualAdsOnly] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await contextAPI.getConsent();
      const settings = response.data;
      setPersonalizedAds(settings.personalised_ads_enabled || false);
      setContextualAdsOnly(settings.contextual_ads_only || true);
      setVisibility(settings.community_visibility_mode || 'public');
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const handlePersonalizedAdsToggle = async (value: boolean) => {
    await haptics.selection();
    setPersonalizedAds(value);
    setContextualAdsOnly(!value);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await haptics.medium();

      await contextAPI.updateConsent({
        personalised_ads_enabled: personalizedAds,
        contextual_ads_only: contextualAdsOnly,
        community_visibility_mode: visibility,
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
        <Text style={styles.headerTitle}>{t('profile.privacy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.adPreferences')}</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('profile.personalizedAds')}</Text>
              <Text style={styles.settingDescription}>
                {t('profile.personalizedAdsDesc')}
              </Text>
            </View>
            <Switch
              value={personalizedAds}
              onValueChange={handlePersonalizedAdsToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('profile.contextualAds')}</Text>
              <Text style={styles.settingDescription}>
                {t('profile.contextualAdsDesc')}
              </Text>
            </View>
            <Switch
              value={contextualAdsOnly}
              onValueChange={(value) => {
                haptics.selection();
                setContextualAdsOnly(value);
                setPersonalizedAds(!value);
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.communityVisibility')}</Text>

          <TouchableOpacity
            style={[styles.visibilityCard, visibility === 'public' && styles.visibilityCardSelected]}
            onPress={() => {
              setVisibility('public');
              haptics.selection();
            }}
          >
            <View style={styles.visibilityIcon}>
              <Ionicons
                name="globe-outline"
                size={24}
                color={visibility === 'public' ? theme.colors.primary : theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.visibilityInfo}>
              <Text style={[styles.visibilityLabel, visibility === 'public' && styles.visibilityLabelSelected]}>
                {t('profile.publicProfile')}
              </Text>
              <Text style={styles.visibilityDescription}>
                Everyone can see your profile and content
              </Text>
            </View>
            {visibility === 'public' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.visibilityCard, visibility === 'followers' && styles.visibilityCardSelected]}
            onPress={() => {
              setVisibility('followers');
              haptics.selection();
            }}
          >
            <View style={styles.visibilityIcon}>
              <Ionicons
                name="people-outline"
                size={24}
                color={visibility === 'followers' ? theme.colors.primary : theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.visibilityInfo}>
              <Text style={[styles.visibilityLabel, visibility === 'followers' && styles.visibilityLabelSelected]}>
                {t('profile.followersOnly')}
              </Text>
              <Text style={styles.visibilityDescription}>
                Only your followers can see your content
              </Text>
            </View>
            {visibility === 'followers' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.visibilityCard, visibility === 'private' && styles.visibilityCardSelected]}
            onPress={() => {
              setVisibility('private');
              haptics.selection();
            }}
          >
            <View style={styles.visibilityIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color={visibility === 'private' ? theme.colors.primary : theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.visibilityInfo}>
              <Text style={[styles.visibilityLabel, visibility === 'private' && styles.visibilityLabelSelected]}>
                {t('profile.privateProfile')}
              </Text>
              <Text style={styles.visibilityDescription}>
                Only you can see your content
              </Text>
            </View>
            {visibility === 'private' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
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
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
    lineHeight: 18,
  },
  visibilityCard: {
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
  visibilityCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  visibilityLabelSelected: {
    color: theme.colors.primary,
  },
  visibilityDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  saveButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});
