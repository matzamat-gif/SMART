import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { fadeIn, scaleIn } from '../lib/animations';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
  animation?: 'fade' | 'scale' | 'both';
}

export function AnimatedCard({
  children,
  delay = 0,
  onPress,
  style,
  animation = 'both',
}: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(animation === 'scale' ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(animation === 'fade' ? 1 : 0)).current;

  useEffect(() => {
    const animations = [];

    if (animation === 'fade' || animation === 'both') {
      animations.push(fadeIn(opacity, 300, delay));
    }

    if (animation === 'scale' || animation === 'both') {
      animations.push(scaleIn(scale, 300, delay));
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, []);

  const cardStyle = [
    styles.card,
    {
      opacity: animation === 'scale' ? 1 : opacity,
      transform: [{ scale: animation === 'fade' ? 1 : scale }],
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </TouchableOpacity>
    );
  }

  return <Animated.View style={cardStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
