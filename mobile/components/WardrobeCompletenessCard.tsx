import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  computeCompletenessScore,
  FIRST_OUTFIT_ITEM_THRESHOLD,
  WARDROBE_COMPLETE_ITEM_THRESHOLD,
} from '../lib/onboarding';

interface Props {
  /** The user's wardrobe items, used to compute the score. */
  items: { category?: string }[];
  /**
   * When true the card collapses itself once the wardrobe is "complete
   * enough" — useful on the daily/today screen where we don't want to nag
   * power users.
   */
  hideWhenComplete?: boolean;
  /** Optional CTA override; defaults to navigating to the closet. */
  onAddItemPress?: () => void;
}

const REQUIRED_CATEGORIES: { key: string; labelEn: string }[] = [
  { key: 'tops', labelEn: 'Tops' },
  { key: 'bottoms', labelEn: 'Bottoms' },
  { key: 'shoes', labelEn: 'Shoes' },
  { key: 'outerwear', labelEn: 'Outerwear' },
  { key: 'accessories', labelEn: 'Accessories' },
];

/**
 * Wardrobe completeness card — Strategy 2 ("structured journey") and
 * Strategy 8 ("visible value from incomplete data") from the market
 * analysis. Shows a single score, per-category progress, and the next
 * suggested action so the user knows exactly what to do to unlock better
 * recommendations.
 */
export default function WardrobeCompletenessCard({
  items,
  hideWhenComplete = false,
  onAddItemPress,
}: Props) {
  const summary = computeCompletenessScore(items);

  if (hideWhenComplete && summary.score >= 100) return null;

  const handleAdd = () => {
    if (onAddItemPress) return onAddItemPress();
    router.push('/add-item');
  };

  const remainingForFirstOutfit = Math.max(
    0,
    FIRST_OUTFIT_ITEM_THRESHOLD - summary.totalItems
  );
  const remainingForComplete = Math.max(
    0,
    WARDROBE_COMPLETE_ITEM_THRESHOLD - summary.totalItems
  );

  const headline = remainingForFirstOutfit > 0
    ? `Add ${remainingForFirstOutfit} more item${remainingForFirstOutfit === 1 ? '' : 's'} to unlock your first outfit`
    : remainingForComplete > 0
      ? `${remainingForComplete} more for a fully balanced wardrobe`
      : 'Your wardrobe is set up and ready';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{summary.score}</Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Wardrobe completeness</Text>
          <Text style={styles.subtitle}>{headline}</Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${summary.score}%` }]} />
        </View>
      </View>

      <View style={styles.categoriesRow}>
        {REQUIRED_CATEGORIES.map((cat) => {
          const count = summary.perCategory[cat.key] ?? 0;
          const filled = count > 0;
          return (
            <View key={cat.key} style={styles.categoryItem}>
              <View
                style={[
                  styles.categoryDot,
                  filled ? styles.categoryDotFilled : undefined,
                ]}
              >
                {filled ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={styles.categoryDotEmpty}>0</Text>
                )}
              </View>
              <Text style={[styles.categoryLabel, filled && styles.categoryLabelFilled]} numberOfLines={1}>
                {cat.labelEn}
              </Text>
              <Text style={styles.categoryCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleAdd} activeOpacity={0.8}>
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.ctaText}>
          {remainingForFirstOutfit > 0 ? 'Add another item' : 'Keep adding'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#059669',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    lineHeight: 20,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#059669',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryDotFilled: {
    backgroundColor: '#059669',
  },
  categoryDotEmpty: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  categoryLabelFilled: {
    color: '#1F2937',
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
