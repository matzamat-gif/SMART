import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../lib/theme';
import { useI18n } from '../../lib/i18n/I18nContext';
import { SocialNotification } from '../../lib/types';
import { socialFeedAPI } from '../../lib/api';
import { timeAgo } from '../../lib/timeAgo';
import Avatar from './Avatar';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (visible) {
      loadNotifications(true);
      // Mark as read in the background
      socialFeedAPI.markNotificationsRead().catch(console.error);
    }
  }, [visible]);

  const loadNotifications = async (refresh = false) => {
    try {
      if (refresh) setLoading(true);

      const response = await socialFeedAPI.getNotifications({
        limit: 20,
        cursor: refresh ? undefined : cursor,
      });

      const newNotifs = response.data.notifications;
      
      setNotifications(refresh ? newNotifs : [...notifications, ...newNotifs]);
      setCursor(response.data.nextCursor);
      setHasMore(!!response.data.nextCursor);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    loadNotifications();
  };

  const handleNotificationPress = (notification: SocialNotification) => {
    onClose();
    if (notification.type === 'follow') {
      router.push(`/social/profile/${notification.actor_username}`);
    } else if (notification.reference_id) {
      router.push(`/social/post/${notification.reference_id}`);
    } else {
      router.push(`/social/profile/${notification.actor_username}`);
    }
  };

  const getNotificationText = (notification: SocialNotification) => {
    switch (notification.type) {
      case 'like':
        return t('social.likedYourPost');
      case 'follow':
        return t('social.startedFollowingYou');
      case 'comment':
        return t('social.commentedOnYourPost', { comment: notification.comment_content });
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <View style={[styles.iconBadge, { backgroundColor: '#EF4444' }]}><Ionicons name="heart" size={10} color="#fff" /></View>;
      case 'comment':
        return <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary }]}><Ionicons name="chatbubble" size={10} color="#fff" /></View>;
      case 'follow':
        return <View style={[styles.iconBadge, { backgroundColor: '#10B981' }]}><Ionicons name="person" size={10} color="#fff" /></View>;
      default:
        return null;
    }
  };

  const renderNotification = ({ item }: { item: SocialNotification }) => (
    <TouchableOpacity 
      style={[styles.notificationContainer, !item.is_read && styles.unreadContainer]} 
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrapper}>
        <Avatar
          uri={item.actor_avatar}
          name={item.actor_display_name || item.actor_username}
          size={48}
          style={styles.avatar}
        />
        {getNotificationIcon(item.type)}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={2}>
          <Text style={styles.username}>{item.actor_display_name || item.actor_username}</Text>
          {' '}{getNotificationText(item)}
        </Text>
        <Text style={styles.timeAgo}>
          {timeAgo(item.created_at)}
        </Text>
      </View>
      
      {(item.type === 'like' || item.type === 'comment') && item.post_image && (
        <Image source={{ uri: item.post_image }} style={styles.postThumbnail} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('social.notifications')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="notifications-outline" size={64} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>{t('social.noNotificationsYet')}</Text>
            <Text style={styles.emptySubtext}>{t('social.whenSomeoneInteracts')}</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && notifications.length > 0 ? (
                <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} />
              ) : null
            }
          />
        )}
      </View>
    </Modal>
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
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: theme.colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingBottom: 20,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unreadContainer: {
    backgroundColor: theme.colors.primary + '10', // 10% opacity primary color
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  username: {
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  postThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
});
