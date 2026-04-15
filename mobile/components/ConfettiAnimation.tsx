import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  color: string;
}

export default function ConfettiAnimation({ active = false }: { active: boolean }) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    if (confettiPieces.current.length === 0) {
      confettiPieces.current = Array.from({ length: 50 }, () => ({
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(-50),
        rotation: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }
  }, []);

  useEffect(() => {
    if (active) {
      confettiPieces.current.forEach((piece, index) => {
        const randomDelay = Math.random() * 300;
        const randomDuration = 2000 + Math.random() * 1000;
        const randomRotation = 360 + Math.random() * 360;

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(piece.y, {
              toValue: height + 50,
              duration: randomDuration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.x, {
              toValue: (piece.x as any)._value + (Math.random() - 0.5) * 200,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(piece.rotation, {
              toValue: randomRotation,
              duration: randomDuration,
              useNativeDriver: true,
            }),
          ]).start(() => {
            piece.y.setValue(-50);
            piece.x.setValue(Math.random() * width);
            piece.rotation.setValue(0);
          });
        }, randomDelay);
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
