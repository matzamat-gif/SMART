import { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { socialFeedAPI } from '@/lib/api';
import { theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n/I18nContext';
import { haptics } from '@/lib/haptics';

export default function SetupProfileScreen() {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>('public');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const response = await socialFeedAPI.getProfile();
      const profile = response.data;
      if (profile) {
        setIsEditMode(true);
        setUsername(profile.username || '');
        setDisplayName(profile.display_name || '');
        setBio(profile.bio || '');
        setVisibility(profile.visibility_mode || 'public');
        if (profile.profile_photo_url) {
          setProfilePhoto(profile.profile_photo_url);
        }
      }
    } catch (error: any) {
      // 404 means no profile yet — stay in create mode
      if (error.response?.status !== 404) {
        console.error('Failed to load profile:', error);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(t('common.error'), t('social.photoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
        await haptics.success();
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('social.failedToPickPhoto'));
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert(t('common.error'), t('social.usernameRequired'));
      return;
    }

    if (username.length < 3 || username.length > 50) {
      Alert.alert(t('common.error'), t('social.usernameLength'));
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      Alert.alert(t('common.error'), t('social.usernameInvalid'));
      return;
    }

    try {
      setLoading(true);
      await haptics.medium();

      let profilePhotoUrl: string | undefined;

      // Upload photo if selected (simplified - in production use proper GCS upload)
      if (profilePhoto) {
        setUploading(true);
        // For now, we'll skip the upload and use placeholder
        // In production, implement proper upload to GCS
        profilePhotoUrl = profilePhoto;
        setUploading(false);
      }

      if (isEditMode) {
        await socialFeedAPI.updateProfile({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          visibility,
          profilePhotoUrl,
        });
      } else {
        await socialFeedAPI.createProfile({
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          visibility,
          profilePhotoUrl,
        });
      }

      await haptics.success();
      Alert.alert(
        t('common.success'),
        isEditMode ? t('social.profileUpdated') : t('social.profileCreated'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/(tabs)/feed'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Profile creation failed:', error);
      const message = error.response?.data?.error || t('social.failedToCreateProfile');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
      setUploading(false);
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
        <Ionicons name={isEditMode ? 'person' : 'person-add'} size={32} color="rgba(255,255,255,0.9)" />
        <Text style={styles.headerTitle}>{isEditMode ? t('social.editProfile') : t('social.createProfile')}</Text>
        <Text style={styles.headerSubtitle}>{isEditMode ? t('social.editSubtitle') : t('social.setupSubtitle')}</Text>
      </LinearGradient>

      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.profilePhoto')}</Text>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePickPhoto}
            disabled={uploading}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color={theme.colors.text.tertiary} />
                <Text style={styles.photoPlaceholderText}>{t('social.addPhoto')}</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Username */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('social.username')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, isEditMode && styles.inputDisabled]}
            placeholder={t('social.usernamePlaceholder')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
            editable={!isEditMode}
          />
          <Text style={styles.hint}>{isEditMode ? t('social.usernameCannotChange') : t('social.usernameHint')}</Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.displayName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('social.displayNamePlaceholder')}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={100}
          />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.bio')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('social.bioPlaceholder')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('social.visibility')}</Text>
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
      )}

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading || uploading}
        >
          <LinearGradient
            colors={theme.colors.gradient.warm as readonly [string, string, ...string[]]}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>{isEditMode ? t('social.saveProfile') : t('social.createProfile')}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  inputDisabled: {
    backgroundColor: theme.colors.surfaceSecondary,
    color: theme.colors.text.disabled,
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
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
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
  required: {
    color: '#F87171',
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
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  submitButton: {
    width: '100%',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: '#fff',
  },
});
