import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  PanResponder,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../lib/i18n';
import { haptics } from '../lib/haptics';

export interface SwipeCard {
  key: string;
  imageUri: string;
  title: string;
  subtitle: string;
}

interface Props {
  card: SwipeCard | null;
  remaining: number;
  onConfirm: () => void;
  onDiscard: () => void;
  onEdit: () => void;
}

const SWIPE_THRESHOLD = 120;

export default function SwipeConfirmStack({
  card,
  remaining,
  onConfirm,
  onDiscard,
  onEdit,
}: Props) {
  const { t } = useI18n();
  const position = useRef(new Animated.ValueXY()).current;

  // In RTL, the "end of reading direction" is to the LEFT. Confirm
  // should be the gesture toward the end of the reading direction in
  // both layouts, so we flip the sign of dx under RTL.
  const confirmSign = I18nManager.isRTL ? -1 : 1;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: g.dy / 4 });
      },
      onPanResponderRelease: (_, g) => {
        const dx = g.dx * confirmSign;
        if (dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: confirmSign * 500, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            haptics.success();
            onConfirm();
          });
        } else if (dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -confirmSign * 500, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            haptics.light();
            onDiscard();
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!card) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{t('bulkImport.empty')}</Text>
      </View>
    );
  }

  const rotate = position.x.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const confirmOpacity = position.x.interpolate({
    inputRange: confirmSign === 1 ? [0, 150] : [-150, 0],
    outputRange: confirmSign === 1 ? [0, 1] : [1, 0],
    extrapolate: 'clamp',
  });
  const discardOpacity = position.x.interpolate({
    inputRange: confirmSign === 1 ? [-150, 0] : [0, 150],
    outputRange: confirmSign === 1 ? [1, 0] : [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: card.imageUri }} style={styles.image} />
        <View style={styles.labels}>
          <Animated.View style={[styles.stampConfirm, { opacity: confirmOpacity }]}>
            <Text style={styles.stampText}>{t('bulkImport.confirm')}</Text>
          </Animated.View>
          <Animated.View style={[styles.stampDiscard, { opacity: discardOpacity }]}>
            <Text style={styles.stampText}>{t('bulkImport.discard')}</Text>
          </Animated.View>
        </View>
        <TouchableOpacity style={styles.info} onPress={onEdit}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          <View style={styles.editRow}>
            <Ionicons name="create-outline" size={14} color="#059669" />
            <Text style={styles.editText}>{t('bulkImport.edit')}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.hint}>{t('bulkImport.swipeHint')}</Text>
      <Text style={styles.remaining}>{remaining} left</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280' },
  card: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 0.75,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  image: { width: '100%', height: '75%', backgroundColor: '#E5E7EB' },
  labels: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  stampConfirm: {
    position: 'absolute',
    top: 24,
    left: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: '#059669',
    borderRadius: 8,
    transform: [{ rotate: '-10deg' }],
  },
  stampDiscard: {
    position: 'absolute',
    top: 24,
    right: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: '#DC2626',
    borderRadius: 8,
    transform: [{ rotate: '10deg' }],
  },
  stampText: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  info: { padding: 16, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardSubtitle: { fontSize: 13, color: '#6B7280' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  editText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  hint: { marginTop: 16, fontSize: 13, color: '#6B7280' },
  remaining: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
});
