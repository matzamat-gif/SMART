import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, contextAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { logger } from '@/lib/logger';
import {
  registerForPushNotificationsAsync,
  syncPushTokenWithBackend,
  scheduleMorningOutfitReminder,
} from '@/lib/notifications';
import { PENDING_PREFERENCES_KEY } from '@/lib/onboarding';

export default function Register() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }

    // Validate password complexity to match backend requirements
    const passwordErrors: string[] = [];
    if (trimmedPassword.length < 8) passwordErrors.push(t('auth.passwordMinLength'));
    if (!/[a-z]/.test(trimmedPassword)) passwordErrors.push(t('auth.passwordNeedsLowercase'));
    if (!/[A-Z]/.test(trimmedPassword)) passwordErrors.push(t('auth.passwordNeedsUppercase'));
    if (!/[0-9]/.test(trimmedPassword)) passwordErrors.push(t('auth.passwordNeedsNumber'));
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) passwordErrors.push(t('auth.passwordNeedsSpecial'));
    
    if (passwordErrors.length > 0) {
      Alert.alert(t('common.error'), passwordErrors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({
        email: trimmedEmail,
        password: trimmedPassword,
        username: trimmedUsername || undefined,
        full_name: fullName.trim() || undefined,
      });
      const { token, user } = response.data;

      // Store credentials via AuthContext so axios picks them up.
      await signIn(token, user);

      // DEV-007: Replay any preferences the user picked during onboarding
      // before they had an auth token. Best-effort — never block registration.
      try {
        const pendingRaw = await AsyncStorage.getItem(PENDING_PREFERENCES_KEY);
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          await contextAPI.updateProfile({
            ...(pending.preferred_brands ? { preferred_brands: pending.preferred_brands } : {}),
            ...(pending.preferred_colors ? { preferred_colors: pending.preferred_colors } : {}),
            ...(pending.city ? { city: pending.city } : {}),
            ...(pending.primary_language ? { primary_language: pending.primary_language } : {}),
          });
          await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
        }
      } catch (prefErr) {
        logger.debug('Could not replay onboarding preferences');
      }

      // Push notifications: ask permission and register the token. Both
      // calls are no-ops if expo-notifications isn't available.
      try {
        await registerForPushNotificationsAsync();
        await syncPushTokenWithBackend();
        await scheduleMorningOutfitReminder(7, 0);
      } catch {
        // non-blocking
      }

      // Redirect to main app after successful registration
      router.replace('/(tabs)');
    } catch (error: any) {
      logger.error('Registration failed', { status: error.response?.status });
      Alert.alert(t('common.error'), error.response?.data?.error || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.usernameRequired')}
              placeholderTextColor={theme.colors.text.disabled}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="happy-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.fullName')}
              placeholderTextColor={theme.colors.text.disabled}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailRequired')}
              placeholderTextColor={theme.colors.text.disabled}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordRequired')}
              placeholderTextColor={theme.colors.text.disabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#9CA3AF', '#9CA3AF'] as const : theme.colors.gradient.primary}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading && <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.buttonText}>{loading ? t('auth.creatingAccount') : t('auth.createAccount')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginBottom: theme.spacing.lg,
    width: 40,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text.secondary,
  },
  form: {
    gap: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.text.primary,
  },
  button: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
});
