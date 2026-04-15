import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { wardrobeAPI } from '../../lib/api';
import { useI18n } from '@/lib/i18n';

interface CategoryProgress {
  category: string;
  icon: string;
  count: number;
  target: number;
}

// Helper function to normalize category names
const normalizeCategory = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  
  // Define category mappings - return lowercase to match backend
  const categoryMappings: { [key: string]: string } = {
    'tops': 'tops',
    'top': 'tops',
    'shirt': 'tops',
    'shirts': 'tops',
    't-shirt': 'tops',
    'tshirt': 'tops',
    'blouse': 'tops',
    'sweater': 'tops',
    'hoodie': 'tops',
    'tank': 'tops',
    
    'bottoms': 'bottoms',
    'bottom': 'bottoms',
    'pants': 'bottoms',
    'jeans': 'bottoms',
    'shorts': 'bottoms',
    'skirt': 'bottoms',
    'trousers': 'bottoms',
    
    'shoes': 'shoes',
    'shoe': 'shoes',
    'sneakers': 'shoes',
    'sneaker': 'shoes',
    'boots': 'shoes',
    'boot': 'shoes',
    'sandals': 'shoes',
    'heels': 'shoes',
    
    'outerwear': 'outerwear',
    'jacket': 'outerwear',
    'coat': 'outerwear',
    'blazer': 'outerwear',
    'cardigan': 'outerwear',
    
    'accessories': 'accessories',
    'accessory': 'accessories',
    'bag': 'accessories',
    'hat': 'accessories',
    'scarf': 'accessories',
    'belt': 'accessories',
    'jewelry': 'accessories',
  };
  
  // Check direct match
  if (categoryMappings[normalized]) {
    return categoryMappings[normalized];
  }
  
  // Check if any key is contained in the category string
  for (const [key, value] of Object.entries(categoryMappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // Log warning for unknown categories (data loss prevention)
  console.warn(`Unknown category detected: "${category}". Defaulting to "accessories". Consider updating category mappings.`);
  return 'accessories';
};

export default function ScanScreen() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryProgress[]>([
    { category: 'tops', icon: 'shirt-outline', count: 0, target: 5 },
    { category: 'bottoms', icon: 'fitness-outline', count: 0, target: 3 },
    { category: 'shoes', icon: 'footsteps-outline', count: 0, target: 2 },
    { category: 'outerwear', icon: 'rainy-outline', count: 0, target: 2 },
    { category: 'accessories', icon: 'watch-outline', count: 0, target: 2 },
  ]);

  const [totalItems, setTotalItems] = useState(0);
  const minimumItems = 5;

  useEffect(() => {
    loadWardrobe();
  }, []);

  const loadWardrobe = async () => {
    try {
      const response = await wardrobeAPI.getItems();
      // Add null check to prevent crashes on malformed responses
      const items = response.data?.items || [];
      
      setTotalItems(items.length);

      // Count by category with improved detection
      const counts: { [key: string]: number } = {};
      items.forEach((item: any) => {
        const category = normalizeCategory(item.category);
        counts[category] = (counts[category] || 0) + 1;
      });

      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          count: counts[cat.category] || 0,
        }))
      );
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
    }
  };

  const canContinue = totalItems >= minimumItems;
  const overallProgress = Math.min((totalItems / 10) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.closetScan')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.minimumItems')}
        </Text>
      </View>

      {/* Overall Progress */}
      <View style={styles.overallProgress}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{t('onboarding.progressTitle')}</Text>
          <Text style={styles.progressCount}>{totalItems} {t('wardrobe.items')}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${overallProgress}%` }]} />
        </View>
      </View>

      {/* Category Progress */}
      <ScrollView style={styles.categories} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const progress = Math.min((cat.count / cat.target) * 100, 100);
          const isComplete = cat.count >= cat.target;

          return (
            <View key={cat.category} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={isComplete ? '#059669' : '#6B7280'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{cat.category}</Text>
                  <View style={styles.categoryProgressBar}>
                    <View
                      style={[
                        styles.categoryProgressFill,
                        { width: `${progress}%` },
                        isComplete && styles.categoryProgressComplete,
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.categoryCount}>
                  {cat.count}/{cat.target}
                </Text>
                {isComplete && (
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* CTAs */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            router.push('/add-item');
          }}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.addButtonText}>{t('onboarding.addItems')}</Text>
        </TouchableOpacity>

        {canContinue ? (
          <TouchableOpacity onPress={() => router.replace('/(tabs)/today')}>
            <LinearGradient
              colors={['#059669', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>{t('onboarding.getFirstOutfit')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.hintText}>
              Add {minimumItems - totalItems} more item{minimumItems - totalItems > 1 ? 's' : ''} to continue
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progress}>
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  overallProgress: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 6,
  },
  categories: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },
  categoryProgressComplete: {
    backgroundColor: '#059669',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  footer: {
    paddingTop: 24,
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  continueButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  hintCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  progressDotActive: {
    backgroundColor: '#059669',
    width: 24,
  },
});
