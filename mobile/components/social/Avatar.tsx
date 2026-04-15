import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../../lib/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: object;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[containerStyle, styles.image, style]}
        defaultSource={undefined}
      />
    );
  }

  return (
    <View style={[containerStyle, styles.fallback, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  fallback: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});
