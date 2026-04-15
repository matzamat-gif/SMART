import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function ItemCardSkeleton() {
  return (
    <View style={styles.itemCard}>
      <SkeletonLoader height={120} borderRadius={8} />
      <View style={styles.itemInfo}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 6 }} />
        <SkeletonLoader width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function OutfitCardSkeleton() {
  return (
    <View style={styles.outfitCard}>
      <SkeletonLoader height={200} borderRadius={12} />
      <View style={{ padding: 16, gap: 8 }}>
        <SkeletonLoader width="60%" height={18} />
        <SkeletonLoader width="80%" height={14} />
        <SkeletonLoader width="70%" height={14} />
      </View>
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <SkeletonLoader width={60} height={60} borderRadius={8} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  itemCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemInfo: {
    padding: 8,
  },
  outfitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
  },
});
