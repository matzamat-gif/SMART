import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { socialFeedAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';
import { haptics } from '@/lib/haptics';

export default function ShareOutfitScreen() {
  const { outfitId, imageUrl } = useLocalSearchParams();
  const { t } = useI18n();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>('public');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      await haptics.medium();

      // Create FormData for image upload
      const formData = new FormData();
      formData.append('outfitId', outfitId as string);
      formData.append('caption', caption.trim());
      formData.append('visibility', visibility);
      formData.append('sourceType', 'approved_outfit');

      await socialFeedAPI.createPost(formData);

      await haptics.success();
      Alert.alert(
        t('common.success'),
        t('social.postCreated'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/(tabs)/feed'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Post creation failed:', error);
      const message = error.response?.data?.error || t('social.failedToCreatePost');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Ionicons name="share-social" size={32} color="rgba(255,255,255,0.9)" />
        <Text style={styles.headerTitle}>{t('social.shareOutfit')}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        {imageUrl && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUrl as string }} style={styles.previewImage} />
          </View>
        )}

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.caption')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('social.captionPlaceholder')}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.postVisibility')}</Text>
          <View style={styles.visibilityOptions}>
            {[
              { value: 'public', icon: 'globe-outline', label: t('social.visibilityPublic') },
              { value: 'followers_only', icon: 'people-outline', label: t('social.visibilityFollowers') },
              { value: 'private', icon: 'lock-closed-outline', label: t('social.visibilityPrivate') },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.visibilityOptionSelected,
                ]}
                onPress={() => {
                  setVisibility(option.value as any);
                  haptics.selection();
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={visibility === option.value ? theme.colors.primary : theme.colors.text.secondary}
                />
                <Text
                  style={[
                    styles.visibilityLabel,
                    visibility === option.value && styles.visibilityLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Share Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={loading}
        >
          <LinearGradient
            colors={theme.colors.gradient.warm as readonly [string, string, ...string[]]}
            style={styles.shareButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text style={styles.shareButtonText}>{t('social.share')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.lg,
    top: 60,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold as any,
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  previewContainer: {
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  previewImage: {
    width: '100%',
    height: 400,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.base,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  visibilityOptions: {
    gap: theme.spacing.sm,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: theme.colors.surface,
  },
  visibilityOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#ECFDF5',
  },
  visibilityLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.md,
  },
  visibilityLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold as any,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: theme.colors.surface,
  },
  shareButton: {
    width: '100%',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  shareButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: '#fff',
  },
});
