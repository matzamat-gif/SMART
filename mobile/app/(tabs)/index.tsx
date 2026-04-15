import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { outfitAPI, wardrobeAPI } from '@/lib/api';
import { Outfit, WardrobeItem } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';

export default function Home() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [unusedItems, setUnusedItems] = useState<WardrobeItem[]>([]);
  const [unusedByCategory, setUnusedByCategory] = useState<{[key: string]: WardrobeItem[]}>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [outfitsRes, unusedRes] = await Promise.all([
        outfitAPI.getOutfits({ is_favorite: true }),
        wardrobeAPI.getUnusedItems(60),
      ]);
      // Add null checks to prevent crashes on malformed API responses
      setOutfits((outfitsRes.data?.outfits || []).slice(0, 3));
      const items = unusedRes.data?.items || [];
      setUnusedItems(items);
      
      // Group by category
      const grouped = items.reduce((acc: {[key: string]: WardrobeItem[]}, item: WardrobeItem) => {
        const category = item.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {});
      setUnusedByCategory(grouped);
    } catch (error: any) {
      Alert.alert(t('common.error'), t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const generateOutfit = async () => {
    setGenerating(true);
    try {
      const response = await outfitAPI.generateAI({});
      Alert.alert(t('common.success'), t('today.outfitGenerated'), [
        { text: t('common.done'), onPress: () => router.push('/closet') },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('today.failedToGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{t('home.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <TouchableOpacity
        onPress={generateOutfit}
        disabled={generating}
        activeOpacity={0.8}
        style={styles.aiButtonWrapper}
      >
        <LinearGradient
          colors={generating ? ['#9CA3AF', '#9CA3AF'] : theme.colors.gradient.warm}
          style={styles.aiButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="sparkles" size={24} color="#fff" />
          <Text style={styles.aiButtonText}>
            {generating ? t('today.generating') : t('today.generateAIOutfit')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('today.favoriteOutfits')}</Text>
            <Text style={styles.sectionSubtitleSmall}>{t('today.savedCombinations')}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/closet')}>
            <Text style={styles.seeAll}>{t('today.seeAll')}</Text>
          </TouchableOpacity>
        </View>
        {outfits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={48} color={theme.colors.text.disabled} />
            <Text style={styles.emptyText}>{t('today.noFavoriteOutfits')}</Text>
            <Text style={styles.emptySubtext}>{t('today.generateToStart')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {outfits.map((outfit) => (
              <TouchableOpacity key={outfit.id} style={styles.outfitCard} activeOpacity={0.7}>
                <LinearGradient
                  colors={[theme.colors.surfaceSecondary, theme.colors.surface]}
                  style={styles.outfitPlaceholder}
                >
                  <Ionicons name="shirt" size={40} color={theme.colors.primary} />
                </LinearGradient>
                <Text style={styles.outfitTitle} numberOfLines={1}>{outfit.title}</Text>
                <View style={styles.outfitMeta}>
                  <Ionicons name="heart" size={14} color={theme.colors.secondary} />
                  <Text style={styles.outfitMetaText}>{t('today.favorite')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('home.unusedItems')}</Text>
            <Text style={styles.sectionSubtitleSmall}>{t('today.unusedItems')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unusedItems.length}</Text>
          </View>
        </View>
        {unusedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
            <Text style={styles.emptyText}>{t('today.allItemsUsed')}</Text>
            <Text style={styles.emptySubtext}>{t('today.greatManagement')}</Text>
          </View>
        ) : (
          <View>
            {Object.entries(unusedByCategory).map(([category, items]) => (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Text style={styles.categoryCount}>({items.length})</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  {items.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.itemCard} activeOpacity={0.7}>
                      <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                      <View style={styles.itemBadge}>
                        <Ionicons name="time" size={12} color="#fff" />
                        <Text style={styles.itemBadgeText}>{t('common.new')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
  },
  aiButtonWrapper: {
    marginHorizontal: theme.spacing.lg,
    marginTop: -24,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  sectionSubtitleSmall: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  seeAll: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    color: theme.colors.text.tertiary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  scrollContent: {
    paddingRight: theme.spacing.lg,
  },
  categorySection: {
    marginBottom: theme.spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  categoryTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
  },
  categoryCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  outfitCard: {
    marginRight: theme.spacing.md,
    width: 140,
  },
  outfitPlaceholder: {
    width: 140,
    height: 180,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  outfitTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  outfitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outfitMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  itemCard: {
    marginRight: theme.spacing.md,
    width: 120,
  },
  itemImage: {
    width: 120,
    height: 160,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  itemBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium as any,
  },
  itemCategory: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text.secondary,
  },
  itemOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  itemDaysTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  itemDaysText: {
    fontSize: theme.fontSize.xs,
    color: '#fff',
    fontWeight: theme.fontWeight.medium,
  },
});
