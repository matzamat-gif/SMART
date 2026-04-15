import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { socialFeedAPI } from '@/lib/api';
import { FeedPost } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';
import { haptics } from '@/lib/haptics';
import { timeAgo } from '@/lib/timeAgo';
import Avatar from '@/components/social/Avatar';
import CommentsModal from '@/components/social/CommentsModal';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      const response = await socialFeedAPI.getPost(Number(postId));
      setPost(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert(t('common.error'), t('social.profilePrivate'));
      } else {
        Alert.alert(t('common.error'), t('social.failedToLoadFeed'));
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await haptics.selection();
      const isLiked = post.liked;
      setPost(prev => prev ? {
        ...prev,
        liked: !isLiked,
        likes_count: isLiked ? prev.likes_count - 1 : prev.likes_count + 1,
      } : null);
      if (isLiked) {
        await socialFeedAPI.unlikePost(post.id);
      } else {
        await socialFeedAPI.likePost(post.id);
        await haptics.success();
      }
    } catch {
      // Revert on error
      setPost(prev => prev ? { ...prev, liked: post.liked, likes_count: post.likes_count } : null);
      Alert.alert(t('common.error'), t('social.failedToLike'));
    }
  };

  const handleSave = async () => {
    if (!post) return;
    try {
      await haptics.selection();
      const isSaved = post.saved;
      setPost(prev => prev ? {
        ...prev,
        saved: !isSaved,
        saves_count: isSaved ? prev.saves_count - 1 : prev.saves_count + 1,
      } : null);
      if (isSaved) {
        await socialFeedAPI.unsavePost(post.id);
      } else {
        await socialFeedAPI.savePost(post.id);
        await haptics.success();
      }
    } catch {
      setPost(prev => prev ? { ...prev, saved: post.saved, saves_count: post.saves_count } : null);
      Alert.alert(t('common.error'), t('social.failedToSave'));
    }
  };

  const handlePostMenu = useCallback(() => {
    if (!post) return;
    Alert.alert(post.display_name || post.username || 'Post', undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('social.blockUser'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('social.blockUser'), t('social.blockUserConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('social.block'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await socialFeedAPI.blockUser(post.user_id);
                  await haptics.success();
                  router.back();
                } catch {
                  Alert.alert(t('common.error'), t('social.blockFailed'));
                }
              },
            },
          ]);
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
                    await socialFeedAPI.reportContent({ targetType: 'post', targetId: post.id, reason: key });
                    Alert.alert(t('common.success'), t('social.contentReported'));
                  } catch {
                    Alert.alert(t('common.error'), t('social.reportFailed'));
                  }
                },
              })),
            ]
          );
        },
      },
    ]);
  }, [post, t]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('social.post')}</Text>
        <TouchableOpacity style={styles.moreButton} onPress={handlePostMenu}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Author */}
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => post.username && router.push(`/social/profile/${post.username}`)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarRing}>
            <Avatar
              uri={post.profile_photo_url}
              name={post.display_name || post.username}
              size={44}
            />
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.displayName}>{post.display_name || post.username}</Text>
            <Text style={styles.username}>@{post.username} · {timeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>

        {/* Image */}
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />

        {/* Actions */}
        <View style={styles.actions}>
          {/* Like */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
            <LinearGradient
              colors={
                post.liked
                  ? (theme.colors.gradient.warm as readonly [string, string, ...string[]])
                  : (['transparent', 'transparent'] as const)
              }
              style={[styles.actionInner, post.liked && styles.actionActive]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons
                name={post.liked ? 'heart' : 'heart-outline'}
                size={22}
                color={post.liked ? '#fff' : theme.colors.text.secondary}
              />
              <Text style={[styles.actionText, post.liked && styles.actionTextActive]}>
                {post.likes_count}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)} activeOpacity={0.7}>
            <View style={styles.actionInner}>
              <Ionicons name="chatbubble-outline" size={22} color={theme.colors.text.secondary} />
              <Text style={styles.actionText}>{post.comments_count || 0}</Text>
            </View>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.7}>
            <LinearGradient
              colors={
                post.saved
                  ? (theme.colors.gradient.primary as readonly [string, string, ...string[]])
                  : (['transparent', 'transparent'] as const)
              }
              style={[styles.actionInner, post.saved && styles.actionActive]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons
                name={post.saved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={post.saved ? '#fff' : theme.colors.text.secondary}
              />
              <Text style={[styles.actionText, post.saved && styles.actionTextActive]}>
                {post.saves_count}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {post.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionAuthor}>{post.display_name || post.username}</Text>
            <Text style={styles.captionText}> {post.caption}</Text>
          </View>
        ) : null}

        {/* View comments CTA */}
        <TouchableOpacity style={styles.viewComments} onPress={() => setShowComments(true)}>
          <Text style={styles.viewCommentsText}>
            {post.comments_count
              ? t('social.viewAllComments', { count: post.comments_count })
              : t('social.addComment')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CommentsModal
        visible={showComments}
        postId={post.id}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => setPost(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null)}
        onCommentDeleted={() => setPost(prev => prev ? { ...prev, comments_count: Math.max((prev.comments_count || 0) - 1, 0) } : null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  authorInfo: {
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
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  actionBtn: {
    flex: 1,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 6,
  },
  actionActive: {
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
  captionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  captionAuthor: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
  },
  captionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  viewComments: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginTop: 1,
  },
  viewCommentsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});
