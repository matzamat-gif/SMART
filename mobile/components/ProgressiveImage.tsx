import React, { useState } from 'react';
import { View, Image, StyleSheet, Animated, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProgressiveImageProps {
  source: { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  blurRadius?: number;
  showPlaceholder?: boolean;
}

export default function ProgressiveImage({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  blurRadius = 0,
  showPlaceholder = true,
}: ProgressiveImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const opacity = new Animated.Value(0);

  const handleLoad = () => {
    setLoading(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Placeholder */}
      {loading && showPlaceholder && (
        <View style={[styles.placeholder, style]}>
          <Ionicons name="image-outline" size={32} color="#9CA3AF" />
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={[styles.error, style]}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        </View>
      )}

      {/* Actual Image */}
      {!error && (
        <Animated.Image
          source={source}
          style={[style, { opacity }]}
          resizeMode={resizeMode}
          blurRadius={blurRadius}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
