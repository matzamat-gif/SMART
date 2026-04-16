import React, { useRef, useState, useEffect } from 'react';
import { View, Image as RNImage, StyleSheet, Animated, ViewStyle, ImageStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Try to load expo-image at module init for on-disk caching of remote
// images (DEV-014). Falls back to React Native's <Image> if the package
// isn't available (e.g. during certain web builds).
let ExpoImage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoImage = require('expo-image').Image;
} catch {
  ExpoImage = null;
}

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

  // DEV-005: Hold the animated value in a ref so it survives re-renders.
  // Previously a fresh Animated.Value was created on every render, which
  // (a) leaked subscribers and (b) made the fade-in animation no-op.
  const opacity = useRef(new Animated.Value(0)).current;

  // Reset state when the source URI changes so the new image fades in.
  useEffect(() => {
    setLoading(true);
    setError(false);
    opacity.setValue(0);
  }, [source?.uri, opacity]);

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
      {loading && showPlaceholder && (
        <View style={[styles.placeholder, style]}>
          <Ionicons name="image-outline" size={32} color="#9CA3AF" />
        </View>
      )}

      {error && (
        <View style={[styles.error, style]}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        </View>
      )}

      {!error && (
        ExpoImage && Platform.OS !== 'web' ? (
          // expo-image gives us free disk + memory caching.
          <Animated.View style={[style, { opacity }]}>
            <ExpoImage
              source={source}
              style={StyleSheet.absoluteFill}
              contentFit={resizeMode === 'cover' ? 'cover' : resizeMode === 'contain' ? 'contain' : 'fill'}
              transition={0}
              cachePolicy="memory-disk"
              onLoad={handleLoad}
              onError={handleError}
            />
          </Animated.View>
        ) : (
          <Animated.Image
            source={source}
            style={[style, { opacity }]}
            resizeMode={resizeMode}
            blurRadius={blurRadius}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
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

// Re-export the underlying RN Image so callers needing the static methods
// (prefetch, getSize) still have access without importing it directly.
export { RNImage };
