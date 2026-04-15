import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { socialAPI } from '@/lib/api';
import { Reel } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';

export default function Social() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const response = await socialAPI.getFeed({ page, limit: 20 });
      setReels(response.data.reels);
    } catch (error) {
      Alert.alert(t('common.error'), t('social.failedToLoadFeed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (reelId: number) => {
    try {
      await socialAPI.likeReel(reelId);
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === reelId
            ? {
                ...reel,
                is_liked: !reel.is_liked,
                likes_count: reel.is_liked ? reel.likes_count - 1 : reel.likes_count + 1,
              }
            : reel
        )
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('social.failedToLike'));
    }
  };

  const renderReel = ({ item }: { item: Reel }) => (
    <View style={styles.reelCard}>
      <View style={styles.reelHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.profile_image_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.thumbnail_url && (
        <Image source={{ uri: item.thumbnail_url }} style={styles.reelImage} />
      )}

      {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleLike(item.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={item.is_liked ? theme.colors.gradient.warm : ['transparent', 'transparent'] as const}
            style={[styles.actionButtonInner, item.is_liked && styles.actionButtonLiked]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={item.is_liked ? 'heart' : 'heart-outline'}
              size={20}
              color={item.is_liked ? '#fff' : theme.colors.text.secondary}
            />
            <Text style={[styles.actionText, item.is_liked && styles.actionTextLiked]}>{item.likes_count}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <View style={styles.actionButtonInner}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>{item.comments_count}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <View style={styles.actionButtonInner}>
            <Ionicons name="eye-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>{item.views_count}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="people" size={32} color="rgba(255,255,255,0.9)" style={{ marginBottom: 8 }} />
        <Text style={styles.headerTitle}>{t('social.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('social.subtitle')}</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="people-outline" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyText}>{t('social.noPosts')}</Text>
          <Text style={styles.emptySubtext}>{t('social.followPrompt')}</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          renderItem={renderReel}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  list: {
    padding: theme.spacing.md,
  },
  reelCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  reelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatarContainer: {
    padding: 2,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  userInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  username: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  reelImage: {
    width: '100%',
    height: 400,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  caption: {
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 6,
  },
  actionButtonLiked: {
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  actionTextLiked: {
    color: '#fff',
  },
});
