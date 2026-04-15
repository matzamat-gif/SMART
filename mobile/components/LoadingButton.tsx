import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingText?: string;
}

export default function LoadingButton({
  onPress,
  loading = false,
  disabled = false,
  title,
  variant = 'primary',
  icon,
  style,
  textStyle,
  loadingText,
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    const baseStyle = [styles.button, style];
    
    if (variant === 'outline') {
      return [...baseStyle, styles.outlineButton];
    }
    if (variant === 'secondary') {
      return [...baseStyle, styles.secondaryButton];
    }
    if (isDisabled && variant !== 'gradient') {
      return [...baseStyle, styles.disabledButton];
    }
    if (variant === 'primary') {
      return [...baseStyle, styles.primaryButton];
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText, textStyle];
    
    if (variant === 'outline') {
      return [...baseStyle, styles.outlineText];
    }
    if (variant === 'secondary') {
      return [...baseStyle, styles.secondaryText];
    }
    return [...baseStyle, styles.primaryText];
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={style}>
        <LinearGradient
          colors={isDisabled ? ['#9CA3AF', '#6B7280'] : ['#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              {loadingText && (
                <Text style={[styles.buttonText, styles.primaryText, { marginLeft: 8 }]}>
                  {loadingText}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.buttonContent}>
              {icon && <Ionicons name={icon} size={20} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={[styles.buttonText, styles.primaryText]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={getButtonStyle()}
      activeOpacity={0.7}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={variant === 'outline' ? '#059669' : '#fff'}
          />
          {loadingText && (
            <Text style={[getTextStyle(), { marginLeft: 8 }]}>{loadingText}</Text>
          )}
        </View>
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'outline' ? '#059669' : '#fff'}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#059669',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#059669',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#059669',
  },
});
