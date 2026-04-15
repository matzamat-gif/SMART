import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { AnimatedButton } from '@/components/AnimatedButton';

export default function EditProfile() {
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setFullName(user.full_name || '');
          setUsername(user.username || '');
          setEmail(user.email || '');
        } catch (parseError) {
          console.error('Failed to parse user data:', parseError);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      Alert.alert(t('common.error'), t('profile.failedToLoad'));
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }

    try {
      setLoading(true);
      await haptics.medium();

      // Note: Backend doesn't have update profile endpoint yet
      // For now, just update local storage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          user.full_name = fullName;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        } catch (parseError) {
          console.error('Failed to parse user data on save:', parseError);
        }
      }

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
        <Text style={styles.headerTitle}>{t('profile.account')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color={theme.colors.primary} />
          </View>
          <TouchableOpacity 
            style={styles.changePhotoButton}
            onPress={() => {
              haptics.light();
              Alert.alert(
                t('profile.changePhoto'),
                t('profile.photoComingSoon') || 'Photo upload will be available soon.'
              );
            }}
          >
            <Text style={styles.changePhotoText}>{t('profile.changePhoto')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.fullName')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('auth.fullNamePlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.username')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={username}
              editable={false}
              placeholderTextColor={theme.colors.text.tertiary}
            />
            <Text style={styles.helperText}>{t('profile.usernameCannotChange')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholderTextColor={theme.colors.text.tertiary}
            />
            <Text style={styles.helperText}>{t('profile.emailCannotChange')}</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  changePhotoButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  changePhotoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  form: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
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
  inputDisabled: {
    backgroundColor: theme.colors.surfaceSecondary,
    color: theme.colors.text.tertiary,
  },
  helperText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  saveButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});
