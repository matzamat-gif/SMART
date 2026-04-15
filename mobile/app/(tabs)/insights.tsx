import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { insightsAPI } from '../../lib/api';
import { useI18n } from '@/lib/i18n';

interface InsightsSummary {
  total_items: number;
  favorites_count: number;
  average_times_worn: number;
  recent_wears_7_days: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface WardrobeItem {
  id: number;
  category: string;
  sub_category: string;
  color: string;
  image_url: string;
  times_worn: number;
  last_worn_date?: string;
  days_since_worn?: number;
}

interface WardrobeGap {
  gap_category: string;
  gap_type: string;
  confidence_score: number;
  message: string;
  current_count: number;
}

export default function InsightsScreen() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [mostWorn, setMostWorn] = useState<WardrobeItem[]>([]);
  const [leastWorn, setLeastWorn] = useState<WardrobeItem[]>([]);
  const [longUnworn, setLongUnworn] = useState<WardrobeItem[]>([]);
  const [gaps, setGaps] = useState<WardrobeGap[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [costPerWear, setCostPerWear] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'stats' | 'worn' | 'unworn' | 'gaps' | 'dupes'>('stats');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await insightsAPI.getWardrobe();
      
      setSummary(response.data.summary);
      setCategoryBreakdown(response.data.category_breakdown || []);
      setMostWorn(response.data.most_worn_items || []);
      setLeastWorn(response.data.least_worn_items || []);
      setLongUnworn(response.data.long_unworn_items || []);
      setGaps(response.data.wardrobe_gaps || []);
      setDuplicates(response.data.duplicates || []);
      setCostPerWear(response.data.cost_per_wear || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
      Alert.alert(t('common.error'), t('insights.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('insights.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('insights.title')}</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="shirt-outline" size={28} color="#059669" />
            <Text style={styles.summaryNumber}>{summary.total_items}</Text>
            <Text style={styles.summaryLabel}>{t('insights.totalItems')}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="heart" size={28} color="#EF4444" />
            <Text style={styles.summaryNumber}>{summary.favorites_count}</Text>
            <Text style={styles.summaryLabel}>{t('insights.favorites')}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="repeat" size={28} color="#3B82F6" />
            <Text style={styles.summaryNumber}>{summary.average_times_worn.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>{t('insights.avgTimesWorn')}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={28} color="#8B5CF6" />
            <Text style={styles.summaryNumber}>{summary.recent_wears_7_days}</Text>
            <Text style={styles.summaryLabel}>{t('insights.recentWears')}</Text>
          </View>
        </View>
      )}

      <View style={styles.tabContainerWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'stats' && styles.tabActive]}
            onPress={() => setSelectedTab('stats')}
          >
            <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>
              {t('insights.stats')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'worn' && styles.tabActive]}
            onPress={() => setSelectedTab('worn')}
          >
            <Text style={[styles.tabText, selectedTab === 'worn' && styles.tabTextActive]}>
              {t('insights.mostWorn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'unworn' && styles.tabActive]}
            onPress={() => setSelectedTab('unworn')}
          >
            <Text style={[styles.tabText, selectedTab === 'unworn' && styles.tabTextActive]}>
              {t('insights.unworn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'gaps' && styles.tabActive]}
            onPress={() => setSelectedTab('gaps')}
          >
            <Text style={[styles.tabText, selectedTab === 'gaps' && styles.tabTextActive]}>
              {t('insights.gaps') || 'Gaps'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'dupes' && styles.tabActive]}
            onPress={() => setSelectedTab('dupes')}
          >
            <Text style={[styles.tabText, selectedTab === 'dupes' && styles.tabTextActive]}>
              Duplicates & CPW
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      {selectedTab === 'stats' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('insights.categoryBreakdown')}</Text>
          {categoryBreakdown.map((cat, index) => (
            <View key={index} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (cat.count / Math.max(...categoryBreakdown.map((c) => c.count))) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.categoryCount}>{cat.count}</Text>
            </View>
          ))}
        </View>
      )}

      {selectedTab === 'worn' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('insights.mostWornItems')}</Text>
          <View style={styles.itemGrid}>
            {mostWorn.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                <View style={styles.itemBadge}>
                  <Text style={styles.itemWorn}>{item.times_worn} {t('insights.times')}</Text>
                </View>
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.itemColor} numberOfLines={1}>
                  {item.color}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedTab === 'unworn' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('insights.longUnwornItems')} (60+ days)</Text>
          <Text style={styles.sectionSubtitle}>
            Consider styling these or donating them
          </Text>
          <View style={styles.itemGrid}>
            {longUnworn.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                {item.days_since_worn && (
                  <View style={[styles.itemBadge, styles.itemBadgeWarning]}>
                    <Text style={styles.itemWorn}>{item.days_since_worn} {t('insights.daysAgo')}</Text>
                  </View>
                )}
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.itemColor} numberOfLines={1}>
                  {item.color}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedTab === 'gaps' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('insights.wardrobeGaps')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('insights.missingCategories')}
          </Text>
          {gaps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyText}>{t('insights.noGaps')}</Text>
            </View>
          ) : (
            gaps.map((gap, index) => (
              <View key={index} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <Ionicons
                    name={gap.gap_type === 'missing' ? 'alert-circle' : 'information-circle'}
                    size={24}
                    color={gap.gap_type === 'missing' ? '#EF4444' : '#F59E0B'}
                  />
                  <Text style={styles.gapCategory}>{gap.gap_category}</Text>
                  <Text style={styles.gapCount}>({gap.current_count})</Text>
                </View>
                <Text style={styles.gapMessage}>{gap.message}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {selectedTab === 'dupes' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Duplicate Items</Text>
          <Text style={styles.sectionSubtitle}>
            Items with the same category and color
          </Text>
          {duplicates.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyText}>No duplicates found</Text>
            </View>
          ) : (
            duplicates.map((dupe, index) => (
              <View key={index} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <Ionicons name="copy-outline" size={24} color="#F59E0B" />
                  <Text style={styles.gapCategory}>{dupe.category} - {dupe.color}</Text>
                  <Text style={styles.gapCount}>({dupe.count} items)</Text>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Best Value (Cost Per Wear)</Text>
          <Text style={styles.sectionSubtitle}>
            Items giving you the most value for money
          </Text>
          <View style={styles.itemGrid}>
            {costPerWear.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                <View style={[styles.itemBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.itemWorn}>${parseFloat(item.cost_per_wear).toFixed(2)}/wear</Text>
                </View>
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            ))}
            {costPerWear.length === 0 && (
              <Text style={styles.emptyText}>Add prices to your items to see this metric</Text>
            )}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tabContainerWrapper: {
    marginTop: 24,
  },
  tabContainer: {
    paddingHorizontal: 20,
    gap: 16,
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#059669',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    minWidth: 40,
    textAlign: 'right',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  itemBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemBadgeWarning: {
    backgroundColor: '#F59E0B',
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 8,
  },
  itemColor: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  gapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gapCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
    textTransform: 'capitalize',
  },
  gapCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  gapMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  itemWorn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});
