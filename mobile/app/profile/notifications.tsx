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

export default function Notifications() {
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [likes, setLikes] = useState(false);
  const [comments, setComments] = useState(true);

  const handleSave = async () => {
    try {
      setLoading(true);
      await haptics.medium();

      await contextAPI.updateProfile({
        notification_enabled: notificationsEnabled,
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
        <Text style={styles.headerTitle}>{t('profile.notifications')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.masterToggle}>
          <View style={styles.masterToggleInfo}>
            <Ionicons name="notifications" size={24} color={theme.colors.primary} />
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleLabel}>{t('profile.enableNotifications')}</Text>
              <Text style={styles.masterToggleDescription}>
                Receive push notifications on your device
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => {
              setNotificationsEnabled(value);
              haptics.selection();
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {notificationsEnabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.wardrobeOutfits')}</Text>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t('profile.dailyReminder')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.dailyReminderDesc')}
                  </Text>
                </View>
                <Switch
                  value={dailyReminder}
                  onValueChange={setDailyReminder}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t('profile.weatherAlerts')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('profile.weatherAlertsDesc')}
                  </Text>
                </View>
                <Switch
                  value={weatherAlerts}
                  onValueChange={setWeatherAlerts}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>{t('profile.social')}</Text>
              </View>

              <View style={styles.sectionContent}>
                <View style={styles.settingCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t('profile.newFollowers')}</Text>
                    <Text style={styles.settingDescription}>
                      {t('profile.newFollowersDesc')}
                    </Text>
                  </View>
                  <Switch
                    value={newFollowers}
                    onValueChange={setNewFollowers}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t('profile.likes')}</Text>
                    <Text style={styles.settingDescription}>
                      {t('profile.likesDesc')}
                    </Text>
                  </View>
                  <Switch
                    value={likes}
                    onValueChange={setLikes}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t('profile.comments')}</Text>
                    <Text style={styles.settingDescription}>
                      {t('profile.commentsDesc')}
                    </Text>
                  </View>
                  <Switch
                    value={comments}
                    onValueChange={(value) => {
                      setComments(value);
                      haptics.selection();
                    }}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>
          </>
        )}

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
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.shadows.md,
  },
  masterToggleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  masterToggleText: {
    flex: 1,
  },
  masterToggleLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  masterToggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  sectionContent: {
    gap: theme.spacing.sm,
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
  saveButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});
