import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../lib/i18n/I18nContext';
import { haptics } from '../../lib/haptics';
import { fadeIn, scaleIn, staggeredFadeIn } from '../../lib/animations';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const logoScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const featureOpacities = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      scaleIn(logoScale, 400, 0),
      fadeIn(titleOpacity, 300, 100),
      staggeredFadeIn(featureOpacities, 200, 80),
      scaleIn(buttonScale, 300, 0),
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    await haptics.medium();
    router.push('/onboarding/language');
  };

  return (
    <LinearGradient
      colors={['#059669', '#10B981', '#34D399']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: logoScale }] }]}>
          <Ionicons name="shirt" size={80} color="#fff" />
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text style={styles.title}>{t('onboarding.appName')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.tagline')}</Text>
        </Animated.View>

        {/* Value Props */}
        <View style={styles.features}>
          {[
            t('onboarding.feature1'),
            t('onboarding.feature2'),
            t('onboarding.feature3'),
            t('onboarding.feature4'),
          ].map((feature, index) => (
            <Animated.View
              key={index}
              style={[styles.feature, { opacity: featureOpacities[index] }]}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.featureText}>{feature}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Slogan */}
        <Text style={styles.slogan}>
          {t('onboarding.sloganHe')}
        </Text>
        <Text style={styles.sloganEn}>
          {t('onboarding.slogan')}
        </Text>
      </View>

      {/* CTA */}
      <Animated.View style={[styles.footer, { transform: [{ scale: buttonScale }] }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>{t('onboarding.getStarted')}</Text>
          <Ionicons name="arrow-forward" size={20} color="#059669" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginText}>{t('auth.hasAccount')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 48,
  },
  features: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  slogan: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
  sloganEn: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    paddingBottom: 40,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  loginText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
