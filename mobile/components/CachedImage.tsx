import React from 'react';
import { Image as RNImage, ImageStyle, StyleProp, Platform, ImageProps as RNImageProps } from 'react-native';

// Lazy-load expo-image. Prefer it when available so wardrobe photos don't
// re-download on every visit (DEV-014).
let ExpoImage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoImage = require('expo-image').Image;
} catch {
  ExpoImage = null;
}

export interface CachedImageProps {
  source: { uri: string } | number | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
}

/**
 * Drop-in replacement for <Image source={{ uri }} /> that uses expo-image
 * for transparent memory + disk caching when available.
 */
export default function CachedImage({
  source,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  accessibilityLabel,
}: CachedImageProps) {
  if (ExpoImage && Platform.OS !== 'web' && source && typeof source === 'object' && 'uri' in source) {
    const contentFit =
      resizeMode === 'cover' ? 'cover' :
      resizeMode === 'contain' ? 'contain' :
      resizeMode === 'stretch' ? 'fill' : 'cover';
    return (
      <ExpoImage
        source={source}
        style={style}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={150}
        onLoad={onLoad}
        onError={onError}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  // Fallback to RN Image (no caching beyond OS-level HTTP cache).
  const fallbackProps: RNImageProps = {
    source: source as any,
    style: style as any,
    resizeMode,
    onLoad: onLoad as any,
    onError: onError as any,
    accessibilityLabel,
  };
  return <RNImage {...fallbackProps} />;
}
