import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { wardrobeAPI, contextAPI } from '../../lib/api';
import { router, useFocusEffect } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import CachedImage from '@/components/CachedImage';
import WardrobeCompletenessCard from '@/components/WardrobeCompletenessCard';
import { logger } from '@/lib/logger';

interface WardrobeItem {
  id: number;
  category: string;
  sub_category: string;
  brand?: string;
  color: string;
  season: string;
  image_url: string;
  times_worn: number;
  last_worn_date?: string;
  is_favorite: boolean;
  locked_for_next: boolean;
  availability_state: string;
}

const getCategoryIcon = (key: string) => {
  const icons: Record<string, string> = {
    all: 'grid-outline',
    tops: 'shirt-outline',
    bottoms: 'fitness-outline',
    shoes: 'footsteps-outline',
    outerwear: 'rainy-outline',
    accessories: 'watch-outline',
  };
  return icons[key] || 'grid-outline';
};

// DEV-017: page items in chunks instead of loading the full closet at once.
const PAGE_SIZE = 30;

export default function ClosetScreen() {
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'last_worn_date' | 'times_worn'>('created_at');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  // Total wardrobe size — drives the completeness card. We compute it
  // independently so it doesn't shrink when the user filters by category.
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [allCategoriesSnapshot, setAllCategoriesSnapshot] = useState<{ category?: string }[]>([]);

  useEffect(() => {
    // Reset and reload whenever filters change.
    loadItems({ reset: true });
  }, [selectedCategory, sortBy]);

  // Reload items when screen gains focus (e.g., after adding new item)
  useFocusEffect(
    useCallback(() => {
      loadItems({ reset: true });
      // Refresh the completeness snapshot too.
      refreshCompletenessSnapshot();
    }, [selectedCategory, sortBy])
  );

  const refreshCompletenessSnapshot = async () => {
    try {
      const res = await wardrobeAPI.getItems({
        sort_by: 'created_at',
        order: 'DESC',
        limit: 200,
      });
      const all = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setAllCategoriesSnapshot(all);
      setTotalCount(all.length);
    } catch {
      // non-fatal
    }
  };

  const loadItems = async ({ reset = false }: { reset?: boolean } = {}) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const nextOffset = reset ? 0 : offset;
      const params: any = {
        sort_by: sortBy,
        order: 'DESC',
        limit: PAGE_SIZE,
        offset: nextOffset,
      };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const response = await wardrobeAPI.getItems(params);

      const page = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      setHasMore(page.length === PAGE_SIZE);
      setOffset(nextOffset + page.length);
      setItems((prev) => (reset ? page : [...prev, ...page]));

      if (reset && selectedCategory === 'all') {
        // Use the first page snapshot as a reasonable proxy when the
        // dedicated snapshot fetch hasn't returned yet.
        setAllCategoriesSnapshot((current) => (current.length === 0 ? page : current));
      }
    } catch (err) {
      logger.error('Failed to load wardrobe items');
      Alert.alert(t('common.error'), t('closet.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleEndReached = () => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    loadItems({ reset: false });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadItems({ reset: true });
    refreshCompletenessSnapshot();
  };

  const handleToggleFavorite = async (itemId: number) => {
    try {
      await contextAPI.toggleFavorite(itemId);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, is_favorite: !item.is_favorite }
            : item
        )
      );
      haptics.selection();
    } catch (error) {
      logger.error('Failed to toggle favorite');
      Alert.alert(t('common.error'), t('closet.failedToUpdateFavorite') || 'Failed to update favorite status');
    }
  };

  const handleToggleLock = async (itemId: number) => {
    try {
      await contextAPI.toggleLocked(itemId);
      
      // Update local state
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, locked_for_next: !item.locked_for_next }
            : item
        )
      );

      const item = items.find(i => i.id === itemId);
      const newState = !item?.locked_for_next;
      
      Alert.alert(
        newState ? t('closet.itemLocked') : t('closet.itemUnlocked'),
        newState
          ? t('closet.lockedMessage')
          : t('closet.unlockedMessage')
      );
    } catch (error) {
      logger.error('Failed to toggle lock');
      Alert.alert(t('common.error'), t('closet.failedToUpdateLock'));
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    Alert.alert(
      t('closet.delete'),
      t('closet.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('closet.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wardrobeAPI.deleteItem(itemId);
              setItems(prevItems => prevItems.filter(item => item.id !== itemId));
              Alert.alert(t('closet.delete'), t('closet.deleted'));
            } catch (error) {
              logger.error('Failed to delete item');
              Alert.alert(t('common.error'), t('closet.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onLongPress={() =>
          Alert.alert(t('closet.itemActions'), `${item.category} - ${item.color}`, [
            {
              text: item.is_favorite ? t('closet.removeFavorite') : t('closet.addFavorite'),
              onPress: () => handleToggleFavorite(item.id),
            },
            {
              text: item.locked_for_next ? t('closet.unlockForOutfit') : t('closet.lockForOutfit'),
              onPress: () => handleToggleLock(item.id),
            },
            {
              text: t('closet.delete'),
              style: 'destructive',
              onPress: () => handleDeleteItem(item.id),
            },
            { text: t('common.cancel'), style: 'cancel' },
          ])
        }
      >
        {item.image_url ? (
          <CachedImage source={{ uri: item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="shirt-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {item.is_favorite ? (
            <View style={styles.badge}>
              <Ionicons name="heart" size={16} color="#EF4444" />
            </View>
          ) : null}
          {item.locked_for_next ? (
            <View style={[styles.badge, styles.badgeLocked]}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
            </View>
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <Ionicons
              name={item.is_favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={item.is_favorite ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => handleToggleLock(item.id)}
          >
            <Ionicons
              name={item.locked_for_next ? 'lock-closed' : 'lock-open-outline'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemCategory} numberOfLines={1}>
            {item.category ? String(item.category) : 'Item'}
          </Text>
          <Text style={styles.itemDetails} numberOfLines={1}>
            {[item.color, item.sub_category].filter(Boolean).join(' ') || 'Details'}
          </Text>
          <View style={styles.itemMeta}>
            <Ionicons name="repeat" size={12} color="#6B7280" />
            <Text style={styles.itemMetaText}>
              {`${t('closet.worn') || 'Worn'} ${item.times_worn || 0} ${t('closet.times') || 'times'}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('closet.loading') || 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('closet.title') || 'My Closet'}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/scan-session')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {['all', 'tops', 'bottoms', 'shoes', 'outerwear', 'accessories'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip,
              selectedCategory === key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Ionicons
              name={getCategoryIcon(key) as any}
              size={20}
              color={selectedCategory === key ? '#fff' : '#6B7280'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === key && styles.categoryTextActive,
              ]}
            >
              {t(`closet.categories.${key}`) || key}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>{t('closet.sort.label') || 'Sort:'}</Text>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'created_at' && styles.sortBtnActive]}
          onPress={() => setSortBy('created_at')}
        >
          <Text style={[styles.sortText, sortBy === 'created_at' && styles.sortTextActive]}>
            {t('closet.sort.recent') || 'Recent'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'times_worn' && styles.sortBtnActive]}
          onPress={() => setSortBy('times_worn')}
        >
          <Text style={[styles.sortText, sortBy === 'times_worn' && styles.sortTextActive]}>
            {t('closet.sort.mostWorn') || 'Most Worn'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'last_worn_date' && styles.sortBtnActive]}
          onPress={() => setSortBy('last_worn_date')}
        >
          <Text style={[styles.sortText, sortBy === 'last_worn_date' && styles.sortTextActive]}>
            {t('closet.sort.lastWorn') || 'Last Worn'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items Grid */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{t('closet.noItems') || 'No Items Yet'}</Text>
          <Text style={styles.emptyText}>
            {t('closet.startBuilding') || 'Start building your wardrobe'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/scan-session')}
          >
            <Text style={styles.emptyButtonText}>{t('closet.addItem') || 'Add Item'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          renderItem={renderItem}
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          // DEV-017: paginate. Window is small enough that we still feel
          // snappy, but we no longer fetch every item up-front.
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          // Render perf knobs — important once the closet grows past a
          // few hundred items.
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={5}
          removeClippedSubviews
          ListHeaderComponent={
            selectedCategory === 'all' && allCategoriesSnapshot.length > 0 ? (
              <WardrobeCompletenessCard
                items={allCategoriesSnapshot}
                hideWhenComplete
              />
            ) : null
          }
          ListFooterComponent={
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : !hasMore && items.length >= PAGE_SIZE ? (
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  {t('closet.endOfList') || `That's everything (${items.length})`}
                </Text>
              ) : null}
            </View>
          }
        />
      )}
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    maxHeight: 60,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  sortBtnActive: {
    backgroundColor: '#059669',
  },
  sortText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'flex-start',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  itemCard: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  badgeLocked: {
    backgroundColor: '#059669',
  },
  quickActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 4,
  },
  quickActionBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    padding: 8,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
