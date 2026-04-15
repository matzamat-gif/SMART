import { Animated, Easing } from 'react-native';

export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = 300,
  delay: number = 0
) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  });
};

export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = 300,
  delay: number = 0
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    delay,
    useNativeDriver: true,
    easing: Easing.in(Easing.ease),
  });
};

export const slideInFromRight = (
  animatedValue: Animated.Value,
  duration: number = 300
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
};

export const slideInFromLeft = (
  animatedValue: Animated.Value,
  duration: number = 300
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
};

export const slideInFromBottom = (
  animatedValue: Animated.Value,
  duration: number = 300
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
};

export const scaleIn = (
  animatedValue: Animated.Value,
  duration: number = 300,
  delay: number = 0
) => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    delay,
    useNativeDriver: true,
    tension: 100,
    friction: 7,
  });
};

export const scaleOut = (
  animatedValue: Animated.Value,
  duration: number = 200
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
    easing: Easing.in(Easing.ease),
  });
};

export const pulse = (
  animatedValue: Animated.Value,
  toValue: number = 1.05,
  duration: number = 200
) => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }),
  ]);
};

export const shake = (animatedValue: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

export const staggeredFadeIn = (
  animatedValues: Animated.Value[],
  duration: number = 300,
  stagger: number = 100
) => {
  return Animated.stagger(
    stagger,
    animatedValues.map((value) => fadeIn(value, duration))
  );
};

export const cardFlip = (
  animatedValue: Animated.Value,
  duration: number = 600
) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    useNativeDriver: true,
    easing: Easing.inOut(Easing.ease),
  });
};

export const bounceIn = (
  animatedValue: Animated.Value,
  delay: number = 0
) => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    delay,
    useNativeDriver: true,
    tension: 120,
    friction: 8,
    velocity: 2,
  });
};

export const elasticScale = (
  animatedValue: Animated.Value,
  toValue: number = 1
) => {
  return Animated.spring(animatedValue, {
    toValue,
    useNativeDriver: true,
    tension: 80,
    friction: 5,
  });
};
