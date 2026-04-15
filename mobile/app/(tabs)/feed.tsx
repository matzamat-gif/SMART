import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { socialFeedAPI } from '@/lib/api';
import { FeedPost } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';
import { haptics } from '@/lib/haptics';
import { timeAgo } from '@/lib/timeAgo';
import CommentsModal from '@/components/social/CommentsModal';
import NotificationsModal from '@/components/social/NotificationsModal';
import Avatar from '@/components/social/Avatar';

export default function FeedScreen() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkProfileAndLoadFeed();
    checkNotifications();
  }, []);

  const checkNotifications = async () => {
    try {
      const response = await socialFeedAPI.getUnreadNotificationCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to get notification count', error);
    }
  };

  const checkProfileAndLoadFeed = async () => {
    try {
      await socialFeedAPI.getProfile();
      setHasProfile(true);
      await loadFeed();
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasProfile(false);
      } else {
        console.error('Failed to check social profile:', error);
        Alert.alert(t('common.error'), t('social.failedToLoadProfile'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFeed = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      }

      const response = await socialFeedAPI.getFeed({
        cursor: refresh ? undefined : cursor,
        limit: 20,
      });

      const newPosts = response.data.items || [];
      const nextCursor = response.data.nextCursor;

      if (refresh) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (error) {
      console.error('Failed to load feed:', error);
      Alert.alert(t('common.error'), t('social.failedToLoadFeed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setCursor(undefined);
    setHasMore(true);
    await Promise.all([loadFeed(true), checkNotifications()]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && cursor) {
      loadFeed();
    }
  };

  const handleLike = async (post: FeedPost) => {
    try {
      await haptics.selection();
      
      const isLiked = post.liked;
      
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked: !isLiked,
                likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      );

      if (isLiked) {
        await socialFeedAPI.unlikePost(post.id);
      } else {
        await socialFeedAPI.likePost(post.id);
        await haptics.success();
      }
    } catch (error) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked: post.liked, likes_count: post.likes_count }
            : p
        )
      );
      Alert.alert(t('common.error'), t('social.failedToLike'));
    }
  };

  const handleSave = async (post: FeedPost) => {
    try {
      await haptics.selection();
      
      const isSaved = post.saved;
      
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                saved: !isSaved,
                saves_count: isSaved ? p.saves_count - 1 : p.saves_count + 1,
              }
            : p
        )
      );

      if (isSaved) {
        await socialFeedAPI.unsavePost(post.id);
      } else {
        await socialFeedAPI.savePost(post.id);
        await haptics.success();
      }
    } catch (error) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, saved: post.saved, saves_count: post.saves_count }
            : p
        )
      );
      Alert.alert(t('common.error'), t('social.failedToSave'));
    }
  };

  const handlePostMenu = (post: FeedPost) => {
    Alert.alert(
      post.display_name || post.username || 'Post',
      undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('social.blockUser'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('social.blockUser'),
              t('social.blockUserConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('social.block'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await socialFeedAPI.blockUser(post.user_id);
                      setPosts(prev => prev.filter(p => p.user_id !== post.user_id));
                      haptics.success();
                    } catch {
                      Alert.alert(t('common.error'), t('social.blockFailed'));
                    }
                  },
                },
              ]
            );
          },
        },
        {
          text: t('social.reportPost'),
          onPress: () => {
            Alert.alert(
              t('social.reportConfirmTitle'),
              t('social.reportConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                ...Object.entries(t('social.reportReasons') as any).map(([key, label]) => ({
                  text: label as string,
                  onPress: async () => {
                    try {
                      await socialFeedAPI.reportContent({
                        targetType: 'post',
                        targetId: post.id,
                        reason: key,
                      });
                      Alert.alert(t('common.success'), t('social.contentReported'));
                    } catch {
                      Alert.alert(t('common.error'), t('social.reportFailed'));
                    }
                  },
                }))
              ]
            );
          },
        },
      ]
    );
  };

  const handleProfilePress = (username: string) => {
    router.push(`/social/profile/${username}`);
  };

  const handleCreateProfile = () => {
    router.push('/social/setup-profile');
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeaderContainer}>
        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => item.username && handleProfilePress(item.username)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Avatar
              uri={item.profile_photo_url}
              name={item.display_name || item.username}
              size={40}
              style={styles.avatar}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {item.display_name || item.username || 'User'}
            </Text>
            {item.username && (
              <Text style={styles.username}>@{item.username}</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handlePostMenu(item)} style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <Image source={{ uri: item.image_url }} style={styles.postImage} />

      {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              item.liked
                ? (theme.colors.gradient.warm as readonly [string, string, ...string[]])
                : (['transparent', 'transparent'] as const)
            }
            style={[styles.actionButtonInner, item.liked && styles.actionButtonActive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={item.liked ? 'heart' : 'heart-outline'}
              size={20}
              color={item.liked ? '#fff' : theme.colors.text.secondary}
            />
            <Text style={[styles.actionText, item.liked && styles.actionTextActive]}>
              {item.likes_count}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setActiveCommentPostId(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.actionButtonInner}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSave(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              item.saved
                ? (theme.colors.gradient.primary as readonly [string, string, ...string[]])
                : (['transparent', 'transparent'] as const)
            }
            style={[styles.actionButtonInner, item.saved && styles.actionButtonActive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={item.saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={item.saved ? '#fff' : theme.colors.text.secondary}
            />
            <Text style={[styles.actionText, item.saved && styles.actionTextActive]}>
              {item.saves_count}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.timestamp}>
          <Text style={styles.timestampText}>
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );

  const handleCommentAdded = (postId: number) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
    ));
  };

  const handleCommentDeleted = (postId: number) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, comments_count: Math.max((p.comments_count || 0) - 1, 0) } : p
    ));
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Ionicons name="sparkles" size={32} color="rgba(255,255,255,0.9)" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{t('social.feed')}</Text>
              <Text style={styles.headerSubtitle}>{t('social.feedSubtitle')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications-outline" size={28} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (hasProfile === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Ionicons name="sparkles" size={32} color="rgba(255,255,255,0.9)" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{t('social.feed')}</Text>
              <Text style={styles.headerSubtitle}>{t('social.feedSubtitle')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications-outline" size={28} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="person-add-outline" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyText}>{t('social.noProfile')}</Text>
          <Text style={styles.emptySubtext}>{t('social.createProfilePrompt')}</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateProfile}>
            <LinearGradient
              colors={theme.colors.gradient.warm as readonly [string, string, ...string[]]}
              style={styles.createButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.createButtonText}>{t('social.createProfile')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Ionicons name="sparkles" size={32} color="rgba(255,255,255,0.9)" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t('social.feed')}</Text>
            <Text style={styles.headerSubtitle}>{t('social.feedSubtitle')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setShowNotifications(true)}
          >
            <Ionicons name="notifications-outline" size={28} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="people-outline" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyText}>{t('social.noPosts')}</Text>
          <Text style={styles.emptySubtext}>{t('social.followPrompt')}</Text>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => router.push('/social/discover')}
          >
            <LinearGradient
              colors={theme.colors.gradient.primary as readonly [string, string, ...string[]]}
              style={styles.discoverButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="search" size={24} color="#fff" />
              <Text style={styles.discoverButtonText}>{t('social.discoverPeople')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && posts.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} />
            ) : null
          }
        />
      )}

      {activeCommentPostId && (
        <CommentsModal
          visible={!!activeCommentPostId}
          postId={activeCommentPostId}
          onClose={() => setActiveCommentPostId(null)}
          onCommentAdded={() => handleCommentAdded(activeCommentPostId)}
          onCommentDeleted={() => handleCommentDeleted(activeCommentPostId)}
        />
      )}

      <NotificationsModal
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          setUnreadCount(0);
        }}
      />
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  notificationButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: '#EF4444', // Red
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primaryDark,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold as any,
    color: '#fff',
    marginTop: theme.spacing.sm,
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
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  discoverButton: {
    marginTop: theme.spacing.xl,
  },
  discoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  discoverButtonText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  createButton: {
    marginTop: theme.spacing.xl,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  createButtonText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  list: {
    padding: theme.spacing.md,
  },
  postCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  postHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moreButton: {
    padding: 8,
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
  displayName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
  },
  username: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  postImage: {
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
    alignItems: 'center',
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
  actionButtonActive: {
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text.secondary,
  },
  actionTextActive: {
    color: '#fff',
  },
  timestamp: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timestampText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
});
