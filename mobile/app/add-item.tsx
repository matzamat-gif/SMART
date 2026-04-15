import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { wardrobeAPI } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { haptics } from '../lib/haptics';
import LoadingButton from '../components/LoadingButton';
import { useI18n } from '../lib/i18n';
import CameraModal from '../components/CameraModal';
import { useAnalytics } from '../hooks/useAnalytics';

const CATEGORY_ICONS: Record<string, string> = {
  tops: 'shirt',
  bottoms: 'briefcase',
  shoes: 'footsteps',
  outerwear: 'umbrella',
  accessories: 'watch',
  dresses: 'woman',
  activewear: 'fitness',
};

export default function AddItemScreen() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const [image, setImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState<string[]>(['all']);
  const [brand, setBrand] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, success, error, hideToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset submitting state on mount to prevent stuck button
  useEffect(() => {
    setSubmitting(false);
  }, []);

  const handleImageAnalysis = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      const fileData: any = {
        uri: uri,
        name: filename,
        type: type,
      };
      
      formData.append('image', fileData);

      console.log('🤖 Sending image for AI analysis...');
      const response = await wardrobeAPI.analyzeImage(formData);
      
      console.log('📦 Full API Response:', JSON.stringify(response.data, null, 2));
      
      const suggestions = response.data?.suggestions;
      
      if (!suggestions) {
        console.log('⚠️ No suggestions in API response');
        return;
      }
      
      console.log('✅ AI Suggestions received:', suggestions);
      
      if (suggestions) {
        let fieldsFilledCount = 0;
        console.log('🔄 Starting to apply AI suggestions...');
        
        // Auto-fill category
        if (suggestions.category) {
          console.log('🏷️ Suggested category:', suggestions.category);
          const suggestedCategory = suggestions.category.toLowerCase();
          const matchedCategory = categories.find(c => 
            c === suggestedCategory ||
            suggestedCategory.includes(c) ||
            c.includes(suggestedCategory)
          );
          if (matchedCategory) {
            setCategory(matchedCategory);
            fieldsFilledCount++;
            console.log('✓ Set category:', matchedCategory);
          }
        }

        // Auto-fill sub-category
        if (suggestions.sub_category) {
          setSubCategory(suggestions.sub_category);
          fieldsFilledCount++;
          console.log('✓ Set sub-category:', suggestions.sub_category);
        }

        // Auto-fill color
        if (suggestions.color) {
          console.log('🎨 Suggested color:', suggestions.color);
          const suggestedColor = suggestions.color.toLowerCase();
          const matchedColor = colors.find(c => 
            c === suggestedColor ||
            suggestedColor.includes(c) ||
            c.includes(suggestedColor)
          );
          if (matchedColor) {
            setColor(matchedColor);
            fieldsFilledCount++;
            console.log('✓ Set color:', matchedColor);
          } else {
            // If it's a unique color not in our list, just use it as a custom string
            setColor(suggestions.color);
            fieldsFilledCount++;
            console.log('✓ Set custom color:', suggestions.color);
          }
        }

        // Auto-fill season
        if (suggestions.season) {
          const suggestedSeason = suggestions.season.toLowerCase();
          
          if (suggestedSeason === 'all') {
            setSeason(['all']);
            fieldsFilledCount++;
            console.log('✓ Set season: all');
          } else {
            const matchedSeason = seasons.find(s => 
              s === suggestedSeason ||
              suggestedSeason.includes(s) ||
              s.includes(suggestedSeason)
            );
            if (matchedSeason && matchedSeason !== 'all') {
              setSeason([matchedSeason]);
              fieldsFilledCount++;
              console.log('✓ Set season:', matchedSeason);
            }
          }
        }

        // Auto-fill brand if available
        if (suggestions.brand) {
          setBrand(suggestions.brand);
          fieldsFilledCount++;
          console.log('✓ Set brand:', suggestions.brand);
        }

        // Show success feedback only if fields were actually filled
        if (fieldsFilledCount > 0) {
          haptics.success();
          success(t('addItem.aiSuggested'));
          console.log(`✅ AI filled ${fieldsFilledCount} field(s)`);
        } else {
          console.log('⚠️ AI returned suggestions but no fields matched');
        }
      } else {
        console.log('⚠️ No suggestions in response');
      }
    } catch (err: any) {
      console.error('❌ Image analysis failed:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Silently continue - user can fill manually
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    try {
      console.log('📷 [Gallery] Requesting permissions and opening picker...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(t('common.error'), t('addItem.photoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        // Force local gallery on iPhone instead of iCloud - uses current representation to avoid fetching from iCloud
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      });

      console.log('📷 [Gallery] Result:', { canceled: result.canceled });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('📷 [Gallery] Selected image URI:', uri);
        setImage(uri);
        console.log('📷 [Gallery] Image state updated, should trigger re-render');
        haptics.success();
        await handleImageAnalysis(uri);
      }
    } catch (err) {
      console.error('📷 [Gallery] Error:', err);
      const errorMessage = err instanceof Error ? err.message : t('errors.unknownError');
      Alert.alert(t('common.error'), `${t('errors.galleryError')}: ${errorMessage}`);
      error(t('addItem.failedToPickImage'));
    }
  };

  const takePhoto = () => {
    console.log('📸 [Camera] Opening in-app camera modal...');
    setShowCamera(true);
  };

  const handlePictureTaken = async (uri: string) => {
    setImage(uri);
    setShowCamera(false);
    haptics.success();
    await handleImageAnalysis(uri);
  };

  const handleSubmit = async () => {
    if (!image) {
      error(t('addItem.photoRequired'));
      return;
    }
    if (!category) {
      error(t('addItem.selectCategoryError'));
      return;
    }
    if (!color) {
      error(t('addItem.selectColorError'));
      return;
    }

    try {
      setSubmitting(true);
      await haptics.medium();

      // Create form data
      const formData = new FormData();
      
      // Add image - React Native requires specific format
      const filename = image.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      const fileData: any = {
        uri: image,
        name: filename,
        type: type,
      };
      
      formData.append('image', fileData);

      // Add other fields
      formData.append('category', category);
      if (subCategory) formData.append('sub_category', subCategory);
      formData.append('color', color);
      // Send first season only - backend expects single value
      formData.append('season', season[0] || 'all');
      if (brand) formData.append('brand', brand);

      // Send confirmed AI tags to avoid redundant backend processing
      const aiTags = {
        category: category,
        color: color,
        // We could expand this to include material/texture if UI supported it
      };
      formData.append('ai_tags', JSON.stringify(aiTags));

      await wardrobeAPI.addItem(formData);
      
      // Track analytics events
      await track('item_added', { category, color, brand: brand || 'unknown' });
      await track('item_tag_confirmed', { tags: aiTags });
      
      await haptics.success();
      success(t('addItem.itemAdded'));
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: any) {
      console.error('Item upload failed:', err.response?.data || err.message);
      
      const errorMessage = err.response?.data?.error || err.message || t('errors.unknownError');
      Alert.alert(t('common.error'), errorMessage);
      error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSeason = (s: string) => {
    if (s === 'all') {
      setSeason(['all']);
    } else {
      const newSeasons = season.includes(s)
        ? season.filter(x => x !== s)
        : [...season.filter(x => x !== 'all'), s];
      setSeason(newSeasons.length > 0 ? newSeasons : ['all']);
    }
  };

  const categories = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'dresses'];
  const colors = ['black', 'white', 'gray', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'beige'];
  const seasons = ['spring', 'summer', 'fall', 'winter', 'all'];

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <CameraModal 
        visible={showCamera} 
        onClose={() => setShowCamera(false)} 
        onPictureTaken={handlePictureTaken} 
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('addItem.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.photoRequired')}</Text>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
              {isAnalyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.analyzingText}>{t('addItem.analyzing')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={pickImage}
                disabled={isAnalyzing}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.changePhotoText}>{t('addItem.changePhoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
              <Text style={styles.imagePlaceholderText}>{t('addItem.addPhoto')}</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#059669" />
                  <Text style={styles.imageButtonText}>{t('addItem.camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#059669" />
                  <Text style={styles.imageButtonText}>{t('addItem.gallery')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.categoryRequired')}</Text>
          <View style={styles.categoryGrid}>
            {categories.map((catKey) => (
              <TouchableOpacity
                key={catKey}
                style={[
                  styles.categoryCard,
                  category === catKey && styles.categoryCardSelected,
                ]}
                onPress={async () => {
                  await haptics.selection();
                  setCategory(catKey);
                }}
              >
                <Ionicons
                  name={CATEGORY_ICONS[catKey] as any}
                  size={32}
                  color={category === catKey ? '#059669' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.categoryName,
                    category === catKey && styles.categoryNameSelected,
                  ]}
                >
                  {t(`addItem.categories.${catKey}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sub Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.subCategoryLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addItem.subCategoryPlaceholder')}
            value={subCategory}
            onChangeText={setSubCategory}
          />
        </View>

        {/* Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.colorRequired')}</Text>
          <View style={styles.colorGrid}>
            {colors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorChip,
                  color === c && styles.colorChipSelected,
                ]}
                onPress={async () => {
                  await haptics.selection();
                  setColor(c);
                }}
              >
                <Text
                  style={[
                    styles.colorText,
                    color === c && styles.colorTextSelected,
                  ]}
                >
                  {t(`addItem.colors.${c}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Season */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.seasonLabel')}</Text>
          <View style={styles.seasonGrid}>
            {seasons.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.seasonChip,
                  season.includes(s) && styles.seasonChipSelected,
                ]}
                onPress={async () => {
                  await haptics.selection();
                  toggleSeason(s);
                }}
              >
                <Text
                  style={[
                    styles.seasonText,
                    season.includes(s) && styles.seasonTextSelected,
                  ]}
                >
                  {t(`addItem.seasons.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brand */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addItem.brandLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addItem.brandPlaceholder')}
            value={brand}
            onChangeText={setBrand}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <LoadingButton
          title={submitting ? t('addItem.saving') : t('addItem.saveButton')}
          loading={submitting}
          loadingText={t('addItem.saving')}
          icon="checkmark"
          variant="gradient"
          onPress={handleSubmit}
          style={styles.submitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 300,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 20,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    alignItems: 'center',
    gap: 6,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  categoryCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  categoryName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
  },
  categoryNameSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  colorChipSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  colorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  colorTextSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  seasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  seasonChipSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  seasonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  seasonTextSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitButton: {
    width: '100%',
  },
});
