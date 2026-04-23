import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { socialFeedAPI } from '@/lib/api';
import { SocialProfile, FeedPost } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';
import { haptics } from '@/lib/haptics';
import Avatar from '@/components/social/Avatar';
import { useCurrentUserId } from '@/lib/AuthContext';
import { logger } from '@/lib/logger';

export default function ProfileScreen() {
  const { username } = useLocalSearchParams();
  const { t } = useI18n();
  const currentUserId = useCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // True when this profile belongs to the signed-in user — the follow
  // button doesn't make sense in that case.
  const isOwnProfile = currentUserId != null && profile?.user_id === currentUserId;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const profileResponse = await socialFeedAPI.getProfile(username as string);
      const profileData = profileResponse.data as SocialProfile;
      setProfile(profileData);

      // DEV-008: Seed the follow button from whatever the server tells us.
      // If the response doesn't include `is_following`, fall back to a
      // dedicated status endpoint so we don't render "Follow" when the
      // current user is already following.
      if (typeof profileData.is_following === 'boolean') {
        setIsFollowing(profileData.is_following);
      } else if (currentUserId != null && profileData.user_id !== currentUserId) {
        try {
          const statusRes = await socialFeedAPI.getFollowStatus(profileData.user_id);
          setIsFollowing(!!statusRes.data?.is_following);
        } catch {
          // Endpoint may not exist yet — leave default and let the user
          // toggle. The unfollow call will succeed even if the initial
          // state was wrong.
          setIsFollowing(false);
        }
      }

      const postsResponse = await socialFeedAPI.getUserPosts({
        userId: profileData.user_id,
        limit: 20,
      });
      setPosts(postsResponse.data.posts || []);
    } catch (error: any) {
      logger.error('Failed to load profile', { status: error.response?.status });
      if (error.response?.status === 403) {
        Alert.alert(t('common.error'), t('social.profilePrivate'));
      } else {
        Alert.alert(t('common.error'), t('social.failedToLoadProfile'));
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    
    try {
      setLoadingFollow(true);
      await haptics.medium();

      if (isFollowing) {
        await socialFeedAPI.unfollow(profile.user_id);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null);
      } else {
        await socialFeedAPI.follow(profile.user_id);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
        await haptics.success();
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('social.failedToFollow'));
    } finally {
      setLoadingFollow(false);
    }
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/social/post/${item.id}`)}
    >
      <Image source={{ uri: item.image_url }} style={styles.postImage} />
      <View style={styles.postStats}>
        <View style={styles.stat}>
          <Ionicons name="heart" size={14} color="#fff" />
          <Text style={styles.statText}>{item.likes_count}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="bookmark" size={14} color="#fff" />
          <Text style={styles.statText}>{item.saves_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar
              uri={profile.profile_photo_url}
              name={profile.display_name || profile.username}
              size={100}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.displayName}>
            {profile.display_name || profile.username}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.posts_count}</Text>
              <Text style={styles.statLabel}>{t('social.posts')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followers_count}</Text>
              <Text style={styles.statLabel}>{t('social.followers')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>{t('social.following')}</Text>
            </View>
          </View>

          {/* Follow Button — hidden on own profile (DEV-008). */}
          {!isOwnProfile && (
          <TouchableOpacity
            style={styles.followButton}
            onPress={handleFollow}
            disabled={loadingFollow}
          >
            <LinearGradient
              colors={
                isFollowing
                  ? ['#E5E7EB', '#E5E7EB']
                  : (theme.colors.gradient.primary as readonly [string, string, ...string[]])
              }
              style={styles.followButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loadingFollow ? (
                <ActivityIndicator color={isFollowing ? theme.colors.text.primary : '#fff'} />
              ) : (
                <>
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add'}
                    size={20}
                    color={isFollowing ? theme.colors.text.primary : '#fff'}
                  />
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowing && styles.followButtonTextFollowing,
                    ]}
                  >
                    {isFollowing ? t('social.following') : t('social.follow')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          )}
        </View>

        {/* Posts Grid */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>{t('social.posts')}</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="images-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyText}>{t('social.noPosts')}</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={styles.postsRow}
            />
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    padding: 3,
    borderRadius: 52,
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  displayName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  username: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.md,
  },
  bio: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  followButton: {
    width: '100%',
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  followButtonText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  followButtonTextFollowing: {
    color: theme.colors.text.primary,
  },
  postsSection: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  postsRow: {
    gap: 2,
    marginBottom: 2,
  },
  postItem: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  postStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: theme.fontSize.xs,
    color: '#fff',
    fontWeight: theme.fontWeight.medium as any,
  },
});
