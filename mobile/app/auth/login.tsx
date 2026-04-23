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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { authAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email: trimmedEmail, password: trimmedPassword });
      const { token, user } = response.data;

      await signIn(token, user);
      router.replace('/(tabs)');
    } catch (error: any) {
      logger.error('Login failed', { status: error.response?.status });

      const errorMsg = error.response?.data?.error || error.message || t('auth.loginFailed');
      Alert.alert(t('common.error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={theme.colors.gradient.primary}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shirt-outline" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>{t('app.name')}</Text>
          <Text style={styles.subtitle}>{t('app.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
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
              placeholder={t('auth.password')}
              placeholderTextColor={theme.colors.text.disabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
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
              <Text style={styles.buttonText}>{loading ? t('auth.loggingIn') : t('auth.login')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/auth/register')}
            style={styles.registerButton}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>{t('auth.createAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.text.tertiary,
    fontSize: theme.fontSize.sm,
  },
  registerButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  registerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
});
