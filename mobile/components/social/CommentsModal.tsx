import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { useI18n } from '../../lib/i18n/I18nContext';
import { FeedComment } from '../../lib/types';
import { socialFeedAPI } from '../../lib/api';
import { haptics } from '../../lib/haptics';

interface CommentsModalProps {
  visible: boolean;
  postId: number;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

export default function CommentsModal({ visible, postId, onClose, onCommentAdded, onCommentDeleted }: CommentsModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      loadComments(true);
    } else {
      // Reset state when closed
      setComments([]);
      setContent('');
      setCursor(undefined);
      setHasMore(true);
    }
  }, [visible, postId]);

  const loadComments = async (refresh = false) => {
    try {
      if (refresh) setLoading(true);
      else setLoadingMore(true);

      const response = await socialFeedAPI.getComments(postId, {
        limit: 20,
        cursor: refresh ? undefined : cursor,
      });

      const newComments = response.data.comments;
      
      setComments(refresh ? newComments : [...comments, ...newComments]);
      setCursor(response.data.nextCursor);
      setHasMore(!!response.data.nextCursor);
    } catch (error) {
      console.error('Failed to load comments:', error);
      if (refresh) Alert.alert(t('common.error'), t('social.failedToLoadComments'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    loadComments();
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await socialFeedAPI.addComment(postId, content.trim());
      
      // Optimistic-like UI update
      setComments([response.data, ...comments]);
      setContent('');
      await haptics.success();
      onCommentAdded();
      
      // Keep keyboard open for rapid-fire comments
    } catch (error) {
      console.error('Failed to post comment:', error);
      Alert.alert(t('common.error'), t('social.failedToPostComment'));
      await haptics.error();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (comment: FeedComment) => {
    Alert.alert(
      t('common.delete'),
      t('social.deleteCommentConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await socialFeedAPI.deleteComment(comment.id);
              setComments(comments.filter(c => c.id !== comment.id));
              onCommentDeleted();
              await haptics.success();
            } catch (error) {
              Alert.alert(t('common.error'), t('social.failedToDeleteComment'));
            }
          }
        }
      ]
    );
  };

  const renderComment = ({ item }: { item: FeedComment }) => (
    <View style={styles.commentContainer} key={`comment-${item.id}`}>
      <Image
        source={{ uri: item.profile_photo_url || 'https://via.placeholder.com/40' }}
        style={styles.avatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>
            {item.display_name || item.username || 'User'}
            {item.username && <Text style={styles.usernameHandle}> @{item.username}</Text>}
          </Text>
          <Text style={styles.timeAgo}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
      
      {/* Assuming current user can delete their own comments - would need real user context to hide properly */}
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('social.comments')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>{t('social.noCommentsYet')}</Text>
            <Text style={styles.emptySubtext}>{t('social.beTheFirstToComment')}</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ padding: 16 }} color={theme.colors.primary} />
              ) : null
            }
            inverted // Messages flow bottom to top usually looks better, but we are returning newest first
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('social.addCommentPlaceholder')}
            placeholderTextColor={theme.colors.text.tertiary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!content.trim() || submitting) && styles.sendButtonDisabled]} 
            onPress={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: theme.colors.surface,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  usernameHandle: {
    fontSize: 13,
    fontWeight: 'normal',
    color: theme.colors.text.secondary,
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginLeft: 8,
  },
  commentText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  deleteButton: {
    paddingLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
});
