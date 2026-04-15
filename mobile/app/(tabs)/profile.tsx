import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/lib/api';
import { User } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';

export default function Profile() {
  const { t, isRTL } = useI18n();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (parseError) {
          console.error('Failed to parse user data:', parseError);
          // If data is corrupted, clear it and redirect to login
          await AsyncStorage.multiRemove(['authToken', 'user']);
          router.replace('/auth/login');
        }
      }
    } catch (error) {
      console.error('Failed to load user data from storage:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await haptics.light();
      Alert.alert(
        t('profile.logout') || 'Logout',
        t('profile.logoutConfirm') || 'Are you sure you want to logout?',
        [
          {
            text: t('common.cancel') || 'Cancel',
            style: 'cancel',
            onPress: () => haptics.light(),
          },
          {
            text: t('profile.logout') || 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await haptics.success();
                // Clear auth data
                await AsyncStorage.multiRemove(['authToken', 'user']);
                // Navigate to login
                router.replace('/auth/login');
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(t('common.error'), t('profile.logoutFailed'));
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Logout alert error:', error);
      // Fallback direct logout
      try {
        await AsyncStorage.multiRemove(['authToken', 'user']);
        router.replace('/auth/login');
      } catch (e) {
        console.error('Critical logout error:', e);
      }
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="person" size={48} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.name}>{user?.full_name || user?.username || 'User'}</Text>
        <Text style={styles.username}>@{user?.username || 'username'}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
          
          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              router.push('/profile/edit');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              router.push('/profile/settings');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.settings')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              router.push('/profile/privacy');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.privacy')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              router.push('/profile/notifications');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.notifications')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          
          <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.version')}</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, isRTL && styles.menuItemRTL]} 
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              Alert.alert(t('profile.termsOfService'), t('profile.termsComingSoon') || 'Terms of Service will be available soon.');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.termsOfService')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, isRTL && styles.menuItemRTL]} 
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              Alert.alert(t('profile.privacyPolicy'), t('profile.privacyComingSoon') || 'Privacy Policy will be available soon.');
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.menuText}>{t('profile.privacyPolicy')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.logoutButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  username: {
    fontSize: theme.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    ...theme.shadows.sm,
  },
  menuItemRTL: {
    flexDirection: 'row-reverse',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  versionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.fontWeight.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  logoutText: {
    color: '#fff',
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
});
